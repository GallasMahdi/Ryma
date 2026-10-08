// In-memory DOM behavior tests; visual layout still requires a real browser.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {JSDOM}=require('jsdom'),React=require('react'),{createRoot}=require('react-dom/client'),ts=require('typescript');
test('QA-14 modal traps keyboard focus, protects drafts and restores the trigger',async()=>{
  const dom=new JSDOM('<!doctype html><body><button id="trigger">Open</button><main id="app"></main></body>',{url:'http://fixture.invalid/'});
  global.window=dom.window;global.document=dom.window.document;global.HTMLElement=dom.window.HTMLElement;global.IS_REACT_ACT_ENVIRONMENT=true;
  // jsdom has no layout engine. All elements in this small fixture have a box.
  dom.window.HTMLElement.prototype.getClientRects=function(){return [{width:10,height:10}];};
  const motionDiv=React.forwardRef(({children,initial,animate,exit,transition,...props},ref)=>React.createElement('div',{...props,ref},children));
  const requireFixture=name=>name==='framer-motion'?{motion:{div:motionDiv},AnimatePresence:({children})=>children}:name==='@tabler/icons-react'?{IconX:()=>null}:require(name);
  const source=fs.readFileSync(path.join(__dirname,'../src/components/admin/ResponsiveModal.tsx'),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const mod={exports:{}};vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(requireFixture,mod,mod.exports);
  const root=createRoot(document.querySelector('#app'));let open=true,closed=0;
  const render=()=>root.render(React.createElement(mod.exports.ResponsiveModal,{isOpen:open,title:'Clinical record',lang:'en',onClose(){closed++;open=false;render();}},React.createElement('form',null,React.createElement('label',null,'Notes',React.createElement('input',{name:'notes'})),React.createElement('button',{type:'button','data-modal-dismiss':true},'Cancel'),React.createElement('button',{type:'submit'},'Save'))));
  const trigger=document.querySelector('#trigger');trigger.focus();
  try{
    await React.act(async()=>render());
    const dialog=document.querySelector('[role=dialog]');assert(dialog);assert.equal(dialog.getAttribute('aria-modal'),'true');assert.equal(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent,'Clinical record');assert(dialog.contains(document.activeElement));assert.equal(trigger.inert,true);
    const buttons=[...dialog.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
    await React.act(async()=>{last.focus();last.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));});assert.equal(document.activeElement,first);
    await React.act(async()=>{first.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));});assert.equal(document.activeElement,last);
    const input=dialog.querySelector('input');await React.act(async()=>{input.value='Unsaved clinical note';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));input.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));});
    assert.equal(closed,0);const confirm=document.querySelector('[role=alertdialog]');assert(confirm);assert(confirm.contains(document.activeElement));
    await React.act(async()=>confirm.querySelector('button').click());assert.equal(document.querySelector('[role=alertdialog]'),null);assert.equal(input.value,'Unsaved clinical note');assert(dialog.contains(document.activeElement));
    await React.act(async()=>dialog.querySelector('[data-modal-dismiss]').click());assert(document.querySelector('[role=alertdialog]'));assert.equal(closed,0);
    await React.act(async()=>[...document.querySelectorAll('[role=alertdialog] button')].at(-1).click());
    assert.equal(closed,1);assert.equal(document.querySelector('[role=dialog]'),null);assert.equal(document.activeElement,trigger);assert(!trigger.inert);
  }finally{await React.act(async()=>root.unmount());dom.window.close();delete global.window;delete global.document;delete global.HTMLElement;delete global.IS_REACT_ACT_ENVIRONMENT;}
});
