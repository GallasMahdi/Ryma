export interface PricingPackage {
  id: string;
  name: { fr: string; pt: string; en: string };
  badge?: { fr: string; pt: string; en: string };
  description: { fr: string; pt: string; en: string };
  price: number;
  originalPrice?: number;
  sessions: number;
  features: { fr: string[]; pt: string[]; en: string[] };
  popular?: boolean;
  serviceSlug?: string;
}

export interface SinglePriceItem {
  name: { fr: string; pt: string; en: string };
  duration: string;
  price: number;
  pole: 'kinesitherapie' | 'minceur';
  slug: string;
}

export const PRICING_PACKAGES: PricingPackage[] = [
  {
    id: 'pack-minceur-starter',
    name: {
      fr: 'Pack Découverte Minceur',
      pt: 'Pacote Descoberta Emagrecimento',
      en: 'Slimming Discovery Pack',
    },
    badge: {
      fr: 'Idéal Débutantes',
      pt: 'Ideal para Iniciantes',
      en: 'Ideal for Beginners',
    },
    description: {
      fr: 'Une initiation complète aux soins minceur avec bilan personnalisé et drainage.',
      pt: 'Uma introdução completa aos cuidados de emagrecimento com avaliação personalizada e drenagem.',
      en: 'A complete introduction to body slimming care with personalized assessment and drainage.',
    },
    price: 95,
    originalPrice: 120,
    sessions: 5,
    features: {
      fr: [
        '1 Bilan Minceur offert (60 min)',
        '2 Séances de Cavitation Ultrasonique',
        '2 Séances de Pressothérapie',
        '1 Massage Amincissant',
        'Suivi des mesures',
      ],
      pt: [
        '1 Avaliação de Emagrecimento Gratuita (60 min)',
        '2 Sessões de Cavitação Ultrassónica',
        '2 Sessões de Pressoterapia',
        '1 Massagem Modeladora',
        'Acompanhamento de medições',
      ],
      en: [
        '1 Free Slimming Assessment (60 min)',
        '2 Ultrasonic Cavitation Sessions',
        '2 Pressotherapy Sessions',
        '1 Sculpting Massage',
        'Measurement tracking',
      ],
    },
  },
  {
    id: 'pack-sculpt-expert',
    name: {
      fr: 'Pack Silhouette Expert (10 séances)',
      pt: 'Pacote Silhueta Expert (10 sessões)',
      en: 'Expert Body Sculpt Pack (10 sessions)',
    },
    badge: {
      fr: 'Le Plus Populaire',
      pt: 'Mais Popular',
      en: 'Most Popular',
    },
    popular: true,
    description: {
      fr: 'Programme intensif sur-mesure pour perte centimétrique et lissage de la cellulite.',
      pt: 'Programa intensivo à medida para perda de centímetros e redução da celulite.',
      en: 'Intensive tailored program for centimeter loss and cellulite reduction.',
    },
    price: 180,
    originalPrice: 230,
    sessions: 10,
    features: {
      fr: [
        '1 Bilan Minceur offert',
        '4 Séances Cavitation ou Laser Lipo',
        '3 Séances Radiofréquence Raffermissante',
        '3 Séances Pressothérapie / Drainage',
        '1 Séances Cryolipolyse offerte',
        'Suivi photo Avant/Après',
      ],
      pt: [
        '1 Avaliação de Emagrecimento Gratuita',
        '4 Sessões de Cavitação ou Laser Lipo',
        '3 Sessões de Radiofrequência Firmadora',
        '3 Sessões de Pressoterapia / Drenagem',
        '1 Sessão de Criolipólise Grátis',
        'Registo fotográfico Antes/Depois',
      ],
      en: [
        '1 Free Slimming Assessment',
        '4 Cavitation or Lipo Laser Sessions',
        '3 Firming Radiofrequency Sessions',
        '3 Pressotherapy / Drainage Sessions',
        '1 Free Cryolipolysis Session',
        'Before/After photo tracking',
      ],
    },
  },
  {
    id: 'pack-post-partum',
    name: {
      fr: 'Pack Récupération Post-Partum',
      pt: 'Pacote Recuperação Pós-Parto',
      en: 'Postpartum Recovery Pack',
    },
    badge: {
      fr: 'Spécial Mamans',
      pt: 'Especial Mães',
      en: 'Moms Special',
    },
    description: {
      fr: 'Rééducation périnéale, renforcement abdominal hypopressif et soins fermeté.',
      pt: 'Reabilitação perineal, fortalecimento abdominal hipopressivo e cuidados firmadores.',
      en: 'Pelvic floor rehabilitation, hypopressive abdominal strengthening, and firming care.',
    },
    price: 150,
    originalPrice: 190,
    sessions: 8,
    features: {
      fr: [
        '1 Bilan Périnéal & Postural complet',
        '4 Séances Kiné Post-Partum (Périnée/Abdos)',
        '2 Séances Radiofréquence Ventre',
        '2 Séances Pressothérapie Jambes Légères',
        'Conseils posture avec bébé',
      ],
      pt: [
        '1 Avaliação Perineal e Postural completa',
        '4 Sessões de Fisioterapia Pós-Parto',
        '2 Sessões de Radiofrequência Abdominal',
        '2 Sessões de Pressoterapia para Pernas',
        'Conselhos de postura no dia a dia',
      ],
      en: [
        '1 Full Pelvic Floor & Postural Assessment',
        '4 Postpartum Physiotherapy Sessions',
        '2 Abdominal Radiofrequency Sessions',
        '2 Leg Pressotherapy Sessions',
        'Postural guidance with baby',
      ],
    },
  },
  {
    id: 'pack-kine-sante',
    name: {
      fr: 'Cure Kinésithérapie Douleur & Posture',
      pt: 'Programa Fisioterapia Dor & Postura',
      en: 'Physiotherapy Pain & Posture Care',
    },
    badge: {
      fr: 'Reçu Mutuelle / Assurance',
      pt: 'Recibos p/ Seguro de Saúde',
      en: 'Health Insurance Receipts',
    },
    description: {
      fr: 'Programme thérapeutique pour douleurs chroniques, sciatique et mal de dos.',
      pt: 'Programa terapêutico para dores crónicas, ciática e dores de costas.',
      en: 'Therapeutic program for chronic pain, sciatica, and back pain relief.',
    },
    price: 120,
    originalPrice: 150,
    sessions: 6,
    features: {
      fr: [
        '1 Bilan Postural RPG',
        '4 Séances RPG ou Massage Thérapeutique',
        '2 Séances Électrothérapie / TENS / Ultrasons',
        'Programme d\'exercices à domicile',
      ],
      pt: [
        '1 Avaliação Postural RPG',
        '4 Sessões de RPG ou Massagem Terapêutica',
        '2 Sessões de Eletroterapia / TENS / Ultrassom',
        'Programa de exercícios para casa',
      ],
      en: [
        '1 GPR Postural Assessment',
        '4 GPR or Therapeutic Massage Sessions',
        '2 Electrotherapy / TENS / Ultrasound Sessions',
        'Home exercise program',
      ],
    },
  },
];
