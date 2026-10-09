const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),ts=require('typescript');
const root=path.resolve(__dirname,'..');

// Vercel filters deployment input using gitignore-style patterns before Next.js builds.
// A normal local build alone cannot detect source files removed by .vercelignore.
for (const [label,directory,prefix] of [['repository',path.dirname(root),'ryma-site/'],['app',root,'']]) {
  test(`${label} deployment retains all source files while excluding runtime data`,()=>{
    const {spawnSync}=require('node:child_process');
    const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ryma-deployment-filter-'));
    const run=(args,input)=>{
      const result=spawnSync('git',args,{cwd:temporary,input,encoding:'utf8',windowsHide:true});
      assert.ifError(result.error);return result;
    };
    try {
      const initialized=run(['init','--quiet']);assert.equal(initialized.status,0,initialized.stderr);
      fs.copyFileSync(path.join(directory,'.vercelignore'),path.join(temporary,'.gitignore'));
      const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
      const source=files(path.join(root,'src')).map(file=>prefix+path.relative(root,file).split(path.sep).join('/'));
      assert(source.includes(prefix+'src/data/translations/legacy-es.ts'));
      const excluded=['data/catalogue-backup.json','.demo/sample/report.json','data/backups/patient-snapshot.json','data/ryma.db','data/ryma.db-wal','data/ryma.db-shm','data/ryma.sqlite3'].map(file=>prefix+file);
      const result=run(['-c','core.excludesFile=','check-ignore','--no-index','-z','--stdin'],[...source,...excluded].join('\0')+'\0');
      assert.equal(result.status,0,result.stderr);
      const ignored=result.stdout.split('\0').filter(Boolean);
      assert.deepEqual(ignored.filter(file=>source.includes(file)),[],`${label} .vercelignore removes application source`);
      assert.deepEqual(ignored.filter(file=>excluded.includes(file)).sort(),excluded.sort());
    } finally {
      const resolved=fs.realpathSync(temporary);
      assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));
      assert(path.basename(resolved).startsWith('ryma-deployment-filter-'));
      fs.rmSync(resolved,{recursive:true,force:true});
    }
  });
}

function loader(mocks={}) {
  const cache=new Map();
  function load(id,parent=root){
    if(Object.hasOwn(mocks,id))return mocks[id];
    if(!id.startsWith('@/')&&!id.startsWith('.'))return require(id);
    const base=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(parent,id);
    const file=['.ts','.tsx',''].map(ext=>base+ext).find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
    assert(file,id);if(cache.has(file))return cache.get(file).exports;
    const mod={exports:{}};cache.set(file,mod);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(child=>load(child,path.dirname(file)),mod,mod.exports);
    return mod.exports;
  }
  return load;
}
test('health coalesces concurrent probes and reports read-only storage as unavailable',async()=>{
  let calls=0;
  const {GET}=loader({'@/lib/db':{dbHealthCheck:async()=>{calls++;return {status:'connected',writable:false};}}})('@/app/api/health/route');
  const responses=await Promise.all(Array.from({length:20},()=>GET()));
  assert.equal(calls,1);assert(responses.every(r=>r.status===503));
});
test('health never publishes a database exception or secret',async()=>{
  const {GET}=loader({'@/lib/db':{dbHealthCheck:async()=>{throw Error('private-token-123 /private/database');}}})('@/app/api/health/route');
  const r=await GET();assert.equal(r.status,503);assert(!/private-token|private\/database/.test(await r.text()));
});
test('production rejects missing CAPTCHA and wrong actions before storing an appointment',async()=>{
  const original={...process.env};process.env.NODE_ENV='production';process.env.RECAPTCHA_SECRET_KEY='fixture';
  try {
    let writes=0;
    const load=loader({'@/lib/db':{dbConsumeRateLimit:async()=>true,dbCreateAppointment:async()=>{writes++;}},'@/lib/booking-service':{},'@/lib/email':{},'@/lib/events':{}});
    const route=load('@/app/api/appointments/route');
    const {NextRequest}=require('next/server');
    const r=await route.POST(new NextRequest('http://localhost/api/appointments',{method:'POST',body:JSON.stringify({patientName:'Fixture'})}));
    assert.equal(r.status,403);assert.equal(writes,0);
    const originalFetch=globalThis.fetch;
    try {globalThis.fetch=async()=>Response.json({success:true,score:0.9,action:'other'});assert.equal((await load('@/lib/recaptcha').verifyRecaptchaToken('fixture','booking')).valid,false);}finally{globalThis.fetch=originalFetch;}
  }finally{process.env=original;}
});
test('untrusted Cloudflare and made-up Vercel IP headers do not override ingress IP',()=>{
  const original={...process.env};process.env.NODE_ENV='production';delete process.env.TRUSTED_PROXY;
  try {
    const {getClientIp}=loader()('@/lib/validation');
    const headers=new Headers({'cf-connecting-ip':'1.1.1.1','x-vercel-ip':'2.2.2.2','x-forwarded-for':'3.3.3.3'});
    assert.equal(getClientIp({headers}),'3.3.3.3');
    process.env.TRUSTED_PROXY='cloudflare';assert.equal(getClientIp({headers}),'1.1.1.1');
  }finally{process.env=original;}
});
test('fresh libSQL instance reads the durable schema version without rerunning migrations',async()=>{
  const original={...process.env};
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ryma-production-test-'));
  Object.assign(process.env,{NODE_ENV:'test',TURSO_DATABASE_URL:pathToFileURL(path.join(dir,'test.db')).href,TURSO_AUTH_TOKEN:''});
  const clients=[],queries=[];
  const mocks={'@libsql/client':{createClient(options){
    assert(options.url.startsWith('file:'));
    const c=require('@libsql/client').createClient(options);clients.push(c);
    return new Proxy(c,{get(target,key){const value=target[key];if(key==='execute'||key==='batch')return (...args)=>{queries.push({method:key,input:args[0]});return value.apply(target,args)};return typeof value==='function'?value.bind(target):value;}});
  }}};
  try {
    const first=loader(mocks)('@/lib/db');await first.executeQuery('SELECT 1');
    await first.executeQuery("INSERT INTO patients(id,patientName,phone,createdAt,updatedAt) VALUES('fixture','Audit fixture','+351969990001','2026-01-01','2026-01-01')");
    queries.length=0;
    const second=loader(mocks)('@/lib/db');const start=performance.now();const rows=await second.executeQuery('SELECT count(*) n FROM patients');
    const elapsedMs=performance.now()-start;
    assert.equal(rows[0].n,1);
    assert.equal(queries.length,3); // file WAL pragma, revision read, requested read
    assert(!queries.some(q=>q.method==='batch'||/CREATE|ALTER|DROP/.test(JSON.stringify(q.input))));
    const allowances=await Promise.all(Array.from({length:20},()=>second.dbConsumeRateLimit('fixture-ip','concurrent-review',5,3600)));
    assert.equal(allowances.filter(Boolean).length,5);
    console.log(JSON.stringify({schemaRestartQueries:3,remoteEquivalentQueries:2,localRestartReadMs:elapsedMs,rateLimitAllowed:5,rateLimitRequests:20}));
  }finally{for(const c of clients)c.close();process.env=original;}
});
test('production rejects shipped default hashes and implicit SQLite paths',()=>{
  const original={...process.env};process.env.NODE_ENV='production';
  try {
    const env=loader()('@/lib/env').env;
    process.env.ADMIN_PASSWORD_HASH='$2b$12$mZ3/r/MFfB0bC14buxvXUuk5podIpggQ7sfis2Iyt5MnoZWeUh/Eu';
    assert.throws(()=>env.ADMIN_PASSWORD_HASH,/configured credentials/);
    delete process.env.TURSO_DATABASE_URL;delete process.env.DATABASE_PATH;process.env.ALLOW_SQLITE_FALLBACK='true';
    assert.throws(()=>loader()('@/lib/db').getDb(),/explicit persistent DATABASE_PATH/);
  }finally{process.env=original;}
});

test('contact validates payloads, limits chunked bodies and only succeeds after SMTP acceptance',async()=>{
  const original={...process.env};process.env.NODE_ENV='production';
  try {
    let allowed=true,captcha=true,delivered=false,writes=0;
    const route=loader({'@/lib/db':{dbConsumeRateLimit:async()=>allowed},'@/lib/recaptcha':{verifyRecaptchaToken:async(token,action)=>({valid:captcha&&token==='fixture'&&action==='contact'})},'@/lib/email':{sendContactMessage:async()=>{writes++;return delivered;}}})('@/app/api/contact/route');
    const {NextRequest}=require('next/server');
    const payload={name:'Audit Fixture',email:'fixture@example.test',phone:'+351969990001',subject:'info',message:'This is an isolated test.',recaptchaToken:'fixture'};
    const post=body=>route.POST(new NextRequest('http://localhost/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)}));
    assert.equal((await post('{')).status,400);
    assert.equal((await post([])).status,400);
    assert.equal((await post({...payload,email:'a@example.test\r\nBcc: b@example.test'})).status,422);
    assert.equal((await post({...payload,phone:'abc'})).status,422);
    assert.equal((await post({...payload,message:'x'.repeat(17000)})).status,413);
    captcha=false;assert.equal((await post(payload)).status,403);assert.equal(writes,0);
    captcha=true;assert.equal((await post(payload)).status,503);assert.equal(writes,1);
    delivered=true;assert.equal((await post(payload)).status,200);assert.equal(writes,2);
    allowed=false;assert.equal((await post(payload)).status,429);assert.equal(writes,2);
  }finally{process.env=original;}
});

test('bounded public review lists retain global totals and reject excessive limits',async()=>{
  let reads=0;
  const route=loader({'@/lib/db':{dbGetApprovedReviews:async({limit})=>{reads++;return Array(limit).fill({rating:5});},dbGetApprovedReviewStats:async()=>({total:251,average:4.2})}})('@/app/api/reviews/route');
  const {NextRequest}=require('next/server');
  const response=await route.GET(new NextRequest('http://localhost/api/reviews?limit=12'));
  const body=await response.json();assert.equal(body.reviews.length,12);assert.equal(body.stats.total,251);assert.equal(body.stats.average,4.2);
  for(const limit of ['0','-1','101','NaN','1.5'])assert.equal((await route.GET(new NextRequest('http://localhost/api/reviews?limit='+limit))).status,400);
  assert.equal(reads,1);
});
