import { PrescriptionItemCategory } from '@/types/admin';

export interface PrescriptionTemplateItem {
  id: string;
  category: PrescriptionItemCategory;
  title: {
    pt: string;
    fr: string;
    en: string;
  };
  defaultInstructions: {
    pt: string;
    fr: string;
    en: string;
  };
  description: {
    pt: string;
    fr: string;
    en: string;
  };
}

export const PRESCRIPTION_LIBRARY: PrescriptionTemplateItem[] = [
  // ─── 1. Produtos & Cuidados Tópicos (Care Products) ──────────────────────────
  {
    id: 'cryo-gel',
    category: 'care_product',
    title: {
      pt: 'Gel Cryo / Frio Descongestionante',
      fr: 'Gel Cryo / Froid Décongestionnant',
      en: 'Cryo Cooling Therapeutic Gel',
    },
    defaultInstructions: {
      pt: 'Aplicar 2 a 3 vezes ao dia na zona dolorosa com massagem circular suave até total absorção.',
      fr: 'Appliquer 2 à 3 fois par jour sur la zone douloureuse en massage circulaire doux.',
      en: 'Apply 2-3 times daily on the painful area with gentle circular massage.',
    },
    description: {
      pt: 'Efeito frio imediato para alívio de tendinites, contraturas e inflamações articulares.',
      fr: 'Effet froid immédiat pour soulager tendinites, contractures et inflammations.',
      en: 'Instant cooling effect for tendonitis, muscle tension, and inflammation.',
    },
  },
  {
    id: 'arnica-balm',
    category: 'care_product',
    title: {
      pt: 'Óleo / Bálsamo de Arnica & Gaultéria Bio',
      fr: 'Huile / Baume d\'Arnica & Gaulthérie Bio',
      en: 'Organic Arnica & Wintergreen Balm',
    },
    defaultInstructions: {
      pt: 'Aplicar à noite antes de dormir, mantendo a zona quente após a massagem.',
      fr: 'Appliquer le soir avant le coucher, garder la zone au chaud après massage.',
      en: 'Apply in the evening before bed, keeping the area warm after massaging.',
    },
    description: {
      pt: 'Anti-inflamatório muscular natural para nódulos de tensão e fadiga muscular.',
      fr: 'Anti-inflammatoire musculaire naturel pour nœuds de tension et courbatures.',
      en: 'Natural muscle anti-inflammatory for trigger points and stiffness.',
    },
  },
  {
    id: 'firming-draining-cream',
    category: 'care_product',
    title: {
      pt: 'Creme Drenante & Refirmante com Cafeína',
      fr: 'Crème Drainante & Raffermissante à la Caféine',
      en: 'Draining & Firming Caffeine Cream',
    },
    defaultInstructions: {
      pt: 'Aplicar diariamente de manhã com movimentos ascendentes (dos tornozelos às coxas / abdómen).',
      fr: 'Appliquer chaque matin en mouvements ascendants (des chevilles vers les cuisses / ventre).',
      en: 'Apply daily in the morning with upward strokes (ankles to thighs / abdomen).',
    },
    description: {
      pt: 'Potencializa e prolonga os resultados da drenagem linfática e remodelagem corporal.',
      fr: 'Optimise et prolonge les résultats du drainage lymphatique et remodelage.',
      en: 'Enhances and extends lymphatic drainage and body contouring results.',
    },
  },
  {
    id: 'magnesium-marine',
    category: 'care_product',
    title: {
      pt: 'Magnésio Marinho & Vitamina B6',
      fr: 'Magnésium Marin & Vitamine B6',
      en: 'Marine Magnesium & Vitamin B6',
    },
    defaultInstructions: {
      pt: '1 cápsula ao almoço e 1 cápsula ao jantar com um copo de água, durante 30 dias.',
      fr: '1 gélule le midi et 1 gélule le soir avec un grand verre d\'eau, pendant 30 jours.',
      en: '1 capsule at lunch and 1 capsule at dinner with water, for 30 days.',
    },
    description: {
      pt: 'Favorece o relaxamento neuromuscular, reduz cãibras e combate a fadiga.',
      fr: 'Favorise la décontraction neuromusculaire et réduit les crampes.',
      en: 'Promotes neuromuscular relaxation and reduces muscle cramps.',
    },
  },

  // ─── 2. Material Ergonómico & Auto-Reabilitação (Ergonomic Equipment) ────────
  {
    id: 'lumbar-cushion',
    category: 'ergonomic_equipment',
    title: {
      pt: 'Almofada Lombar Ergonómica com Memória de Forma',
      fr: 'Coussin Ergonomique Lombaire à Mémoire de Forme',
      en: 'Memory Foam Ergonomic Lumbar Support Cushion',
    },
    defaultInstructions: {
      pt: 'Posicionar na curva lombar da cadeira de trabalho e ajustar a altura para manter a coluna ereta.',
      fr: 'Positionner dans le creux lombaire du fauteuil de bureau pour maintenir la lordose.',
      en: 'Position in the lumbar curve of your office chair to maintain upright spine alignment.',
    },
    description: {
      pt: 'Previne a sobrecarga discal L4-L5/S1 e reduz a fadiga postural em trabalho de secretária.',
      fr: 'Prévient la surcharge discale et soulage les lombalgies posturales assises.',
      en: 'Prevents spinal disc compression and relieves seated lower back strain.',
    },
  },
  {
    id: 'theraband-elastic',
    category: 'ergonomic_equipment',
    title: {
      pt: 'Banda Elástica de Resistência (Theraband Média)',
      fr: 'Bande Élastique de Résistance (Theraband Moyenne)',
      en: 'Resistance Exercise Band (Medium Theraband)',
    },
    defaultInstructions: {
      pt: '3 séries de 12 repetições dos exercícios prescritos, 3 a 4 vezes por semana.',
      fr: '3 séries de 12 répétitions des exercices prescrits, 3 à 4 fois par semaine.',
      en: '3 sets of 12 reps of prescribed posture exercises, 3-4 times weekly.',
    },
    description: {
      pt: 'Reforço dos fixadores da omoplata, manguito rotador e estabilizadores pélvicos.',
      fr: 'Renforcement des fixateurs d\'omoplate, coiffe des rotateurs et fessiers.',
      en: 'Strengthening scapular stabilizers, rotator cuff, and postural muscles.',
    },
  },
  {
    id: 'foam-roller',
    category: 'ergonomic_equipment',
    title: {
      pt: 'Rolo de Auto-Libertação Miofascial (Foam Roller)',
      fr: 'Rouleau d\'Auto-Massage Myofascial (Foam Roller)',
      en: 'Myofascial Release Foam Roller',
    },
    defaultInstructions: {
      pt: 'Passar lentamente 1 a 2 minutos em cada grupo muscular (costas, quadríceps, isquiotibiais).',
      fr: 'Passer lentement 1 à 2 minutes par groupe musculaire (dos, cuisses, mollets).',
      en: 'Roll slowly for 1-2 minutes per muscle group (thoracic spine, quads, hamstrings).',
    },
    description: {
      pt: 'Liberta aderências da fáscia, estimula a circulação e melhora a mobilidade articular.',
      fr: 'Libère les adhérences fasciales et améliore la mobilité articulaire.',
      en: 'Releases fascial tightness and boosts muscular blood flow.',
    },
  },
  {
    id: 'trigger-point-ball',
    category: 'ergonomic_equipment',
    title: {
      pt: 'Bola de Massagem Trigger Point (Lacrosse Ball)',
      fr: 'Balle de Massage Trigger Point (Balle Lacrosse)',
      en: 'Trigger Point Massage Ball (Lacrosse Ball)',
    },
    defaultInstructions: {
      pt: 'Pressionar contra a parede ou chão no ponto doloroso durante 30 a 60 segundos com respiração profunda.',
      fr: 'Maintenir la pression contre un mur sur le point douloureux 30 à 60s en respirant calmement.',
      en: 'Apply sustained pressure against a wall/floor on trigger points for 30-60 seconds.',
    },
    description: {
      pt: 'Específico para nódulos em trapézios, glúteo médio, piriforme e fáscia plantar.',
      fr: 'Ciblage précis des trigger points (trapèzes, fessiers, voûte plantaire).',
      en: 'Targeted deep relief for gluteal, piriformis, and upper back trigger points.',
    },
  },
  {
    id: 'hot-cold-pack',
    category: 'ergonomic_equipment',
    title: {
      pt: 'Compressa Térmica Frio / Quente Reutilizável',
      fr: 'Poche Thermique Chaud / Froid Réutilisable',
      en: 'Reusable Hot / Cold Gel Pack',
    },
    defaultInstructions: {
      pt: 'Frio (gelo) para dor aguda (15 min com toalha) / Calor para contraturas crónicas (20 min).',
      fr: 'Froid pour douleur aiguë (15 min avec linge) / Chaud pour contractures (20 min).',
      en: 'Cold for acute pain (15 min wrapped in cloth) / Heat for chronic stiffness (20 min).',
    },
    description: {
      pt: 'Termoterapia direcionada para controle da dor e relaxamento tecidual em casa.',
      fr: 'Thermothérapie à domicile pour gestion de la douleur et relâchement musculaire.',
      en: 'Versatile home thermotherapy for swelling and chronic tension relief.',
    },
  },

  // ─── 3. Hábitos & Ergonomia de Vida (Lifestyle Habits) ──────────────────────
  {
    id: 'hydration-protocol',
    category: 'lifestyle_habit',
    title: {
      pt: 'Protocolo de Hidratação Celular & Drenante',
      fr: 'Protocole d\'Hydratation Cellulaire & Drainant',
      en: 'Cellular Hydration & Draining Protocol',
    },
    defaultInstructions: {
      pt: 'Ingerir pelo menos 2 litros de água pura ou infusões drenantes ao longo do dia, fora das refeições.',
      fr: 'Boire au moins 2 litres d\'eau ou tisanes drainantes réparties sur la journée.',
      en: 'Drink at least 2 liters of water or herbal teas evenly distributed throughout the day.',
    },
    description: {
      pt: 'Essencial para a eliminação de toxinas, elasticidade da fáscia e regeneração dos discos.',
      fr: 'Indispensable pour l\'élimination des toxines et l\'élasticité des fascias.',
      en: 'Crucial for toxin elimination, fascial elasticity, and intervertebral disc hydration.',
    },
  },
  {
    id: 'active-micro-breaks',
    category: 'lifestyle_habit',
    title: {
      pt: 'Micro-Pausas Posturais Ativas (Regra 45/2)',
      fr: 'Micro-Pauses Posturales Actives (Règle 45/2)',
      en: 'Active Posture Micro-Breaks (45/2 Rule)',
    },
    defaultInstructions: {
      pt: 'A cada 45 minutos de trabalho sentado, levantar-se, caminhar 2 minutos e realizar 3 extensões torácicas.',
      fr: 'Toutes les 45 min assis, se lever, marcher 2 min et faire 3 extensions thoraciques.',
      en: 'Every 45 minutes of sitting, stand up, walk for 2 minutes and do 3 thoracic extensions.',
    },
    description: {
      pt: 'Quebra o ciclo de estase circulatória, ativa a bomba venosa da barriga da perna e descomprime a coluna.',
      fr: 'Décompresse le rachis lombaire et relance la circulation veineuse.',
      en: 'Reactivates blood circulation and relieves cumulative spinal load.',
    },
  },
  {
    id: 'sleep-ergonomics',
    category: 'lifestyle_habit',
    title: {
      pt: 'Ergonomia de Sono & Alinhamento Espinal',
      fr: 'Ergonomie de Sommeil & Alignement Vertébral',
      en: 'Sleep Ergonomics & Spinal Alignment',
    },
    defaultInstructions: {
      pt: 'Dormir de lado (decúbito lateral) com almofada entre os joelhos, ou de costas com almofada sob os joelhos.',
      fr: 'Dormir sur le côté avec un coussin entre les genoux, ou sur le dos avec coussin sous les genoux.',
      en: 'Sleep on your side with a pillow between knees, or on your back with a pillow under knees.',
    },
    description: {
      pt: 'Mantém a bacia neutra e alivia a rotação e compressão do nervo ciático durante a noite.',
      fr: 'Maintient le bassin aligné et soulage les tensions lombaires nocturnes.',
      en: 'Maintains neutral pelvic alignment and alleviates nighttime lower back pressure.',
    },
  },
];
