const C=require('./common.cjs');const d=C.db();d.pragma('foreign_keys=ON');
const tables=['patient_sessions','invoices','appointments','patients'];const manifest={};
for(const t of tables){manifest[t]=d.prepare(`SELECT id FROM ${t}`).all().map(r=>r.id);}
if(d.prepare('SELECT COUNT(*) n FROM patients WHERE patientName NOT LIKE ?').get('AUDIT%').n)throw Error('Non-audit patient encountered');
manifest.patientNotePhones=d.prepare('SELECT phone FROM patient_notes WHERE patientName LIKE ?').all('AUDIT%').map(r=>r.phone);
C.write('growth-reset-manifest-'+Date.now()+'.json',manifest);
d.transaction(()=>{for(const t of tables){const stmt=d.prepare(`DELETE FROM ${t} WHERE id=?`);for(const id of manifest[t])stmt.run(id);}const notes=d.prepare('DELETE FROM patient_notes WHERE phone=? AND patientName LIKE ?');for(const phone of manifest.patientNotePhones)notes.run(phone,'AUDIT%');})();d.close();console.log('Removed only manifested synthetic growth records.');
