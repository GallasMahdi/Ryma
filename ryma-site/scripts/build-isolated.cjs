// Builds without loading real database or messaging credentials.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {demoEnvironment,ROOT}=require('./demo/runtime.cjs');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ryma-build-audit-'));
const env=demoEnvironment(path.join(directory,'fixture.db'),'production');
const result=spawnSync(process.execPath,[require.resolve('next/dist/bin/next'),'build'],{cwd:ROOT,env,stdio:'inherit',windowsHide:true});
process.exitCode=result.status??1;
// The synthetic build directory is deliberately retained for failure diagnostics.
