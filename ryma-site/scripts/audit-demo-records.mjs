// SELECT-only audit of synthetic provenance. No rows or credentials are printed.
import nextEnv from '@next/env';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
nextEnv.loadEnvConfig(process.cwd(),false);
const client=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
const result={checkedAt:new Date().toISOString(),scope:'configured database; Vercel environment equivalence is unverified',tables:[],dependencies:[]};
try {
  const tables=(await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).rows.map(r=>String(r.name));
  if(tables.includes('ryma_demo_imports'))result.imports=(await client.execute('SELECT id,report FROM ryma_demo_imports')).rows.map(r=>{const j=JSON.parse(r.report);return {id:r.id,importedAt:j.importedAt,totals:j.totals};});
  for(const table of tables){
    if(!/^[a-z_]+$/.test(table))continue;
    const columns=(await client.execute(`PRAGMA table_info(${table})`)).rows.map(r=>r.name);
    if(columns.includes('id')){
      const row=(await client.execute(`SELECT COUNT(*) total,SUM(CASE WHEN id GLOB 'demo_*' OR id GLOB 'apt_demo_*' THEN 1 ELSE 0 END) syntheticIds FROM ${table}`)).rows[0];
      result.tables.push({table,total:Number(row.total),syntheticIds:Number(row.syntheticIds||0)});
    }
  }
  for(const table of ['appointments','invoices','patient_sessions','prescriptions']){
    if(!tables.includes(table))continue;
    const row=(await client.execute(`SELECT COUNT(*) n FROM ${table} WHERE id NOT GLOB 'demo_*' AND patientId IN (SELECT id FROM patients WHERE id GLOB 'demo_*')`)).rows[0];
    result.dependencies.push({table,nonDemoRecordsReferencingDemoPatients:Number(row.n)});
  }
  fs.writeFileSync('docs/production-audit-2026-10-09/demo-data-inventory.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}finally{client.close();}
