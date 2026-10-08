import { randomUUID } from 'node:crypto';
import { executeQuery } from '@/lib/db';
import { commitScheduling, loadScheduleState, SchedulingError } from '@/lib/scheduling';
import type { Service, LocalizedString, LocalizedList, CareGoal, TreatmentBodyZone } from '@/data/services';
import type { Treatment, TreatmentStatus } from '@/types/treatments';
import { practitionerIntervals } from '@/lib/schedule-math';

export interface TreatmentRow { slug:string;content:string;status:TreatmentStatus;durationMinutes:number;priceCents:number;version:number;updatedAt:string }
export function treatmentFromRow(row: TreatmentRow): Treatment {
  return {...JSON.parse(row.content),slug:row.slug,status:row.status,durationMinutes:row.durationMinutes,priceCents:row.priceCents,price:row.priceCents/100,duration:`${row.durationMinutes} min`,version:row.version,updatedAt:row.updatedAt};
}
export async function getTreatments(publicOnly = false): Promise<Treatment[]> {
  const rows = await executeQuery<TreatmentRow>(`SELECT * FROM treatment_catalog${publicOnly ? " WHERE status='PUBLISHED'" : ''} ORDER BY rowid`);
  return rows.map(treatmentFromRow);
}
export function publicTreatment(t: Treatment): Service {
  const {status,version,updatedAt,priceCents,durationMinutes,...service} = t;
  return service;
}
export async function getPublicServices(): Promise<Service[]> { return (await getTreatments(true)).map(publicTreatment); }
export async function isKnownTreatment(slug: unknown, publicOnly = false): Promise<boolean> {
  if(typeof slug!=='string')return false;
  return (await executeQuery<{slug:string}>(`SELECT slug FROM treatment_catalog WHERE slug=?${publicOnly?" AND status='PUBLISHED'":''}`,[slug])).length>0;
}
const fail = (message: string): never => { throw new SchedulingError('INVALID_INPUT',message); };
function localized(value: unknown, label: string, max: number, required = true): LocalizedString {
  if (!value || typeof value!=='object' || Array.isArray(value)) return fail(`${label}: invalid translations.`);
  const source=value as Record<string,unknown>;
  const result: Record<string,string>={};
  for (const lang of ['pt','fr','en','ar']) {
    if (source[lang]===undefined) continue;
    if(typeof source[lang]!=='string' || (source[lang] as string).length>max) return fail(`${label}: maximum ${max} characters.`);
    result[lang]=(source[lang] as string).trim();
  }
  if(required && !result.pt && !result.fr && !result.en) return fail(`${label} is required in at least one language.`);
  return {...result,fr:result.fr || ''};
}
function stringList(value: unknown, label: string, count = 30, length = 500): string[] {
  if (!Array.isArray(value) || value.length > count || value.some(v => typeof v !== 'string' || v.length > length)) return fail(`${label}: invalid list.`);
  return [...new Set(value.map(v => v.trim()).filter(Boolean))];
}
function translatedList(value: unknown, label: string): LocalizedList {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(`${label}: invalid translations.`);
  const source=value as Record<string,unknown>, result: Record<string,string[]>={fr:[]};
  for(const lang of ['pt','fr','en','ar']) if(source[lang]!==undefined)result[lang]=stringList(source[lang],label);
  return result as LocalizedList;
}
function options<T extends string>(value: unknown, allowed: readonly T[], label: string): T[] {
  if(!Array.isArray(value)||value.length>allowed.length||value.some(v=>typeof v!=='string'||!allowed.includes(v as T))||new Set(value).size!==value.length)return fail(`${label}: invalid selection.`);
  return value as T[];
}
export function validateTreatment(body: Record<string,unknown>, existing?: Treatment): Service & {status:TreatmentStatus;durationMinutes:number;priceCents:number} {
  const slug=body.slug;
  if(typeof slug!=='string'|| !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>100)return fail('Invalid treatment identifier.');
  if(typeof body.pole!=='string'||!['kinesitherapie','minceur','bilan'].includes(body.pole))return fail('Choose a valid category.');
  if(typeof body.status!=='string'||!['DRAFT','PUBLISHED','ARCHIVED'].includes(body.status))return fail('Choose a valid publication status.');
  if(typeof body.durationMinutes!=='number'||!Number.isInteger(body.durationMinutes)||body.durationMinutes<5||body.durationMinutes>720)return fail('Duration must be a whole number from 5 to 720 minutes.');
  if(typeof body.priceCents!=='number'||!Number.isSafeInteger(body.priceCents)||body.priceCents<0||body.priceCents>5000000)return fail('Price must be from €0 to €50,000, with at most two decimals.');
  const name=localized(body.name,'Name',120),shortDesc=localized(body.shortDesc,'Summary',400),longDesc=localized(body.longDesc,'Description',6000,false);
  const careGoals=options<CareGoal>((body.careGoals===undefined?existing?.careGoals??[]:body.careGoals),['posture','slimming','drainage','postpartum'],'Care goals');
  const bodyZones=options<TreatmentBodyZone>((body.bodyZones===undefined?existing?.bodyZones??[]:body.bodyZones),['torso','legs','arms','back'],'Body areas');
  const sessionFlow=translatedList((body.sessionFlow===undefined?existing?.sessionFlow??{fr:[]}:body.sessionFlow),'Session steps');
  const indications=translatedList((body.indications===undefined?existing?.indications??{fr:[]}:body.indications),'Indications');
  const contraindications=translatedList((body.contraindications===undefined?existing?.contraindications??{fr:[]}:body.contraindications),'Contraindications');
  const keywords=stringList((body.keywords===undefined?existing?.keywords??[]:body.keywords),'Search terms',30,100);
  const rawFaq=(body.faq===undefined?existing?.faq??[]:body.faq);
  if(!Array.isArray(rawFaq)||rawFaq.length>20)return fail('FAQ: maximum 20 questions.');
  const faq=rawFaq.map(item=>{if(!item||typeof item!=='object'||Array.isArray(item))return fail('FAQ: invalid question.');return {q:localized(item.q,'Question',300),a:localized(item.a,'Answer',2000)};});
  // Omitted optional fields retain saved content; explicit empty values clear it.
  return {...(existing || {icon:'IconPhysotherapist',bodyMapPoint:{x:50,y:50,view:'both'},sessionFlow:{fr:[]},indications:{fr:[]},contraindications:{fr:[]},faq:[],hasBeforeAfter:false,keywords:[]}),
    slug,pole:body.pole as Service['pole'],name,shortDesc,longDesc,careGoals,bodyZones,sessionFlow,indications,contraindications,keywords,faq,duration:`${body.durationMinutes} min`,price:body.priceCents/100,
    status:body.status as TreatmentStatus,durationMinutes:body.durationMinutes,priceCents:body.priceCents};
}

/** Catalogue, practitioner mappings, revision and audit history commit together. */
export async function saveTreatment(body: Record<string,unknown>, actor: string) {
  const state=await loadScheduleState();
  if(!Number.isSafeInteger(body.revision)||body.revision!==state.revision)throw new SchedulingError('SCHEDULE_CHANGED','The catalogue or schedule changed. Reload before saving.');
  const existing=state.treatments?.find(t=>t.slug===body.slug);
  if(body.version!== (existing?.version ?? 0))throw new SchedulingError('SCHEDULE_CHANGED','This treatment was changed by another user. Reload before saving.');
  const treatment=validateTreatment(body,existing);
  const ids=body.practitionerIds;
  if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'||!state.practitioners.some(p=>p.id===id))||new Set(ids).size!==ids.length)return fail('Select valid practitioners without duplicates.');
  if(treatment.status==='PUBLISHED'&&!state.practitioners.some(p=>{
    if(!ids.includes(p.id)||!p.active||!p.bookable)return false;
    const mapping=state.services.find(s=>s.service===treatment.slug&&s.practitionerId===p.id);
    const duration=mapping?.durationMinutes??treatment.durationMinutes,before=mapping?.bufferBefore??0,after=mapping?.bufferAfter??0;
    // Check the recurring template, allowing existing one-off absences. Starts use the booking grid.
    return [4,5,6,7,8,9,10].some(day=>practitionerIntervals({...state,exceptions:[]},p.id,`2026-10-${String(day).padStart(2,'0')}`).some(([start,end])=>Math.ceil((start+before)/30)*30+duration+after<=end));
  }))return fail('To publish, assign an active online practitioner whose clinic and working hours can fit the treatment, including buffers.');
  const removed=state.services.filter(s=>s.service===treatment.slug&&!ids.includes(s.practitionerId));
  const conflicts=state.appointments.filter(a=>a.service===treatment.slug&&removed.some(s=>s.practitionerId===a.practitionerId));
  if(conflicts.length)throw new SchedulingError('EXISTING_BOOKINGS','These practitioners have future appointments for this treatment. Keep their assignment or reassign those appointments first.',conflicts.slice(0,50));
  const now=new Date().toISOString();
  const {status,durationMinutes,priceCents,...content}=treatment;
  const next={...content,status,durationMinutes,priceCents,version:(existing?.version??0)+1,updatedAt:now};
  const statements:{sql:string;args:(string|number|null)[]}[]=[{sql:`INSERT INTO treatment_catalog(slug,content,status,durationMinutes,priceCents,version,updatedAt) VALUES(?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET content=excluded.content,status=excluded.status,durationMinutes=excluded.durationMinutes,priceCents=excluded.priceCents,version=excluded.version,updatedAt=excluded.updatedAt`,args:[treatment.slug,JSON.stringify(content),status,durationMinutes,priceCents,next.version,now]}];
  for(const s of removed) statements.push({sql:'DELETE FROM practitioner_services WHERE practitionerId=? AND service=?',args:[s.practitionerId,treatment.slug]});
  for(const id of ids) statements.push({sql:'INSERT OR IGNORE INTO practitioner_services(practitionerId,service,durationMinutes,bufferBefore,bufferAfter) VALUES(?,?,NULL,0,0)',args:[id,treatment.slug]});
  statements.push({sql:'INSERT INTO treatment_revisions(id,slug,beforeJson,afterJson,actor,createdAt) VALUES(?,?,?,?,?,?)',args:[randomUUID(),treatment.slug,existing?JSON.stringify(existing):null,JSON.stringify(next),actor,now]});
  if(!await commitScheduling(state,statements))throw new SchedulingError('SCHEDULE_CHANGED','The catalogue or schedule changed. Reload before saving.');
  return next;
}
