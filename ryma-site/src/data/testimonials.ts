export interface Testimonial {
  id: string;
  name: string;
  role: { fr: string; pt: string; en: string };
  serviceSlug: string;
  rating: number; // 5
  date: string;
  comment: { fr: string; pt: string; en: string };
  location: string;
  verified: boolean;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'Sofia Antunes',
    role: {
      fr: 'Patiente Post-Partum',
      pt: 'Paciente de Reabilitação Pós-Parto',
      en: 'Postpartum Patient',
    },
    serviceSlug: 'reeducation-post-partum',
    rating: 5,
    date: '2026-06-14',
    location: 'Lisboa',
    verified: true,
    comment: {
      fr: 'Une équipe professionnelle d\'une douceur et d\'un écoute exceptionnelles. Après mon 2ème accouchement, j\'avais de fortes douleurs et des fuites. En 8 séances, tout est rentré dans l\'ordre.',
      pt: 'A equipa da Digital Clínica é de uma empatia e competência excecionais. Após o meu segundo parto, tinha dores intensas e desconforto. Em 8 sessões, recuperei a qualidade de vida. Muito obrigada!',
      en: 'The Digital Clinic team is exceptionally caring and skilled. After my second childbirth, I had severe discomfort. Within 8 sessions, everything was completely resolved. Thank you so much!',
    },
  },
  {
    id: 't-2',
    name: 'Ana Catarina Silva',
    role: {
      fr: 'Cure Minceur Cavitation & RF',
      pt: 'Tratamento de Cavitação & Radiofrequência',
      en: 'Cavitation & Radiofrequency Slimming',
    },
    serviceSlug: 'cavitation',
    rating: 5,
    date: '2026-07-02',
    location: 'Cascais',
    verified: true,
    comment: {
      fr: 'Résultats impressionnants ! J\'ai perdu 5 cm de tour de taille après la cure de 10 séances. La combinaison cavitation et radiofréquence a vraiment raffermi ma peau.',
      pt: 'Resultados impressionantes! Reduzi 5 cm de perímetro abdominal após o programa de 10 sessões. A combinação de cavitação e radiofrequência firmou verdadeiramente a pele.',
      en: 'Impressive results! I lost 5 cm around my waist after the 10-session course. The combination of cavitation and radiofrequency truly firmed up my skin.',
    },
  },
  {
    id: 't-3',
    name: 'Diogo Fernandes',
    role: {
      fr: 'Patient RPG (Lombalgie)',
      pt: 'Paciente de RPG (Lombalgia)',
      en: 'GPR Patient (Lumbar Pain)',
    },
    serviceSlug: 'reeducation-posturale',
    rating: 5,
    date: '2026-05-20',
    location: 'Sintra',
    verified: true,
    comment: {
      fr: 'Après des mois d\'automédication inefficace pour mes douleurs de dos au bureau, les séances de RPG à la Digital Clínica ont totalement changé ma posture et soulagé ma douleur.',
      pt: 'Após meses com dores de costas devidas ao trabalho de escritório, as sessões de RPG na Digital Clínica mudaram radicalmente a minha postura e eliminaram a dor.',
      en: 'After months of back pain from working at a desk, GPR sessions at Digital Clinic completely corrected my posture and relieved my pain.',
    },
  },
  {
    id: 't-4',
    name: 'Beatriz Ramos',
    role: {
      fr: 'Cure Drainage Lymphatique',
      pt: 'Tratamento de Drenagem Linfática',
      en: 'Lymphatic Drainage Treatment',
    },
    serviceSlug: 'drainage-lymphatique',
    rating: 5,
    date: '2026-07-25',
    location: 'Oeiras',
    verified: true,
    comment: {
      fr: 'Le drainage manuel selon la méthode Vodder est d\'une efficacité incroyable pour mes jambes lourdes. Le cabinet est d\'une propreté irréprochable.',
      pt: 'A drenagem manual pelo Método Vodder é de uma eficácia incrível para pernas cansadas. A clínica tem um ambiente calmo, acolhedor e impecável.',
      en: 'Manual lymphatic drainage using the Vodder method is incredibly effective for heavy legs. The clinic is spotless and deeply relaxing.',
    },
  },
  {
    id: 't-5',
    name: 'Inês Mendes',
    role: {
      fr: 'Cryolipolyse & Pressothérapie',
      pt: 'Criolipólise & Pressoterapia',
      en: 'Cryolipolysis & Pressotherapy',
    },
    serviceSlug: 'cryolipolyse',
    rating: 5,
    date: '2026-06-30',
    location: 'Lisboa',
    verified: true,
    comment: {
      fr: 'Explications très claires dès le bilan initial. La cryolipolyse a fonctionné au-delà de mes espérances en 2 mois.',
      pt: 'Explicações técnicas muito claras desde a avaliação inicial. O tratamento de criolipólise superou todas as minhas expectativas em apenas 2 meses.',
      en: 'Very clear clinical explanation during the initial assessment. Cryolipolysis worked beyond my expectations within 2 months.',
    },
  },
  {
    id: 't-6',
    name: 'Miguel Vaz',
    role: {
      fr: 'Patient Massage Thérapeutique',
      pt: 'Paciente de Massagem Terapêutica',
      en: 'Therapeutic Massage Patient',
    },
    serviceSlug: 'massage-therapeutique',
    rating: 5,
    date: '2026-08-01',
    location: 'Lisboa',
    verified: true,
    comment: {
      fr: 'Pratiquant de crossfit régulier, j\'avais des contractures dorsales persistantes. Les massages thérapeutiques et décontracturants ont accéléré ma récupération.',
      pt: 'Praticante regular de desporto, tinha contraturas musculares intensas na coluna. A massagem terapêutica desportiva acelerou drasticamente a minha recuperação física.',
      en: 'As a regular athlete, I suffered from stubborn muscular tension. The targeted sports massage significantly accelerated my physical recovery.',
    },
  },
  {
    id: 't-7',
    name: 'Mariana Costa',
    role: {
      fr: 'Cure Lipo Laser & Radiofréquence',
      pt: 'Tratamento de Lipo Laser & RF',
      en: 'Laser Lipo & Radiofrequency',
    },
    serviceSlug: 'laser-lipo',
    rating: 5,
    date: '2026-07-18',
    location: 'Cascais',
    verified: true,
    comment: {
      fr: 'Totalement indolore et très relaxant. En seulement 6 séances, j\'ai constaté une vraie réduction du volume au niveau des cuisses et une peau beaucoup plus ferme.',
      pt: 'Totalmente indolor e muito relaxante. Em apenas 6 sessões notei uma redução visível no volume das coxas e uma pele muito mais tonificada e firme.',
      en: 'Completely painless and deeply relaxing. In just 6 sessions, I noticed a visible reduction in thigh volume and noticeably firmer skin texture.',
    },
  },
  {
    id: 't-8',
    name: 'Rita Carvalho',
    role: {
      fr: 'Pressothérapie Médicale',
      pt: 'Paciente de Pressoterapia Médica',
      en: 'Medical Pressotherapy Patient',
    },
    serviceSlug: 'pressotherapie',
    rating: 5,
    date: '2026-08-10',
    location: 'Estoril',
    verified: true,
    comment: {
      fr: 'Un confort immédiat dès la première séance. La sensation de légèreté dure plusieurs jours. Le cadre de la clinique est exceptionnel.',
      pt: 'Conforto e alívio imediatos desde a primeira sessão. A sensação de leveza nas pernas prolonga-se por vários dias. O espaço da clínica é irrepreensível.',
      en: 'Immediate relief from the very first session. The light sensation in my legs lasted for days. The clinic atmosphere is truly exceptional.',
    },
  },
];
