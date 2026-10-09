// DOM behavior tests, with fixture HTTP responses. No live browser or database.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {JSDOM}=require('jsdom'),React=require('react'),ts=require('typescript');
const dom=new JSDOM('<!doctype html><body><main id="app"></main></body>',{url:'http://fixture.invalid/',pretendToBeVisual:true});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.getClientRects=function(){return [{width:10,height:10}];};
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
const {createRoot}=require('react-dom/client'),rootPath=path.resolve(__dirname,'..'),cache=new Map();
function load(id,parent=rootPath){
  if(id.endsWith('.css'))return {};
  if(id==='@tabler/icons-react')return new Proxy({}, {get:()=>()=>null});
  if(!id.startsWith('@/')&&!id.startsWith('.'))return require(id);
  const base=id.startsWith('@/')?path.join(rootPath,'src',id.slice(2)):path.resolve(parent,id);
  const file=['.tsx','.ts',''].map(ext=>base+ext).find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());assert(file,id);
  if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(child=>load(child,path.dirname(file)),mod,mod.exports);return mod.exports;
}
const {TreatmentsTab}=load('@/components/admin/TreatmentsTab'),{ServiceCatalogProvider,useServices}=load('@/components/ServiceCatalogProvider');
const service={...require('./fixtures/services.cjs').SERVICES[0],slug:'ui-fixture',name:{fr:'UI fixture',en:'UI fixture'},price:65.5,priceCents:6550,duration:'45 min',durationMinutes:45,status:'PUBLISHED',version:1,updatedAt:'2026-10-08'};
const configuration=()=>({revision:1,treatments:[service],practitioners:[{id:'p1',name:'Fixture Practitioner',profession:'Physiotherapist',active:1,bookable:1,color:'#123456',priority:0}],services:[{practitionerId:'p1',service:service.slug,durationMinutes:null,bufferBefore:0,bufferAfter:0}],hours:[{practitionerId:'p1',dayOfWeek:1,startMinute:540,endMinute:1020}],exceptions:[],resources:[],serviceResources:[]});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function click(text){const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert(button,'button '+text);await React.act(async()=>{button.click();await tick()});return button;}
function field(label){const l=[...document.querySelectorAll('label')].find(l=>l.querySelector('span')?.textContent===label);assert(l,'label '+label);return l.querySelector('input,textarea,select');}
async function change(label,value){const el=field(label),proto=el.tagName==='TEXTAREA'?dom.window.HTMLTextAreaElement.prototype:el.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLInputElement.prototype;await React.act(async()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new dom.window.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));await tick()});}
test('treatment editor preserves drafts, protects close, validates cents and blocks duplicate submits',async()=>{
  let posts=[],release,reply=()=>new Promise(resolve=>{release=resolve});
  global.fetch=async(_url,options)=>{if(options?.method==='POST'){posts.push(JSON.parse(options.body));return reply();}return Response.json(configuration());};
  const root=createRoot(document.getElementById('app'));
  try {
    await React.act(async()=>{root.render(React.createElement(TreatmentsTab,{lang:'en'}));await tick()});
    const opener=await click('New treatment');opener.focus();
    await change('Name','Custom São Care');await change('Summary','Patient-centred care');
    assert.equal(field('Website address identifier').value,'custom-sao-care');
    await click('Cancel');assert(document.body.textContent.includes('Discard unsaved changes?'));await click('Keep editing');assert.equal(field('Name').value,'Custom São Care');
    await change('Price (€)','12.345');await click('Save treatment');assert.equal(posts.length,0);assert(document.querySelector('[role=alert]').textContent.includes('2 decimals'));
    await change('Price (€)','12,35');await React.act(async()=>{document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick()});
    assert.equal(posts.length,1);assert.equal(posts[0].priceCents,1235);assert.equal(posts[0].status,'DRAFT');assert.deepEqual(posts[0].practitionerIds,[]);assert(document.querySelector('fieldset').disabled);
    await React.act(async()=>{release(Response.json({error:'Concurrent update',code:'SCHEDULE_CHANGED'},{status:409}));await tick()});
    assert.equal(field('Name').value,'Custom São Care');assert(document.body.textContent.includes('Reload settings'));assert(!document.querySelector('fieldset').disabled);
    await click('Reload settings');assert.equal(field('Name').value,'');await click('Cancel');assert(!document.querySelector('dialog'));
    await click('Manage treatment');assert(field('Website address identifier').readOnly);
    await change('Price (€)','72.10');reply=async()=>{throw Error('Offline');};await click('Save treatment');assert.equal(field('Price (€)').value,'72.10');assert(document.querySelector('[role=alert]').textContent.includes('Offline'));
    reply=async()=>Response.json({treatment:service});await click('Save treatment');assert(!document.querySelector('dialog'));assert(document.querySelector('[role=status]').textContent.includes('Treatment saved'));
  } finally {await React.act(async()=>root.unmount());}
});
test('public catalogue context refreshes, hides archived treatments and avoids unchanged rerenders',async()=>{
  let services=[service],renders=0,fail=false;
  global.fetch=async()=>fail?Response.json({error:'Unavailable'},{status:503}):Response.json({services});
  function Consumer(){renders++;const list=useServices();return React.createElement('p',null,list.map(t=>t.name.fr).join(', '));}
  const root=createRoot(document.getElementById('app'));
  try{
    await React.act(async()=>{root.render(React.createElement(ServiceCatalogProvider,{initialServices:services},React.createElement(Consumer)));await tick()});const previous=renders;
    await React.act(async()=>{window.dispatchEvent(new Event('focus'));await tick()});assert.equal(renders,previous);
    services=[{...service,name:{fr:'<script>alert(1)</script>'}}];await React.act(async()=>{window.dispatchEvent(new Event('ryma_catalogue_changed'));await tick()});assert(document.body.textContent.includes('<script>alert(1)</script>'));assert.equal(document.querySelector('script'),null);
    fail=true;await React.act(async()=>{window.dispatchEvent(new Event('focus'));await tick()});assert(document.body.textContent.includes('<script>'));
    fail=false;services=[];await React.act(async()=>{window.dispatchEvent(new Event('focus'));await tick()});assert.equal(document.querySelector('#app p').textContent,'');
  }finally{await React.act(async()=>root.unmount());}
});
test('Team online badges require a published treatment, not just an assignment',()=>{
  const {renderToStaticMarkup}=require('react-dom/server'),{TeamRoster}=load('@/components/admin/team/TeamOverview');
  for(const status of ['DRAFT','ARCHIVED','PUBLISHED']){
    const config=configuration();config.treatments=[{...service,status}];
    const html=renderToStaticMarkup(React.createElement(TeamRoster,{config,lang:'en',open(){}}));
    assert.equal(html.includes('Online'),status==='PUBLISHED');
  }
});
test('an empty admin response clears a stale parent catalogue and never invents an internal service',async()=>{
  const {useAllServices,useTeamServices}=load('@/components/ServiceCatalogProvider');
  global.fetch=async()=>Response.json({treatments:[]});
  function Consumer(){return React.createElement('p',null,JSON.stringify({all:useAllServices(),team:useTeamServices(),public:useServices()}));}
  const root=createRoot(document.getElementById('app'));
  try{await React.act(async()=>{root.render(React.createElement(ServiceCatalogProvider,{initialServices:[service]},React.createElement(ServiceCatalogProvider,{admin:true},React.createElement(Consumer))));await tick()});assert.deepEqual(JSON.parse(document.querySelector('#app p').textContent),{all:[],team:[],public:[]});}
  finally{await React.act(async()=>root.unmount());}
});

test('editor submits administrator-selected areas, goals, clinical details and FAQ translations',async()=>{
  let posted;
  global.fetch=async(_url,options)=>{if(options?.method==='POST'){posted=JSON.parse(options.body);return Response.json({error:'Retain editor for assertions'},{status:422});}return Response.json({...configuration(),treatments:[]});};
  const root=createRoot(document.getElementById('app'));
  try{
    await React.act(async()=>{root.render(React.createElement(TreatmentsTab,{lang:'en'}));await tick()});await click('New treatment');
    await change('Name','Admin-authored care');await change('Summary','A custom treatment');
    for(const text of ['Drainage','Back']){const input=[...document.querySelectorAll('label')].find(l=>l.textContent===text)?.querySelector('input');assert(input,text);await React.act(async()=>input.click());}
    await change('Session steps','First step\nSecond step');await change('Indications','Administrator-entered indication');await change('Search terms','custom alias\nsecond alias');
    await click('Add question');await change('Question 1','What happens?');await change('Answer 1','Administrator-entered answer.');await click('Save treatment');
    assert.deepEqual(posted.careGoals,['drainage']);assert.deepEqual(posted.bodyZones,['back']);assert.deepEqual(posted.sessionFlow.en,['First step','Second step']);assert.deepEqual(posted.keywords,['custom alias','second alias']);assert.equal(posted.faq[0].a.en,'Administrator-entered answer.');
  }finally{await React.act(async()=>root.unmount());}
});

test('booking selector shows a first treatment from any category, supports aliases and clears after archive',async()=>{
  const {LanguageContext}=load('@/lib/i18n'),{en}=load('@/data/translations/en'),{TreatmentSelector}=load('@/components/booking/TreatmentSelector');
  let services=[{...service,pole:'bilan',name:{fr:'',en:'First assessment'},keywords:['first-custom-alias']}],booked;
  global.fetch=async()=>Response.json({services});
  const root=createRoot(document.getElementById('app'));
  try{
    await React.act(async()=>{root.render(React.createElement(LanguageContext.Provider,{value:{lang:'en',t:en,setLang(){}}},React.createElement(ServiceCatalogProvider,{initialServices:services},React.createElement(TreatmentSelector,{selectedService:null,onBook:s=>{booked=s}}))));await tick()});
    assert(document.querySelector('article').textContent.includes('First assessment'));
    const search=document.querySelector('input[type=search]');await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(search,'first-custom-alias');search.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await tick()});
    assert.equal(document.querySelectorAll('article').length,1);
    const book=document.querySelector('button[aria-label="Book treatment: First assessment"]');assert(book);await React.act(async()=>book.click());assert.equal(booked.slug,service.slug);
    services=[];await React.act(async()=>{window.dispatchEvent(new Event('ryma_catalogue_changed'));await tick()});assert.equal(document.querySelectorAll('article').length,0);assert.equal(document.querySelectorAll('button[aria-label^="Book treatment:"]').length,0);
  }finally{await React.act(async()=>root.unmount());}
});

test('assessment promotion is displayed only when the public catalogue contains an assessment',()=>{
  const {renderToStaticMarkup}=require('react-dom/server'),{LanguageContext}=load('@/lib/i18n'),{en}=load('@/data/translations/en'),{TreatmentSelector}=load('@/components/booking/TreatmentSelector');
  for(const services of [[],[service],[{...service,pole:'bilan'}]]){
    const html=renderToStaticMarkup(React.createElement(LanguageContext.Provider,{value:{lang:'en',t:en,setLang(){}}},React.createElement(ServiceCatalogProvider,{initialServices:services},React.createElement(TreatmentSelector,{selectedService:null,onBook(){}}))));
    assert.equal(html.includes('Discover your assessment'),services.some(s=>s.pole==='bilan'));
  }
});

test('custom assessments retain their category on service cards and booking confirmations in every language',()=>{
  const {renderToStaticMarkup}=require('react-dom/server'),{LanguageContext}=load('@/lib/i18n'),{ServiceCard}=load('@/components/ui/ServiceCard'),{AppointmentConfirmation}=load('@/components/booking/AppointmentConfirmation');
  for(const [lang,label] of [['pt','Avaliação'],['en','Assessment'],['fr','Bilan']]){
    const t=load('@/data/translations/'+lang)[lang],assessment={...service,pole:'bilan'};
    for(const component of [React.createElement(ServiceCard,{service:assessment}),React.createElement(AppointmentConfirmation,{service:assessment,date:'2099-01-05',time:'09:00',patient:{name:'Synthetic QA',phone:'+351969000001',email:'',coverageType:'PARTICULAR',coverageProvider:''}})]){
      const html=renderToStaticMarkup(React.createElement(LanguageContext.Provider,{value:{lang,t,setLang(){}}},component));assert(html.includes(label),lang);
    }
  }
});

test('Spanish preference persists across provider mounts and is included in language cycling',async()=>{
  const {LanguageProvider,useLanguage}=load('@/lib/i18n');
  global.localStorage=dom.window.localStorage;
  localStorage.clear();let context;
  function Probe(){context=useLanguage();return React.createElement('p',null,context.t.common.back);}
  let root=createRoot(document.getElementById('app'));
  try {
    await React.act(async()=>root.render(React.createElement(LanguageProvider,{initialLang:'fr'},React.createElement(Probe))));
    await React.act(async()=>context.toggleLang());
    assert.equal(context.lang,'es');assert.equal(document.querySelector('#app p').textContent,'Volver');
    assert.equal(document.documentElement.lang,'es');assert.equal(localStorage.getItem('ryma_lang'),'es');assert.match(document.cookie,/ryma_lang=es/);
    await React.act(async()=>root.unmount());root=createRoot(document.getElementById('app'));
    await React.act(async()=>root.render(React.createElement(LanguageProvider,{initialLang:'pt'},React.createElement(Probe))));
    assert.equal(context.lang,'es');
    await React.act(async()=>context.toggleLang());assert.equal(context.lang,'pt');
  }finally{await React.act(async()=>root.unmount());localStorage.clear();delete global.localStorage;}
});

test('Spanish admin treatment editor submits Spanish names, steps and FAQ without dropping other locales',async()=>{
  let posted;
  global.fetch=async(_url,options)=>{if(options?.method==='POST'){posted=JSON.parse(options.body);return Response.json({error:'Retener formulario de prueba'},{status:422});}return Response.json({...configuration(),treatments:[]});};
  const root=createRoot(document.getElementById('app'));
  try {
    await React.act(async()=>{root.render(React.createElement(TreatmentsTab,{lang:'es'}));await tick()});
    await click('Nuevo tratamiento');
    await change('Nombre','Masaje de prueba');await change('Resumen','Atención individual');
    await change('Pasos de la sesión','Evaluación\nTratamiento');
    await click('Añadir pregunta');await change('Pregunta 1','¿Cómo reservar?');await change('Respuesta 1','Seleccione una fecha.');
    await click('EN');await change('Nombre','Test massage');await click('ES');
    await click('Guardar tratamiento');
    assert.equal(posted.name.es,'Masaje de prueba');assert.equal(posted.shortDesc.es,'Atención individual');
    assert.deepEqual(posted.sessionFlow.es,['Evaluación','Tratamiento']);assert.equal(posted.faq[0].a.es,'Seleccione una fecha.');
    assert.equal(posted.name.en,'Test massage');assert.equal(posted.name.fr,'');
  }finally{await React.act(async()=>root.unmount());}
});

test.after(()=>dom.window.close());
