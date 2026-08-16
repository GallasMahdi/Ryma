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
      fr: 'Ryma est une professionnelle d\'une douceur et d\'un écoute exceptionnelles. Après mon 2ème accouchement, j\'avais de fortes douleurs et des fuites. En 8 séances, tout est rentré dans l\'ordre.',
      pt: 'A Ryma é uma profissional de uma empatia e competência excecionais. Após o meu segundo parto, tinha dores intensas e desconforto. Em 8 sessões, recuperei a qualidade de vida. Muito obrigada!',
      en: 'Ryma is an exceptionally caring and skilled professional. After my second childbirth, I had severe discomfort. Within 8 sessions, everything was completely resolved. Thank you so much!',
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
      fr: 'Après des mois d\'automédication inefficace pour mes douleurs de dos au bureau, les séances de RPG chez Ryma ont totalement changé ma posture et soulagé ma douleur.',
      pt: 'Após meses com dores de costas devidas ao trabalho de escritório, as sessões de RPG com a Fisioterapeuta Ryma mudaram radicalmente a minha postura e eliminaram a dor.',
      en: 'After months of back pain from working at a desk, GPR sessions with Ryma completely corrected my posture and relieved my pain.',
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
];
