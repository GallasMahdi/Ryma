export interface PricingPackage {
  id: string;
  name: { fr: string; ar: string };
  badge?: { fr: string; ar: string };
  description: { fr: string; ar: string };
  price: number;
  originalPrice?: number;
  sessions: number;
  features: { fr: string[]; ar: string[] };
  popular?: boolean;
  serviceSlug?: string;
}

export interface SinglePriceItem {
  name: { fr: string; ar: string };
  duration: string;
  price: number;
  pole: 'kinesitherapie' | 'minceur';
  slug: string;
}

export const PRICING_PACKAGES: PricingPackage[] = [
  {
    id: 'pack-minceur-starter',
    name: { fr: 'Pack Découverte Minceur', ar: 'باقة اكتشاف التنحيف' },
    badge: { fr: 'Idéal Débutantes', ar: 'مثالي للمبتدئات' },
    description: {
      fr: 'Une initiation complète aux soins minceur avec bilan personnalisé et drainage.',
      ar: 'مقدمة كاملة لعلاجات التنحيف مع تقييم مخصص وصرف لمفاوي.',
    },
    price: 290,
    originalPrice: 340,
    sessions: 5,
    features: {
      fr: [
        '1 Bilan Minceur offert (60 min)',
        '2 Séances de Cavitation Ultrasonique',
        '2 Séances de Pressothérapie',
        '1 Massage Amincissant',
        'Suivi des mesures',
      ],
      ar: [
        '1 تقييم تنحيف مجاني (60 دقيقة)',
        '2 جلسات تكهيف بالموجات فوق الصوتية',
        '2 جلسات علاج بالضغط',
        '1 تدليك منحف',
        'متابعة القياسات',
      ],
    },
  },
  {
    id: 'pack-sculpt-expert',
    name: { fr: 'Pack Silhouette Expert (10 séances)', ar: 'باقة نحت الجسم الاحترافية (10 جلسات)' },
    badge: { fr: 'Le Plus Populaire', ar: 'الأكثر شعبية' },
    popular: true,
    description: {
      fr: 'Programme intensif sur-mesure pour perte centimétrique et lissage de la cellulite.',
      ar: 'برنامج مكثف مخصص لفقدان السنتيمترات وتنعيم السيلوليت.',
    },
    price: 580,
    originalPrice: 720,
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
      ar: [
        '1 تقييم تنحيف مجاني',
        '4 جلسات تكهيف أو ليزر ليبو',
        '3 جلسات ترددات راديوية لشد الجسم',
        '3 جلسات علاج بالضغط / صرف لمفاوي',
        '1 جلسة تحليل الدهون بالتبريد مجانية',
        'متابعة بالصور قبل وبعد',
      ],
    },
  },
  {
    id: 'pack-post-partum',
    name: { fr: 'Pack Récupération Post-Partum', ar: 'باقة تعافي ما بعد الولادة' },
    badge: { fr: 'Spécial Mamans', ar: 'خاص بالأمهات' },
    description: {
      fr: 'Rééducation périnéale, renforcement abdominal hypopressif et soins fermeté.',
      ar: 'إعادة تأهيل العجان والبطن وتقوية العضلات والشد.',
    },
    price: 490,
    originalPrice: 600,
    sessions: 8,
    features: {
      fr: [
        '1 Bilan Périnéal & Postural complet',
        '4 Séances Kiné Post-Partum (Périnée/Abdos)',
        '2 Séances Radiofréquence Ventre',
        '2 Séances Pressothérapie Jambes Légères',
        'Conseils posture avec bébé',
      ],
      ar: [
        '1 تقييم شامل للعجان والوضعية',
        '4 جلسات علاجي طبيعي لما بعد الولادة',
        '2 جلسات ترددات راديوية للبطن',
        '2 جلسات علاج بالضغط للساقين',
        'نصائح الوضعية أثناء رعاية الطفل',
      ],
    },
  },
  {
    id: 'pack-kine-sante',
    name: { fr: 'Cure Kinésithérapie Douleur & Posture', ar: 'دورة العلاج الطبيعي للآلام والوضعية' },
    badge: { fr: 'Prise en charge CNAM possible', ar: 'إمكانية تغطية CNAM' },
    description: {
      fr: 'Programme thérapeutique pour douleurs chroniques, sciatique et mal de dos.',
      ar: 'برنامج علاجي للآلام المزمنة والعرق النسا وآلام الظهر.',
    },
    price: 360,
    originalPrice: 420,
    sessions: 6,
    features: {
      fr: [
        '1 Bilan Postural RPG',
        '4 Séances RPG ou Massage Thérapeutique',
        '2 Séances Électrothérapie / TENS / Ultrasons',
        'Programme d\'exercices à domicile',
      ],
      ar: [
        '1 تقييم وضعي شامل',
        '4 جلسات علاج طبيعي أو تدليك علاجي',
        '2 جلسات علاج كهربائي / موجات صوتية',
        'برنامج تمارين منزلية',
      ],
    },
  },
];
