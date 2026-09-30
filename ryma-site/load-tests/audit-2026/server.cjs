const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const c=JSON.parse(fs.readFileSync(path.join(__dirname,'latest.json')));
const {env}=JSON.parse(fs.readFileSync(path.join(c.out,'private-config.json')));
const mode=process.argv[2]||'start';
if(mode==='stop'){
 const record=JSON.parse(fs.readFileSync(path.join(c.out,'start-process.json')));
 if(!Number.isInteger(record.pid)||!Number.isInteger(record.parentPid))throw Error('Invalid server process record');
 const command=`$ErrorActionPreference = 'Stop'; $auditProcess = Get-CimInstance Win32_Process -Filter 'ProcessId = ${record.pid}'; if ($auditProcess) { if ($auditProcess.Name -ne 'node.exe' -or $auditProcess.ParentProcessId -ne ${record.parentPid} -or $auditProcess.CommandLine -notmatch 'next.*start.*3217') { throw 'Server identity mismatch' }; $auditTermination = Invoke-CimMethod -InputObject $auditProcess -MethodName Terminate -Arguments @{Reason=0}; if ($auditTermination.ReturnValue -ne 0) { throw 'Server termination failed' } }; $shutdownDeadline = [DateTime]::UtcNow.AddSeconds(5); do { $remainingProcess = Get-CimInstance Win32_Process -Filter 'ProcessId = ${record.pid}'; if (-not $remainingProcess) { break }; Start-Sleep -Milliseconds 100 } while ([DateTime]::UtcNow -lt $shutdownDeadline); if ($remainingProcess) { throw 'Server still running' }`;
 const result=require('node:child_process').spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true});
 if(result.status!==0)throw Error(result.stderr||'Could not verify server shutdown');
 fs.writeFileSync(path.join(c.out,'server-stop-verification.json'),JSON.stringify({stopped:true,verified:true,pid:record.pid,time:new Date().toISOString()}));
 console.log('Verified isolated server stopped: '+record.pid);
 process.exit(0);
}
if(mode==='start'){
env.NODE_OPTIONS=`--require="${path.join(__dirname,'monitor.cjs').replace(/\\/g,'/')}"`;env.AUDIT_METRICS=path.join(c.out,'server-resources.jsonl');}
const t=performance.now();
const args=[path.join(c.root,'node_modules/next/dist/bin/next'),mode];
if(mode==='start')args.push('-p','3217','-H','127.0.0.1');
const child=spawn(process.execPath,args,{cwd:path.join(c.out,'sandbox'),env,windowsHide:true,stdio:['ignore','pipe','pipe']});
const log=fs.createWriteStream(path.join(c.out,mode+'.log'),{flags:'a'});
child.stdout.on('data',d=>{log.write(d);process.stdout.write(d)});
child.stderr.on('data',d=>{log.write(d);process.stderr.write(d)});
fs.writeFileSync(path.join(c.out,mode+'-process.json'),JSON.stringify({pid:child.pid,parentPid:process.pid,startedAt:new Date().toISOString()}));
child.on('exit',code=>{fs.writeFileSync(path.join(c.out,mode+'-result.json'),JSON.stringify({code,durationMs:performance.now()-t}));process.exitCode=code||0;log.end();});
process.on('SIGINT',()=>child.kill());
