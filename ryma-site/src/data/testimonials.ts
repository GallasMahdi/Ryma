export interface Testimonial {
  id: string;
  name: string;
  role: { fr: string; ar: string };
  serviceSlug: string;
  rating: number; // 5
  date: string;
  comment: { fr: string; ar: string };
  location: string;
  verified: boolean;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'Sarra Ben Ammar',
    role: { fr: 'Patiente Post-Partum', ar: 'مريضة ما بعد الولادة' },
    serviceSlug: 'reeducation-post-partum',
    rating: 5,
    date: '2026-06-14',
    location: 'Ezzahra',
    verified: true,
    comment: {
      fr: 'Ryma est une professionnelle d\'une douceur et d\'un écoute exceptionnelles. Après mon 2ème accouchement, j\'avais de fortes douleurs et des fuites. En 8 séances, tout est rentré dans l\'ordre. Un grand merci !',
      ar: 'ريما أخصائية ممتازة ومستمعة لطيفة جداً. بعد ولادتي الثانية، كنت أعاني من آلام شديدة وتسرب البول. في 8 جلسات استعدت عافيتي تماماً. شكراً جزيلاً!',
    },
  },
  {
    id: 't-2',
    name: 'Amel Karoui',
    role: { fr: 'Cure Minceur Cavitation & RF', ar: 'دورة تنحيف بالتكهيف والترددات الراديوية' },
    serviceSlug: 'cavitation',
    rating: 5,
    date: '2026-07-02',
    location: 'Rades',
    verified: true,
    comment: {
      fr: 'Résultats impressionnants ! J\'ai perdu 5 cm de tour de taille après la cure de 10 séances. La combinaison cavitation et radiofréquence a vraiment raffermi ma peau.',
      ar: 'نتائج مذهلة! فقدت 5 سم من محيط الخصر بعد دورة 10 جلسات. الجمع بين التكهيف والترددات الراديوية شد بشرتي حقاً.',
    },
  },
  {
    id: 't-3',
    name: 'Mehdi Ben Romdhane',
    role: { fr: 'Patient RPG (Lombalgie)', ar: 'مريض إعادة التأهيل الوضعي (آلام الظهر)' },
    serviceSlug: 'reeducation-posturale',
    rating: 5,
    date: '2026-05-20',
    location: 'Mégrine',
    verified: true,
    comment: {
      fr: 'Après des mois d\'automédication inefficace pour mes douleurs de dos au bureau, les séances de RPG chez Ryma ont totalement changé ma posture et soulagé ma douleur.',
      ar: 'بعد أشهر من العلاج الذاتي غير الفعال لآلام ظهري في المكتب، غيّرت جلسات إعادة التأهيل الوضعي مع ريما وضعيتي تماماً وخففت ألمي.',
    },
  },
  {
    id: 't-4',
    name: 'Lilia Bouzid',
    role: { fr: 'Cure Drainage Lymphatique', ar: 'دورة الصرف اللمفاوي' },
    serviceSlug: 'drainage-lymphatique',
    rating: 5,
    date: '2026-07-25',
    location: 'Hammam Lif',
    verified: true,
    comment: {
      fr: 'Le drainage manuel selon la méthode Vodder est d\'une efficacité incroyable pour mes jambes lourdes. Le cabinet est d\'une propreté irréprochable et l\'ambiance très apaisante.',
      ar: 'الصرف اليدوي بتقنية فودر فعال بشكل مذهل لساقي الثقيلتين. العيادة نظيفة جداً والجو مريح ومطمئن.',
    },
  },
  {
    id: 't-5',
    name: 'Ines Trabelsi',
    role: { fr: 'Cryolipolyse & Pressothérapie', ar: 'تحليل الدهون بالتبريد والعلاج بالضغط' },
    serviceSlug: 'cryolipolyse',
    rating: 5,
    date: '2026-06-30',
    location: 'Ezzahra',
    verified: true,
    comment: {
      fr: 'Explications très claires dès le bilan initial. La cryolipolyse sur les poignées d\'amour a fonctionné au-delà de mes espérances en 2 mois.',
      ar: 'توضيحات واضحة جداً منذ التقييم الأول. تحليل الدهون بالتبريد على الخاصرة أعطى نتائج فاقت توقعاتي خلال شهرين.',
    },
  },
];
