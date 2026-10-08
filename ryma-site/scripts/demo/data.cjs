// Fictional fixtures only. No patient records, credentials, or production exports.
const tr = (pt, en, fr) => ({ pt, en, fr });
const definitions = [
  ['reeducation-posturale', 'Reeducação postural', 'Postural rehabilitation', 'Rééducation posturale', 50, 6500, 'kinesitherapie', 'posture', 'back'],
  ['reeducation-post-partum', 'Reabilitação pós-parto', 'Postpartum rehabilitation', 'Rééducation post-partum', 45, 6000, 'kinesitherapie', 'postpartum', 'torso'],
  ['massage-therapeutique', 'Massagem terapêutica', 'Therapeutic massage', 'Massage thérapeutique', 45, 5500, 'kinesitherapie', 'posture', 'back'],
  ['drainage-lymphatique', 'Drenagem linfática', 'Lymphatic drainage', 'Drainage lymphatique', 50, 6500, 'kinesitherapie', 'drainage', 'legs'],
  ['electrotherapie', 'Eletroterapia', 'Electrotherapy', 'Électrothérapie', 30, 4000, 'kinesitherapie', 'posture', 'arms'],
  ['ultrasons', 'Ultrassons terapêuticos', 'Therapeutic ultrasound', 'Ultrasons thérapeutiques', 20, 3500, 'kinesitherapie', 'posture', 'arms'],
  ['cavitation', 'Cavitação', 'Cavitation', 'Cavitation', 45, 8000, 'minceur', 'slimming', 'torso'],
  ['radiofrequence', 'Radiofrequência', 'Radiofrequency', 'Radiofréquence', 60, 9000, 'minceur', 'slimming', 'legs'],
  ['laser-lipo', 'Laser lipolítico', 'Lipo laser', 'Laser lipo', 30, 7000, 'minceur', 'slimming', 'torso'],
  ['pressotherapie', 'Pressoterapia', 'Pressotherapy', 'Pressothérapie', 45, 5000, 'minceur', 'drainage', 'legs'],
  ['cryolipolyse', 'Criolipólise', 'Cryolipolysis', 'Cryolipolyse', 60, 12000, 'minceur', 'slimming', 'torso'],
  ['massage-amincissant', 'Massagem modeladora', 'Body contour massage', 'Massage amincissant', 45, 6500, 'minceur', 'slimming', 'legs'],
  ['bilan-minceur', 'Avaliação corporal', 'Body assessment', 'Bilan corporel', 60, 5000, 'bilan', 'slimming', 'torso'],
  ['avaliacao-desportiva', 'Avaliação desportiva — rascunho', 'Sports assessment — draft', 'Bilan sportif — brouillon', 60, 7500, 'bilan', 'posture', 'legs'],
  ['mobilidade-funcional', 'Mobilidade funcional — arquivo', 'Functional mobility — archived', 'Mobilité fonctionnelle — archive', 45, 5500, 'kinesitherapie', 'posture', 'back'],
];
const treatments = definitions.map(([slug, pt, en, fr, durationMinutes, priceCents, pole, goal, zone], index) => ({
  slug, name: tr(pt, en, fr), durationMinutes, priceCents, pole,
  status: index === 13 ? 'DRAFT' : index === 14 ? 'ARCHIVED' : 'PUBLISHED',
  shortDesc: tr(`${pt}: acompanhamento individual, com avaliação inicial e objetivos acordados.`, `${en}: individual care with an initial assessment and agreed goals.`, `${fr} : prise en charge individuelle, avec bilan initial et objectifs partagés.`),
  longDesc: tr(`Catálogo de demonstração. ${pt} integra uma avaliação individual, registo de evolução e revisão do plano em cada visita. A indicação e a adequação são avaliadas pelo profissional.`, `Demo catalogue. ${en} includes an individual assessment, progress records and review of the plan at each visit. Suitability is assessed by the practitioner.`, `Catalogue de démonstration. ${fr} comprend un bilan individuel, un suivi de progression et une révision du programme à chaque visite. Le professionnel évalue la pertinence du soin.`),
  careGoals: [goal], bodyZones: [zone], keywords: [pt, en, fr],
  sessionFlow: tr(['Acolhimento e avaliação', 'Intervenção individualizada', 'Registo e planeamento da próxima visita'], ['Welcome and assessment', 'Individual session', 'Documentation and next visit planning'], ['Accueil et bilan', 'Séance individuelle', 'Documentation et prochaine visite']),
  indications: tr(['Objetivos definidos na avaliação individual.'], ['Goals identified during the individual assessment.'], ['Objectifs définis pendant le bilan individuel.']),
  contraindications: tr(['Requer avaliação prévia do profissional.'], ['Prior practitioner assessment required.'], ['Évaluation préalable du professionnel requise.']),
  faq: [{ q: tr('Como é preparada a primeira visita?', 'How is the first visit prepared?', 'Comment préparer la première visite ?'), a: tr('Reúna as informações relevantes para a avaliação. Este conteúdo é uma demonstração.', 'Bring relevant information for the assessment. This is demonstration content.', 'Préparez les informations utiles au bilan. Ce contenu est une démonstration.') }],
}));

const firstNames = ['Ana', 'Miguel', 'Inês', 'João', 'Beatriz', 'Pedro', 'Mariana', 'Tiago', 'Sofia', 'Diogo', 'Catarina', 'Rui', 'Leonor', 'André', 'Rita', 'Tomás', 'Clara', 'Duarte', 'Marta', 'Bruno'];
const surnames = ['Almeida', 'Santos', 'Ferreira', 'Costa', 'Pereira'];
const cases = [
  ['Lombalgia; Postura', 'Queixa simulada de desconforto lombar em tarefas prolongadas. Objetivo registado: melhorar a tolerância funcional.', 0],
  ['Pós-parto; Mobilidade', 'Avaliação simulada de recuperação funcional pós-parto, com objetivos individualizados de mobilidade.', 1],
  ['Cervicalgia; Ergonomia', 'História fictícia de tensão cervical durante o trabalho. Seguimento da evolução funcional.', 2],
  ['Edema; Seguimento', 'Caso fictício de acompanhamento de edema. Plano sujeito a avaliação individual do profissional.', 3],
  ['Ombro; Reabilitação', 'Registo simulado de limitação funcional do ombro. Avaliação e reavaliação documentadas.', 4],
  ['Tornozelo; Mobilidade', 'Caso simulado de recuperação funcional do tornozelo. Objetivos revistos em cada visita.', 5],
  ['Bem-estar; Contorno corporal', 'Avaliação estética fictícia, com expectativas e objetivos registados para demonstrar o fluxo.', 6],
  ['Pele; Acompanhamento', 'Acompanhamento estético simulado. Fotografias e resultados reais não estão incluídos.', 7],
  ['Avaliação; Contorno corporal', 'Ficha fictícia de avaliação corporal, com revisão periódica dos objetivos.', 8],
  ['Pernas; Bem-estar', 'Caso fictício para demonstrar agendamento com equipamento partilhado.', 9],
  ['Contorno corporal; Seguimento', 'Plano estético fictício para testar duração, faturação e seguimento.', 10],
  ['Bem-estar; Massagem', 'Plano fictício de sessões de bem-estar com acompanhamento individual.', 11],
  ['Avaliação inicial', 'Primeira avaliação fictícia para explorar objetivos e construir o plano de acompanhamento.', 12],
];

function patient(index) {
  const [pathologyTags, history, serviceIndex] = cases[index % cases.length];
  const coverageType = ['PARTICULAR', 'INSURANCE', 'ADSE', 'OTHER'][index % 4];
  const postpartum = serviceIndex === 1;
  const firstName = postpartum && index % 2 ? 'Helena' : firstNames[index % 20];
  return { patientName: `${firstName} ${surnames[Math.floor(index / 20)]} [DEMO]`,
    // Fictional London 020 7946 00xx range, accepted by the strict phone validator.
    phone: `+4420794600${String(index).padStart(2, '0')}`, email: `patient${String(index + 1).padStart(3, '0')}@example.invalid`,
    gender: postpartum ? 'F' : index === 99 ? 'OTHER' : index % 2 ? 'M' : 'F', dob: `${postpartum ? 1990 + index % 10 : 1960 + index % 44}-${String(1 + index % 12).padStart(2, '0')}-15`,
    coverageType, coverageProvider: coverageType === 'PARTICULAR' ? null : `${coverageType === 'INSURANCE' ? (index % 3 ? 'Médis' : 'Multicare') : coverageType === 'ADSE' ? 'ADSE' : 'Protocolo empresarial'} (simulação)`,
    coverageNumber: coverageType === 'PARTICULAR' ? null : `DEMO-${String(index + 1).padStart(4, '0')}`,
    referringDoctor: index % 3 ? 'Dra. Teresa Neves [DEMO]' : null,
    pathologyTags, medicalHistory: `[DEMO — pessoa e história fictícias] ${history}`,
    totalPrescribedSessions: 6 + index % 7, service: treatments[serviceIndex].slug };
}

module.exports = { treatments, patient };
