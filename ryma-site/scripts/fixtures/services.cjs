// Synthetic regression fixtures only. Never imported by application code or migrations.
const records=[
  ['reeducation-posturale',65,50,'kinesitherapie'],['reeducation-post-partum',60,45,'kinesitherapie'],
  ['massage-therapeutique',55,45,'kinesitherapie'],['drainage-lymphatique',65,50,'kinesitherapie'],
  ['electrotherapie',40,30,'kinesitherapie'],['ultrasons',35,20,'kinesitherapie'],
  ['cavitation',80,45,'minceur'],['radiofrequence',90,60,'minceur'],['laser-lipo',70,30,'minceur'],
  ['pressotherapie',50,45,'minceur'],['cryolipolyse',120,60,'minceur'],['massage-amincissant',65,45,'minceur'],['bilan-minceur',50,60,'bilan'],
];
const SERVICES=records.map(([slug,price,minutes,pole])=>({slug,price,duration:`${minutes} min`,pole,
  name:slug==='massage-therapeutique'?{pt:'Massagem terapêutica',fr:'Massage thérapeutique',en:'Therapeutic massage',es:'Masaje terapéutico'}:{fr:'Fixture '+slug,pt:'Fixture '+slug,en:'Fixture '+slug,es:'Tratamiento de prueba '+slug},
  shortDesc:{fr:'Synthetic test care'},longDesc:{fr:''},icon:'hands',bodyMapPoint:{x:50,y:50,view:'both'},
  sessionFlow:{fr:[]},indications:{fr:[]},contraindications:{fr:[]},faq:[],hasBeforeAfter:false,keywords:[],careGoals:[],bodyZones:[],
}));
async function seedTestServices(db){
  if(process.env.NODE_ENV!=='test')throw Error('Synthetic catalogue requires NODE_ENV=test');
  for(const s of SERVICES){
    await db.executeQuery("INSERT INTO treatment_catalog(slug,content,status,durationMinutes,priceCents,version,updatedAt) VALUES(?,?,'PUBLISHED',?,?,1,?)",[s.slug,JSON.stringify(s),parseInt(s.duration,10),Math.round(s.price*100),'2026-10-08T00:00:00.000Z']);
    await db.executeQuery("INSERT INTO practitioner_services(practitionerId,service) VALUES('legacy',?)",[s.slug]);
  }
}
module.exports={SERVICES,seedTestServices};
