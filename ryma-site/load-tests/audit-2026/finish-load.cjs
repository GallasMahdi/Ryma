const C=require('./common.cjs'),{spawn}=require('node:child_process');
async function run(file,args=[]){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[C.path.join(__dirname,file),...args],{cwd:C.root,windowsHide:true,stdio:['ignore','pipe','pipe']});const log=C.fs.createWriteStream(C.path.join(C.out,file.replace('.cjs','')+'-followup.log'));child.stdout.on('data',d=>{log.write(d);process.stdout.write(d)});child.stderr.on('data',d=>{log.write(d);process.stderr.write(d)});child.on('error',reject);child.on('exit',code=>{log.end();code?reject(Error(file+' exited '+code)):resolve()});});}
async function main(){
  const until=Date.now()+75*60*1000;
  while(!C.fs.existsSync(C.path.join(C.out,'repeat-process-result.json'))){if(Date.now()>until)throw Error('Repeat wait timed out');await C.sleep(5000);}
  const result=JSON.parse(C.fs.readFileSync(C.path.join(C.out,'repeat-process-result.json')));
  if(result.code!==0)throw Error('Baseline repeat failed; follow-up cancelled');
  await C.sleep(3000);
  await run('load.cjs',['--bounded-arrival']);
  await run('auth.cjs');
  C.write('finish-load-outcome.json',{finishedAt:new Date().toISOString(),completed:true});
}
main().catch(e=>{C.write('finish-load-fatal.json',{error:e.stack});console.error(e);process.exitCode=1});
