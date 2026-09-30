const C=require('./common.cjs');
if(C.fs.existsSync(C.path.join(C.out,'pause-before-load.json')))throw Error('Load paused for a booking lifecycle regression check; see pause-before-load.json');
require('./reset-growth.cjs');
const counts=C.seed(1000);
if(counts.patients!==1000||counts.appointments!==1000||counts.invoices!==1000||counts.patient_sessions!==3000)throw Error('Load fixture mismatch');
C.write('load-dataset.json',{counts,preparedAt:new Date().toISOString()});
console.log('Exact 1000-patient load fixture prepared.');
