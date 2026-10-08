const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), React = require('react');
function compile(file, resolver = require) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
  }).outputText;
  const mod = {exports:{}};
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(resolver, mod, mod.exports);
  return mod.exports;
}
const {createAdminReadClient} = compile('lib/admin-read.ts');

test('concurrent identical reads share one request and distinct queries stay isolated', async () => {
  let calls = 0, release;
  const client = createAdminReadClient(async (_url, options) => {
    calls++; assert.equal(options.cache,'no-store'); assert.equal(options.credentials,'same-origin');
    assert(options.signal instanceof AbortSignal);
    await new Promise(resolve => {release = resolve;}); return Response.json({calls});
  });
  const a = client.read('/same'), b = client.read('/same');
  assert.equal(calls,1); release(); assert.deepEqual(await a,await b);
  const c = client.read('/other'); assert.equal(calls,2); release(); await c;
});

test('reference cache expires and invalidation makes it fresh immediately', async () => {
  let now = 0, calls = 0;
  const client = createAdminReadClient(async () => Response.json({revision:++calls}), () => now);
  assert.equal((await client.read('/team',100)).revision,1);
  now = 99; assert.equal((await client.read('/team',100)).revision,1);
  now = 100; assert.equal((await client.read('/team',100)).revision,2);
  client.invalidate(); assert.equal((await client.read('/team',100)).revision,3);
});

test('failed reads are not cached and retry performs a fresh request', async () => {
  let calls = 0;
  const client = createAdminReadClient(async () => ++calls===1 ? Response.json({error:'Unavailable'},{status:503}) : Response.json({ok:true}));
  await assert.rejects(client.read('/retry',100),/Unavailable/);
  assert.deepEqual(await client.read('/retry',100),{ok:true}); assert.equal(calls,2);
});

test('a pre-mutation response cannot overwrite a newly invalidated cache', async () => {
  let release, calls = 0;
  const client = createAdminReadClient(async () => {
    const revision = ++calls;
    if (revision===1) await new Promise(resolve => {release=resolve;});
    return Response.json({revision});
  });
  const old = client.read('/team',100);
  client.invalidate(); assert.equal((await client.read('/team',100)).revision,2);
  release(); await old;
  assert.equal((await client.read('/team',100)).revision,2); assert.equal(calls,2);
});

test('appointment and financial reads are never retained without an explicit cache lifetime', async () => {
  let calls = 0;
  const client = createAdminReadClient(async () => Response.json({revision:++calls}));
  assert.equal((await client.read('/appointments')).revision,1);
  assert.equal((await client.read('/appointments')).revision,2);
});

test('reference cache is bounded when navigating many dates', async () => {
  let calls = 0;
  const client = createAdminReadClient(async () => Response.json({revision:++calls}));
  for(let i=0;i<65;i++) await client.read('/date/'+i,10000);
  await client.read('/date/0',10000); assert.equal(calls,66);
});

test('agenda refreshes do not reload configuration or hide the current day; schedule events still refresh', async () => {
  const {JSDOM} = require('jsdom');
  const dom = new JSDOM('<main id="app"></main>');
  Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
  const {createRoot} = require('react-dom/client');
  const calls=[];
  const config={practitioners:[],services:[],hours:[],exceptions:[],resources:[],serviceResources:[]};
  const {TeamDayAgenda} = compile('components/admin/TeamDayAgenda.tsx', id => {
    if(id==='@/components/ServiceCatalogProvider')return {useServiceLabels:()=>({getServiceName:()=>''})};
    if(id==='@/lib/admin-read')return {readAdminJson:async url=>{calls.push(url);return url.includes('/slots')?{blocks:[]}:config;}};
    if(id==='@/types/scheduling')return {formatMinute:String};
    if(id==='@/lib/schedule-math')return {practitionerIntervals:()=>[]};
    if(id==='@/lib/booking-schedule')return {clockMinutes:()=>0};
    if(id==='@/types/admin')return {STATUS_CONFIG:{}};
    return require(id);
  });
  const root=createRoot(document.getElementById('app'));
  const render=date=>root.render(React.createElement(TeamDayAgenda,{date,appointments:[],lang:'en',onSelect(){}}));
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  try {
    await React.act(async()=>{render('2026-10-15');await tick();}); assert.equal(calls.length,2);
    await React.act(async()=>{render('2026-10-15');await tick();}); assert.equal(calls.length,2);
    assert.equal(document.querySelector('[role=status]'),null);
    await React.act(async()=>{render('2026-10-16');await tick();}); assert.equal(calls.length,3);
    assert.equal(calls.filter(url=>url.includes('practitioners')).length,1);
    await React.act(async()=>{window.dispatchEvent(new dom.window.Event('ryma_schedule_changed'));await tick();});
    assert.equal(calls.length,5); assert.equal(document.querySelector('[role=status]'),null);
  } finally {await React.act(async()=>root.unmount());dom.window.close();delete global.window;delete global.document;delete global.IS_REACT_ACT_ENVIRONMENT;}
});
