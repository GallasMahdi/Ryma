export type ServicePole = 'kinesitherapie' | 'minceur' | 'bilan';

export type LocalizedString = {
  fr: string;
  pt?: string;
  en?: string;
  ar?: string;
};

export type LocalizedList = {
  fr: string[];
  pt?: string[];
  en?: string[];
  ar?: string[];
};

export interface ServiceFAQ {
  q: LocalizedString;
  a: LocalizedString;
}

export interface Service {
  slug: string;
  pole: ServicePole;
  icon: string; // SVG path or name
  bodyMapPoint: { x: number; y: number; view: 'front' | 'back' | 'both' };
  name: LocalizedString;
  shortDesc: LocalizedString;
  longDesc: LocalizedString;
  duration: string; // "45 min"
  price: number;
  sessionFlow: LocalizedList;
  indications: LocalizedList;
  contraindications: LocalizedList;
  faq: ServiceFAQ[];
  hasBeforeAfter: boolean;
  keywords: string[];
}

export function getLocalizedText(obj: LocalizedString | undefined, lang: string): string {
  if (!obj) return '';
  if (lang === 'pt' && obj.pt) return obj.pt;
  if (lang === 'en' && obj.en) return obj.en;
  return obj.fr || obj.pt || obj.en || '';
}

export function getLocalizedList(obj: LocalizedList | undefined, lang: string): string[] {
  if (!obj) return [];
  if (lang === 'pt' && obj.pt) return obj.pt;
  if (lang === 'en' && obj.en) return obj.en;
  return obj.fr || obj.pt || obj.en || [];
}


export const SERVICES: Service[] = [
  {
    slug: 'reeducation-posturale',
    pole: 'kinesitherapie',
    icon: 'spine',
    bodyMapPoint: { x: 50, y: 28, view: 'back' },
    name: {
      fr: 'Rééducation Posturale Globale',
      pt: 'Reeducação Postural Global (RPG)',
      en: 'Global Postural Reeducation (GPR)',
      ar: 'إعادة التأهيل الوضعي الشامل',
    },
    shortDesc: {
      fr: 'Correction des déséquilibres musculaires et articulaires pour retrouver une posture saine et sans douleur.',
      pt: 'Correção de desequilíbrios musculares e articulares para restabelecer uma postura saudável e sem dor.',
      en: 'Correction of muscular and articular imbalances to restore a healthy, pain-free posture.',
      ar: 'تصحيح الاختلالات العضلية والمفصلية لاستعادة وضعية صحية وخالية من الألم.',
    },
    longDesc: {
      fr: `La Rééducation Posturale Globale (RPG) est une méthode thérapeutique douce qui s'attaque aux causes profondes des douleurs chroniques et des déformations posturales. Contrairement aux approches segmentaires classiques, la RPG traite le corps comme un tout, en identifiant les chaînes musculaires responsables des tensions et des compensations.

Développée par Philippe Souchard, cette technique repose sur des postures actives maintenues dans le temps, qui permettent de relâcher progressivement les tensions profondément enracinées dans les muscles. Elle convient aussi bien aux adolescents souffrant de scoliose légère qu'aux adultes victimes de douleurs lombaires chroniques ou de séquelles de blessures sportives.

À la Digital Clínica, chaque bilan postural est personnalisé : analyse de votre silhouette debout et en mouvement, identification des chaînes courtes, et élaboration d'un programme sur mesure. Les résultats sont durables car ils traitent la cause, pas seulement le symptôme.`,
      pt: `A Reeducação Postural Global (RPG) é um método fisioterapêutico especializado que atua sobre as causas profundas de dores crónicas e alterações da postura. Ao contrário das abordagens convencionais focadas num único segmento, a RPG considera o corpo como um sistema global integrado, identificando as cadeias musculares responsáveis por compensações e retrações.

Desenvolvida por Philippe Souchard, a técnica baseia-se em posturas ativas e progressivas que promovem o alongamento das cadeias musculares encurtadas e o reforço da musculatura profunda. É amplamente indicada para escolioses, hérnias discais, lombalgias, cervicalgias e desequilíbrios posturais decorrentes de hábitos profissionais sedentários.

Na Digital Clínica, cada plano postural é precedido de uma avaliação minuciosa com vista a obter resultados clínicos sólidos e duradouros.`,
      en: `Global Postural Reeducation (GPR) is an evidence-based physical therapy method that addresses the root biomechanical causes of chronic musculoskeletal pain and postural misalignments.

Developed by Philippe Souchard, GPR utilizes active, progressive therapeutic postures to gently release shortened muscle chains and restore balanced neuromuscular coordination. It is highly effective for scoliosis, herniated discs, chronic low back pain, cervical tension, and posture issues related to desk work.

At Digital Clinic, every treatment plan begins with an exhaustive biomechanical assessment tailored to your individual clinical profile.`,
      ar: `إعادة التأهيل الوضعي الشامل هي طريقة علاجية لطيفة تعالج الأسباب الجذرية للآلام المزمنة والتشوهات الوضعية. على عكس الأساليب التقليدية، تعامل هذه التقنية الجسم ككل متكامل.

طورها فيليب سوشار، وتعتمد على وضعيات نشطة يتم الحفاظ عليها بمرور الوقت لتحرير التوترات العميقة في العضلات. مناسبة للمراهقين الذين يعانون من الجنف الخفيف والبالغين الذين يعانون من آلام أسفل الظهر المزمنة.

في العيادة الرقمية، كل تقييم وضعي مخصص: تحليل صورتك وقوفاً وأثناء الحركة، وتحديد السلاسل القصيرة، ووضع برنامج مخصص. النتائج دائمة لأنها تعالج السبب وليس فقط الأعراض.`,
    },
    duration: '50 min',
    price: 65,
    sessionFlow: {
      fr: [
        'Bilan postural complet (debout, en charge, en mouvement)',
        'Identification des chaînes musculaires raccourcies',
        'Mise en posture active sur table ou debout',
        'Maintien de la posture 20–30 minutes avec guidance',
        'Étirements spécifiques complémentaires',
        'Conseils posturaux pour le quotidien',
      ],
      pt: [
        'Avaliação postural minuciosa (em carga e movimento)',
        'Identificação de retrações e cadeias musculares encurtadas',
        'Execução de posturas ativas guiadas',
        'Manutenção postural assistida (20–30 minutos)',
        'Alongamentos analíticos complementares',
        'Orientações ergonómicas e posturais para o dia a dia',
      ],
      en: [
        'Comprehensive postural and gait assessment',
        'Identification of shortened myofascial chains',
        'Guided active therapeutic posture execution',
        'Assisted postural hold and neuromuscular release',
        'Targeted complementary stretching',
        'Daily ergonomic and postural guidelines',
      ],
      ar: [
        'تقييم وضعي شامل (وقوفاً، أثناء الحمل، أثناء الحركة)',
        'تحديد السلاسل العضلية المقصرة',
        'اتخاذ وضعية نشطة على الطاولة أو وقوفاً',
        'الحفاظ على الوضعية 20-30 دقيقة مع التوجيه',
        'تمددات محددة تكميلية',
        'نصائح وضعية للحياة اليومية',
      ],
    },
    indications: {
      fr: [
        'Douleurs lombaires chroniques',
        'Cervicalgies et torticolis récidivants',
        'Scoliose légère à modérée',
        'Hernie discale',
        'Douleurs de hanches et genoux',
        'Après une grossesse',
      ],
      pt: [
        'Lombalgias crónicas e ciatalgias',
        'Cervicalgias e torcicolos recorrentes',
        'Escoliose, cifose e hiperlordose',
        'Hérnias discais e protusões',
        'Dores articulares de anca e joelho',
        'Recuperação postural após gravidez',
      ],
      en: [
        'Chronic lower back pain and sciatica',
        'Cervical spine stiffness and neck pain',
        'Scoliosis and postural deformities',
        'Herniated and bulging discs',
        'Hip and knee joint tension',
        'Postpartum postural recovery',
      ],
      ar: [
        'آلام أسفل الظهر المزمنة',
        'آلام الرقبة والتواء الرقبة المتكرر',
        'الجنف الخفيف إلى المتوسط',
        'الفتق القرصي',
        'آلام الوركين والركبتين',
        'بعد الحمل',
      ],
    },
    contraindications: {
      fr: [
        'Fracture récente non consolidée',
        'Cancer en phase active',
        'Grossesse au 1er trimestre (avec accord médical)',
        'Ostéoporose sévère',
      ],
      pt: [
        'Fratura óssea recente não consolidada',
        'Patologia oncológica em fase aguda',
        'Gravidez no 1º trimestre (sem validação médica)',
        'Osteoporose severa não controlada',
      ],
      en: [
        'Recent unhealed bone fracture',
        'Active malignancy without medical clearance',
        'First trimester pregnancy (unless cleared)',
        'Severe advanced osteoporosis',
      ],
      ar: [
        'كسر حديث غير ملتئم',
        'السرطان في المرحلة النشطة',
        'الحمل في الثلث الأول (بموافقة طبية)',
        'هشاشة العظام الشديدة',
      ],
    },
    faq: [
      {
        q: { fr: 'Combien de séances sont nécessaires ?', pt: 'Quantas sessões são necessárias?', en: 'How many sessions are recommended?', ar: 'كم عدد الجلسات اللازمة؟' },
        a: {
          fr: "En général, un cycle de 10 à 15 séances est recommandé, à raison d'une séance par semaine. Les premiers résultats se sentent dès la 3e ou 4e séance.",
          pt: 'Recomenda-se habitualmente um ciclo de 8 a 12 sessões, com frequência semanal. As melhorias clínicas são percetíveis a partir da 3ª sessão.',
          en: 'A standard course consists of 8 to 12 weekly sessions. Clinical improvements are typically noticed by the 3rd or 4th session.',
          ar: 'بشكل عام، يُوصى بدورة من 10 إلى 15 جلسة، بمعدل جلسة واحدة في الأسبوع. تُلاحَظ النتائج الأولى منذ الجلسة الثالثة أو الرابعة.',
        },
      },
      {
        q: { fr: 'La séance est-elle douloureuse ?', pt: 'O tratamento causa dor?', en: 'Is the treatment painful?', ar: 'هل الجلسة مؤلمة؟' },
        a: {
          fr: "La RPG n'est pas douloureuse. Vous pouvez ressentir une légère tension ou inconfort lors du maintien des postures, mais jamais de douleur vive.",
          pt: 'A RPG é uma técnica suave e não agressiva. Pode sentir tensão durante a manutenção das posturas, mas nunca dor aguda.',
          en: 'GPR is gentle and non-invasive. You may experience muscle tension during posture holds, but never sharp pain.',
          ar: 'لا تسبب هذه التقنية الألم. قد تشعر ببعض التوتر الخفيف أو الانزعاج أثناء الحفاظ على الوضعيات، لكن لا ألم حاد أبداً.',
        },
      },
      {
        q: { fr: 'Est-ce remboursé par les assurances ou mutuelles ?', pt: 'As sessões são comparticipadas por seguros de saúde?', en: 'Is it covered by health insurance?' },
        a: {
          fr: 'Oui, sur prescription médicale, vous pouvez soumettre les factures acquittées à votre assurance ou mutuelle de santé pour remboursement.',
          pt: 'Sim. Mediante prescrição médica, emitimos fatura com os dados clínicos necessários para submissão à sua seguradora de saúde ou subsistema (Regime Livre).',
          en: 'Yes. With a medical prescription, we provide certified clinical receipts that you can submit to your private health insurance for reimbursement.',
        },
      },
      {
        q: { fr: 'Dois-je apporter une ordonnance médicale ?', pt: 'É obrigatório ter receita médica?', en: 'Do I need a doctor\'s prescription?' },
        a: {
          fr: "Une ordonnance n'est pas obligatoire pour une consultation privée, mais elle est recommandée pour le remboursement par votre assurance.",
          pt: 'Uma prescrição médica não é estritamente obrigatória para consultas privadas, mas é necessária caso pretenda obter reembolso junto da sua seguradora.',
          en: 'A prescription is not strictly required for private self-pay visits, but is necessary if you intend to claim reimbursement from your insurance.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['reeducação postural Lisboa', 'RPG Lisboa', 'fisioterapia postura', 'coluna e costas'],
  },
  {
    slug: 'reeducation-post-partum',
    pole: 'kinesitherapie',
    icon: 'pelvis',
    bodyMapPoint: { x: 50, y: 62, view: 'front' },
    name: {
      fr: 'Rééducation Périnéale & Post-Partum',
      pt: 'Reabilitação Perineal & Pós-Parto',
      en: 'Pelvic Floor & Postpartum Rehabilitation',
      ar: 'إعادة تأهيل العجان وما بعد الولادة',
    },
    shortDesc: {
      fr: "Programme complet de rééducation après l'accouchement : périnée, abdominaux profonds, récupération globale.",
      pt: 'Programa completo de recuperação pós-parto: fortalecimento do pavimento pélvico, abdómen profundo e recuperação funcional.',
      en: 'Comprehensive postpartum rehabilitation: pelvic floor strengthening, deep core recovery, and functional realignment.',
      ar: 'برنامج متكامل لإعادة التأهيل بعد الولادة: العجان، عضلات البطن العميقة، التعافي الشامل.',
    },
    longDesc: {
      fr: `La grossesse et l'accouchement mettent à rude épreuve le périnée, les abdominaux et le plancher pelvien. La rééducation post-partum est une étape cruciale, souvent sous-estimée, pour prévenir les fuites urinaires, les douleurs pelviennes et les diastasis abdominaux.

À la Digital Clínica, le programme de rééducation périnéale commence dès la 6e semaine après l'accouchement (ou après la réévaluation médicale). Il comprend une évaluation fonctionnelle du plancher pelvien, des exercices de renforcement progressifs et des techniques de rééducation abdominale hypopressive.

La rééducation n'est pas seulement physique : nous abordons aussi la posture, la reprise d'activité physique et les conseils nutritionnels pour vous aider à retrouver votre bien-être dans les meilleures conditions.`,
      pt: `A gravidez e o parto exercem uma exigência mecânica intensa sobre os músculos do pavimento pélvico e a parede abdominal. A reabilitação pós-parto é fundamental para prevenir incontinência urinária, prolapsos, dores pélvicas e diástase dos retos abdominais.

Na Digital Clínica, o protocolo tem início habitualmente a partir da 6ª semana pós-parto. Inclui avaliação funcional perineal, exercícios guiados de reforço, ginástica abdominal hipopressiva e reajuste da estática pélvica e lombar.`,
      en: `Pregnancy and childbirth subject the pelvic floor and abdominal wall to substantial mechanical stress. Specialized postpartum rehabilitation is vital to prevent urinary incontinence, organ prolapse, pelvic pain, and abdominal diastasis recti.

At Digital Clinic, programs typically begin from the 6th postpartum week onwards, integrating tailored pelvic floor muscle training, hypopressive abdominal therapy, and postural re-education.`,
      ar: `الحمل والولادة يضعان ضغطاً كبيراً على العجان والبطن وقاع الحوض. إعادة التأهيل بعد الولادة خطوة حاسمة، كثيراً ما تُستهان بها، لمنع تسرب البول وآلام الحوض وفجوات البطن.

في العيادة الرقمية، يبدأ برنامج إعادة تأهيل العجان من الأسبوع السادس بعد الولادة. يشمل تقييماً وظيفياً لقاع الحوض، وتمارين تقوية تدريجية، وتقنيات إعادة تأهيل البطن الهيبوبريسيف.

إعادة التأهيل ليست جسدية فحسب: نتناول أيضاً الوضعية واستئناف النشاط البدني والنصائح الغذائية.`,
    },
    duration: '45 min',
    price: 60,
    sessionFlow: {
      fr: [
        'Bilan fonctionnel du plancher pelvien',
        'Électrostimulation périnéale si nécessaire',
        'Exercices de Kegel guidés et progressifs',
        'Rééducation abdominale hypopressive (RAH)',
        'Travail postural global',
        'Conseils pour la reprise du sport',
      ],
      pt: [
        'Avaliação funcional e tónus do pavimento pélvico',
        'Biofeedback e estimulação perineal caso indicado',
        'Exercícios de Kegel supervisionados e progressivos',
        'Ginástica abdominal hipopressiva para diástase',
        'Trabalho de alinhamento postural da bacia',
        'Orientações para o retorno seguro à atividade física',
      ],
      en: [
        'Pelvic floor muscle tone and functional assessment',
        'Targeted biofeedback or stimulation if indicated',
        'Guided progressive pelvic floor strengthening',
        'Hypopressive core therapy for diastasis recti',
        'Pelvic and lumbar postural alignment',
        'Safe return-to-exercise guidelines',
      ],
      ar: [
        'تقييم وظيفي لقاع الحوض',
        'تحفيز كهربائي للعجان عند الحاجة',
        'تمارين كيجل موجهة وتدريجية',
        'إعادة تأهيل البطن الهيبوبريسيف',
        'العمل الوضعي الشامل',
        'نصائح لاستئناف الرياضة',
      ],
    },
    indications: {
      fr: [
        'Après accouchement vaginal ou césarienne',
        "Fuites urinaires d'effort",
        'Prolapsus léger à modéré',
        'Diastasis abdominal',
        'Douleurs pelviennes post-partum',
        'Cicatrice de périnée ou de césarienne',
      ],
      pt: [
        'Pós-parto por via vaginal ou cesariana',
        'Perdas involuntárias de urina ao esforço',
        'Prolapso de órgãos pélvicos ligeiro a moderado',
        'Diástase dos músculos retos abdominais',
        'Desconforto ou dor na cintura pélvica',
        'Trabalho cicatricial pós-cesariana ou episiotomia',
      ],
      en: [
        'Postpartum following vaginal delivery or C-section',
        'Stress urinary incontinence and leakage',
        'Mild to moderate pelvic organ prolapse',
        'Diastasis recti separation',
        'Pelvic girdle and lower back discomfort',
        'C-section or episiotomy scar mobilization',
      ],
      ar: [
        'بعد الولادة الطبيعية أو القيصرية',
        'تسرب البول عند المجهود',
        'الهبوط الخفيف إلى المتوسط',
        'فجوة البطن',
        'آلام الحوض بعد الولادة',
        'ندبة العجان أو القيصرية',
      ],
    },
    contraindications: {
      fr: [
        'Avant 6 semaines post-partum (sans accord médical)',
        'Infection active du tractus urinaire',
        'Hémorragie active',
      ],
      pt: [
        'Período inferior a 6 semanas pós-parto sem alta médica',
        'Infeção urinária ou ginecológica ativa',
        'Hemorragia puerperal ativa',
      ],
      en: [
        'Under 6 weeks postpartum without obstetric clearance',
        'Active urinary or gynecological infection',
        'Unexplained active hemorrhage',
      ],
      ar: [
        'قبل 6 أسابيع من الولادة (بدون موافقة طبية)',
        'عدوى نشطة في المسالك البولية',
        'نزيف نشط',
      ],
    },
    faq: [
      {
        q: { fr: 'Quand commencer la rééducation après accouchement ?', pt: 'Quando devo iniciar a reabilitação pós-parto?', en: 'When should I start postpartum rehabilitation?', ar: 'متى أبدأ إعادة التأهيل بعد الولادة؟' },
        a: {
          fr: 'En général à partir de la 6e semaine post-partum, après la visite de contrôle avec votre gynécologue.',
          pt: 'Geralmente a partir da 6ª semana após o parto, após a consulta de revisão puerperal com o seu médico obstetra.',
          en: 'Generally starting from the 6th week postpartum, following your routine check-up with your obstetrician.',
          ar: 'عموماً من الأسبوع السادس بعد الولادة، بعد زيارة المتابعة مع طبيب النساء.',
        },
      },
      {
        q: { fr: 'Puis-je amener mon bébé ?', pt: 'Posso levar o meu bebé à consulta?', en: 'Can I bring my baby to the appointment?', ar: 'هل يمكنني إحضار طفلي؟' },
        a: {
          fr: 'Absolument ! Notre clinique est parfaitement adaptée aux jeunes mamans.',
          pt: 'Com certeza! O nosso espaço está preparado com todo o conforto e tranquilidade para receber a mãe e o seu bebé.',
          en: 'Absolutely! Our clinical space is serene and welcoming for mothers and their babies.',
          ar: 'بالتأكيد! نحن متفهمون تماماً للأمهات الجدد المرضعات أو اللواتي لا يجدن من يرعى أطفالهن.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['fisioterapia pós-parto Lisboa', 'pavimento pélvico', 'diástase abdominal Lisboa', 'saúde da mulher'],
  },
  {
    slug: 'massage-therapeutique',
    pole: 'kinesitherapie',
    icon: 'hands',
    bodyMapPoint: { x: 50, y: 40, view: 'both' },
    name: {
      fr: 'Massage Thérapeutique',
      pt: 'Massagem Terapêutica & Desportiva',
      en: 'Therapeutic & Sports Massage',
      ar: 'التدليك العلاجي',
    },
    shortDesc: {
      fr: 'Massages ciblés pour soulager les douleurs musculaires, réduire les tensions et accélérer la récupération.',
      pt: 'Massagens direcionadas para alívio de contraturas musculares, redução de tensões e aceleração da recuperação física.',
      en: 'Targeted massage techniques to relieve muscle pain, reduce tension, and accelerate athletic recovery.',
      ar: 'تدليك موجه لتخفيف الآلام العضلية، وتقليل التوترات، وتسريع التعافي.',
    },
    longDesc: {
      fr: `Le massage thérapeutique est une technique manuelle fondamentale en kinésithérapie, qui va bien au-delà du simple massage de relaxation. Il s'agit d'un acte médical ciblé, qui mobilise les tissus mous (muscles, fascias, tendons) pour traiter des pathologies spécifiques.

Notre équipe maîtrise plusieurs techniques de massage thérapeutique : le massage transverse profond (MTP) de Cyriax pour les tendinopathies, le massage des points trigger myofasciaux pour les contractures chroniques, et le massage des cicatrices pour améliorer la mobilité tissulaire après une chirurgie.`,
      pt: `A massagem terapêutica é uma intervenção manual clínica especializada destinada ao tratamento de dores e contraturas musculares profundas, disfunções miofasciais e sobrecargas posturais.

A nossa equipa domina técnicas como a Massagem Transversa Profunda (MTP) de Cyriax para tendinopatias, desativação de pontos-gatilho (trigger points) miofasciais e mobilização de tecidos moles para acelerar a regeneração muscular.`,
      en: `Therapeutic clinical massage goes beyond relaxation by utilizing targeted orthopedic manual therapy techniques to relieve chronic muscle contractures, decompress myofascial trigger points, and optimize tissue healing.`,
      ar: `التدليك العلاجي تقنية يدوية أساسية في العلاج الطبيعي، تتجاوز مجرد التدليك الاسترخائي. إنه إجراء طبي موجه يحرك الأنسجة الرخوة لعلاج أمراض محددة.`,
    },
    duration: '45 min',
    price: 55,
    sessionFlow: {
      fr: [
        'Bilan palpatoire des zones douloureuses',
        'Effleurages de réchauffement',
        'Techniques profondes ciblées (Cyriax, trigger points)',
        'Mobilisations douces associées',
        'Étirements post-massage',
      ],
      pt: [
        'Palpação e diagnóstico das zonas de tensão e contratura',
        'Aquecimento tecidular e hiperémia controlada',
        'Libertação miofascial e pressão em pontos-gatilho',
        'Mobilização articular suave complementar',
        'Alongamentos musculares analíticos',
      ],
      en: [
        'Palpation and assessment of tension trigger zones',
        'Tissue warm-up and circulatory activation',
        'Deep myofascial release and Cyriax friction',
        'Complementary gentle joint mobilization',
        'Post-treatment assisted stretching',
      ],
      ar: [
        'تقييم لمسي للمناطق المؤلمة',
        'تدليك تحضيري للتسخين',
        'تقنيات عميقة موجهة',
        'تعبئات لطيفة مرتبطة',
        'تمددات بعد التدليك',
      ],
    },
    indications: {
      fr: ['Contractures et douleurs musculaires', 'Tendinopathies', 'Douleurs cervicales et dorsales', 'Récupération sportive'],
      pt: ['Contraturas e rigidez muscular', 'Tendinopatias crónicas', 'Dores cervicais, dorsais e lombares', 'Recuperação muscular desportiva'],
      en: ['Muscle contractures and stiffness', 'Chronic tendinopathies', 'Cervical and thoracic spine pain', 'Athletic training recovery'],
      ar: ['التشنجات وآلام العضلات', 'اعتلالات الأوتار', 'آلام الرقبة والظهر', 'التعافي الرياضي'],
    },
    contraindications: {
      fr: ['Phlébite ou thrombose', 'Peau lésée ou infectée', 'Cancer en phase active', 'Fracture récente'],
      pt: ['Flebite ou trombose venosa profunda', 'Lesões cutâneas ativas na área', 'Processo inflamatório infecioso agudo'],
      en: ['Deep vein thrombosis or active phlebitis', 'Broken skin or open infections', 'Acute feverish conditions'],
      ar: ['التهاب الوريد أو الخثار', 'جلد متضرر أو مصاب', 'كسر حديث'],
    },
    faq: [
      {
        q: { fr: 'Quelle est la différence avec un massage de spa ?', pt: 'Qual a diferença face a uma massagem de relaxamento?', en: 'How is this different from a spa massage?', ar: 'ما الفرق عن مساج السبا؟' },
        a: {
          fr: "Le massage thérapeutique est ciblé et basé sur un diagnostic précis. L'objectif est médical : traiter une pathologie, réduire une douleur.",
          pt: 'A massagem terapêutica é um ato fisioterapêutico baseado em diagnóstico clínico para resolver contraturas e patologias, enquanto a massagem de spa é meramente relaxante.',
          en: 'Therapeutic massage is a clinical intervention addressing diagnosed musculoskeletal issues, whereas spa massage focuses on general relaxation.',
          ar: 'التدليك العلاجي موجه ومبني على تشخيص دقيق وهدفه طبي.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['massagem terapêutica Lisboa', 'massagem desportiva', 'libertação miofascial', 'alívio contraturas'],
  },
  {
    slug: 'drainage-lymphatique',
    pole: 'kinesitherapie',
    icon: 'lymph',
    bodyMapPoint: { x: 30, y: 48, view: 'front' },
    name: {
      fr: 'Drainage Lymphatique Manuel',
      pt: 'Drenagem Linfática Manual (Vodder)',
      en: 'Manual Lymphatic Drainage (Vodder)',
      ar: 'الصرف اللمفاوي اليدوي',
    },
    shortDesc: {
      fr: 'Technique douce qui stimule la circulation lymphatique pour réduire les œdèmes, les gonflements et améliorer l\'immunité.',
      pt: 'Técnica manual suave para estimular a circulação linfática, reduzir edemas, retenção de líquidos e pernas pesadas.',
      en: 'Gentle manual technique stimulating lymphatic flow to reduce edema, swelling, fluid retention, and enhance immunity.',
      ar: 'تقنية لطيفة تحفز الدورة اللمفاوية لتقليل الوذمات والانتفاخات وتحسين المناعة.',
    },
    longDesc: {
      fr: `Le drainage lymphatique manuel (DLM) est une technique de massage très douce, développée par le Dr Emil Vodder dans les années 1930. Elle consiste en des mouvements rythmés et superficiels, suivant le trajet naturel des vaisseaux lymphatiques, pour stimuler la circulation de la lymphe.

Notre équipe est formée à la technique Vodder, garantissant une approche rigoureuse et scientifiquement validée. Les séances sont très relaxantes et ne génèrent aucune douleur.`,
      pt: `A Drenagem Linfática Manual (Método Vodder) é uma terapia manual precisa e suave que visa reabsorver o excesso de líquido intersticial e estimular o sistema linfático.

É o padrão de excelência clínica no tratamento de pernas cansadas, edemas gestacionais, pós-operatório de cirurgia plástica (como lipoaspiração e abdominoplastia) e linfedemas.`,
      en: `Manual Lymphatic Drainage (Vodder Method) is a gentle, specialized therapeutic massage technique designed to stimulate the flow of lymph fluid, reducing edema, localized swelling, and postoperative fluid retention.`,
      ar: `الصرف اللمفاوي اليدوي تقنية تدليك لطيفة جداً تحفز المسار الطبيعي للأوعية اللمفاوية لتقليل الوذمات.`,
    },
    duration: '50 min',
    price: 65,
    sessionFlow: {
      fr: [
        'Bilan des zones de gonflement',
        'Drainage des ganglions centraux (cou, aisselles, aine)',
        'Manœuvres périphériques vers le centre',
        'Conseils pour la compression à domicile',
      ],
      pt: [
        'Avaliação dos pontos de retenção hídrica e edema',
        'Estimulação e abertura dos gânglios linfáticos centrais',
        'Manobras circulares suaves e direcionadas',
        'Drenagem sequencial das extremidades',
        'Recomendações de hidratação e cuidados domiciliários',
      ],
      en: [
        'Assessment of edema and fluid retention areas',
        'Opening of central lymph node stations',
        'Rhythmic, gentle circular directional strokes',
        'Sequential drainage of targeted limbs',
        'Hydration and post-session self-care guidance',
      ],
      ar: [
        'تقييم مناطق الانتفاخ',
        'صرف الغدد الليمفاوية المركزية',
        'مناورات محيطية نحو المركز',
        'نصائح للضغط في المنزل',
      ],
    },
    indications: {
      fr: ['Œdèmes post-chirurgicaux', 'Lymphœdème primaire ou secondaire', 'Jambes lourdes et fatiguées', 'Grossesse (œdèmes des chevilles)', 'Post-liposuccion'],
      pt: ['Edemas pós-cirúrgicos e pós-lipoaspiração', 'Pernas pesadas e insuficiência venosa ligeira', 'Retenção de líquidos na gravidez', 'Linfedemas primários ou secundários'],
      en: ['Post-surgical and post-liposuction swelling', 'Heavy, fatigued legs and mild venous congestion', 'Fluid retention during pregnancy', 'Lymphedema management'],
      ar: ['وذمات ما بعد الجراحة', 'الساقان الثقيلتان والمتعبتان', 'الحمل (وذمات الكاحلين)', 'ما بعد شفط الدهون'],
    },
    contraindications: {
      fr: ['Insuffisance cardiaque non compensée', 'Thrombose veineuse aiguë', 'Infection aiguë'],
      pt: ['Insuficiência cardíaca descompensada', 'Trombose venosa profunda ativa', 'Infeções ou inflamações agudas'],
      en: ['Uncompensated heart failure', 'Active deep vein thrombosis', 'Acute systemic infections'],
      ar: ['قصور القلب غير المعوَّض', 'تجلط وريدي حاد', 'عدوى حادة'],
    },
    faq: [
      {
        q: { fr: 'Le drainage aide-t-il à maigrir ?', pt: 'A drenagem linfática emagrece?', en: 'Does lymphatic drainage help with weight loss?', ar: 'هل يساعد الصرف على إنقاص الوزن؟' },
        a: {
          fr: "Le drainage lymphatique n'élimine pas les graisses, mais réduit la rétention d'eau et affine la silhouette.",
          pt: 'A drenagem não destrói células de gordura diretamente, mas reduz a retenção hídrica e o inchaço, desinchando visivelmente a silhueta.',
          en: 'Lymphatic drainage does not burn fat cells directly, but it significantly reduces fluid retention, de-puffing and refining body contours.',
          ar: 'الصرف اللمفاوي يقلل الوذمات واحتباس الماء مما يعطي إحساساً بالخفة.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['drenagem linfática Lisboa', 'método Vodder Lisboa', 'pernas pesadas', 'pós-operatório lipoaspiração'],
  },
  {
    slug: 'electrotherapie',
    pole: 'kinesitherapie',
    icon: 'electric',
    bodyMapPoint: { x: 70, y: 38, view: 'front' },
    name: {
      fr: 'Électrothérapie & TENS',
      pt: 'Eletroterapia Médica & TENS',
      en: 'Medical Electrotherapy & TENS',
      ar: 'العلاج الكهربائي وTENS',
    },
    shortDesc: {
      fr: 'Utilisation de courants électriques thérapeutiques pour soulager la douleur, stimuler les muscles et accélérer la cicatrisation.',
      pt: 'Correntes elétricas terapêuticas analgésicas e estimulantes para alívio de dores agudas e crónicas.',
      en: 'Application of therapeutic electrical currents for targeted pain relief, muscle activation, and tissue repair.',
      ar: 'استخدام التيارات الكهربائية العلاجية لتخفيف الألم وتحفيز العضلات وتسريع الشفاء.',
    },
    longDesc: {
      fr: `L'électrothérapie regroupe plusieurs modalités de traitement utilisant des courants électriques contrôlés pour des effets thérapeutiques. Le TENS bloque la transmission de la douleur en stimulant les fibres nerveuses sensitives.`,
      pt: `A eletroterapia médica recorre a impulsos elétricos de baixa e média frequência calibrados para analgesia profunda (TENS), estimulação neuromuscular e desinflamação tecidular.`,
      en: `Medical electrotherapy utilizes controlled electrical waveforms (including TENS and NMES) to block nociceptive pain signals, stimulate weakened muscle groups, and enhance microcirculation.`,
      ar: `يضم العلاج الكهربائي تيارات كهربائية علاجية لتخفيف الألم وتحفيز العضلات.`,
    },
    duration: '30 min',
    price: 40,
    sessionFlow: {
      fr: ['Évaluation de la douleur (EVA)', 'Positionnement des électrodes', 'Application pendant 20-25 minutes', 'Réévaluation de la douleur'],
      pt: ['Avaliação clínica da dor (Escala EVA)', 'Colocação precisa dos elétrodos na zona afetada', 'Aplicação de corrente durante 20–25 minutos', 'Reavaliação dos níveis de dor'],
      en: ['Clinical pain level assessment (VAS)', 'Precise electrode placement over targeted nerves', '20-25 minute controlled current therapy', 'Post-session pain evaluation'],
      ar: ['تقييم الألم', 'وضع الأقطاب الكهربائية', 'تطبيق لمدة 20-25 دقيقة', 'إعادة تقييم الألم'],
    },
    indications: {
      fr: ['Douleurs aiguës et chroniques', 'Nevralgies et sciatique', 'Contractures musculaires'],
      pt: ['Dores agudas e crónicas de coluna', 'Nevralgias, ciatalgias e dor radicular', 'Reabilitação de atrofia muscular'],
      en: ['Acute and chronic spinal pain', 'Neuralgia, sciatica, and nerve pain', 'Muscular re-education and spasm relief'],
      ar: ['الآلام الحادة والمزمنة', 'الأعصاب والعرق النسا', 'التشنجات العضلية'],
    },
    contraindications: {
      fr: ['Pacemaker ou implant électronique', 'Grossesse (zone abdominale)', 'Peau lésée'],
      pt: ['Portadores de pacemaker ou implantes elétricos', 'Zona abdominal durante a gravidez', 'Lesões cutâneas abertas'],
      en: ['Cardiac pacemakers or electronic implants', 'Abdomen during pregnancy', 'Open skin lesions'],
      ar: ['جهاز تنظيم ضربات القلب', 'الحمل (منطقة البطن)', 'جلد تالف'],
    },
    faq: [
      {
        q: { fr: 'Est-ce douloureux ?', pt: 'O tratamento causa dor ou choque elétrico?', en: 'Does it hurt or cause electric shocks?', ar: 'هل هو مؤلم؟' },
        a: {
          fr: "Non, vous ressentirez des picotements ou des fourmillements agréables, jamais une douleur.",
          pt: 'Não. Sentirá apenas um formigueiro suave e confortável, ajustado continuamente ao seu limiar de tolerância.',
          en: 'No. You will feel a comfortable tingling sensation, adjusted precisely to your comfort level.',
          ar: 'لا، ستشعر بوخز مريح فقط.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['eletroterapia Lisboa', 'TENS fisioterapia', 'alívio dor crónica', 'ciática Lisboa'],
  },
  {
    slug: 'ultrasons',
    pole: 'kinesitherapie',
    icon: 'wave',
    bodyMapPoint: { x: 72, y: 55, view: 'front' },
    name: {
      fr: 'Ultrasons Thérapeutiques',
      pt: 'Ultrassons Terapêuticos',
      en: 'Therapeutic Ultrasound',
      ar: 'الموجات فوق الصوتية العلاجية',
    },
    shortDesc: {
      fr: 'Les ultrasons pénètrent en profondeur pour traiter les tendinites, les bursites et accélérer la cicatrisation tissulaire.',
      pt: 'Ondas acústicas de alta frequência para tratamento profundo de tendinopatias, bursites e inflamações articulares.',
      en: 'High-frequency sound waves penetrating deep tissues to treat tendinitis, bursitis, and promote healing.',
      ar: 'تخترق الموجات فوق الصوتية بعمق لعلاج التهابات الأوتار والأكياس المصلية وتسريع شفاء الأنسجة.',
    },
    longDesc: {
      fr: `Les ultrasons thérapeutiques utilisent des ondes sonores à haute fréquence (1 à 3 MHz) pour produire des effets thermiques et mécaniques dans les tissus profonds.`,
      pt: `Os ultrassons terapêuticos utilizam frequências acústicas de 1 a 3 MHz para produzir micro-massagem celular e efeito térmico em tecidos conjuntivos profundos, acelerando a resolução de inflamações articulares e tendinosas.`,
      en: `Therapeutic ultrasound applies high-frequency mechanical vibrations to accelerate cellular repair, increase local vascularization, and alleviate chronic tendon and ligament inflammation.`,
      ar: `تستخدم الموجات فوق الصوتية العلاجية موجات صوتية عالية التردد لإنتاج آثار حرارية وميكانيكية في الأنسجة العميقة.`,
    },
    duration: '20 min',
    price: 35,
    sessionFlow: {
      fr: ['Application de gel conducteur', 'Application circulaire sur la zone', 'Nettoyage et conseils'],
      pt: ['Aplicação de gel condutor médico', 'Movimentos circulares contínuos com a cabeça de ultrassom', 'Remoção e aconselhamento clínico'],
      en: ['Medical acoustic gel application', 'Slow circular soundhead application', 'Cleaning and post-treatment advice'],
      ar: ['تطبيق هلام موصل', 'تطبيق دائري على المنطقة', 'تنظيف المنطقة'],
    },
    indications: {
      fr: ['Tendinites et tendinopathies', 'Bursites', 'Fasciite plantaire'],
      pt: ['Tendinites do ombro, cotovelo e rotulianas', 'Fasceíte plantar e esporão do calcâneo', 'Bursites e entorses subagudas'],
      en: ['Rotator cuff and Achilles tendinitis', 'Plantar fasciitis and heel pain', 'Subacute bursitis and sprains'],
      ar: ['التهابات الأوتار', 'التهاب الأكياس المصلية', 'لفافة أخمص القدم'],
    },
    contraindications: {
      fr: ['Grossesse', 'Implant métallique dans la zone', 'Cancer'],
      pt: ['Áreas abdominais na gravidez', 'Próteses metálicas na zona de emissão direta', 'Processos tumorais ativos'],
      en: ['Pregnancy (abdominal area)', 'Metallic implants directly in acoustic beam', 'Active tumor sites'],
      ar: ['الحمل', 'غرسة معدنية في المنطقة', 'السرطان'],
    },
    faq: [
      {
        q: { fr: 'Est-ce que je vais sentir quelque chose ?', pt: 'Sente-se dor durante a aplicação?', en: 'Will I feel any pain?', ar: 'هل سأشعر بشيء؟' },
        a: {
          fr: "Vous sentirez une légère chaleur agréable en mode continu, indolore.",
          pt: 'O procedimento é indolor; poderá sentir apenas um calor suave e relaxante na zona tratada.',
          en: 'The application is completely painless; you will only perceive a pleasant mild warmth.',
          ar: 'ستشعر بحرارة خفيفة مريحة فقط.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['ultrassons fisioterapia Lisboa', 'tratamento tendinite Lisboa', 'fasceíte plantar'],
  },
  {
    slug: 'cavitation',
    pole: 'minceur',
    icon: 'bubble',
    bodyMapPoint: { x: 50, y: 55, view: 'front' },
    name: {
      fr: 'Cavitation Ultrasonique',
      pt: 'Cavitação Ultrassónica',
      en: 'Ultrasonic Cavitation',
      ar: 'التكهيف بالموجات فوق الصوتية',
    },
    shortDesc: {
      fr: 'Technique non-invasive qui détruit les cellules graisseuses localisées par des ondes ultrasoniques, sans chirurgie ni temps de récupération.',
      pt: 'Tecnologia não invasiva que atua na gordura localizada rebelde e celulite profunda através de ultrassons.',
      en: 'Non-invasive acoustic technology breaking down localized fat deposits and deep cellulite without surgery.',
      ar: 'تقنية غير جراحية تدمر خلايا الدهون الموضعية بالموجات فوق الصوتية، بدون جراحة أو وقت تعافٍ.',
    },
    longDesc: {
      fr: `La cavitation ultrasonique est l'une des techniques phares de la médecine esthétique non-invasive. Elle utilise des ondes ultrasoniques de basse fréquence (40 kHz) qui créent des micro-bulles dans le tissu adipeux. Quand ces bulles implosent, elles détruisent la membrane des adipocytes sans affecter les autres tissus.`,
      pt: `A cavitação ultrassónica emite ondas acústicas de 40 kHz que provocam a formação de micro-bolhas de vácuo no tecido adiposo subcutâneo. A implosão destas bolhas fragmenta as membranas dos adipócitos, permitindo a sua drenagem e eliminação fisiológica pelo sistema linfático e hepático.`,
      en: `Ultrasonic cavitation delivers 40 kHz acoustic energy into subcutaneous fat, producing microscopic cavitation bubbles that disrupt adipocyte membranes, facilitating their natural drainage and metabolic elimination.`,
      ar: `التكهيف بالموجات فوق الصوتية يستخدم موجات منخفضة التردد لتفكيك الدهون الموضعية والتخلص منها طبيعياً.`,
    },
    duration: '45 min',
    price: 80,
    sessionFlow: {
      fr: ['Bilan morphologique et photos', 'Application de gel conducteur', 'Passages de la sonde cavitation', 'Drainage lymphatique post-séance'],
      pt: ['Avaliação e medição das pregas adiposas', 'Aplicação de gel condutor de alta condutividade', 'Varredura contínua com manípulo de cavitação', 'Drenagem linfática complementar pós-sessão'],
      en: ['Morphological measurement and target mapping', 'Application of medical acoustic gel', 'Steady cavitation wand application over fat zones', 'Post-session complementary lymphatic drainage'],
      ar: ['تقييم شكلي وصور', 'تطبيق هلام موصل', 'تمرير مسبار التكهيف', 'صرف لمفاوي بعد الجلسة'],
    },
    indications: {
      fr: ['Graisse localisée rebelle', 'Culotte de cheval', 'Graisse abdominale', 'Cellulite fibreuse'],
      pt: ['Gordura localizada no abdómen e flancos', 'Culote e face interna das coxas', 'Braços e zona trocantérica', 'Celulite compacta e fibrosa'],
      en: ['Stubborn abdominal fat and love handles', 'Outer thighs and inner knees', 'Upper arms and flanks', 'Fibrotic deep cellulite'],
      ar: ['دهون موضعية مقاومة', 'دهون الفخذ الخارجية', 'دهون البطن', 'سيلوليت ليفي'],
    },
    contraindications: {
      fr: ['Grossesse et allaitement', 'Pacemaker', 'Maladies hépatiques graves'],
      pt: ['Gravidez e amamentação', 'Insuficiência hepática ou renal severa', 'Dispositivos eletrónicos implantados (pacemaker)'],
      en: ['Pregnancy and nursing', 'Severe hepatic or renal disease', 'Implanted pacemakers or defibrillators'],
      ar: ['الحمل والرضاعة', 'جهاز تنظيم ضربات القلب', 'أمراض الكبد الخطيرة'],
    },
    faq: [
      {
        q: { fr: 'Combien de séances pour voir des résultats ?', pt: 'Quantas sessões são necessárias para ver resultados?', en: 'How many sessions are needed to see results?', ar: 'كم عدد الجلسات لرؤية نتائج؟' },
        a: {
          fr: 'Les premiers résultats centimétriques sont visibles dès la 3e à 5e séance. Un programme complet compte 8 à 10 séances.',
          pt: 'Os resultados centimétricos tornam-se evidentes a partir da 3ª sessão. Recomenda-se um protocolo de 8 a 10 sessões com intervalos semanais.',
          en: 'Measurable reductions are commonly observed by the 3rd to 5th session. A full protocol typically involves 8 to 10 weekly sessions.',
          ar: 'تبدأ النتائج في الظهور بعد 3 إلى 5 جلسات.',
        },
      },
    ],
    hasBeforeAfter: true,
    keywords: ['cavitação Lisboa', 'gordura localizada Lisboa', 'emagrecimento não invasivo', 'lipoaspiração não cirúrgica'],
  },
  {
    slug: 'radiofrequence',
    pole: 'minceur',
    icon: 'radio',
    bodyMapPoint: { x: 35, y: 52, view: 'front' },
    name: {
      fr: 'Radiofréquence Corps & Visage',
      pt: 'Radiofrequência Corporal & Facial',
      en: 'Body & Facial Radiofrequency',
      ar: 'الترددات الراديوية للجسم والوجه',
    },
    shortDesc: {
      fr: 'Raffermit la peau, stimule la production de collagène et réduit les rides grâce à l\'énergie thermique des ondes radio.',
      pt: 'Reafirmação cutânea e estimulação profunda de colagénio para combate à flacidez e rejuvenescimento.',
      en: 'Thermal energy waves stimulating collagen synthesis, firming skin, and contouring body and facial curves.',
      ar: 'يشد الجلد ويحفز إنتاج الكولاجين ويقلل التجاعيد بفضل الطاقة الحرارية لموجات الراديو.',
    },
    longDesc: {
      fr: `La radiofréquence est une technique de rajeunissement cutané et de raffermissement corporel qui utilise des ondes électromagnétiques pour chauffer le derme en profondeur. Cette chaleur contrôlée (40–45°C) stimule les fibroblastes.`,
      pt: `A radiofrequência multipolar induz um aquecimento controlado nas camadas profundas da derme (40–42°C), provocando a contração imediata das fibras de colagénio existentes e estimulando a síntese continuada de novo colagénio e elastina.`,
      en: `Multipolar radiofrequency safely elevates deep dermal temperature (40–42°C) to contract existing collagen fibrils and stimulate long-term neocollagenesis for firmer, smoother skin.`,
      ar: `الترددات الراديوية تقنية لتجديد شباب الجلد وشد الجسم تستخدم موجات كهرومغناطيسية لتسخين الأدمة بعمق.`,
    },
    duration: '60 min',
    price: 90,
    sessionFlow: {
      fr: ['Nettoyage de la zone', 'Application de gel conducteur', 'Passages réguliers de la tête de RF', 'Application de sérum apaisant'],
      pt: ['Higienização da pele e monitorização térmica', 'Aplicação de gel condutor', 'Trabalho contínuo com elétrodos de RF multipolar', 'Aplicação de sérum firmador e calmante'],
      en: ['Skin cleansing and baseline thermal measurement', 'Conductive gel application', 'Continuous multipolar RF handpiece treatment', 'Application of firming soothing serum'],
      ar: ['تنظيف المنطقة', 'تطبيق هلام موصل', 'تمريرات لرأس الترددات الراديوية', 'تطبيق مصل مهدئ'],
    },
    indications: {
      fr: ['Peau relâchée et flasque', 'Rides et ridules', 'Cellulite molle', 'Raffermissement post-grossesse'],
      pt: ['Flacidez cutânea abdominal, braços e coxas', 'Perda de firmeza facial e contorno mandibular', 'Recuperação de tónus após perda de peso ou gravidez'],
      en: ['Skin laxity on abdomen, arms, and thighs', 'Loss of facial firmness and jawline definition', 'Post-weight loss and postpartum skin firming'],
      ar: ['جلد مترهل', 'التجاعيد', 'سيلوليت ناعم', 'شد بعد الحمل'],
    },
    contraindications: {
      fr: ['Grossesse', 'Implants métalliques dans la zone', 'Cancer', 'Pacemaker'],
      pt: ['Gravidez', 'Implantes metálicos na zona a tratar', 'Pacemakers cardíacos', 'Patologia oncológica ativa'],
      en: ['Pregnancy', 'Metallic implants within treatment area', 'Cardiac pacemakers', 'Active oncological conditions'],
      ar: ['الحمل', 'غرسات معدنية في المنطقة', 'جهاز تنظيم ضربات القلب'],
    },
    faq: [
      {
        q: { fr: 'Quand vais-je voir les résultats ?', pt: 'Quando são visíveis os resultados?', en: 'When will I see the results?', ar: 'متى سأرى النتائج؟' },
        a: {
          fr: "Un effet tenseur immédiat est ressenti dès la première séance. Les résultats optimaux s'installent au bout de 6 à 8 semaines.",
          pt: 'Sente-se um efeito tensor imediato logo após a 1ª sessão. A regeneração profunda de colagénio atinge o auge entre a 6ª e a 8ª semana.',
          en: 'An immediate tightening effect is noticeable after session one, with progressive collagen remodeling peaking at 6 to 8 weeks.',
          ar: 'الشد مرئي من الجلسة الأولى وأفضل النتائج بعد شهرين.',
        },
      },
    ],
    hasBeforeAfter: true,
    keywords: ['radiofrequência Lisboa', 'flacidez da pele Lisboa', 'reafirmação corporal', 'rejuvenescimento não invasivo'],
  },
  {
    slug: 'laser-lipo',
    pole: 'minceur',
    icon: 'laser',
    bodyMapPoint: { x: 65, y: 58, view: 'front' },
    name: {
      fr: 'Laser Lipo Non-Invasif',
      pt: 'Lipo Laser Não Invasivo',
      en: 'Non-Invasive Laser Lipolysis',
      ar: 'شد الدهون بالليزر غير الجراحي',
    },
    shortDesc: {
      fr: 'Lasers froids qui pénètrent dans les adipocytes et libèrent leur contenu, permettant une perte centimétrique sans douleur.',
      pt: 'Laser de baixa intensidade para esvaziamento de adipócitos e redução centimétrica indolor.',
      en: 'Cold laser diode treatment triggering natural lipid release for painless, measurable inch reduction.',
      ar: 'ليزر بارد يخترق الخلايا الدهنية ويُطلق محتواها، مما يتيح فقدان سنتيمترات بدون ألم.',
    },
    longDesc: {
      fr: `Le laser lipo non-invasif utilise de la lumière laser à faible énergie (LLLT) pour créer des micropores temporaires dans la membrane des adipocytes. Le contenu des cellules graisseuses s'écoule et est éliminé par voie lymphatique.`,
      pt: `O Lipo Laser de baixa intensidade (LLLT) emite comprimentos de onda de 635–650 nm que permeabilizam temporariamente a membrana das células adiposas, libertando ácidos gordos e triglicéridos para o espaço intersticial sem danificar os tecidos adjacentes.`,
      en: `Non-invasive Laser Lipolysis uses 635-650 nm cold diode lasers to stimulate adipocyte micropores, releasing trapped triglycerides into the interstitial fluid where they are safely metabolized.`,
      ar: `ليزر ليبو غير الجراحي يستخدم ضوء ليزر منخفض الطاقة لإفراغ الخلايا الدهنية بأمان.`,
    },
    duration: '30 min',
    price: 70,
    sessionFlow: {
      fr: ['Mesures initiales', 'Positionnement des palettes laser (20–30 min)', 'Drainage lymphatique post-séance'],
      pt: ['Medição centimétrica pré-tratamento', 'Posicionamento das placas de díodos laser nas áreas-alvo (20–30 min)', 'Drenagem e medição pós-sessão'],
      en: ['Pre-treatment circumference measurement', 'Positioning of laser diode paddles (20-30 min)', 'Post-session drainage and measurement'],
      ar: ['قياسات أولية', 'وضع لوحات الليزر (20-30 دقيقة)', 'صرف لمفاوي بعد الجلسة'],
    },
    indications: {
      fr: ['Ventre post-grossesse', 'Cuisses', 'Bras', 'Flancs'],
      pt: ['Gordura localizada abdominal', 'Flancos e zona lombar', 'Coxas e braços'],
      en: ['Localized abdominal deposits', 'Love handles and flanks', 'Thighs and upper arms'],
      ar: ['بطن ما بعد الحمل', 'الفخذان', 'الذراعان', 'الجنبان'],
    },
    contraindications: {
      fr: ['Grossesse', 'Épilepsie photosensible', 'Tumeurs malignes'],
      pt: ['Gravidez', 'Epilepsia fotossensível', 'Neoplasias ativas'],
      en: ['Pregnancy', 'Photosensitive epilepsy', 'Active malignancies'],
      ar: ['الحمل', 'الصرع الحساس للضوء', 'الأورام الخبيثة'],
    },
    faq: [
      {
        q: { fr: 'Est-ce que ça fait mal ?', pt: 'O tratamento causa algum desconforto?', en: 'Is the treatment painful?', ar: 'هل يؤلم؟' },
        a: {
          fr: "Absolument pas. Vous ne sentez rien du tout pendant la séance.",
          pt: 'Não. É um tratamento 100% indolor, sem calor excessivo nem marcas na pele.',
          en: 'Not at all. The treatment is completely painless with zero downtime.',
          ar: 'لا على الإطلاق، غير مؤلم تماماً.',
        },
      },
    ],
    hasBeforeAfter: true,
    keywords: ['lipo laser Lisboa', 'redução centimétrica Lisboa', 'laser emagrecimento', 'gordura sem cirurgia'],
  },
  {
    slug: 'pressotherapie',
    pole: 'minceur',
    icon: 'compress',
    bodyMapPoint: { x: 50, y: 72, view: 'front' },
    name: {
      fr: 'Pressothérapie',
      pt: 'Pressoterapia Médica',
      en: 'Medical Pressotherapy',
      ar: 'العلاج بالضغط',
    },
    shortDesc: {
      fr: 'Massage pneumatique qui stimule la circulation lymphatique et veineuse pour des jambes légères et un corps affiné.',
      pt: 'Compressão pneumática sequencial para drenagem profunda, desintoxicação e alívio imediato de pernas pesadas.',
      en: 'Sequential pneumatic pressure boosting venous and lymphatic circulation for lighter legs and reduced fluid retention.',
      ar: 'تدليك هوائي يحفز الدورة اللمفاوية والوريدية لساقين خفيفتين وجسم مشدود.',
    },
    longDesc: {
      fr: `La pressothérapie utilise des bottes gonflables qui compriment et relâchent rythmiquement les membres pour stimuler la circulation lymphatique et veineuse.`,
      pt: `A pressoterapia médica utiliza câmaras pneumáticas com gradiente de pressão sequencial ascendente para ativar o retorno venoso e linfático, eliminando toxinas e aliviando a sensação de pernas pesadas e inchadas.`,
      en: `Medical pressotherapy applies gradient pneumatic compression from distal to proximal areas, enhancing venous return, detoxifying tissues, and relieving swelling in the lower extremities.`,
      ar: `تستخدم العلاج بالضغط أحذية قابلة للنفخ تضغط على الأطراف بشكل إيقاعي لتحفيز الدورة الدموية واللمفاوية.`,
    },
    duration: '45 min',
    price: 50,
    sessionFlow: {
      fr: ['Installation du costume de pressothérapie', 'Séance de 40 minutes relaxante', 'Conseils hydriques'],
      pt: ['Colocação das perneiras e faixa abdominal de pressoterapia', 'Seleção do programa e calibração de pressão', 'Sessão de relaxamento de 40 minutos', 'Recomendações de hidratação'],
      en: ['Fitting of pneumatic compression boots and sleeves', 'Selection and calibration of specialized program', '40-minute relaxing compression session', 'Post-session hydration advice'],
      ar: ['وضع زي العلاج بالضغط', 'جلسة 40 دقيقة في وضع الاستلقاء', 'نصائح نمط الحياة'],
    },
    indications: {
      fr: ['Jambes lourdes', 'Rétention d\'eau', 'Cellulite aqueuse', 'Récupération sportive', 'Post-liposuccion'],
      pt: ['Sensação de pernas pesadas e cansaço', 'Retenção hídrica generalizada', 'Celulite de cariz edematoso e aquoso', 'Recuperação muscular em atletas'],
      en: ['Heavy, swollen, and tired legs', 'Generalized fluid retention', 'Edematous and watery cellulite', 'Athletic circulatory recovery'],
      ar: ['الساقان الثقيلتان', 'احتباس الماء', 'سيلوليت مائي', 'تعافٍ رياضي'],
    },
    contraindications: {
      fr: ['Thrombose veineuse profonde', 'Insuffisance cardiaque', 'Phlébite aiguë'],
      pt: ['Trombose venosa profunda ativa', 'Insuficiência cardíaca descompensada', 'Infeções cutâneas graves nos membros'],
      en: ['Active deep vein thrombosis', 'Uncompensated congestive heart failure', 'Severe limb infections'],
      ar: ['الخثار الوريدي العميق', 'قصور القلب', 'التهاب وريد حاد'],
    },
    faq: [
      {
        q: { fr: 'Quelle sensation ressent-on ?', pt: 'Qual é a sensação durante a sessão?', en: 'What does the treatment feel like?', ar: 'ما هو الإحساس؟' },
        a: {
          fr: "Une compression douce et rythmée, extrêmement relaxante.",
          pt: 'Uma massagem de compressão suave e compassada, muito agradável e descontraída.',
          en: 'A soothing, rhythmic wave of gentle pressure that is deeply relaxing.',
          ar: 'ضغط لطيف وإيقاعي ومريح جداً.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['pressoterapia Lisboa', 'pernas pesadas Lisboa', 'retenção líquidos', 'recuperação desportiva'],
  },
  {
    slug: 'cryolipolyse',
    pole: 'minceur',
    icon: 'snowflake',
    bodyMapPoint: { x: 42, y: 60, view: 'front' },
    name: {
      fr: 'Cryolipolyse',
      pt: 'Criolipólise Avançada',
      en: 'Advanced Cryolipolysis',
      ar: 'تحليل الدهون بالتبريد',
    },
    shortDesc: {
      fr: 'Congélation ciblée des cellules graisseuses qui les élimine définitivement par voie naturelle, sans chirurgie.',
      pt: 'Arrefecimento seletivo a temperaturas negativas para destruição e eliminação natural definitiva de células adiposas.',
      en: 'Targeted cooling technology inducing natural fat cell apoptosis and permanent reduction of localized bulges.',
      ar: 'تجميد موجه للخلايا الدهنية يزيلها بشكل نهائي بشكل طبيعي، بدون جراحة.',
    },
    longDesc: {
      fr: `La cryolipolyse expose les cellules graisseuses à des températures contrôlées (-5°C à -10°C) pour provoquer leur apoptose sans endommager les tissus environnants. Les cellules détruites sont éliminées sur 2 à 3 mois.`,
      pt: `A criolipólise médica baseia-se na maior suscetibilidade dos adipócitos ao frio controlado (-5°C a -10°C). Ao expor a gordura localizada a esta temperatura sob sucção suave, desencadeia-se a apoptose (morte celular programada) dos adipócitos, que são eliminados gradualmente pelo sistema imunitário ao longo de 6 a 12 semanas.`,
      en: `Cryolipolysis targets localized fat deposits by delivering controlled cooling (-5°C to -10°C), triggering natural adipocyte apoptosis without injuring surrounding skin or nervous tissue.`,
      ar: `تحليل الدهون بالتبريد يزيل الخلايا الدهنية بتعريضها لدرجات حرارة منخفضة محكومة.`,
    },
    duration: '60 min',
    price: 120,
    sessionFlow: {
      fr: ['Marquage de la zone', 'Application de membrane protectrice', 'Traitement par cryolipolyse (45 min)', 'Massage post-traitement'],
      pt: ['Marcação anatómica da prega de gordura', 'Aplicação de membrana anticongelante de proteção dérmica', 'Aplicação do aplicador de vácuo e arrefecimento (45–50 min)', 'Massagem de reativação imediata'],
      en: ['Target area mapping and caliper measurement', 'Application of thermal protective antifreeze membrane', 'Vacuum applicator cooling cycle (45-50 min)', 'Post-treatment manual reperfusion massage'],
      ar: ['تقييم وتحديد المنطقة', 'تطبيق هلام حماية', 'جلسة التبريد (45 دقيقة)', 'تدليك بعد العلاج'],
    },
    indications: {
      fr: ['Bourrelet abdominal', 'Poignées d\'amour', 'Culotte de cheval', 'Double menton'],
      pt: ['Adiposidade localizada no abdómen superior e inferior', 'Flancos ("pneus") e prega do soutien', 'Culote e face interna das coxas', 'Papada'],
      en: ['Stubborn lower abdominal bulge', 'Love handles and bra fat', 'Outer thighs and inner knees', 'Submental double chin'],
      ar: ['ترهل البطن', 'الخاصرة', 'دهون الفخذ الخارجية', 'الذقن المزدوجة'],
    },
    contraindications: {
      fr: ['Cryoglobulinémie', 'Raynaud sévère', 'Grossesse', 'Hernie sur la zone'],
      pt: ['Crioglobulinemia e hemoglobinúria paroxística ao frio', 'Doença de Raynaud severa', 'Gravidez', 'Hérnia na zona a tratar'],
      en: ['Cryoglobulinemia or cold agglutinin disease', 'Severe Raynaud\'s syndrome', 'Pregnancy', 'Abdominal wall hernia at site'],
      ar: ['الكريوغلوبولينيا', 'رينود الشديد', 'الحمل', 'فتق في المنطقة'],
    },
    faq: [
      {
        q: { fr: 'En combien de temps voit-on les résultats ?', pt: 'Em quanto tempo são visíveis os resultados?', en: 'How long does it take to see results?', ar: 'في كم من الوقت تظهر النتائج؟' },
        a: {
          fr: 'Les résultats sont progressifs, apparaissant entre 6 et 12 semaines après la séance.',
          pt: 'Os resultados são progressivos e duradouros, tornando-se claramente mensuráveis entre a 6ª e a 12ª semana após a sessão.',
          en: 'Results develop progressively as the body eliminates damaged fat cells, typically visible between 6 to 12 weeks.',
          ar: 'تظهر النتائج تدريجياً بين 6 و12 أسبوعاً.',
        },
      },
    ],
    hasBeforeAfter: true,
    keywords: ['criolipólise Lisboa', 'congelar gordura Lisboa', 'eliminar gordura localizada', 'lipoaspiração sem cirurgia'],
  },
  {
    slug: 'massage-amincissant',
    pole: 'minceur',
    icon: 'massage',
    bodyMapPoint: { x: 58, y: 65, view: 'back' },
    name: {
      fr: 'Massage Amincissant & Anti-Cellulite',
      pt: 'Massagem Modeladora & Anti-Celulite',
      en: 'Slimming & Anti-Cellulite Massage',
      ar: 'التدليك المنحف ومضاد السيلوليت',
    },
    shortDesc: {
      fr: 'Massage profond et technique qui rompt les amas graisseux, stimule la circulation et lisse la peau d\'orange.',
      pt: 'Massagem mecânica intensiva para descompactar nódulos celulíticos, melhorar a tonicidade e remodelar a silhueta.',
      en: 'Intensive manual rolling and kneading techniques breaking down cellulite and toning skin texture.',
      ar: 'تدليك عميق وتقني يكسر تراكمات الدهون ويحفز الدورة الدموية ويلطف جلد البرتقال.',
    },
    longDesc: {
      fr: `Le massage amincissant anti-cellulite combine plusieurs approches : palper-rouler profond, drainage lymphatique et manœuvres tonifiantes pour lisser la peau d'orange et stimuler la lipolyse naturelle.`,
      pt: `A massagem modeladora e anti-celulite combina manobras manuais vigorosas de palpar-rolar, amassamento profundo e drenagem para quebrar os septos fibrosos da celulite, ativar a microcirculação local e remodelar o contorno corporal.`,
      en: `The slimming anti-cellulite massage employs vigorous manual techniques including deep kneading and palper-rouler to release fibrotic tissue, boost microcirculation, and smooth textured skin.`,
      ar: `التدليك المنحف يجمع بين العجن العميق والصرف لتحسين ملمس الجلد وتنسيق القوام.`,
    },
    duration: '45 min',
    price: 65,
    sessionFlow: {
      fr: ['Évaluation du type de cellulite', 'Palper-rouler intensif', 'Drainage intégré'],
      pt: ['Diagnóstico do tipo de celulite (adiposa, fibrosa ou edematosa)', 'Aplicação de creme termoativo profissional', 'Manobras profundas de palpar-rolar nas zonas críticas', 'Finalização com drenagem de toxinas'],
      en: ['Cellulite classification (adipose, fibrotic, or edematous)', 'Application of professional active slimming cream', 'Deep palper-rouler kneading on target zones', 'Lymphatic detox finish'],
      ar: ['تقييم نوع السيلوليت', 'جمع وطي مكثف', 'صرف لمفاوي'],
    },
    indications: {
      fr: ['Cellulite tous stades', 'Peau d\'orange', 'Raffermissement silhouette'],
      pt: ['Celulite em todos os graus', 'Aspeto de casca de laranja nas coxas e glúteos', 'Modelação da cintura e ancas'],
      en: ['All stages of cellulite', 'Orange-peel dimpling on thighs and glutes', 'Waist and hip contouring'],
      ar: ['سيلوليت في جميع مراحله', 'جلد البرتقال', 'شد القوام'],
    },
    contraindications: {
      fr: ['Phlébite', 'Varices sévères', 'Infection cutanée'],
      pt: ['Varizes graves e tromboflebite', 'Fragilidade capilar severa com hematomas fáceis', 'Infeções cutâneas'],
      en: ['Severe varicose veins and active phlebitis', 'Severe capillary fragility', 'Open skin lesions'],
      ar: ['التهاب الوريد', 'دوالي شديدة', 'عدوى جلدية'],
    },
    faq: [
      {
        q: { fr: 'Combien de séances sont nécessaires ?', pt: 'Quantas sessões são recomendadas?', en: 'How many sessions are recommended?', ar: 'كم عدد الجلسات اللازمة؟' },
        a: {
          fr: "Un cycle de 10 à 15 séances est généralement recommandé.",
          pt: 'Recomenda-se habitualmente um plano de 10 a 12 sessões, com 1 a 2 sessões por semana.',
          en: 'A standard protocol involves 10 to 12 sessions, at a frequency of 1 to 2 visits weekly.',
          ar: 'يُوصى عادةً بدورة من 10 إلى 15 جلسة.',
        },
      },
    ],
    hasBeforeAfter: true,
    keywords: ['massagem anti-celulite Lisboa', 'massagem modeladora Lisboa', 'palpar rolar Lisboa', 'tratar celulite coxas'],
  },
  {
    slug: 'bilan-minceur',
    pole: 'bilan',
    icon: 'clipboard',
    bodyMapPoint: { x: 50, y: 20, view: 'front' },
    name: {
      fr: 'Bilan Minceur Personnalisé',
      pt: 'Avaliação Clínica & Diagnóstico Corporal',
      en: 'Personalized Body Assessment & Consultation',
      ar: 'تقييم الإنقاص الشخصي',
    },
    shortDesc: {
      fr: 'Consultation complète pour analyser votre morphologie, définir vos objectifs et élaborer un programme minceur sur mesure.',
      pt: 'Avaliação personalizada para análise morfológica, definição de objetivos clínicos e protocolo sob medida.',
      en: 'Comprehensive consultation analyzing body composition, clinical parameters, and building a tailored care plan.',
      ar: 'استشارة شاملة لتحليل بنيتك الجسدية وتحديد أهدافك ووضع برنامج إنقاص مخصص لك.',
    },
    longDesc: {
      fr: `Le bilan minceur est la première étape incontournable avant tout programme d'amincissement. Il permet d'analyser précisément votre situation et de concevoir un programme adapté à votre corps, vos objectifs et votre mode de vie.`,
      pt: `A Consulta de Avaliação Clínica e Diagnóstico Corporal é o ponto de partida essencial para qualquer plano estético ou de remodelação. Inclui análise morfológica e antropométrica rigorosa, classificação do tipo de celulite e adiposidade, e elaboração de um plano terapêutico personalizado com metas realistas.`,
      en: `The Personalized Body Assessment is the foundational first step for any body contouring protocol, featuring precise morphological analysis, cellulite classification, and customized treatment planning.`,
      ar: `بيان الإنقاص هو الخطوة الأولى الإلزامية قبل أي برنامج تنحيف لتحليل وضعك بدقة.`,
    },
    duration: '60 min',
    price: 50,
    sessionFlow: {
      fr: ['Accueil et questionnaire de santé', 'Mesures anthropométriques', 'Examen de la peau', 'Proposition du programme sur-mesure'],
      pt: ['Questionário clínico e historial de saúde', 'Medições antropométricas e pregas cutâneas', 'Avaliação do tónus e estadiamento de celulite', 'Desenho do plano de tratamento personalizado'],
      en: ['Clinical health history questionnaire', 'Anthropometric and skinfold caliper measurements', 'Tissue elasticity and cellulite assessment', 'Customized care protocol formulation'],
      ar: ['الاستقبال واستبيان الصحة', 'قياسات أنثروبومترية', 'فحص جودة الجلد', 'اقتراح برنامج مخصص'],
    },
    indications: {
      fr: ['Toute personne souhaitant commencer un programme minceur', 'Bilan annuel'],
      pt: ['Início de qualquer programa de estética ou remodelação', 'Dúvidas sobre o tratamento mais indicado', 'Acompanhamento e reavaliação periódica'],
      en: ['Anyone beginning a body contouring or slimming journey', 'Uncertainty regarding the optimal technology', 'Periodic progress evaluation'],
      ar: ['أي شخص يرغب في بدء برنامج إنقاص', 'متابعة سنوية'],
    },
    contraindications: {
      fr: ['Aucune contre-indication au bilan lui-même'],
      pt: ['Sem contraindicações para a consulta de avaliação'],
      en: ['No contraindications for the initial assessment'],
      ar: ['لا توجد موانع للتقييم بحد ذاته'],
    },
    faq: [
      {
        q: { fr: 'Le bilan est-il déductible du forfait ?', pt: 'O valor da avaliação é dedutível se subscrever um pacote?', en: 'Is the assessment fee deductible from a package?', ar: 'هل يُخصم التقييم من سعر الباقة؟' },
        a: {
          fr: 'Oui, le bilan est offert / déduit pour tout forfait de soins souscrit.',
          pt: 'Sim, o valor da avaliação inicial é integralmente creditado na aquisição de qualquer pacote de tratamentos.',
          en: 'Yes, the initial consultation fee is credited towards the purchase of any multi-session package.',
          ar: 'نعم، التقييم مجاني عند الاشتراك في باقة جلسات.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['avaliação corporal Lisboa', 'diagnóstico estético', 'consulta emagrecimento Lisboa', 'plano personalizado'],
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getServicesByPole(pole: ServicePole): Service[] {
  return SERVICES.filter((s) => s.pole === pole);
}
