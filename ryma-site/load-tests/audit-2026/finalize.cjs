const C=require('./common.cjs'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const read=name=>JSON.parse(C.fs.readFileSync(C.path.join(C.out,name),'utf8'));
const cleanup=read('cleanup-verification.json'),load=read('load-outcome.json'),verdict=read('audit-verdict.json');
if(!cleanup.passed)throw Error('Cleanup, integrity or source verification failed');
if(read('booking-lifecycle.json').checks.length!==2)throw Error('Booking lifecycle regression incomplete');
if(!verdict.functional)throw Error('Functional regression gates did not pass');
const fatal=C.fs.readdirSync(C.out).filter(name=>name.endsWith('-fatal.json'));
if(fatal.length)throw Error('Unresolved fatal artifacts: '+fatal.join(', '));
const browser=read('browser-summary.json');
if(browser.length!==66||!read('browser-quality.json').passed)throw Error('Browser matrix incomplete or contains unexplained errors');
const api=read('api-summary.json');
if(api.length!==51||api.some(row=>row.unexpected||row.successes!==row.n))throw Error('API matrix incomplete or has failed validation');
if(read('extended-regression.json').checks.length!==6||read('extended-regression.json').errors.length)throw Error('Extended regressions incomplete');
if(read('supplemental-journeys.json').failures.length)throw Error('Journey failures remain');
const quality=read('load-quality.json');
if(!quality.phases.some(p=>p.phase.startsWith('soak-')&&p.valid&&p.completedPlannedHold&&p.correctDatabaseResponses))throw Error('No valid completed soak');
const dest=C.path.join(C.out,'scripts');C.fs.mkdirSync(dest,{recursive:true});
for(const name of C.fs.readdirSync(__dirname))if(/\.(cjs|md)$/.test(name)&&!['report.cjs','finish-load.cjs','repeat-after-load.cjs','reproduction.md'].includes(name))C.fs.copyFileSync(C.path.join(__dirname,name),C.path.join(dest,name));
C.fs.copyFileSync(C.path.join(__dirname,'README.md'),C.path.join(C.out,'reproduction.md'));
const status=spawnSync('git',['status','--porcelain=v1'],{cwd:C.root,encoding:'utf8'}).stdout;
const stopped=read('server-stop-verification.json');
if(!stopped.stopped)throw Error('Server shutdown has not been verified');
C.write('audit-completion.json',{completedAt:new Date().toISOString(),runId:C.runId,cleanupPassed:true,functionalRegressionPassed:true,performanceVerdict:verdict,gitStatus:status,sourceUnchangedSinceTestBuild:cleanup.applicationSourceChanges.length===0,applicationChangedFromBaseline:true,productionDatabaseAccess:false,applicationDeployed:false,serverStopped:true,loadOutcome:load,limitations:['Local SQLite and same-host generator; remote Turso/CDN untested','Lab timings, not field INP','See report for explicit latency misses and stress limits']});
const entries=[];
function walk(dir,prefix=''){
 for(const item of C.fs.readdirSync(dir,{withFileTypes:true})){
  if(['sandbox','private-config.json','evidence-manifest.json'].includes(item.name)||item.name.startsWith('isolated.sqlite'))continue;
  const full=C.path.join(dir,item.name),relative=C.path.join(prefix,item.name).replace(/\\/g,'/');
  if(item.isDirectory())walk(full,relative);else if(item.isFile()){const data=C.fs.readFileSync(full);entries.push({file:relative,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}
 }
}
walk(C.out);C.write('evidence-manifest.json',{runId:C.runId,createdAt:new Date().toISOString(),excluded:['sandbox/','private-config.json','isolated.sqlite*','evidence-manifest.json (self)'],files:entries,totalBytes:entries.reduce((sum,row)=>sum+row.bytes,0)});
console.log(JSON.stringify({runId:C.runId,files:entries.length,bytes:entries.reduce((sum,row)=>sum+row.bytes,0),functional:verdict.functional,performance:verdict}));
