export type ServicePole = 'kinesitherapie' | 'minceur' | 'bilan';

export interface ServiceFAQ {
  q: { fr: string; ar: string };
  a: { fr: string; ar: string };
}

export interface Service {
  slug: string;
  pole: ServicePole;
  icon: string; // SVG path or name
  bodyMapPoint: { x: number; y: number; view: 'front' | 'back' | 'both' };
  name: { fr: string; ar: string };
  shortDesc: { fr: string; ar: string };
  longDesc: { fr: string; ar: string };
  duration: string; // "45 min"
  price: number; // TND
  sessionFlow: { fr: string[]; ar: string[] };
  indications: { fr: string[]; ar: string[] };
  contraindications: { fr: string[]; ar: string[] };
  faq: ServiceFAQ[];
  hasBeforeAfter: boolean;
  keywords: string[];
}

export const SERVICES: Service[] = [
  {
    slug: 'reeducation-posturale',
    pole: 'kinesitherapie',
    icon: 'spine',
    bodyMapPoint: { x: 50, y: 28, view: 'back' },
    name: {
      fr: 'Rééducation Posturale Globale',
      ar: 'إعادة التأهيل الوضعي الشامل',
    },
    shortDesc: {
      fr: 'Correction des déséquilibres musculaires et articulaires pour retrouver une posture saine et sans douleur.',
      ar: 'تصحيح الاختلالات العضلية والمفصلية لاستعادة وضعية صحية وخالية من الألم.',
    },
    longDesc: {
      fr: `La Rééducation Posturale Globale (RPG) est une méthode thérapeutique douce qui s'attaque aux causes profondes des douleurs chroniques et des déformations posturales. Contrairement aux approches segmentaires classiques, la RPG traite le corps comme un tout, en identifiant les chaînes musculaires responsables des tensions et des compensations.

Développée par Philippe Souchard, cette technique repose sur des postures actives maintenues dans le temps, qui permettent de relâcher progressivement les tensions profondément enracinées dans les muscles. Elle convient aussi bien aux adolescents souffrant de scoliose légère qu'aux adultes victimes de douleurs lombaires chroniques ou de séquelles de blessures sportives.

Chez Ryma Ouichka, chaque bilan postural est personnalisé : analyse de votre silhouette debout et en mouvement, identification des chaînes courtes, et élaboration d'un programme sur mesure. Les résultats sont durables car ils traitent la cause, pas seulement le symptôme.`,
      ar: `إعادة التأهيل الوضعي الشامل هي طريقة علاجية لطيفة تعالج الأسباب الجذرية للآلام المزمنة والتشوهات الوضعية. على عكس الأساليب التقليدية، تعامل هذه التقنية الجسم ككل متكامل.

طورها فيليب سوشار، وتعتمد على وضعيات نشطة يتم الحفاظ عليها بمرور الوقت لتحرير التوترات العميقة في العضلات. مناسبة للمراهقين الذين يعانون من الجنف الخفيف والبالغين الذين يعانون من آلام أسفل الظهر المزمنة.

عند ريما ويشكة، كل تقييم وضعي مخصص: تحليل صورتك وقوفاً وأثناء الحركة، وتحديد السلاسل القصيرة، ووضع برنامج مخصص. النتائج دائمة لأنها تعالج السبب وليس فقط الأعراض.`,
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
      ar: [
        'كسر حديث غير ملتئم',
        'السرطان في المرحلة النشطة',
        'الحمل في الثلث الأول (بموافقة طبية)',
        'هشاشة العظام الشديدة',
      ],
    },
    faq: [
      {
        q: { fr: 'Combien de séances sont nécessaires ?', ar: 'كم عدد الجلسات اللازمة؟' },
        a: {
          fr: "En général, un cycle de 10 à 15 séances est recommandé, à raison d'une séance par semaine. Les premiers résultats se sentent dès la 3e ou 4e séance.",
          ar: 'بشكل عام، يُوصى بدورة من 10 إلى 15 جلسة، بمعدل جلسة واحدة في الأسبوع. تُلاحَظ النتائج الأولى منذ الجلسة الثالثة أو الرابعة.',
        },
      },
      {
        q: { fr: 'La séance est-elle douloureuse ?', ar: 'هل الجلسة مؤلمة؟' },
        a: {
          fr: "La RPG n'est pas douloureuse. Vous pouvez ressentir une légère tension ou inconfort lors du maintien des postures, mais jamais de douleur vive.",
          ar: 'لا تسبب هذه التقنية الألم. قد تشعر ببعض التوتر الخفيف أو الانزعاج أثناء الحفاظ على الوضعيات، لكن لا ألم حاد أبداً.',
        },
      },
      {
        q: { fr: 'Est-ce remboursé par la CNAM ?', ar: 'هل تشمله تأمين CNAM؟' },
        a: {
          fr: 'Oui, sur prescription médicale, les séances de kinésithérapie sont remboursées par la CNAM en Tunisie. Renseignez-vous auprès de votre médecin.',
          ar: 'نعم، بوصفة طبية، تُغطي CNAM جلسات العلاج الطبيعي في تونس. استشر طبيبك للمزيد من المعلومات.',
        },
      },
      {
        q: { fr: 'Dois-je apporter une ordonnance médicale ?', ar: 'هل أحتاج إلى وصفة طبية؟' },
        a: {
          fr: "Une ordonnance n'est pas obligatoire pour une consultation, mais elle est nécessaire pour la prise en charge par la CNAM.",
          ar: 'الوصفة الطبية ليست إلزامية للاستشارة، لكنها ضرورية للتغطية من قِبل CNAM.',
        },
      },
      {
        q: { fr: 'Quelle tenue porter ?', ar: 'ماذا أرتدي؟' },
        a: {
          fr: 'Portez des vêtements confortables et extensibles (legging, short). Évitez les jeans ou vêtements serrés qui limitent les mouvements.',
          ar: 'ارتدِ ملابس مريحة ومرنة (ليغنز، شورت). تجنب الجينز أو الملابس الضيقة التي تقيد الحركة.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['rééducation posturale', 'RPG', 'kiné Ezzahra', 'mal de dos Tunisie'],
  },
  {
    slug: 'reeducation-post-partum',
    pole: 'kinesitherapie',
    icon: 'pelvis',
    bodyMapPoint: { x: 50, y: 62, view: 'front' },
    name: {
      fr: 'Rééducation Périnéale & Post-Partum',
      ar: 'إعادة تأهيل العجان وما بعد الولادة',
    },
    shortDesc: {
      fr: "Programme complet de rééducation après l'accouchement : périnée, abdominaux profonds, récupération globale.",
      ar: 'برنامج متكامل لإعادة التأهيل بعد الولادة: العجان، عضلات البطن العميقة، التعافي الشامل.',
    },
    longDesc: {
      fr: `La grossesse et l'accouchement mettent à rude épreuve le périnée, les abdominaux et le plancher pelvien. La rééducation post-partum est une étape cruciale, souvent sous-estimée, pour prévenir les fuites urinaires, les douleurs pelviennes et les diastasis abdominaux.

Chez Ryma Ouichka, le programme de rééducation périnéale commence dès la 6e semaine après l'accouchement (ou après la réévaluation médicale). Il comprend une évaluation fonctionnelle du plancher pelvien, des exercices de renforcement progressifs et des techniques de rééducation abdominale hypopressive.

La rééducation n'est pas seulement physique : nous abordons aussi la posture, la reprise d'activité physique et les conseils nutritionnels pour vous aider à retrouver votre bien-être dans les meilleures conditions.`,
      ar: `الحمل والولادة يضعان ضغطاً كبيراً على العجان والبطن وقاع الحوض. إعادة التأهيل بعد الولادة خطوة حاسمة، كثيراً ما تُستهان بها، لمنع تسرب البول وآلام الحوض وفجوات البطن.

عند ريما ويشكة، يبدأ برنامج إعادة تأهيل العجان من الأسبوع السادس بعد الولادة. يشمل تقييماً وظيفياً لقاع الحوض، وتمارين تقوية تدريجية، وتقنيات إعادة تأهيل البطن الهيبوبريسيف.

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
      ar: [
        'قبل 6 أسابيع من الولادة (بدون موافقة طبية)',
        'عدوى نشطة في المسالك البولية',
        'نزيف نشط',
      ],
    },
    faq: [
      {
        q: { fr: 'Quand commencer la rééducation après accouchement ?', ar: 'متى أبدأ إعادة التأهيل بعد الولادة؟' },
        a: {
          fr: 'En général à partir de la 6e semaine post-partum, après la visite de contrôle avec votre gynécologue. Pour une césarienne, on attend parfois un peu plus.',
          ar: 'عموماً من الأسبوع السادس بعد الولادة، بعد زيارة المتابعة مع طبيب النساء. بالنسبة للولادة القيصرية، قد ننتظر أكثر قليلاً.',
        },
      },
      {
        q: { fr: "Combien de séances sont nécessaires en général ?", ar: 'كم عدد الجلسات اللازمة عادةً؟' },
        a: {
          fr: 'En moyenne 8 à 12 séances selon votre état de départ. Chaque patiente est différente.',
          ar: 'في المتوسط 8 إلى 12 جلسة حسب وضعك الأولي. كل مريضة مختلفة.',
        },
      },
      {
        q: { fr: 'Puis-je amener mon bébé ?', ar: 'هل يمكنني إحضار طفلي؟' },
        a: {
          fr: 'Absolument ! Nous sommes tout à fait accommodantes avec les jeunes mamans qui allaitent ou qui n\'ont pas de garde.',
          ar: 'بالتأكيد! نحن متفهمون تماماً للأمهات الجدد المرضعات أو اللواتي لا يجدن من يرعى أطفالهن.',
        },
      },
      {
        q: { fr: 'La rééducation est-elle utile même des années après l\'accouchement ?', ar: 'هل إعادة التأهيل مفيدة حتى بعد سنوات من الولادة؟' },
        a: {
          fr: 'Oui ! Il n\'est jamais trop tard. Beaucoup de femmes consultent des années après pour des fuites urinaires ou des douleurs pelviennes.',
          ar: 'نعم! لا يوجد وقت متأخر أبداً. تستشير كثيرات من النساء بعد سنوات بسبب تسرب البول أو آلام الحوض.',
        },
      },
      {
        q: { fr: 'Est-ce couvert par la CNAM ?', ar: 'هل تشمله تأمين CNAM؟' },
        a: {
          fr: 'Oui, sur prescription médicale de votre gynécologue ou médecin de famille.',
          ar: 'نعم، بوصفة طبية من طبيب النساء أو الطبيب العائلي.',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['rééducation périnéale', 'post-partum', 'kiné femme Ezzahra', 'fuites urinaires'],
  },
  {
    slug: 'massage-therapeutique',
    pole: 'kinesitherapie',
    icon: 'hands',
    bodyMapPoint: { x: 50, y: 40, view: 'both' },
    name: {
      fr: 'Massage Thérapeutique',
      ar: 'التدليك العلاجي',
    },
    shortDesc: {
      fr: 'Massages ciblés pour soulager les douleurs musculaires, réduire les tensions et accélérer la récupération.',
      ar: 'تدليك موجه لتخفيف الآلام العضلية، وتقليل التوترات، وتسريع التعافي.',
    },
    longDesc: {
      fr: `Le massage thérapeutique est une technique manuelle fondamentale en kinésithérapie, qui va bien au-delà du simple massage de relaxation. Il s'agit d'un acte médical ciblé, qui mobilise les tissus mous (muscles, fascias, tendons) pour traiter des pathologies spécifiques.

Ryma Ouichka maîtrise plusieurs techniques de massage thérapeutique : le massage transverse profond (MTP) de Cyriax pour les tendinopathies, le massage des points trigger myofasciaux pour les contractures chroniques, et le massage des cicatrices pour améliorer la mobilité tissulaire après une chirurgie.

Chaque séance commence par un bilan précis pour identifier les structures douloureuses. La pression et la profondeur sont adaptées en permanence à vos sensations et à votre état. L'objectif n'est pas de vous faire souffrir, mais de libérer progressivement les tensions pour vous offrir un soulagement durable.`,
      ar: `التدليك العلاجي تقنية يدوية أساسية في العلاج الطبيعي، تتجاوز مجرد التدليك الاسترخائي. إنه إجراء طبي موجه يحرك الأنسجة الرخوة (العضلات، اللفافة، الأوتار) لعلاج أمراض محددة.

تتقن ريما ويشكة عدة تقنيات: التدليك العرضي العميق لسيرياكس، وتدليك نقاط الزناد للتشنجات المزمنة، وتدليك الندبات لتحسين حركة الأنسجة بعد الجراحة.

تبدأ كل جلسة بتقييم دقيق لتحديد الهياكل المؤلمة. الضغط والعمق يتكيفان باستمرار مع إحساسك وحالتك.`,
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
        'Application de chaud ou froid selon indication',
      ],
      ar: [
        'تقييم لمسي للمناطق المؤلمة',
        'تدليك تحضيري للتسخين',
        'تقنيات عميقة موجهة (سيرياكس، نقاط الزناد)',
        'تعبئات لطيفة مرتبطة',
        'تمددات بعد التدليك',
        'تطبيق الحرارة أو البرودة حسب الإرشادات',
      ],
    },
    indications: {
      fr: ['Contractures et douleurs musculaires', 'Tendinopathies', 'Douleurs cervicales et dorsales', 'Récupération sportive', 'Cicatrices post-chirurgicales', 'Stress et tensions chroniques'],
      ar: ['التشنجات وآلام العضلات', 'اعتلالات الأوتار', 'آلام الرقبة والظهر', 'التعافي الرياضي', 'الندبات بعد الجراحة', 'التوتر والضغوط المزمنة'],
    },
    contraindications: {
      fr: ['Phlébite ou thrombose', 'Peau lésée ou infectée', 'Cancer en phase active', 'Fracture récente'],
      ar: ['التهاب الوريد أو الخثار', 'جلد متضرر أو مصاب', 'السرطان في المرحلة النشطة', 'كسر حديث'],
    },
    faq: [
      {
        q: { fr: 'Quelle est la différence avec un massage de spa ?', ar: 'ما الفرق بين التدليك العلاجي ومساج السبا؟' },
        a: {
          fr: "Le massage thérapeutique est ciblé et basé sur un diagnostic précis. L'objectif est médical : traiter une pathologie, réduire une douleur. Le massage de spa vise la relaxation générale.",
          ar: 'التدليك العلاجي موجه ومبني على تشخيص دقيق. هدفه طبي: علاج مرض، تقليل الألم. أما مساج السبا فيهدف إلى الاسترخاء العام.',
        },
      },
      {
        q: { fr: 'Vais-je avoir des courbatures après ?', ar: 'هل سأشعر بوجع العضلات بعدها؟' },
        a: {
          fr: 'Il est possible de ressentir une légère sensibilité 24 à 48h après une séance intensive. Cela est normal et signe que les tissus ont bien travaillé.',
          ar: 'من الممكن الشعور ببعض الحساسية لمدة 24 إلى 48 ساعة بعد جلسة مكثفة. هذا أمر طبيعي ويدل على أن الأنسجة قد عملت بشكل جيد.',
        },
      },
      {
        q: { fr: 'À quelle fréquence faire les séances ?', ar: 'ما هي وتيرة الجلسات؟' },
        a: {
          fr: "Cela dépend de la pathologie. Pour un problème aigu, 2 à 3 séances par semaine peuvent être nécessaires. Pour l'entretien, une fois par semaine ou toutes les deux semaines suffit.",
          ar: 'يعتمد ذلك على المرض. للمشاكل الحادة، قد تكون هناك حاجة إلى 2-3 جلسات في الأسبوع. للصيانة، مرة في الأسبوع أو كل أسبوعين كافٍ.',
        },
      },
      {
        q: { fr: "Faut-il être à jeun ?", ar: 'هل يجب أن أكون صائماً؟' },
        a: { fr: 'Non, mais évitez de manger un repas lourd dans l\'heure précédant la séance.', ar: 'لا، لكن تجنب تناول وجبة دسمة في الساعة التي تسبق الجلسة.' },
      },
      {
        q: { fr: 'Est-ce que le massage thérapeutique peut aider contre le stress ?', ar: 'هل التدليك العلاجي مفيد ضد التوتر؟' },
        a: {
          fr: 'Absolument. En libérant les tensions physiques, le massage réduit aussi les effets physiologiques du stress (cortisol, tensions musculaires réflexes).',
          ar: 'بالتأكيد. من خلال تحرير التوترات الجسدية، يقلل التدليك أيضاً من الآثار الفيزيولوجية للتوتر (الكورتيزول، التوترات العضلية الانعكاسية).',
        },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['massage thérapeutique Ezzahra', 'massage kinésithérapie Tunisie', 'contractures'],
  },
  {
    slug: 'drainage-lymphatique',
    pole: 'kinesitherapie',
    icon: 'lymph',
    bodyMapPoint: { x: 30, y: 48, view: 'front' },
    name: {
      fr: 'Drainage Lymphatique Manuel',
      ar: 'الصرف اللمفاوي اليدوي',
    },
    shortDesc: {
      fr: 'Technique douce qui stimule la circulation lymphatique pour réduire les œdèmes, les gonflements et améliorer l\'immunité.',
      ar: 'تقنية لطيفة تحفز الدورة اللمفاوية لتقليل الوذمات والانتفاخات وتحسين المناعة.',
    },
    longDesc: {
      fr: `Le drainage lymphatique manuel (DLM) est une technique de massage très douce, développée par le Dr Emil Vodder dans les années 1930. Elle consiste en des mouvements rythmés et superficiels, suivant le trajet naturel des vaisseaux lymphatiques, pour stimuler la circulation de la lymphe.

La lymphe est un liquide interstitiel essentiel au transport des déchets cellulaires, des toxines et des cellules immunitaires. Lorsque le système lymphatique est ralenti (par une chirurgie, un traumatisme, la grossesse ou une pathologie), un œdème (gonflement) se développe. Le DLM permet de le résorber efficacement.

Ryma Ouichka est formée à la technique Vodder, garantissant une approche rigoureuse et scientifiquement validée. Les séances sont très relaxantes et ne génèrent aucune douleur.`,
      ar: `الصرف اللمفاوي اليدوي تقنية تدليك لطيفة جداً، طورها الدكتور إميل فودر في الثلاثينيات. تتكون من حركات إيقاعية وسطحية تتبع المسار الطبيعي للأوعية اللمفاوية.

اللمف سائل بين الخلايا ضروري لنقل النفايات الخلوية والسموم والخلايا المناعية. عندما يتباطأ الجهاز اللمفاوي، تتطور وذمة. يتيح الصرف اللمفاوي اليدوي استيعابها بفعالية.

ريما ويشكة متخصصة في تقنية فودر، مما يضمن نهجاً صارماً وموثقاً علمياً. الجلسات مريحة جداً ولا تسبب أي ألم.`,
    },
    duration: '50 min',
    price: 65,
    sessionFlow: {
      fr: [
        'Bilan des zones de gonflement',
        'Drainage des ganglions centraux (cou, aisselles, aine)',
        'Manœuvres périphériques vers le centre',
        'Techniques spécifiques selon la zone (jambes, visage, bras)',
        'Bandage compressif si nécessaire',
        'Conseils pour la compression à domicile',
      ],
      ar: [
        'تقييم مناطق الانتفاخ',
        'صرف الغدد الليمفاوية المركزية (الرقبة، الإبط، الفخذ)',
        'مناورات محيطية نحو المركز',
        'تقنيات محددة حسب المنطقة (الساقان، الوجه، الذراعان)',
        'ضمادات ضغط عند الحاجة',
        'نصائح للضغط في المنزل',
      ],
    },
    indications: {
      fr: ['Œdèmes post-chirurgicaux', 'Lymphœdème primaire ou secondaire', 'Jambes lourdes et fatiguées', 'Grossesse (œdèmes des chevilles)', 'Post-liposuccion', 'Cicatrices et fibrose'],
      ar: ['وذمات ما بعد الجراحة', 'اللمفوذمة الأولية أو الثانوية', 'الساقان الثقيلتان والمتعبتان', 'الحمل (وذمات الكاحلين)', 'ما بعد شفط الدهون', 'الندبات والتليف'],
    },
    contraindications: {
      fr: ['Insuffisance cardiaque non compensée', 'Thrombose veineuse aiguë', 'Infection aiguë', 'Cancer en phase active sans avis oncologue'],
      ar: ['قصور القلب غير المعوَّض', 'تجلط وريدي حاد', 'عدوى حادة', 'سرطان في مرحلة نشطة بدون رأي أورام'],
    },
    faq: [
      {
        q: { fr: 'Le drainage aide-t-il à maigrir ?', ar: 'هل يساعد الصرف على إنقاص الوزن؟' },
        a: {
          fr: "Le drainage lymphatique n'est pas un outil de perte de poids. Il réduit les œdèmes et la rétention d'eau, ce qui peut donner une sensation d'allégement, mais ne brûle pas les graisses.",
          ar: 'الصرف اللمفاوي ليس أداة لفقدان الوزن. يقلل الوذمات واحتباس الماء، مما قد يعطي إحساساً بالخفة، لكنه لا يحرق الدهون.',
        },
      },
      {
        q: { fr: 'Peut-on faire du drainage en cas de varices ?', ar: 'هل يمكن عمل الصرف في حالة الدوالي؟' },
        a: {
          fr: "Oui, le DLM est même bénéfique pour les personnes avec des varices légères à modérées. En cas de varices sévères, un avis médical est préférable.",
          ar: 'نعم، الصرف اللمفاوي مفيد حتى للأشخاص الذين يعانون من دوالي خفيفة إلى متوسطة. في حالة الدوالي الشديدة، يُفضل استشارة طبية.',
        },
      },
      {
        q: { fr: 'Combien de séances pour un résultat visible ?', ar: 'كم عدد الجلسات لنتيجة ملموسة؟' },
        a: { fr: 'Généralement 5 à 10 séances selon le degré de gonflement. Les jambes lourdes peuvent nécessiter une cure mensuelle d\'entretien.', ar: 'عموماً 5 إلى 10 جلسات حسب درجة الانتفاخ. قد تحتاج الساقان الثقيلتان إلى علاج صيانة شهري.' },
      },
      {
        q: { fr: 'Y a-t-il des choses à faire avant la séance ?', ar: 'هل هناك أشياء يجب فعلها قبل الجلسة؟' },
        a: { fr: "Hydratez-vous bien avant la séance. Portez des vêtements amples. Évitez les crèmes grasses sur la peau le jour de la séance.", ar: 'حافظ على الترطيب الجيد قبل الجلسة. ارتدِ ملابس فضفاضة. تجنب الكريمات الدهنية على الجلد في يوم الجلسة.' },
      },
      {
        q: { fr: 'Le DLM est-il efficace après une liposuccion ?', ar: 'هل الصرف فعال بعد شفط الدهون؟' },
        a: { fr: "Oui, le DLM est fortement recommandé après une liposuccion pour réduire les œdèmes post-opératoires, accélérer la cicatrisation et améliorer le résultat esthétique.", ar: 'نعم، يُوصى بشدة بالصرف اللمفاوي بعد شفط الدهون لتقليل الوذمات بعد الجراحة وتسريع الشفاء وتحسين النتيجة الجمالية.' },
      },
    ],
    hasBeforeAfter: false,
    keywords: ['drainage lymphatique Ezzahra', 'DLM Tunisie', 'jambes lourdes', 'œdèmes'],
  },
  {
    slug: 'electrotherapie',
    pole: 'kinesitherapie',
    icon: 'electric',
    bodyMapPoint: { x: 70, y: 38, view: 'front' },
    name: { fr: 'Électrothérapie & TENS', ar: 'العلاج الكهربائي وTENS' },
    shortDesc: {
      fr: 'Utilisation de courants électriques thérapeutiques pour soulager la douleur, stimuler les muscles et accélérer la cicatrisation.',
      ar: 'استخدام التيارات الكهربائية العلاجية لتخفيف الألم وتحفيز العضلات وتسريع الشفاء.',
    },
    longDesc: {
      fr: `L'électrothérapie regroupe plusieurs modalités de traitement utilisant des courants électriques contrôlés pour des effets thérapeutiques. Le TENS (Transcutaneous Electrical Nerve Stimulation) est la technique la plus connue : il bloque la transmission de la douleur en stimulant les fibres nerveuses sensitives.

D'autres courants comme les courants interférentiels (pour les douleurs profondes) ou les courants de Träbert (anti-algiques puissants) peuvent être utilisés selon la pathologie. La FES (Functional Electrical Stimulation) permet de rééduquer des muscles affaiblis après une paralysie ou une longue immobilisation.

Ryma Ouichka dispose d'un équipement professionnel de dernier génération. L'électrothérapie est toujours combinée à d'autres techniques pour une efficacité maximale.`,
      ar: `يضم العلاج الكهربائي عدة أساليب علاجية تستخدم تيارات كهربائية خاضعة للسيطرة. TENS هو الأكثر شهرة: يحجب انتقال الألم عن طريق تحفيز الألياف العصبية الحسية.

يمكن استخدام تيارات أخرى مثل التيارات التداخلية (للآلام العميقة) أو تيارات تراتبرت (مسكنة قوية) حسب المرض. FES يُعيد تأهيل العضلات المضعوفة بعد الشلل أو الشل الطويل.

تمتلك ريما ويشكة معدات احترافية حديثة. يُجمع العلاج الكهربائي دائماً مع تقنيات أخرى لتحقيق أقصى فعالية.`,
    },
    duration: '30 min',
    price: 40,
    sessionFlow: {
      fr: ['Évaluation de la douleur (EVA)', 'Positionnement des électrodes', 'Réglage des paramètres du courant', 'Application pendant 20-25 minutes', 'Exercices associés si indiqués', 'Réévaluation de la douleur post-séance'],
      ar: ['تقييم الألم (EVA)', 'وضع الأقطاب الكهربائية', 'ضبط معاملات التيار', 'تطبيق لمدة 20-25 دقيقة', 'تمارين مرتبطة عند الإشارة', 'إعادة تقييم الألم بعد الجلسة'],
    },
    indications: { fr: ['Douleurs aiguës et chroniques', 'Nevralgies et sciatique', 'Contractures musculaires', 'Rééducation musculaire', 'Tendinopathies'], ar: ['الآلام الحادة والمزمنة', 'الأعصاب والعرق النسا', 'التشنجات العضلية', 'إعادة تأهيل العضلات', 'اعتلالات الأوتار'] },
    contraindications: { fr: ['Pacemaker ou implant électronique', 'Zone cancéreuse', 'Grossesse (zone abdominale/lombaire)', 'Peau lésée ou eczéma actif'], ar: ['جهاز تنظيم ضربات القلب أو الغرسات الإلكترونية', 'منطقة السرطان', 'الحمل (منطقة البطن/أسفل الظهر)', 'جلد تالف أو أكزيما نشطة'] },
    faq: [
      { q: { fr: 'Est-ce douloureux ?', ar: 'هل هو مؤلم؟' }, a: { fr: "Non, vous ressentirez des picotements ou des fourmillements agréables, jamais une douleur. L'intensité est toujours réglée à votre confort.", ar: 'لا، ستشعر بوخز أو نمل مريح، لا ألم أبداً. الشدة تُضبط دائماً وفق راحتك.' } },
      { q: { fr: 'Combien de temps dure l\'effet antalgique ?', ar: 'كم تدوم التأثيرات المسكنة للألم؟' }, a: { fr: "L'effet peut durer de quelques heures à plusieurs jours selon les patients et la pathologie.", ar: 'يمكن أن يستمر التأثير من بضع ساعات إلى عدة أيام حسب المريض والمرض.' } },
      { q: { fr: 'Puis-je utiliser un TENS à la maison ?', ar: 'هل يمكنني استخدام TENS في المنزل؟' }, a: { fr: "Des appareils TENS grand public existent. Nous pouvons vous apprendre à les utiliser correctement pour compléter les séances au cabinet.", ar: 'توجد أجهزة TENS للعموم. يمكننا تعليمك استخدامها بشكل صحيح لاستكمال الجلسات في العيادة.' } },
      { q: { fr: 'L\'électrothérapie fonctionne-t-elle vraiment ?', ar: 'هل العلاج الكهربائي فعال حقاً؟' }, a: { fr: "Oui, son efficacité est largement documentée dans la littérature médicale internationale, notamment pour la gestion de la douleur chronique.", ar: 'نعم، فعاليته موثقة على نطاق واسع في الأدبيات الطبية الدولية، لا سيما في إدارة الألم المزمن.' } },
      { q: { fr: 'Puis-je conduire après une séance ?', ar: 'هل يمكنني القيادة بعد الجلسة؟' }, a: { fr: "Oui, l'électrothérapie ne provoque pas de somnolence.", ar: 'نعم، العلاج الكهربائي لا يسبب النعاس.' } },
    ],
    hasBeforeAfter: false,
    keywords: ['TENS Ezzahra', 'électrothérapie Tunisie', 'douleur chronique'],
  },
  {
    slug: 'ultrasons',
    pole: 'kinesitherapie',
    icon: 'wave',
    bodyMapPoint: { x: 72, y: 55, view: 'front' },
    name: { fr: 'Ultrasons Thérapeutiques', ar: 'الموجات فوق الصوتية العلاجية' },
    shortDesc: {
      fr: 'Les ultrasons pénètrent en profondeur pour traiter les tendinites, les bursites et accélérer la cicatrisation tissulaire.',
      ar: 'تخترق الموجات فوق الصوتية بعمق لعلاج التهابات الأوتار والأكياس المصلية وتسريع شفاء الأنسجة.',
    },
    longDesc: {
      fr: `Les ultrasons thérapeutiques utilisent des ondes sonores à haute fréquence (1 à 3 MHz) pour produire des effets thermiques et mécaniques dans les tissus profonds. Contrairement aux ultrasons d'imagerie, ils sont conçus pour traiter, pas pour visualiser.

L'effet thermique (mode continu) réchauffe les tendons, les ligaments et les capsules articulaires en profondeur, augmentant leur élasticité et favorisant la cicatrisation. L'effet mécanique (mode pulsé) réduit l'inflammation sans générer de chaleur, idéal pour les phases aiguës.

Cette technique est particulièrement efficace pour les tendinopathies calcifiantes (épaule de calcification), les bursites chroniques et les cicatrices fibreuses. Elle est indolore et très bien tolérée.`,
      ar: `تستخدم الموجات فوق الصوتية العلاجية موجات صوتية عالية التردد (1 إلى 3 ميغاهرتز) لإنتاج آثار حرارية وميكانيكية في الأنسجة العميقة.

التأثير الحراري (الوضع المستمر) يسخن الأوتار والأربطة والكبسولات المفصلية بعمق. التأثير الميكانيكي (الوضع النبضي) يقلل الالتهاب دون توليد حرارة، مثالي للمراحل الحادة.

هذه التقنية فعالة بشكل خاص لاعتلالات الأوتار التكلسية والتهابات الأكياس المصلية المزمنة والندبات الليفية.`,
    },
    duration: '20 min',
    price: 35,
    sessionFlow: {
      fr: ['Application de gel conducteur', 'Réglage fréquence et mode (continu/pulsé)', 'Application circulaire sur la zone', 'Association avec d\'autres techniques', 'Nettoyage de la zone', 'Conseils post-séance'],
      ar: ['تطبيق هلام موصل', 'ضبط التردد والوضع (مستمر/نبضي)', 'تطبيق دائري على المنطقة', 'الدمج مع تقنيات أخرى', 'تنظيف المنطقة', 'نصائح ما بعد الجلسة'],
    },
    indications: { fr: ['Tendinites et tendinopathies', 'Bursites', 'Fasciite plantaire', 'Cicatrices fibreuses', 'Arthrose débutante'], ar: ['التهابات الأوتار', 'التهاب الأكياس المصلية', 'لفافة أخمص القدم', 'الندبات الليفية', 'الفصال العظمي المبكر'] },
    contraindications: { fr: ['Grossesse', 'Implant métallique dans la zone', 'Cancer', 'Épiphyse de croissance chez l\'enfant'], ar: ['الحمل', 'غرسة معدنية في المنطقة', 'السرطان', 'مشاشة النمو عند الأطفال'] },
    faq: [
      { q: { fr: 'Est-ce que je vais sentir quelque chose ?', ar: 'هل سأشعر بشيء؟' }, a: { fr: "Vous sentirez une légère chaleur agréable en mode continu. En mode pulsé, la sensation est quasi imperceptible.", ar: 'ستشعر بحرارة خفيفة مريحة في الوضع المستمر. في الوضع النبضي، الإحساس يكاد يكون غير محسوس.' } },
      { q: { fr: 'Combien de séances pour une tendinite ?', ar: 'كم عدد الجلسات لعلاج التهاب الوتر؟' }, a: { fr: "En général 6 à 10 séances pour une tendinite chronique. Les résultats varient selon l'ancienneté du problème.", ar: 'عموماً 6 إلى 10 جلسات لالتهاب الوتر المزمن. تتفاوت النتائج حسب قِدم المشكلة.' } },
      { q: { fr: 'Peut-on l\'utiliser avec d\'autres techniques ?', ar: 'هل يمكن استخدامه مع تقنيات أخرى؟' }, a: { fr: "Oui, les ultrasons sont souvent combinés avec l'électrothérapie, le massage et les exercices pour un traitement complet.", ar: 'نعم، تُجمع الموجات فوق الصوتية كثيراً مع العلاج الكهربائي والتدليك والتمارين لعلاج شامل.' } },
      { q: { fr: 'Les ultrasons thérapeutiques sont-ils différents de l\'échographie ?', ar: 'هل الموجات فوق الصوتية العلاجية مختلفة عن الموجات التشخيصية؟' }, a: { fr: "Absolument. L'échographie utilise des fréquences très basses pour visualiser. Les ultrasons thérapeutiques ont une fréquence plus élevée et une puissance conçue pour traiter les tissus.", ar: 'بالتأكيد. تستخدم الموجات التشخيصية ترددات منخفضة جداً للرؤية. أما العلاجية فلها تردد أعلى وقوة مصممة لعلاج الأنسجة.' } },
      { q: { fr: 'Y a-t-il des effets secondaires ?', ar: 'هل هناك آثار جانبية؟' }, a: { fr: "Les effets secondaires sont rares et bénins : légère rougeur ou chaleur passagère. L'appareil est utilisé sous contrôle strict de la kinésithérapeute.", ar: 'الآثار الجانبية نادرة وخفيفة: احمرار طفيف أو حرارة عابرة. الجهاز يُستخدم تحت إشراف صارم من المعالجة.' } },
    ],
    hasBeforeAfter: false,
    keywords: ['ultrasons thérapeutiques Ezzahra', 'tendinite traitement Tunisie'],
  },
  {
    slug: 'cavitation',
    pole: 'minceur',
    icon: 'bubble',
    bodyMapPoint: { x: 50, y: 55, view: 'front' },
    name: { fr: 'Cavitation Ultrasonique', ar: 'التكهيف بالموجات فوق الصوتية' },
    shortDesc: {
      fr: 'Technique non-invasive qui détruit les cellules graisseuses localisées par des ondes ultrasoniques, sans chirurgie ni temps de récupération.',
      ar: 'تقنية غير جراحية تدمر خلايا الدهون الموضعية بالموجات فوق الصوتية، بدون جراحة أو وقت تعافٍ.',
    },
    longDesc: {
      fr: `La cavitation ultrasonique est l'une des techniques phares de la médecine esthétique non-invasive. Elle utilise des ondes ultrasoniques de basse fréquence (40 kHz) qui créent des micro-bulles dans le tissu adipeux. Quand ces bulles implosent, elles détruisent la membrane des adipocytes (cellules graisseuses) sans affecter les autres tissus.

Les triglycérides libérés sont ensuite métabolisés par le foie et éliminés naturellement par les voies urinaires et lymphatiques. C'est pourquoi la cavitation est toujours associée à un drainage lymphatique et à une bonne hydratation.

Les zones les plus traitées sont le ventre, les flancs, les cuisses, les bras et le double menton. Les résultats sont progressifs et naturels, sans effet « retouché » artificiel.`,
      ar: `التكهيف بالموجات فوق الصوتية من أبرز تقنيات الطب التجميلي غير الجراحي. يستخدم موجات فوق صوتية منخفضة التردد (40 كيلوهرتز) تخلق فقاعات دقيقة في الأنسجة الدهنية. عند انهيار هذه الفقاعات، تدمر غشاء الخلايا الدهنية دون أن تؤثر على الأنسجة الأخرى.

ثم يتم استقلاب الدهون الثلاثية المُطلَقة عن طريق الكبد والتخلص منها بشكل طبيعي. لهذا يُقترن التكهيف دائماً بصرف لمفاوي وترطيب جيد.

المناطق الأكثر علاجاً: البطن، الجنبان، الفخذان، الذراعان، الذقن المزدوجة.`,
    },
    duration: '45 min',
    price: 80,
    sessionFlow: {
      fr: ['Bilan morphologique et photos', 'Application de gel conducteur', 'Passages de la sonde cavitation sur la zone cible', 'Drainage lymphatique post-séance (20 min)', 'Conseils hydriques et alimentaires', 'Planification des séances suivantes'],
      ar: ['تقييم شكلي وصور', 'تطبيق هلام موصل', 'تمرير مسبار التكهيف على المنطقة المستهدفة', 'صرف لمفاوي بعد الجلسة (20 دقيقة)', 'نصائح مائية وغذائية', 'تخطيط الجلسات التالية'],
    },
    indications: { fr: ['Graisse localisée rebelle', 'Culotte de cheval', 'Graisse abdominale', 'Double menton', 'Bras flasques', 'Cellulite fibreuse'], ar: ['دهون موضعية مقاومة', 'دهون الفخذ الخارجية', 'دهون البطن', 'الذقن المزدوجة', 'ذراعان مترهلتان', 'سيلوليت ليفي'] },
    contraindications: { fr: ['Grossesse et allaitement', 'Pacemaker', 'Maladies hépatiques graves', 'Cancer', 'Implants métalliques dans la zone', 'Diabète non équilibré'], ar: ['الحمل والرضاعة', 'جهاز تنظيم ضربات القلب', 'أمراض الكبد الخطيرة', 'السرطان', 'غرسات معدنية في المنطقة', 'السكري غير المتوازن'] },
    faq: [
      { q: { fr: 'La cavitation est-elle douloureuse ?', ar: 'هل التكهيف مؤلم؟' }, a: { fr: "Non, vous entendrez un léger bourdonnement sourd (les ultrasons) et sentirez une chaleur douce. Certaines personnes entendent le son directement dans l'oreille interne.", ar: 'لا، ستسمع طنيناً خفيفاً (الموجات فوق الصوتية) وتشعر بدفء لطيف. بعض الأشخاص يسمعون الصوت مباشرة في الأذن الداخلية.' } },
      { q: { fr: 'Combien de séances pour voir des résultats ?', ar: 'كم عدد الجلسات لرؤية نتائج؟' }, a: { fr: "Les résultats commencent à être visibles après 3 à 5 séances. Un cycle complet est de 8 à 12 séances selon la zone et l'épaisseur du tissu.", ar: 'تبدأ النتائج في الظهور بعد 3 إلى 5 جلسات. الدورة الكاملة 8 إلى 12 جلسة حسب المنطقة وسمك الأنسجة.' } },
      { q: { fr: 'Faut-il un régime alimentaire particulier ?', ar: 'هل يلزم نظام غذائي خاص؟' }, a: { fr: "Pas de régime strict, mais il est recommandé de boire beaucoup d'eau (2L/jour minimum), d'éviter l'alcool et les graisses saturées les 72h après la séance.", ar: 'لا نظام صارم، لكن يُوصى بشرب الكثير من الماء (2 لتر يومياً على الأقل)، وتجنب الكحول والدهون المشبعة لـ72 ساعة بعد الجلسة.' } },
      { q: { fr: 'Les résultats sont-ils permanents ?', ar: 'هل النتائج دائمة؟' }, a: { fr: "Les cellules détruites ne reviennent pas, mais les cellules graisseuses restantes peuvent grossir si vous reprenez du poids. Un mode de vie sain est essentiel pour maintenir les résultats.", ar: 'الخلايا المدمرة لا تعود، لكن الخلايا الدهنية المتبقية قد تكبر إذا استعدت الوزن. نمط الحياة الصحي ضروري للحفاظ على النتائج.' } },
      { q: { fr: 'Puis-je reprendre le sport après ?', ar: 'هل يمكنني ممارسة الرياضة بعدها؟' }, a: { fr: "Oui, l'activité physique est même recommandée après la séance pour accélérer l'élimination des graisses libérées.", ar: 'نعم، النشاط البدني مستحسن حتى بعد الجلسة لتسريع التخلص من الدهون المُطلَقة.' } },
    ],
    hasBeforeAfter: true,
    keywords: ['cavitation Ezzahra', 'perte de graisse localisée Tunisie', 'minceur non-invasif'],
  },
  {
    slug: 'radiofrequence',
    pole: 'minceur',
    icon: 'radio',
    bodyMapPoint: { x: 35, y: 52, view: 'front' },
    name: { fr: 'Radiofréquence Corps & Visage', ar: 'الترددات الراديوية للجسم والوجه' },
    shortDesc: {
      fr: 'Raffermit la peau, stimule la production de collagène et réduit les rides grâce à l\'énergie thermique des ondes radio.',
      ar: 'يشد الجلد ويحفز إنتاج الكولاجين ويقلل التجاعيد بفضل الطاقة الحرارية لموجات الراديو.',
    },
    longDesc: {
      fr: `La radiofréquence est une technique de rajeunissement cutané et de raffermissement corporel qui utilise des ondes électromagnétiques pour chauffer le derme en profondeur. Cette chaleur contrôlée (40–45°C) stimule les fibroblastes, les cellules responsables de la production de collagène et d'élastine.

Le résultat est double : un effet immédiat de contraction des fibres de collagène existantes (la peau paraît plus ferme dès la première séance) et un effet à long terme de néocollagénèse (production de nouveau collagène sur 3 à 6 mois).

Chez Ryma Ouichka, la radiofréquence est proposée pour le corps (ventre, cuisses, bras, fesses) et le visage (ovale du visage, joues, paupières, cou). Elle peut être combinée avec la cavitation pour un résultat minceur global.`,
      ar: `الترددات الراديوية تقنية لتجديد شباب الجلد وشد الجسم تستخدم موجات كهرومغناطيسية لتسخين الأدمة بعمق. هذه الحرارة المتحكم بها (40-45 درجة مئوية) تحفز الخلايا الليفية، المسؤولة عن إنتاج الكولاجين والإيلاستين.

النتيجة مزدوجة: تأثير فوري بانكماش ألياف الكولاجين الموجودة، وتأثير طويل الأمد بإنتاج كولاجين جديد (على مدى 3 إلى 6 أشهر).

عند ريما ويشكة، تُقدَّم الترددات الراديوية للجسم (البطن، الفخذان، الذراعان، الأرداف) والوجه (الخد، الجفون، الرقبة).`,
    },
    duration: '60 min',
    price: 90,
    sessionFlow: {
      fr: ['Démaquillage et nettoyage de la zone', 'Application de gel conducteur', 'Passages lents et réguliers de la tête de RF', 'Suivi de la température cutanée', 'Application de sérum apaisant', 'Conseils post-traitement'],
      ar: ['إزالة الماكياج وتنظيف المنطقة', 'تطبيق هلام موصل', 'تمريرات بطيئة ومنتظمة لرأس الترددات الراديوية', 'مراقبة درجة حرارة الجلد', 'تطبيق مصل مهدئ', 'نصائح ما بعد العلاج'],
    },
    indications: { fr: ['Peau relâchée et flasque', 'Rides et ridules', 'Cellulite molle', 'Après amincissement important', 'Raffermissement préventif'], ar: ['جلد مترهل ومتدلٍّ', 'التجاعيد والخطوط الدقيقة', 'سيلوليت ناعم', 'بعد إنقاص وزن كبير', 'شد وقائي'] },
    contraindications: { fr: ['Grossesse', 'Implants métalliques dans la zone', 'Cancer', 'Maladies auto-immunes actives', 'Pacemaker'], ar: ['الحمل', 'غرسات معدنية في المنطقة', 'السرطان', 'أمراض المناعة الذاتية النشطة', 'جهاز تنظيم ضربات القلب'] },
    faq: [
      { q: { fr: 'La radiofréquence est-elle adaptée à tous les types de peau ?', ar: 'هل الترددات الراديوية مناسبة لجميع أنواع البشرة؟' }, a: { fr: "Oui, la radiofréquence convient à tous les phototypes (peaux claires à très foncées) car elle travaille en profondeur sans affecter la mélanine.", ar: 'نعم، الترددات الراديوية مناسبة لجميع أنواع البشرة لأنها تعمل بعمق دون التأثير على الميلانين.' } },
      { q: { fr: 'Quand vais-je voir les résultats ?', ar: 'متى سأرى النتائج؟' }, a: { fr: "Un raffermissement est visible dès la première séance. Les meilleurs résultats apparaissent 2 à 3 mois après la fin du traitement, le temps que le nouveau collagène se forme.", ar: 'الشد مرئي من الجلسة الأولى. أفضل النتائج تظهر بعد 2 إلى 3 أشهر من نهاية العلاج، ريثما يتشكل الكولاجين الجديد.' } },
      { q: { fr: 'Combien de séances ?', ar: 'كم عدد الجلسات؟' }, a: { fr: "Pour un résultat optimal, 6 à 8 séances hebdomadaires sont recommandées, suivies de 1 à 2 séances d'entretien par trimestre.", ar: 'للحصول على نتيجة مثلى، يُوصى بـ 6 إلى 8 جلسات أسبوعية، تليها جلسة أو جلستان للصيانة كل ثلاثة أشهر.' } },
      { q: { fr: 'Y a-t-il des effets secondaires ?', ar: 'هل هناك آثار جانبية؟' }, a: { fr: "Une légère rougeur temporaire est normale. Elle disparaît en 30 minutes à 1 heure.", ar: 'احمرار طفيف مؤقت أمر طبيعي. يختفي في غضون 30 دقيقة إلى ساعة.' } },
      { q: { fr: 'Radiofréquence ou laser : que choisir ?', ar: 'الترددات الراديوية أو الليزر: ماذا تختار؟' }, a: { fr: "La RF est sans éviction sociale (pas de rougeur durable), adaptée à tous les phototypes, et traite le relâchement plus en profondeur. Le laser est plus adapté aux taches et imperfections de surface.", ar: 'الترددات الراديوية بدون انقطاع اجتماعي (لا احمرار دائم)، مناسبة لجميع أنواع البشرة، وتعالج الترهل بعمق أكبر. الليزر أكثر ملاءمة للبقع وعيوب السطح.' } },
    ],
    hasBeforeAfter: true,
    keywords: ['radiofréquence Ezzahra', 'raffermissement peau Tunisie', 'anti-âge'],
  },
  {
    slug: 'laser-lipo',
    pole: 'minceur',
    icon: 'laser',
    bodyMapPoint: { x: 65, y: 58, view: 'front' },
    name: { fr: 'Laser Lipo Non-Invasif', ar: 'شد الدهون بالليزر غير الجراحي' },
    shortDesc: {
      fr: 'Lasers froids qui pénètrent dans les adipocytes et libèrent leur contenu, permettant une perte centimétrique sans douleur.',
      ar: 'ليزر بارد يخترق الخلايا الدهنية ويُطلق محتواها، مما يتيح فقدان سنتيمترات بدون ألم.',
    },
    longDesc: {
      fr: `Le laser lipo non-invasif (également appelé laser froid ou LLLT - Low Level Laser Therapy) utilise de la lumière laser à faible énergie pour créer des micropores temporaires dans la membrane des adipocytes. Le contenu des cellules graisseuses (triglycérides, eau) s'écoule naturellement et est éliminé par voie lymphatique.

Contrairement à la cavitation qui détruit les cellules, le laser lipo les vide temporairement sans les tuer. Cela garantit une sécurité maximale et l'absence d'effets secondaires. Les résultats sont immédiatement mesurables en centimètres.

La technologie utilisée au cabinet est certifiée et cliniquement testée, avec des résultats moyens de 2 à 4 cm de perte sur la zone ciblée après une séance de 30 minutes.`,
      ar: `ليزر ليبو غير الجراحي (يُعرف أيضاً بالليزر البارد أو LLLT) يستخدم ضوء ليزر منخفض الطاقة لإنشاء مسام مؤقتة في غشاء الخلايا الدهنية. يتدفق محتوى الخلايا الدهنية بشكل طبيعي ويُزال عبر الجهاز اللمفاوي.

على عكس التكهيف الذي يدمر الخلايا، ليزر ليبو يُفرغها مؤقتاً دون قتلها. هذا يضمن أقصى قدر من الأمان. النتائج قابلة للقياس فوراً بالسنتيمترات.`,
    },
    duration: '30 min',
    price: 70,
    sessionFlow: {
      fr: ['Mesures initiales (tour de taille, cuisses...)', 'Positionnement des palettes laser sur la zone', 'Session de 20–30 minutes allongé(e)', 'Retrait des palettes', 'Drainage lymphatique (inclus)', 'Mesures post-séance'],
      ar: ['قياسات أولية (محيط الخصر، الفخذين...)', 'وضع لوحات الليزر على المنطقة', 'جلسة 20-30 دقيقة مستلقياً', 'إزالة اللوحات', 'صرف لمفاوي (مشمول)', 'قياسات ما بعد الجلسة'],
    },
    indications: { fr: ['Ventre post-grossesse', 'Cuisses et selle-bags', 'Bras', 'Dos du bras', 'Flancs'], ar: ['بطن ما بعد الحمل', 'الفخذان والردفان', 'الذراعان', 'خلف الذراع', 'الجنبان'] },
    contraindications: { fr: ['Grossesse', 'Épilepsie photosensible', 'Tumeurs malignes'], ar: ['الحمل', 'الصرع الحساس للضوء', 'الأورام الخبيثة'] },
    faq: [
      { q: { fr: 'Est-ce que ça fait mal ?', ar: 'هل يؤلم؟' }, a: { fr: "Absolument pas. Vous ne sentez rien du tout pendant la séance. Les lasers froids ne génèrent pas de chaleur perceptible.", ar: 'لا على الإطلاق. لا تشعر بشيء خلال الجلسة. الليزر البارد لا يولد حرارة محسوسة.' } },
      { q: { fr: 'Puis-je reprendre mes activités immédiatement ?', ar: 'هل يمكنني استئناف أنشطتي فوراً؟' }, a: { fr: "Oui ! Aucune éviction sociale, aucune rougeur. Vous pouvez reprendre le travail immédiatement après.", ar: 'نعم! لا انقطاع اجتماعي، لا احمرار. يمكنك العودة للعمل فوراً بعدها.' } },
      { q: { fr: 'Quelle différence avec la liposuccion ?', ar: 'ما الفرق مع شفط الدهون الجراحي؟' }, a: { fr: "La liposuccion est une chirurgie avec anesthésie, éviction sociale de 2 semaines et risques opératoires. Le laser lipo est non-invasif, sans douleur, sans chirurgie, mais avec des résultats plus progressifs.", ar: 'شفط الدهون عملية جراحية بالتخدير وانقطاع اجتماعي لأسبوعين ومخاطر جراحية. ليزر ليبو غير جراحي، بدون ألم، بدون جراحة، لكن بنتائج تدريجية أكثر.' } },
      { q: { fr: 'Faut-il faire de l\'exercice en parallèle ?', ar: 'هل يجب ممارسة الرياضة في الوقت نفسه؟' }, a: { fr: "Très fortement recommandé ! 30 minutes de marche rapide ou de vélo après la séance aide à brûler les triglycérides libérés.", ar: 'مستحسن بشدة! 30 دقيقة من المشي السريع أو ركوب الدراجة بعد الجلسة يساعد على حرق الدهون الثلاثية المُطلَقة.' } },
      { q: { fr: 'Les résultats sont-ils durables ?', ar: 'هل النتائج دائمة؟' }, a: { fr: "Les résultats sont durables avec une alimentation équilibrée. Les cellules se reremplissent si vous retournez à de mauvaises habitudes alimentaires.", ar: 'النتائج دائمة مع نظام غذائي متوازن. تمتلئ الخلايا مجدداً إذا عدت لعادات غذائية سيئة.' } },
    ],
    hasBeforeAfter: true,
    keywords: ['laser lipo Ezzahra', 'liposuccion non-invasive Tunisie', 'perte de centimètres'],
  },
  {
    slug: 'pressotherapie',
    pole: 'minceur',
    icon: 'compress',
    bodyMapPoint: { x: 50, y: 72, view: 'front' },
    name: { fr: 'Pressothérapie', ar: 'العلاج بالضغط' },
    shortDesc: {
      fr: 'Massage pneumatique qui stimule la circulation lymphatique et veineuse pour des jambes légères et un corps affiné.',
      ar: 'تدليك هوائي يحفز الدورة اللمفاوية والوريدية لساقين خفيفتين وجسم مشدود.',
    },
    longDesc: {
      fr: `La pressothérapie utilise des bottes, jambières ou costumes gonflables qui compriment et relâchent rythmiquement les membres. Cette compression séquentielle mimique le mouvement musculaire naturel pour stimuler la circulation lymphatique et veineuse.

Les bénéfices sont multiples : réduction des jambes lourdes, élimination des toxines, réduction de la cellulite par amélioration de la microcirculation, et accélération de la récupération sportive. La pressothérapie est aussi largement utilisée en post-liposuccion et en post-chirurgie esthétique.

C'est une technique agréable et totalement indolore. De nombreuses patientes utilisent la séance pour se relaxer et méditer.`,
      ar: `تستخدم العلاج بالضغط أحذية وسراويل وأقنعة قابلة للنفخ تضغط على الأطراف وتُرخيها بشكل إيقاعي. هذا الضغط المتسلسل يحاكي الحركة العضلية الطبيعية لتحفيز الدورة اللمفاوية والوريدية.

الفوائد متعددة: تخفيف الساقين الثقيلتين، التخلص من السموم، تقليل السيلوليت، وتسريع التعافي الرياضي.

إنها تقنية ممتعة وغير مؤلمة تماماً.`,
    },
    duration: '45 min',
    price: 50,
    sessionFlow: {
      fr: ['Mise en place du costume de pressothérapie', 'Réglage de la pression et du programme', 'Séance de 40 minutes en position allongée', 'Retrait du costume', 'Massage léger complémentaire si indiqué', 'Conseils de style de vie'],
      ar: ['وضع زي العلاج بالضغط', 'ضبط الضغط والبرنامج', 'جلسة 40 دقيقة في وضع الاستلقاء', 'إزالة الزي', 'تدليك خفيف تكميلي عند الإشارة', 'نصائح نمط الحياة'],
    },
    indications: { fr: ['Jambes lourdes', 'Varices légères', 'Rétention d\'eau', 'Cellulite aqueuse', 'Récupération sportive', 'Post-liposuccion'], ar: ['الساقان الثقيلتان', 'دوالي خفيفة', 'احتباس الماء', 'سيلوليت مائي', 'تعافٍ رياضي', 'ما بعد شفط الدهون'] },
    contraindications: { fr: ['Thrombose veineuse profonde', 'Insuffisance cardiaque', 'Phlébite aiguë', 'Infection des membres'], ar: ['الخثار الوريدي العميق', 'قصور القلب', 'التهاب وريد حاد', 'عدوى الأطراف'] },
    faq: [
      { q: { fr: 'C\'est agréable ou désagréable ?', ar: 'هل هو مريح أم غير مريح؟' }, a: { fr: "Très agréable ! La pression est douce et rythmée. La plupart des patients s'endorment pendant la séance.", ar: 'مريح جداً! الضغط لطيف وإيقاعي. معظم المرضى ينامون خلال الجلسة.' } },
      { q: { fr: 'Quelle fréquence recommandez-vous ?', ar: 'ما الوتيرة التي تنصحون بها؟' }, a: { fr: "Pour un traitement, 2 à 3 séances par semaine pendant 4 à 6 semaines. Pour l'entretien, 1 séance par semaine.", ar: 'للعلاج، 2 إلى 3 جلسات في الأسبوع لمدة 4 إلى 6 أسابيع. للصيانة، جلسة واحدة في الأسبوع.' } },
      { q: { fr: 'Peut-on faire une pressothérapie enceinte ?', ar: 'هل يمكن العلاج بالضغط أثناء الحمل؟' }, a: { fr: "Uniquement sur les membres inférieurs et après accord médical. Le programme est adapté.", ar: 'فقط على الأطراف السفلية وبموافقة طبية. البرنامج مُكيَّف.' } },
      { q: { fr: 'Ça m\'aide à maigrir ?', ar: 'هل يساعدني على إنقاص الوزن؟' }, a: { fr: "La pressothérapie n'élimine pas les graisses directement. Elle améliore la circulation et aide à drainer la rétention d'eau, ce qui peut réduire le volume apparent.", ar: 'العلاج بالضغط لا يزيل الدهون مباشرة. يحسن الدورة ويساعد على تصريف احتباس الماء، مما قد يقلل الحجم الظاهر.' } },
      { q: { fr: 'Peut-on combiner pressothérapie et cavitation ?', ar: 'هل يمكن الجمع بين العلاج بالضغط والتكهيف؟' }, a: { fr: "Oui, c'est même recommandé ! La pressothérapie après cavitation accélère l'élimination des triglycérides libérés.", ar: 'نعم، بل يُوصى به! العلاج بالضغط بعد التكهيف يسرع التخلص من الدهون الثلاثية المُطلَقة.' } },
    ],
    hasBeforeAfter: false,
    keywords: ['pressothérapie Ezzahra', 'jambes légères Tunisie', 'drainage lymphatique mécanique'],
  },
  {
    slug: 'cryolipolyse',
    pole: 'minceur',
    icon: 'snowflake',
    bodyMapPoint: { x: 42, y: 60, view: 'front' },
    name: { fr: 'Cryolipolyse', ar: 'تحليل الدهون بالتبريد' },
    shortDesc: {
      fr: 'Congélation ciblée des cellules graisseuses qui les élimine définitivement par voie naturelle, sans chirurgie.',
      ar: 'تجميد موجه للخلايا الدهنية يزيلها بشكل نهائي بشكل طبيعي، بدون جراحة.',
    },
    longDesc: {
      fr: `La cryolipolyse est une technique révolutionnaire basée sur un principe scientifique : les cellules graisseuses (adipocytes) sont plus sensibles au froid que les autres cellules de la peau. En les exposant à des températures contrôlées (-5°C à -10°C), on provoque leur apoptose (mort cellulaire programmée) sans endommager les tissus environnants.

Les cellules détruites sont progressivement éliminées par les macrophages du système immunitaire sur une période de 2 à 3 mois. La réduction du volume graisseux est définitive sur les zones traitées.

La cryolipolyse est idéale pour les bourrelet résistants aux régimes : poignées d'amour, ventre bas, double menton. Les résultats moyens sont de 20 à 25% de réduction du volume graisseux sur la zone traitée.`,
      ar: `تحليل الدهون بالتبريد تقنية ثورية مبنية على مبدأ علمي: الخلايا الدهنية أكثر حساسية للبرد من خلايا الجلد الأخرى. بتعريضها لدرجات حرارة متحكم بها (-5 إلى -10 درجة مئوية)، تحدث موت الخلايا المبرمج دون الإضرار بالأنسجة المحيطة.

الخلايا المدمرة تُزال تدريجياً بالبلاعم على مدى 2 إلى 3 أشهر. تقليص حجم الدهون نهائي في المناطق المعالجة.

مثالية لترهلات مقاومة للحمية: الخاصرة، أسفل البطن، الذقن المزدوجة. النتائج المتوسطة 20 إلى 25% تقليل في حجم الدهون.`,
    },
    duration: '60 min',
    price: 120,
    sessionFlow: {
      fr: ['Bilan et marquage de la zone', 'Application du gel protecteur', 'Positionnement de l\'applicateur cryolipolyse', 'Aspiration de la peau et du tissu (sensation de froid intense 5-10 min)', 'Phase de traitement (45 min)', 'Massage vigoureux post-traitement (améliore les résultats)', 'Photos et mesures'],
      ar: ['تقييم وتحديد المنطقة', 'تطبيق هلام حماية', 'وضع جهاز تحليل الدهون بالتبريد', 'شفط الجلد والنسيج (إحساس بالبرد الشديد 5-10 دقائق)', 'مرحلة العلاج (45 دقيقة)', 'تدليك قوي بعد العلاج (يحسن النتائج)', 'صور وقياسات'],
    },
    indications: { fr: ['Bourrelet abdominal', 'Poignées d\'amour', 'Culotte de cheval', 'Double menton', 'Bras intérieur'], ar: ['ترهل البطن', 'الخاصرة', 'دهون الفخذ الخارجية', 'الذقن المزدوجة', 'داخل الذراع'] },
    contraindications: { fr: ['Cryoglobulinémie', 'Raynaud sévère', 'Grossesse', 'Hernie sur la zone', 'Plaies ouvertes'], ar: ['الكريوغلوبولينيا', 'رينود الشديد', 'الحمل', 'فتق في المنطقة', 'جروح مفتوحة'] },
    faq: [
      { q: { fr: 'Est-ce douloureux ?', ar: 'هل هو مؤلم؟' }, a: { fr: "Les 5 à 10 premières minutes sont inconfortables (froid intense et aspiration), puis la zone s'engourdit complètement et la séance devient confortable.", ar: 'الدقائق الـ5 إلى 10 الأولى غير مريحة (برد شديد وشفط)، ثم تخدر المنطقة تماماً وتصبح الجلسة مريحة.' } },
      { q: { fr: 'En combien de temps vois-je les résultats ?', ar: 'في كم من الوقت أرى النتائج؟' }, a: { fr: "Les résultats se voient progressivement de 6 semaines à 3 mois après la séance, le temps que le corps élimine les cellules détruites.", ar: 'تظهر النتائج تدريجياً من 6 أسابيع إلى 3 أشهر بعد الجلسة، ريثما يُزيل الجسم الخلايا المدمرة.' } },
      { q: { fr: 'Une seule séance suffit-elle ?', ar: 'هل جلسة واحدة كافية؟' }, a: { fr: "Pour la plupart des zones, 1 à 2 séances suffisent. Certaines zones plus importantes peuvent nécessiter une 3e séance.", ar: 'لمعظم المناطق، 1 إلى 2 جلسة كافية. بعض المناطق الأكبر قد تحتاج جلسة ثالثة.' } },
      { q: { fr: 'Puis-je traiter plusieurs zones en même temps ?', ar: 'هل يمكنني علاج عدة مناطق في آن واحد؟' }, a: { fr: "Oui, si le cabinet dispose de plusieurs applicateurs, il est possible de traiter 2 zones simultanément pour gagner du temps.", ar: 'نعم، إذا توفرت أجهزة متعددة في العيادة، يمكن علاج منطقتين في آن واحد لتوفير الوقت.' } },
      { q: { fr: 'Quel est le risque de paradoxal adipose hyperplasia ?', ar: 'ما خطر التضخم الشحمي المتناقض؟' }, a: { fr: "Il s'agit d'un effet secondaire rare (moins de 1%) et spécifique à certains types de machines ou zones. Nous vous évaluerons lors du bilan pour minimiser ce risque.", ar: 'إنه أثر جانبي نادر (أقل من 1%) خاص ببعض أنواع الأجهزة أو المناطق. سنقيمك خلال الاستشارة لتقليل هذا الخطر.' } },
    ],
    hasBeforeAfter: true,
    keywords: ['cryolipolyse Ezzahra', 'fat freezing Tunisie', 'élimination graisses'],
  },
  {
    slug: 'massage-amincissant',
    pole: 'minceur',
    icon: 'massage',
    bodyMapPoint: { x: 58, y: 65, view: 'back' },
    name: { fr: 'Massage Amincissant & Anti-Cellulite', ar: 'التدليك المنحف ومضاد السيلوليت' },
    shortDesc: {
      fr: 'Massage profond et technique qui rompt les amas graisseux, stimule la circulation et lisse la peau d\'orange.',
      ar: 'تدليك عميق وتقني يكسر تراكمات الدهون ويحفز الدورة الدموية ويلطف جلد البرتقال.',
    },
    longDesc: {
      fr: `Le massage amincissant anti-cellulite est une technique manuelle intensive qui combine plusieurs approches : le palper-rouler (technique de pétrissage profond qui mobilise le tissu adipeux), le drainage lymphatique (pour éliminer les toxines libérées) et les effleurages tonifiants.

La cellulite n'est pas de la graisse ordinaire : c'est du tissu adipeux piégé dans des cloisons fibreuses sous la peau, créant l'aspect capitonné caractéristique. Un massage professionnel déstructure ces cloisons, améliore la vascularisation locale et stimule la lipolyse naturelle.

Chez Ryma Ouichka, le massage amincissant est personnalisé selon votre type de cellulite (aqueuse, fibreuse ou adipeuse) et est souvent associé à des techniques d'appareillage (cavitation, radiofréquence) pour des résultats optimaux.`,
      ar: `التدليك المنحف مضاد السيلوليت تقنية يدوية مكثفة تجمع عدة أساليب: الجمع والطي (تقنية عجن عميق تحرك الأنسجة الدهنية)، والصرف اللمفاوي، والتدليك المنشط.

السيلوليت ليس دهوناً عادية: هو نسيج دهني محاصر في حواجز ليفية تحت الجلد. التدليك المهني يكسر هذه الحواجز ويحسن التروية المحلية ويحفز تحلل الدهون الطبيعي.

عند ريما ويشكة، التدليك المنحف مخصص حسب نوع سيلوليتك وكثيراً ما يُقرن بتقنيات الأجهزة لنتائج مثلى.`,
    },
    duration: '45 min',
    price: 65,
    sessionFlow: {
      fr: ['Évaluation du type de cellulite', 'Application d\'huile ou crème anti-cellulite professionnelle', 'Échauffement par effleurages', 'Palper-rouler intensif sur les zones ciblées', 'Drainage lymphatique intégré', 'Enveloppement chaud final (optionnel)'],
      ar: ['تقييم نوع السيلوليت', 'تطبيق زيت أو كريم مضاد للسيلوليت المهني', 'إحماء بالتدليك الخفيف', 'جمع وطي مكثف على المناطق المستهدفة', 'صرف لمفاوي متكامل', 'لف دافئ نهائي (اختياري)'],
    },
    indications: { fr: ['Cellulite en tous stades', 'Peau d\'orange', 'Capitonnage des cuisses', 'Raffermissement post-grossesse', 'Corps après perte de poids'], ar: ['سيلوليت في جميع مراحله', 'جلد البرتقال', 'تقرن الفخذين', 'شد بعد الحمل', 'الجسم بعد إنقاص الوزن'] },
    contraindications: { fr: ['Phlébite ou thrombose', 'Varices sévères', 'Infection cutanée', 'Plaies'], ar: ['التهاب الوريد أو الخثار', 'دوالي شديدة', 'عدوى جلدية', 'جروح'] },
    faq: [
      { q: { fr: 'Est-ce douloureux ?', ar: 'هل هو مؤلم؟' }, a: { fr: "Le palper-rouler peut être intense mais ne doit pas être insupportable. Nous adaptons toujours la pression à votre ressenti.", ar: 'الجمع والطي قد يكون مكثفاً لكنه لا يجب أن يكون لا يُطاق. نتكيف دائماً مع إحساسك.' } },
      { q: { fr: 'Aurai-je des bleus ?', ar: 'هل سأصاب بكدمات؟' }, a: { fr: "Sur les peaux sensibles, de légères marques rouges peuvent apparaître temporairement mais disparaissent en 24-48h. Des bleus sont possibles mais rares avec notre technique.", ar: 'على البشرة الحساسة، قد تظهر علامات حمراء خفيفة مؤقتاً لكنها تختفي في 24-48 ساعة. الكدمات ممكنة لكنها نادرة مع تقنيتنا.' } },
      { q: { fr: 'Quelle différence avec un palper-rouler au rouleau ?', ar: 'ما الفرق مع أسطوانة الرول؟' }, a: { fr: "Le palper-rouler manuel est nettement plus efficace que les rouleaux maison car la thérapeute adapte la pression et la profondeur en temps réel selon les zones et votre tissu.", ar: 'الجمع والطي اليدوي أكثر فعالية بكثير من الأسطوانات المنزلية لأن المعالجة تتكيف مع الضغط والعمق في الوقت الفعلي.' } },
      { q: { fr: 'Combien de séances sont nécessaires ?', ar: 'كم عدد الجلسات اللازمة؟' }, a: { fr: "Un cycle de 10 à 15 séances est généralement recommandé. Les résultats se voient dès la 5e séance.", ar: 'يُوصى عادةً بدورة من 10 إلى 15 جلسة. تظهر النتائج من الجلسة الخامسة.' } },
      { q: { fr: 'Peut-on combiner avec d\'autres techniques ?', ar: 'هل يمكن الجمع مع تقنيات أخرى؟' }, a: { fr: "Oui, le massage amincissant se combine parfaitement avec la cavitation et la pressothérapie pour un programme minceur complet.", ar: 'نعم، التدليك المنحف يتكامل بشكل ممتاز مع التكهيف والعلاج بالضغط لبرنامج إنقاص شامل.' } },
    ],
    hasBeforeAfter: true,
    keywords: ['massage anti-cellulite Ezzahra', 'palper-rouler Tunisie', 'cellulite cuisses'],
  },
  {
    slug: 'bilan-minceur',
    pole: 'bilan',
    icon: 'clipboard',
    bodyMapPoint: { x: 50, y: 20, view: 'front' },
    name: { fr: 'Bilan Minceur Personnalisé', ar: 'تقييم الإنقاص الشخصي' },
    shortDesc: {
      fr: 'Consultation complète pour analyser votre morphologie, définir vos objectifs et élaborer un programme minceur sur mesure.',
      ar: 'استشارة شاملة لتحليل بنيتك الجسدية وتحديد أهدافك ووضع برنامج إنقاص مخصص لك.',
    },
    longDesc: {
      fr: `Le bilan minceur est la première étape incontournable avant tout programme d'amincissement. Il permet d'analyser précisément votre situation et de concevoir un programme adapté à votre corps, vos objectifs et votre mode de vie.

Ce bilan comprend une analyse morphologique complète (mesures, photos, type de cellulite, qualité de peau), un questionnaire de santé approfondi (antécédents médicaux, traitements en cours, activité physique, habitudes alimentaires) et une analyse de composition corporelle si disponible.

À l'issue du bilan, vous repartez avec un programme clair, un calendrier de séances, des objectifs réalistes et des recommandations hygiéno-diététiques personnalisées. Le bilan est offert pour tout programme de 10 séances ou plus.`,
      ar: `بيان الإنقاص هو الخطوة الأولى الإلزامية قبل أي برنامج تنحيف. يتيح تحليل وضعك بدقة ووضع برنامج متكيف مع جسدك وأهدافك وأسلوب حياتك.

يشمل هذا التقييم: تحليلاً مورفولوجياً كاملاً (قياسات، صور، نوع السيلوليت، جودة الجلد)، استبياناً صحياً معمقاً، وتحليل تركيب الجسم إن توفر.

في نهاية التقييم، تغادر ببرنامج واضح وجدول جلسات وأهداف واقعية وتوصيات نظافية غذائية مخصصة. التقييم مجاني لأي برنامج يضم 10 جلسات أو أكثر.`,
    },
    duration: '60 min',
    price: 50,
    sessionFlow: {
      fr: ['Accueil et questionnaire de santé', 'Mesures anthropométriques (poids, IMC, tours...)', 'Photos de référence', 'Examen de la qualité de peau et de la cellulite', 'Analyse de composition corporelle', 'Discussion des objectifs et motivations', 'Proposition du programme sur-mesure'],
      ar: ['الاستقبال واستبيان الصحة', 'قياسات أنثروبومترية (الوزن، مؤشر كتلة الجسم، المحيطات...)', 'صور مرجعية', 'فحص جودة الجلد والسيلوليت', 'تحليل تركيب الجسم', 'مناقشة الأهداف والدوافع', 'اقتراح برنامج مخصص'],
    },
    indications: { fr: ['Toute personne souhaitant commencer un programme minceur', 'Avant tout traitement esthétique', 'Bilan annuel suivi'], ar: ['أي شخص يرغب في بدء برنامج إنقاص', 'قبل أي علاج تجميلي', 'متابعة سنوية'] },
    contraindications: { fr: ['Aucune contre-indication au bilan lui-même'], ar: ['لا توجد موانع للتقييم بحد ذاته'] },
    faq: [
      { q: { fr: 'Le bilan est-il remboursé ?', ar: 'هل يُغطى التقييم من التأمين؟' }, a: { fr: "Non, le bilan minceur n'est pas un acte médical remboursé. Cependant, il est offert dans tout programme de 10 séances.", ar: 'لا، تقييم الإنقاص ليس إجراءً طبياً مشمولاً بالتأمين. لكنه مجاني في أي برنامج يضم 10 جلسات.' } },
      { q: { fr: 'Dois-je être à jeun pour le bilan ?', ar: 'هل يجب أن أكون صائماً للتقييم؟' }, a: { fr: "Pour une analyse de composition corporelle précise, il est recommandé d'être à jeun depuis 2 heures et d'être bien hydraté.", ar: 'لتحليل تركيب الجسم بدقة، يُوصى بالصيام لمدة ساعتين وأن تكون مرطباً جيداً.' } },
      { q: { fr: 'Quels sont les objectifs réalistes ?', ar: 'ما هي الأهداف الواقعية؟' }, a: { fr: "En général, une perte de 2 à 4 cm sur la zone ciblée en 8 à 12 séances est réaliste. La perte de poids varie selon les personnes et leur mode de vie.", ar: 'عموماً، فقدان 2 إلى 4 سم في المنطقة المستهدفة في 8 إلى 12 جلسة أمر واقعي. فقدان الوزن يتفاوت حسب الأشخاص وأسلوب حياتهم.' } },
      { q: { fr: 'Faut-il suivre un régime pendant le programme ?', ar: 'هل يجب اتباع نظام غذائي خلال البرنامج؟' }, a: { fr: "Pas un régime strict, mais des ajustements alimentaires simples sont recommandés pour maximiser les résultats. Nous vous donnons des conseils pratiques et adaptés à vos habitudes.", ar: 'ليس نظاماً صارماً، لكن تعديلات غذائية بسيطة مُوصى بها لتعظيم النتائج. نقدم نصائح عملية متكيفة مع عاداتك.' } },
      { q: { fr: 'Que se passe-t-il si je n\'atteins pas mes objectifs ?', ar: 'ماذا يحدث إذا لم أبلغ أهدافي؟' }, a: { fr: "Nous réévaluons ensemble le programme, ajustons les techniques et les fréquences, et identifions les éventuels facteurs limitants.", ar: 'نعيد تقييم البرنامج معاً ونضبط التقنيات والوترات ونحدد العوامل المعيقة المحتملة.' } },
    ],
    hasBeforeAfter: false,
    keywords: ['bilan minceur Ezzahra', 'programme amincissement Tunisie', 'morphologie'],
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getServicesByPole(pole: ServicePole): Service[] {
  return SERVICES.filter((s) => s.pole === pole);
}
