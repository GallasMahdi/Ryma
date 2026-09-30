const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname,'../..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root,'src',request.slice(2));
  return resolve.call(this,request,parent,...rest);
};
Module._extensions['.ts'] = (module,filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);
const {getLisbonDateTime} = require(path.join(root,'src/lib/validation.ts'));
function original(date) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(date);
  const get = key => parts.find(p=>p.type===key)?.value || '';
  return {todayStr: `${get('year')}-${get('month')}-${get('day')}`,currentHHMM: `${get('hour')}:${get('minute')}`};
}
// Midnight, both DST transitions, year boundaries, and a deterministic spread.
const dates = ['2026-03-29T00:59:00Z','2026-03-29T01:00:00Z','2026-10-25T00:59:00Z','2026-10-25T01:00:00Z','2026-06-01T23:30:00Z','2026-12-31T23:59:00Z'];
for(let i=0;i<1000;i++)dates.push(new Date(Date.UTC(2020,0,1)+i*96739123).toISOString());
for(const value of dates) {
  const actual=getLisbonDateTime(new Date(value)), expected=original(new Date(value));
  for(const key of Object.keys(expected)) assert.equal(actual[key],expected[key],value+' '+key);
}
console.log('Lisbon formatter: '+dates.length+' equivalence checks passed, including DST and midnight.');
