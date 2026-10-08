const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'docs/audit/dynamic-services'),before=path.resolve(root,'../tmp/dynamic-services-20261008/before');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(before,{recursive:true});
for(const name of ['src','scripts','package.json']) if(!fs.existsSync(path.join(before,name))) fs.cpSync(path.join(root,name),path.join(before,name),{recursive:true});
function hashes(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?hashes(path.join(dir,e.name)):[{file:path.relative(root,path.join(dir,e.name)),sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,e.name))).digest('hex')}]);}
if(!fs.existsSync(path.join(out,'data-before.json')))fs.writeFileSync(path.join(out,'data-before.json'),JSON.stringify(hashes(path.join(root,'data')),null,2));
console.log('Source snapshot and real-data fingerprints preserved without loading application data.');
for(const name of ['treatments.log','treatments-libsql.log','treatments-ui.log'])if(fs.existsSync(path.join(root,'docs/audit/treatments',name)))fs.copyFileSync(path.join(root,'docs/audit/treatments',name),path.join(out,'baseline-'+name));
