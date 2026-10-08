// SQLITE_BUSY/LOCKED means the operation could not acquire its database lock.
// Never retry ambiguous network failures for a write that might have committed.
export const isDatabaseBusy = (error: unknown) => /\bSQLITE_(?:BUSY|LOCKED)(?:\b|_)/.test(String(error));
export async function retryDatabaseBusy<T>(operation:()=>Promise<T>):Promise<T> {
  for(let attempt=0;;attempt++) {
    try{return await operation();}
    catch(error){if(!isDatabaseBusy(error)||attempt>=7)throw error;await new Promise(resolve=>setTimeout(resolve,Math.min(400,20*2**attempt)+Math.random()*20));}
  }
}
