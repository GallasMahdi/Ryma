import { getSchedulingConfiguration } from '@/lib/scheduling';
import { randomUUID } from 'node:crypto';
import { getPublicServices } from '@/lib/treatments';
import { getLocalizedText } from '@/data/services';
import { getLisbonDateTime, validateAppointmentInput, VALID_TIME_SLOTS } from '@/lib/validation';
import { isCalendarDate } from '@/lib/admin-validation';
import { dbCheckMultipleDatesAvailability, dbCreateAppointment, executeQuery, type Appointment } from '@/lib/db';
import { broadcastAppointmentCreated } from '@/lib/events';
import { SITE } from '@/lib/site';
import { whatsappConfig } from './config';
import type { Action, Conversation, IncomingMessage, Language, Reply } from './types';

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const words = (lang: Language, pt: string, en: string, fr: string) => ({pt, en, fr})[lang];
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const textReply = (body: string): Reply => ({type: 'text', text: {body}});
const matchesPeriod = (time: string, period?: Conversation['period']) => !period || (period === 'morning' ? time < '13:00' : time >= '13:00');
const displayDate = (date: string, lang: Language) => new Intl.DateTimeFormat({pt: 'pt-PT', en: 'en-GB', fr: 'fr-FR'}[lang], {day: '2-digit', month: 'short', weekday: 'short', timeZone: 'Europe/Lisbon'}).format(new Date(`${date}T12:00:00Z`));

export function detectLanguage(text: string, fallback: Language = 'pt'): Language {
  const value = normalize(text);
  if (/\b(english|hello|book|appointment|tomorrow|available)\b/.test(value)) return 'en';
  if (/\b(francais|bonjour|rendez-vous|demain|reserver|disponibilites)\b/.test(value)) return 'fr';
  if (/\b(portugues|ola|marcar|consulta|amanha|horarios)\b/.test(value)) return 'pt';
  return fallback;
}

function requestedDate(text: string): string | undefined {
  const value = normalize(text), today = getLisbonDateTime().todayStr;
  const iso = value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (iso && isCalendarDate(iso)) return iso;
  if (/\b(tomorrow|amanha|demain)\b/.test(value)) return addDays(today, 1);
  if (/\b(today|hoje|aujourd'hui)\b/.test(value)) return today;
}

async function requestedService(text: string): Promise<string | undefined> {
  const SERVICES=await getPublicServices();
  const value = normalize(text);
  const matches = SERVICES.filter(service => Object.values(service.name).some(name => name && value.includes(normalize(name))) || service.keywords.some(term=>term.trim() && value.includes(normalize(term))) || value.includes(service.slug));
  if (matches.length === 1) return matches[0].slug;
}

function list(state: Conversation, body: string, options: {title: string; description?: string; action: Action}[], buttons = false): Reply {
  const nonce = randomUUID().slice(0, 8);
  state.choices = options.map((option, index) => ({...option, title: option.title.slice(0, buttons ? 20 : 24), id: `${nonce}:${index}`}));
  return {type: 'interactive', interactive: {type: buttons ? 'button' : 'list', body: {text: body}, action: buttons ? {
    buttons: state.choices.map(choice => ({type: 'reply', reply: {id: choice.id, title: choice.title}})),
  } : {
    button: words(state.lang, 'Ver opções', 'View options', 'Voir les options'),
    sections: [{title: 'Ryma Kiné', rows: state.choices.map(({id, title, description}) => ({id, title, ...(description ? {description: description.slice(0, 72)} : {})}))}],
  }}};
}

async function services(state: Conversation, offset = 0): Promise<Reply> {
  const SERVICES=await getPublicServices();
  if(!SERVICES.length){state.step='service';state.choices=[];return textReply(words(state.lang,'Sem tratamentos disponíveis. Contacte a clínica.','No treatments available. Please contact the clinic.','Aucun soin disponible. Contactez la clinique.'));}
  state.step = 'service';
  const options: Parameters<typeof list>[2] = SERVICES.slice(offset, offset + 8).map(service => ({
    title: getLocalizedText(service.name, state.lang),
    description: `${getLocalizedText(service.name, state.lang)} · ${service.duration}`,
    action: {kind: 'service', value: service.slug},
  }));
  if (offset + 8 < SERVICES.length) options.push({title: words(state.lang, 'Mais tratamentos', 'More treatments', 'Autres soins'), action: {kind: 'services', value: String(offset + 8)}});
  if (offset > 0) options.push({title: words(state.lang, 'Voltar', 'Back', 'Retour'), action: {kind: 'services', value: '0'}});
  return list(state, words(state.lang, 'Olá! Sou o assistente de marcações da Ryma Kiné. Escolha o tratamento. Escreva “humano” para contactar a clínica.', 'Hello! I am Ryma Kiné’s booking assistant. Choose a treatment. Type “human” to contact the clinic.', 'Bonjour ! Je suis l’assistant de réservation de Ryma Kiné. Choisissez un soin. Écrivez « humain » pour contacter la clinique.'), options);
}

async function afterPractitioner(state: Conversation): Promise<Reply> {
  if (state.preferredDate) { state.date=state.preferredDate; delete state.preferredDate; return times(state); }
  return dates(state);
}
async function practitioners(state: Conversation, offset=0): Promise<Reply> {
  const config=await getSchedulingConfiguration();
  if(!config.treatments?.some(t=>t.slug===state.service&&t.status==='PUBLISHED'))return services(state);
  const eligible=config.practitioners.filter(p=>p.active&&p.bookable&&config.services.some(s=>s.practitionerId===p.id&&s.service===state.service));
  if(eligible.length===1){state.practitionerId=eligible[0].id;state.practitionerName=eligible[0].name;return afterPractitioner(state);}
  state.step='practitioner';delete state.date;delete state.time;delete state.requestId;
  const options: Parameters<typeof list>[2]=[{title:words(state.lang,'Primeira disponibilidade','Earliest available','Premier créneau'),action:{kind:'practitioner',value:''}},...eligible.slice(offset,offset+7).map(p=>({title:p.name,description:p.profession,action:{kind:'practitioner' as const,value:p.id}}))];
  if(offset+7<eligible.length)options.push({title:words(state.lang,'Mais profissionais','More practitioners','Autres praticiens'),action:{kind:'practitioners',value:String(offset+7)}});
  if(offset>0)options.push({title:words(state.lang,'Voltar','Back','Retour'),action:{kind:'practitioners',value:String(offset-7)}});
  return list(state,words(state.lang,'Escolha um profissional ou a primeira disponibilidade.','Choose a practitioner or earliest availability.','Choisissez un praticien ou le premier créneau disponible.'),options);
}

async function dates(state: Conversation, offset = 0, prefix = ''): Promise<Reply> {
  state.step = 'date';
  delete state.date; delete state.time; delete state.requestId;
  const today = getLisbonDateTime().todayStr;
  const days = Array.from({length: 7}, (_, i) => addDays(today, offset + i));
  const availability = await dbCheckMultipleDatesAvailability(days, VALID_TIME_SLOTS, state.service, {practitionerId: state.practitionerId || undefined, publicOnly: true});
  const options: Parameters<typeof list>[2] = days.filter(date => availability.get(date)?.some(s => s.available && matchesPeriod(s.time, state.period))).map(date => ({title: displayDate(date, state.lang), action: {kind: 'date', value: date}}));
  if (offset < 84) options.push({title: words(state.lang, 'Próxima semana', 'Next week', 'Semaine suivante'), action: {kind: 'dates', value: String(offset + 7)}});
  if (offset > 0) options.push({title: words(state.lang, 'Semana anterior', 'Previous week', 'Semaine précédente'), action: {kind: 'dates', value: String(offset - 7)}});
  options.push({title: words(state.lang, 'Outro tratamento', 'Change treatment', 'Changer de soin'), action: {kind: 'restart'}});
  const hasSlots = days.some(date => availability.get(date)?.some(s => s.available && matchesPeriod(s.time, state.period)));
  return list(state, prefix + words(state.lang, hasSlots ? 'Escolha um dia disponível. Horários de Lisboa.' : 'Sem vagas nesta semana. Pode consultar outras datas.', hasSlots ? 'Choose an available day. All times are Lisbon time.' : 'No slots this week. You can browse other dates.', hasSlots ? 'Choisissez une date disponible. Heure de Lisbonne.' : 'Aucun créneau cette semaine. Consultez les autres dates.'), options);
}

async function times(state: Conversation, offset = 0): Promise<Reply> {
  if (!state.date || !isCalendarDate(state.date) || state.date > addDays(getLisbonDateTime().todayStr, 90)) return dates(state);
  state.step = 'time'; delete state.time; delete state.requestId;
  const slots = (await dbCheckMultipleDatesAvailability([state.date], VALID_TIME_SLOTS, state.service, {practitionerId: state.practitionerId || undefined, publicOnly: true})).get(state.date)?.filter(s => s.available && matchesPeriod(s.time, state.period)) ?? [];
  const options: Parameters<typeof list>[2] = slots.slice(offset, offset + 8).map(slot => ({title: slot.time, action: {kind: 'time', value: slot.time}}));
  if (offset + 8 < slots.length) options.push({title: words(state.lang, 'Mais horários', 'More times', 'Autres horaires'), action: {kind: 'times', value: String(offset + 8)}});
  if (offset > 0) options.push({title: words(state.lang, 'Primeiros horários', 'Earlier times', 'Premiers horaires'), action: {kind: 'times', value: '0'}});
  options.push({title: words(state.lang, 'Outra data', 'Another day', 'Autre date'), action: {kind: 'dates', value: '0'}});
  return list(state, `${displayDate(state.date, state.lang)} — ${words(state.lang, slots.length ? 'Escolha um horário (Lisboa).' : 'Sem horários disponíveis. Escolha outra data.', slots.length ? 'Choose a time (Lisbon).' : 'No available times. Choose another day.', slots.length ? 'Choisissez un horaire (Lisbonne).' : 'Aucun créneau disponible. Choisissez une autre date.')}`, options);
}

async function confirmation(state: Conversation): Promise<Reply> {
  const SERVICES=await getPublicServices();
  state.step = 'confirm';
  state.requestId ??= randomUUID();
  const service = SERVICES.find(s => s.slug === state.service);
  if(!service)return services(state);
  const auto = whatsappConfig().autoConfirm;
  const description = `${state.name}\n${state.practitionerName || words(state.lang, 'Primeira disponibilidade', 'Earliest available', 'Premier créneau')}\n${getLocalizedText(service.name, state.lang)} · ${service.duration}\n${state.date} · ${state.time} (Europe/Lisbon)`;
  const notice = auto ? words(state.lang, 'Confirmar a marcação?', 'Confirm this appointment?', 'Confirmer ce rendez-vous ?') : words(state.lang, 'Enviar pedido? A clínica terá de aprovar a marcação.', 'Submit this request? The clinic will need to approve the appointment.', 'Envoyer la demande ? La clinique devra approuver le rendez-vous.');
  return list(state, `${description}\n\n${notice}`, [
    {title: words(state.lang, 'Confirmar', 'Confirm', 'Confirmer'), action: {kind: 'confirm'}},
    {title: words(state.lang, 'Alterar', 'Change', 'Modifier'), action: {kind: 'dates', value: '0'}},
    {title: words(state.lang, 'Recomeçar', 'Start over', 'Recommencer'), action: {kind: 'restart'}},
  ], true);
}

function receipt(state: Conversation, appointment: Appointment): Reply {
  state.step = 'done'; state.choices = [];
  const lang = state.lang;
  const message = appointment.status === 'CONFIRMED' ? words(lang, 'Marcação confirmada.', 'Appointment confirmed.', 'Rendez-vous confirmé.')
    : appointment.status === 'PENDING' ? words(lang, 'Pedido recebido — aguarda aprovação da clínica.', 'Request received — awaiting clinic approval.', 'Demande reçue — en attente de validation par la clinique.')
    : words(lang, 'Esta marcação já foi atualizada pela clínica. Contacte-nos para detalhes.', 'This appointment has already been updated by the clinic. Contact us for details.', 'Ce rendez-vous a déjà été mis à jour par la clinique. Contactez-nous pour les détails.');
  return textReply(`${message}\n${appointment.practitionerName} · ${appointment.durationMinutes} min\n${appointment.date} · ${appointment.startTime} (Europe/Lisbon)\n${words(lang, 'Referência', 'Reference', 'Référence')}: ${appointment.id}\n${words(lang, 'Para alterações, contacte a clínica:', 'For changes, contact the clinic:', 'Pour modifier, contactez la clinique :')} ${SITE.whatsappDisplay}`);
}

export async function advanceConversation(previous: Conversation | null, incoming: IncomingMessage): Promise<{state: Conversation; replies: Reply[]}> {
  const text = (incoming.text ?? '').trim().slice(0, 1000);
  const expired = !previous || previous.expiresAt < Date.now();
  let state: Conversation = expired ? {lang: detectLanguage(text), step: 'service', choices: [], expiresAt: 0} : {...previous, choices: [...previous.choices]};
  state.expiresAt = Date.now() + 30 * 60_000;
  const lang = state.lang;
  const reply = (message: Reply) => ({state, replies: [message]});
  // Recover a committed booking even if a crash delayed its reply beyond session expiry.
  if (previous?.step === 'confirm' && previous.requestId && previous.choices.some(c => c.id === incoming.choice && c.action.kind === 'confirm')) {
    const existing = await executeQuery<Appointment>('SELECT * FROM appointments WHERE bookingRequestId = ? AND phone = ?', [`wa:${previous.requestId}`, `+${incoming.from}`]);
    if (existing[0]) { state = {...previous, expiresAt: state.expiresAt}; return reply(receipt(state, existing[0])); }
  }
  if (/^(stop|parar|sair|arreter)$/i.test(normalize(text))) {
    state = {...state, choices: [], step: 'done', expiresAt: 0};
    return reply(textReply(words(lang, 'Conversa encerrada. Nenhuma marcação existente foi cancelada. Envie “marcar” para recomeçar.', 'Conversation closed. Existing appointments have not been cancelled. Send “book” to start again.', 'Conversation terminée. Les rendez-vous existants ne sont pas annulés. Envoyez « réserver » pour recommencer.')));
  }
  if (/\b(human|humano|humain|reception|rececao|recepcao)\b/.test(normalize(text))) {
    state.choices = []; state.step = 'done'; state.expiresAt = 0;
    return reply(textReply(words(lang, `Para falar com a clínica, ligue ${SITE.whatsappDisplay}. Este assistente não encaminha mensagens para uma pessoa.`, `To speak with the clinic, call ${SITE.whatsappDisplay}. This assistant does not transfer messages to a person.`, `Pour joindre la clinique, appelez le ${SITE.whatsappDisplay}. Cet assistant ne transfère pas les messages à une personne.`)));
  }
  if (/^(menu|start|restart|book|marcar|reserver|english|francais|portugues)$/i.test(normalize(text))) {
    state = {lang: detectLanguage(text, lang), step: 'service', choices: [], expiresAt: state.expiresAt};
    return reply(await services(state));
  }
  if (expired || state.step === 'done') {
    state.preferredDate = requestedDate(text);
    state.period = /\b(afternoon|tarde|apres-midi)\b/.test(normalize(text)) ? 'afternoon' : /\b(morning|manha|matin)\b/.test(normalize(text)) ? 'morning' : undefined;
    state.service = await requestedService(text);
    if (state.service) {
      delete state.practitionerId; delete state.practitionerName;
      return reply(await practitioners(state));
    }
    return reply(await services(state));
  }
  const action = incoming.choice ? state.choices.find(choice => choice.id === incoming.choice)?.action : undefined;
  if (action?.kind === 'restart') { state = {lang, step: 'service', choices: [], expiresAt: state.expiresAt}; return reply(await services(state)); }
  if (action?.kind === 'services') return reply(await services(state, Number(action.value)));
  if (action?.kind === 'service') {
    state.service = action.value;
    delete state.practitionerId; delete state.practitionerName;
    return reply(await practitioners(state));
  }
  if (action?.kind === 'practitioners') return reply(await practitioners(state,Number(action.value)));
  if (action?.kind === 'practitioner') {
    const config=await getSchedulingConfiguration();
    const selected=config.practitioners.find(p=>p.id===action.value&&p.active&&p.bookable&&config.services.some(s=>s.practitionerId===p.id&&s.service===state.service));
    if(action.value && !selected)return reply(await practitioners(state));
    state.practitionerId=selected?.id;state.practitionerName=selected?.name;
    return reply(await afterPractitioner(state));
  }
  if (action?.kind === 'dates') return reply(await dates(state, Number(action.value)));
  if (action?.kind === 'date') { state.date = action.value; return reply(await times(state)); }
  if (action?.kind === 'times') return reply(await times(state, Number(action.value)));
  if (action?.kind === 'time') {
    state.time = action.value; state.choices = []; state.step = 'name';
    return reply(textReply(words(lang, 'Qual é o nome completo do paciente? Envie apenas o nome, sem informação clínica. Este horário ainda não está reservado.', 'What is the patient’s full name? Send only the name, without medical details. This time is not reserved yet.', 'Quel est le nom complet du patient ? Envoyez uniquement le nom, sans information médicale. Ce créneau n’est pas encore réservé.')));
  }
  if (state.step === 'name' && text && !incoming.choice) {
    const validation = validateAppointmentInput({patientName: text, phone: `+${incoming.from}`, service: state.service, date: state.date, startTime: state.time, lang});
    if (!validation.ok && ['PAST_DATE', 'PAST_TIME'].includes(validation.errorCode ?? '')) return reply(await dates(state));
    if (!validation.ok || text.length > 100) return reply(textReply(words(lang, 'Verifique o nome e tente novamente, ou escreva “menu”.', 'Check the name and try again, or type “menu”.', 'Vérifiez le nom et réessayez, ou écrivez « menu ».')));
    state.name = text;
    return reply(await confirmation(state));
  }
  if (action?.kind === 'confirm' && state.step === 'confirm' && state.requestId) {
    const input = {practitionerId: state.practitionerId || undefined, patientName: state.name!, phone: `+${incoming.from}`, service: state.service!, date: state.date!, startTime: state.time!};
    const validation = validateAppointmentInput({...input, lang});
    if (!validation.ok) return reply(await dates(state, 0, words(lang, 'A seleção expirou. ', 'Your selection expired. ', 'Votre sélection a expiré. ')));
    const previousBookings = await executeQuery<{count: number}>("SELECT COUNT(*) AS count FROM appointments WHERE phone = ? AND createdAt >= ? AND (bookingRequestId IS NULL OR bookingRequestId != ?)", [input.phone, new Date(Date.now() - 3600000).toISOString(), `wa:${state.requestId}`]);
    if (Number(previousBookings[0]?.count) >= 3) return reply(textReply(words(lang, 'Limite de marcações atingido. Contacte a clínica ou tente mais tarde.', 'Booking limit reached. Contact the clinic or try later.', 'Limite de réservation atteinte. Contactez la clinique ou réessayez plus tard.')));
    const result = await dbCreateAppointment({...input, source: 'whatsapp', bookingRequestId: `wa:${state.requestId}`, status: whatsappConfig().autoConfirm ? 'CONFIRMED' : 'PENDING'});
    if (!result.success) return reply(await dates(state, 0, words(lang, 'Este horário já não está disponível. ', 'That time is no longer available. ', 'Ce créneau n’est plus disponible. ')));
    broadcastAppointmentCreated(result.appointment);
    return reply(receipt(state, result.appointment));
  }
  // Old buttons cannot authorize a booking; regenerate the current step instead.
  if (state.step === 'practitioner') return reply(await practitioners(state));
  if (state.step === 'confirm') return reply(await confirmation(state));
  if (state.step === 'time') return reply(await times(state));
  if (state.step === 'date') {
    const date = requestedDate(text);
    if (date) { state.date = date; return reply(await times(state)); }
    return reply(await dates(state));
  }
  if (state.step === 'name') return reply(textReply(words(lang, 'Envie o nome completo do paciente ou escreva “menu”.', 'Send the patient’s full name or type “menu”.', 'Envoyez le nom complet du patient ou écrivez « menu ».')));
  const service = await requestedService(text);
  if (service) { state.service = service; delete state.practitionerId; delete state.practitionerName; return reply(await practitioners(state)); }
  return reply(await services(state));
}
