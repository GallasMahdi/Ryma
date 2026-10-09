// Test-process-only network stub. Never loaded by the application or shipped.
const assert=require('node:assert/strict'),os=require('node:os'),path=require('node:path');
assert(process.env.RYMA_PREVIEW_DB?.startsWith(path.resolve(os.tmpdir())+path.sep));
assert.equal(process.env.RECAPTCHA_SECRET_KEY,'isolated-http-secret');
assert(!process.env.TURSO_DATABASE_URL);
const original=globalThis.fetch;
globalThis.fetch=async(input,options)=>{
  if(String(input)==='https://www.google.com/recaptcha/api/siteverify'){
    const params=new URLSearchParams(options?.body);
    return Response.json({success:params.get('secret')==='isolated-http-secret'&&params.get('response')==='isolated-http-token',score:0.9,action:'booking'});
  }
  return original(input,options);
};
