const fs=require('node:fs');
const Database=require('better-sqlite3');
const prepare=Database.prototype.prepare;
Database.prototype.prepare=function(sql){const s=prepare.call(this,sql);for(const method of ['all','get','run']){const original=s[method];s[method]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{fs.appendFileSync(process.env.AUDIT_SQL_PROFILE,JSON.stringify({time:Date.now(),sql,method,ms:performance.now()-t})+'\n');}}}return s;};
