// Real HTTP workflow and concurrency checks against an isolated, seeded fixture.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');
const {demoEnvironment, createAppLoader, ROOT} = require('./demo/runtime.cjs');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ryma-http-audit-'));
const fixture=path.join(directory,'fixture.db');
const env={...demoEnvironment(fixture,'test'),RYMA_PREVIEW_DB:fixture,RYMA_PREVIEW_PORT:'3008'};
Object.assign(process.env,env);
let server;
(async()=>{
  // Refuse an occupied port rather than accidentally exercising another server.
  await new Promise((resolve,reject)=>{
    const probe=net.createServer();
    probe.once('error',reject);
    probe.listen(3008,'127.0.0.1',()=>probe.close(resolve));
  });
  const db=createAppLoader()('@/lib/db');
  await require('./fixtures/services.cjs').seedTestServices(db);
  db.getDb().close();
  const bcrypt=require('bcryptjs');
  const log=fs.openSync(path.join(directory,'server.log'),'w');
  server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3008'],{cwd:ROOT,env:{...env,NODE_ENV:'production',ADMIN_PASSWORD_HASH:bcrypt.hashSync('team-preview-only',4),OWNER_ANALYTICS_PASSWORD_HASH:bcrypt.hashSync('owner-preview-only',4)},stdio:['ignore',log,log],windowsHide:true});
  fs.closeSync(log);
  let ready=false;
  for(let attempt=0;attempt<40;attempt++) {
    if(server.exitCode!==null)throw Error('Isolated HTTP server exited');
    try {const health=await fetch('http://127.0.0.1:3008/api/health');ready=health.ok;await health.arrayBuffer();}catch{}
    if(ready)break;
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert(ready,'Isolated HTTP server did not start');
  for(const script of ['test-running-preview.cjs','test-running-adversarial.cjs']) {
    const result=spawnSync(process.execPath,[path.join(__dirname,script)],{cwd:ROOT,env,stdio:'inherit',windowsHide:true,timeout:120000});
    assert.equal(result.status,0,`${script} failed`);
  }
  console.log('Both live HTTP suites passed on an isolated fixture.');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  if(server && server.exitCode===null) {server.kill();await new Promise(resolve=>server.once('exit',resolve));}
  assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));
  assert(path.basename(directory).startsWith('ryma-http-audit-'));
  // Preserve failed-run diagnostics; remove only this verified test-created directory.
  if(!process.exitCode)fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});
