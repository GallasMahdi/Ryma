/**
 * Seed 100 Realistic Patients, Sessions, Invoices, Prescriptions & Appointments
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-100-patients.mjs
 *   OR: node scripts/seed-100-patients.mjs
 */

import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// 1. Load .env.local if not already in process.env
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0 && !process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://ryma-db-gallasmahdi.aws-eu-west-1.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODY1NDQ3MTIsImlkIjoiMDE5ZmY2NWMtYmMwMS03NDU3LWE3YzQtOTc3MWI0NmJhNzUxIiwia2lkIjoiVnBUMlJaOHFnWTZxZTZXZkYxR0ozZEtkYWxEYjB5Q1RvVlpoZm1kRVlINCIsInJpZCI6IjFiNTk5ZjllLWZlNDMtNDBlOC04OTJjLTczMjk1ZWE0YzQ3MCJ9.CWfJuh-r1IiffbDwJckemsiwSPZNh6ZTMPLifYnv4cDc1R40VgP2q4OAM9kCL1QrDd7hp6MZpmYGsoSPJJGXAg';

console.log('🌱 Starting 100-Patient Deep Seed Generator for Digital Clínica...\n');

// ── Realistic Data Pools ──────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Maria', 'Ana', 'Beatriz', 'Carolina', 'Diana', 'Francisca', 'Inês', 'Joana', 'Leonor', 'Margarida',
  'Mariana', 'Matilde', 'Rita', 'Sofia', 'Sara', 'Catarina', 'Teresa', 'Helena', 'Patrícia', 'Clara',
  'João', 'Tiago', 'Rodrigo', 'Martim', 'Afonso', 'Francisco', 'Bernardo', 'Miguel', 'Duarte', 'Tomás',
  'Guilherme', 'Gonçalo', 'Pedro', 'Lucas', 'Gabriel', 'Santiago', 'Manuel', 'António', 'Bruno', 'Rui',
  'Alexandre', 'Carlos', 'Diogo', 'Vasco', 'André', 'Hugo', 'David', 'Jorge', 'Luís', 'Eduardo'
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Jesus', 'Sousa',
  'Fernandes', 'Gonçalves', 'Gomes', 'Lopes', 'Marques', 'Alves', 'Almeida', 'Ribeiro', 'Pinto', 'Carvalho',
  'Teixeira', 'Moreira', 'Correia', 'Mendes', 'Nunes', 'Soares', 'Vieira', 'Monteiro', 'Cardoso', 'Rocha',
  'Raposo', 'Neves', 'Coelho', 'Cruz', 'Morgado', 'Pires', 'Ramos', 'Reis', 'Simões', 'Guerreiro'
];

const PATHOLOGIES = [
  { tags: 'Lombalgia Mecânica, Hérnia L4-L5', history: 'Dor lombar irradiada para o membro inferior direito há 4 meses. Agravamento com postura sentada prolongada no escritório. Sem défice motor.', target: 12, service: 'reeducacao-postural-global', price: 65 },
  { tags: 'Cervicalgia Postural, Tensão Trapézio', history: 'Episódios recorrentes de cefaleias cervicogénicas e tensão nos trapézios superiores devido a trabalho em teletrabalho.', target: 10, service: 'kinesitherapie-respiratoire', price: 50 },
  { tags: 'Pós-Operatório Joelho LCA, Meniscectomia', history: 'Cirurgia ligamentoplastia LCA há 6 semanas. Em fase de ganho de amplitude articular (0-110º) e reforço do quadricípite.', target: 20, service: 'reeducacao-postural-global', price: 65 },
  { tags: 'Tendinite da Coifa dos Rotadores', history: 'Impacto subacromial no ombro dominante com dor aos 90º de abdução. Testes de Neer e Hawkins positivos.', target: 15, service: 'kinesitherapie-respiratoire', price: 50 },
  { tags: 'Drenagem Linfática Pós-Lipoaspiração', history: 'Pós-operatório de lipoaspiração abdominal e flancos (D+12). Edema moderado e presença de pequenas fibroses em organização.', target: 10, service: 'drainage-lymphatique-renata-franca', price: 90 },
  { tags: 'Escoliose Dorsolombar Idiopática', history: 'Ângulo de Cobb de 18º. Queixas de fadiga muscular postural ao final do dia. Foco em RPG e fortalecimento do core.', target: 15, service: 'reeducacao-postural-global', price: 65 },
  { tags: 'Epicondilite Lateral (Cotovelo de Tenista)', history: 'Dor à palpação do epicôndilo lateral e extensão resistida do punho. Praticante amador de padel 3x por semana.', target: 8, service: 'kinesitherapie-respiratoire', price: 50 },
  { tags: 'Fascite Plantar Bilateral', history: 'Dor aguda matinal nos primeiros passos ao acordar no calcanhar esquerdo. Hipomobilidade da fáscia e retração do tendão de Aquiles.', target: 10, service: 'kinesitherapie-respiratoire', price: 50 },
  { tags: 'Remodelação Corporal & Celulite Fibrosa', history: 'Protocolo estético avançado para redução de adiposidade localizada nas coxas e melhoria do tónus dérmico.', target: 8, service: 'cryolipolyse-360-medicale', price: 120 },
  { tags: 'Entorse do Tornozelo Grau II', history: 'Entorse em inversão com lesão do ligamento talofibular anterior há 3 semanas. Em fase de treino propriocetivo.', target: 10, service: 'reeducacao-postural-global', price: 65 },
  { tags: 'Síndrome do Canal Cárpico', history: 'Parestesias no território do nervo mediano à noite. Teste de Phalen positivo. Foco em neurodinâmica e libertação fascial.', target: 10, service: 'kinesitherapie-respiratoire', price: 50 },
  { tags: 'Fibromialgia, Dor Miofascial Disseminada', history: 'Pontos gatilho ativos múltiplos, fadiga crónica e perturbação do sono. Protocolo suave de cinesiterapia e termoterapia.', target: 20, service: 'kinesitherapie-respiratoire', price: 50 }
];

const DOCTORS = [
  'Dr. António Ramos (Ortopedia)',
  'Dra. Sofia Carreira (Fisiatria)',
  'Dr. Manuel Ferreira (Medicina Desportiva)',
  'Dra. Teresa Alentejo (Reumatologia)',
  'Dr. Pedro Vasconcelos (Cirurgia Geral)',
  'Dra. Inês Albuquerque (Neurologia)',
  'Dr. Bernardo Sousa (Clínica Geral)',
  'Dra. Mariana Corte-Real (Cirurgia Plástica)',
  null,
  null
];

const COVERAGE_PROVIDERS = [
  { type: 'ADSE', name: 'ADSE Directa', prefix: '1098' },
  { type: 'INSURANCE', name: 'Médis', prefix: 'MED-' },
  { type: 'INSURANCE', name: 'Multicare', prefix: 'MC-' },
  { type: 'INSURANCE', name: 'AdvanceCare', prefix: 'ADV-' },
  { type: 'INSURANCE', name: 'Saúde Prime', prefix: 'SP-' },
  { type: 'INSURANCE', name: 'Allianz Care', prefix: 'ALZ-' },
  { type: 'PARTICULAR', name: null, prefix: '' },
  { type: 'PARTICULAR', name: null, prefix: '' }
];

const RX_CARE_ITEMS = [
  { title: 'Gel de Árnica e Harpagófito', category: 'care_product', instructions: 'Aplicar 2 a 3 vezes ao dia com massagem circular suave na zona dolorosa.' },
  { title: 'Creme com Magnésio & Crioterapia', category: 'care_product', instructions: 'Aplicar à noite após o duche para relaxamento da musculatura paravertebral.' },
  { title: 'Bolsa Térmica Quente/Frio', category: 'ergonomic_equipment', instructions: 'Aplicar calor húmido 15 minutos antes dos alongamentos recomendados.' },
  { title: 'Rolo de Miofascial (Foam Roller)', category: 'ergonomic_equipment', instructions: 'Auto-libertação miofascial dos glúteos e quadricípites por 5 minutos diários.' },
  { title: 'Almofada Lombar Ergonómica', category: 'ergonomic_equipment', instructions: 'Utilizar na cadeira de escritório para manutenção da lordose fisiológica.' },
  { title: 'Pausas Posturais Ativas (45 min)', category: 'lifestyle_habit', instructions: 'Levantar-se a cada 45 minutos para realizar 3 ciclos de extensão lombar.' },
  { title: 'Alongamento Isquiotibiais & Psoas', category: 'lifestyle_habit', instructions: 'Manter 3 repetições de 30 segundos sem ressaltos, duas vezes por dia.' }
];

// Helper random
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate 100 Unique Patients Data
const patientsData = [];
const usedPhones = new Set();
const usedNifs = new Set();

for (let i = 1; i <= 100; i++) {
  const fName = pick(FIRST_NAMES);
  const lName1 = pick(LAST_NAMES);
  const lName2 = pick(LAST_NAMES);
  const patientName = `${fName} ${lName1} ${lName2}`;

  // Unique Phone
  let phone = '';
  do {
    const d3 = pick(['91', '92', '93', '96']);
    const rest = String(randInt(1000000, 9999999));
    phone = `+351${d3}${rest}`;
  } while (usedPhones.has(phone));
  usedPhones.add(phone);

  // Unique NIF
  let nif = '';
  do {
    const firstDigit = pick(['1', '2', '3']);
    nif = `${firstDigit}${randInt(10000000, 99999999)}`;
  } while (usedNifs.has(nif));
  usedNifs.add(nif);

  const cleanEmailName = `${fName.toLowerCase()}.${lName1.toLowerCase()}${randInt(10, 99)}`;
  const email = `${cleanEmailName}@${pick(['gmail.com', 'sapo.pt', 'outlook.pt', 'hotmail.com'])}`;
  
  const patho = pick(PATHOLOGIES);
  const cov = pick(COVERAGE_PROVIDERS);
  const covNumber = cov.name ? `${cov.prefix}${randInt(100000, 999999)}` : null;
  const doc = pick(DOCTORS);

  // Dates in the last 90 days
  const daysAgo = randInt(1, 85);
  const createdDate = new Date(Date.now() - daysAgo * 86400000);
  const createdAt = createdDate.toISOString();
  const updatedDate = new Date(createdDate.getTime() + randInt(0, 10) * 86400000);
  const updatedAt = updatedDate.toISOString();

  // Completed sessions count between 0 and 8
  const sessionCount = randInt(0, Math.min(8, patho.target));
  const initialEva = randInt(6, 9);
  const currentEva = Math.max(1, initialEva - randInt(2, 5));

  patientsData.push({
    id: `pat_seed_${String(i).padStart(3, '0')}`,
    patientName,
    phone,
    email,
    gender: ['Maria', 'Ana', 'Beatriz', 'Carolina', 'Diana', 'Francisca', 'Inês', 'Joana', 'Leonor', 'Margarida', 'Mariana', 'Matilde', 'Rita', 'Sofia', 'Sara', 'Catarina', 'Teresa', 'Helena', 'Patrícia', 'Clara'].includes(fName) ? 'F' : 'M',
    dob: `${randInt(1965, 2003)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    coverageType: cov.type,
    coverageProvider: cov.name,
    coverageNumber: covNumber,
    referringDoctor: doc,
    pathologyTags: patho.tags,
    medicalHistory: patho.history,
    totalPrescribedSessions: patho.target,
    createdAt,
    updatedAt,
    sessionCount,
    initialEva,
    currentEva,
    patho,
    nif
  });
}

// ── Database Insertion Logic ──────────────────────────────────────────────────

async function seedTurso(client) {
  console.log('🚀 Seeding 100 Patients into Turso Cloud Database...');

  let totalSessions = 0;
  let totalInvoices = 0;
  let totalPrescriptions = 0;
  let totalAppointments = 0;
  let invoiceSequence = 1;

  for (const p of patientsData) {
    // 1. Insert Patient
    await client.execute({
      sql: `INSERT OR REPLACE INTO patients
        (id, patientName, phone, email, gender, dob, coverageType, coverageProvider, coverageNumber, referringDoctor, pathologyTags, medicalHistory, totalPrescribedSessions, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.id,
        p.patientName,
        p.phone,
        p.email,
        p.gender,
        p.dob,
        p.coverageType,
        p.coverageProvider,
        p.coverageNumber,
        p.referringDoctor,
        p.pathologyTags,
        p.medicalHistory,
        p.totalPrescribedSessions,
        p.createdAt,
        p.updatedAt,
      ]
    });

    // 2. Insert Patient Note (Legacy mirror)
    await client.execute({
      sql: `INSERT OR REPLACE INTO patient_notes (phone, patientName, content, tags, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      args: [p.phone, p.patientName, p.medicalHistory, p.pathologyTags, p.updatedAt]
    });

    // 3. Insert Clinical Sessions with decreasing EVA score
    for (let sIdx = 1; sIdx <= p.sessionCount; sIdx++) {
      const sessDate = new Date(new Date(p.createdAt).getTime() + sIdx * 5 * 86400000).toISOString().split('T')[0];
      const eva = Math.max(1, Math.round(p.initialEva - ((p.initialEva - p.currentEva) / p.sessionCount) * (sIdx - 1)));
      const sessId = `sess_${p.id}_${sIdx}`;

      await client.execute({
        sql: `INSERT OR REPLACE INTO patient_sessions
          (id, patientId, date, time, serviceSlug, evaPainScore, sessionType, notes, practitioner, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sessId,
          p.id,
          sessDate,
          pick(['09:00', '10:30', '14:00', '15:30', '17:00', '18:30']),
          p.patho.service,
          eva,
          'MANUAL',
          `Sessão #${sIdx}: mobilização articular, treino de estabilização do core e crioterapia final. EVA: ${eva}/10.`,
          'Ryma B. (Fisioterapeuta)',
          new Date(sessDate + 'T10:00:00Z').toISOString()
        ]
      });
      totalSessions++;

      // 4. Create Invoices for completed sessions
      if (Math.random() > 0.3) {
        const invNum = `FR 2026/${String(invoiceSequence++).padStart(4, '0')}`;
        const isPaid = Math.random() > 0.15;
        const isKine = !p.patho.service.includes('cryo') && !p.patho.service.includes('minceur');

        await client.execute({
          sql: `INSERT OR REPLACE INTO invoices
            (id, invoiceNumber, patientId, patientName, patientNif, patientEmail, patientPhone, patientAddress,
             coverageType, coverageProvider, coverageNumber, serviceSlug, serviceName, practitioner, amount,
             vatRate, vatExemptionReason, paymentMethod, paymentStatus, paidAt, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `inv_${p.id}_${sIdx}`,
            invNum,
            p.id,
            p.patientName,
            p.nif,
            p.email,
            p.phone,
            'Lisboa, Portugal',
            p.coverageType,
            p.coverageProvider,
            p.coverageNumber,
            p.patho.service,
            p.patho.service === 'reeducacao-postural-global' ? 'Reeducação Postural Global (RPG)' : p.patho.service === 'drainage-lymphatique-renata-franca' ? 'Drenagem Linfática Renata França' : 'Fisioterapia e Reabilitação Geral',
            'Ryma B. (Fisioterapeuta C-064821)',
            p.patho.price,
            isKine ? 0 : 23,
            isKine ? 'Isento de IVA - Artigo 9.º do CIVA' : null,
            pick(['MULTIBANCO', 'MBWAY', 'CARD', 'TRANSFER', 'CASH']),
            isPaid ? 'PAID' : 'PENDING',
            isPaid ? new Date(sessDate + 'T11:00:00Z').toISOString() : null,
            `Recibo de quitação de sessão de tratamento clínico #${sIdx}.`,
            new Date(sessDate + 'T11:00:00Z').toISOString(),
            new Date(sessDate + 'T11:00:00Z').toISOString()
          ]
        });
        totalInvoices++;
      }
    }

    // 5. Create Clinical Recommendation Pad for ~50% of patients
    if (Math.random() > 0.4) {
      const rxItems = [pick(RX_CARE_ITEMS), pick(RX_CARE_ITEMS), pick(RX_CARE_ITEMS)];
      const rxDate = p.createdAt.split('T')[0];

      await client.execute({
        sql: `INSERT OR REPLACE INTO prescriptions
          (id, patientId, patientPhone, patientName, practitioner, date, diagnosisOrGoal, itemsJson, generalNotes, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `rx_${p.id}`,
          p.id,
          p.phone,
          p.patientName,
          'Ryma B. (Fisioterapeuta)',
          rxDate,
          `Protocolo de suporte domiciliário para ${p.pathologyTags.split(',')[0]}`,
          JSON.stringify(rxItems),
          'Efetuar os exercícios prescritos com regularidade e evitar sobrecarga na fase aguda.',
          p.createdAt
        ]
      });
      totalPrescriptions++;
    }

    // 6. Create upcoming or past appointments
    const apptStatus = pick(['COMPLETED', 'CONFIRMED', 'PENDING']);
    const apptDate = apptStatus === 'COMPLETED'
      ? new Date(Date.now() - randInt(2, 30) * 86400000).toISOString().split('T')[0]
      : new Date(Date.now() + randInt(1, 20) * 86400000).toISOString().split('T')[0];

    await client.execute({
      sql: `INSERT OR REPLACE INTO appointments
        (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `apt_${p.id}`,
        p.patientName,
        p.email,
        p.phone,
        p.patho.service,
        apptDate,
        pick(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00']),
        apptStatus,
        p.medicalHistory.slice(0, 100),
        p.coverageType,
        p.coverageProvider,
        p.coverageNumber,
        p.createdAt,
        p.updatedAt
      ]
    });
    totalAppointments++;
  }

  console.log(`\n🎉 Turso Database Seed Complete!`);
  console.log(`  👤 Patients Seeded:       100`);
  console.log(`  🩺 Clinical Sessions:     ${totalSessions}`);
  console.log(`  🧾 Invoices & Receipts:   ${totalInvoices}`);
  console.log(`  📋 Clinical Prescriptions:${totalPrescriptions}`);
  console.log(`  📅 Appointments:          ${totalAppointments}`);
}

async function seedLocalSqlite() {
  const localDbPath = path.join(process.cwd(), 'data', 'ryma.db');
  if (!fs.existsSync(localDbPath)) return;

  console.log('\n📦 Seeding local SQLite database at data/ryma.db...');
  const db = new Database(localDbPath);

  let invoiceSequence = 1;

  for (const p of patientsData) {
    db.prepare(`INSERT OR REPLACE INTO patients
      (id, patientName, phone, email, gender, dob, coverageType, coverageProvider, coverageNumber, referringDoctor, pathologyTags, medicalHistory, totalPrescribedSessions, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      p.id, p.patientName, p.phone, p.email, p.gender, p.dob, p.coverageType, p.coverageProvider, p.coverageNumber,
      p.referringDoctor, p.pathologyTags, p.medicalHistory, p.totalPrescribedSessions, p.createdAt, p.updatedAt
    );

    db.prepare(`INSERT OR REPLACE INTO patient_notes (phone, patientName, content, tags, updatedAt) VALUES (?, ?, ?, ?, ?)`).run(
      p.phone, p.patientName, p.medicalHistory, p.pathologyTags, p.updatedAt
    );

    for (let sIdx = 1; sIdx <= p.sessionCount; sIdx++) {
      const sessDate = new Date(new Date(p.createdAt).getTime() + sIdx * 5 * 86400000).toISOString().split('T')[0];
      const eva = Math.max(1, Math.round(p.initialEva - ((p.initialEva - p.currentEva) / p.sessionCount) * (sIdx - 1)));

      db.prepare(`INSERT OR REPLACE INTO patient_sessions
        (id, patientId, date, time, serviceSlug, evaPainScore, sessionType, notes, practitioner, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        `sess_${p.id}_${sIdx}`, p.id, sessDate, '10:00', p.patho.service, eva, 'MANUAL',
        `Sessão #${sIdx}: evolução favorável. EVA ${eva}/10.`, 'Ryma B.', new Date(sessDate + 'T10:00:00Z').toISOString()
      );

      if (Math.random() > 0.3) {
        const invNum = `FR 2026/${String(invoiceSequence++).padStart(4, '0')}`;
        const isKine = !p.patho.service.includes('cryo');

        db.prepare(`INSERT OR REPLACE INTO invoices
          (id, invoiceNumber, patientId, patientName, patientNif, patientEmail, patientPhone, patientAddress,
           coverageType, coverageProvider, coverageNumber, serviceSlug, serviceName, practitioner, amount,
           vatRate, vatExemptionReason, paymentMethod, paymentStatus, paidAt, notes, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          `inv_${p.id}_${sIdx}`, invNum, p.id, p.patientName, p.nif, p.email, p.phone, 'Lisboa, Portugal',
          p.coverageType, p.coverageProvider, p.coverageNumber, p.patho.service, 'Fisioterapia & Reabilitação',
          'Ryma B.', p.patho.price, isKine ? 0 : 23, isKine ? 'Isento Art 9 CIVA' : null,
          'MULTIBANCO', 'PAID', new Date().toISOString(), 'Recibo quitado', p.createdAt, p.updatedAt
        );
      }
    }

    if (Math.random() > 0.4) {
      const rxItems = [pick(RX_CARE_ITEMS), pick(RX_CARE_ITEMS), pick(RX_CARE_ITEMS)];
      const rxDate = p.createdAt.split('T')[0];

      db.prepare(`INSERT OR REPLACE INTO prescriptions
        (id, patientId, patientPhone, patientName, practitioner, date, diagnosisOrGoal, itemsJson, generalNotes, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        `rx_${p.id}`, p.id, p.phone, p.patientName, 'Ryma B. (Fisioterapeuta)', rxDate,
        `Protocolo de suporte domiciliário para ${p.pathologyTags.split(',')[0]}`,
        JSON.stringify(rxItems), 'Efetuar os exercícios prescritos com regularidade.', p.createdAt
      );
    }

    const apptStatus = pick(['COMPLETED', 'CONFIRMED', 'PENDING']);
    const apptDate = new Date(Date.now() + randInt(-20, 20) * 86400000).toISOString().split('T')[0];

    db.prepare(`INSERT OR REPLACE INTO appointments
      (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `apt_${p.id}`, p.patientName, p.email, p.phone, p.patho.service, apptDate, '10:00',
      apptStatus, p.medicalHistory.slice(0, 80), p.coverageType, p.coverageProvider, p.coverageNumber, p.createdAt, p.updatedAt
    );
  }

  console.log('✅ Local SQLite database successfully seeded!');
}

async function main() {
  try {
    const client = createClient({
      url: TURSO_DATABASE_URL.trim(),
      authToken: TURSO_AUTH_TOKEN.trim(),
    });
    await seedTurso(client);
    await seedLocalSqlite();
    console.log('\n✨ Database is now fully populated with 100 complete patient records, timeline sessions, invoices, and prescriptions!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

main();
