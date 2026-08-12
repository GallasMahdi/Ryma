export interface LocalizedText {
  fr: string;
  ar: string;
}

export const SITE = {
  name: 'Ryma Ouichka',
  nameAr: 'ريما ويشكة',
  tagline: { fr: 'Kinésithérapeute & Spécialiste en Amincissement', ar: 'أخصائية علاج طبيعي وتنحيف' } as LocalizedText,
  city: { fr: 'Ezzahra, Tunisie', ar: 'الزهراء، تونس' } as LocalizedText,
  phone: '+216 71 800 123',
  whatsapp: '21698123456',
  whatsappDisplay: '+216 98 123 456',
  email: 'contact@ryma-ouichka.tn',
  address: {
    fr: 'Av. Habib Bourguiba, Ezzahra 2034, Tunisie',
    ar: 'شارع الحبيب بورقيبة، الزهراء 2034، تونس',
  } as LocalizedText,
  hours: {
    fr: 'Lun – Sam : 08h30 – 18h30 | Dimanche fermé',
    ar: 'الإثنين – السبت: 08:30 – 18:30 | الأحد مغلق',
  } as LocalizedText,
  mapEmbed: 'https://www.google.com/maps/embed?pb=',
  googlePlaceId: '',
  facebook: 'https://facebook.com/rymaouichka',
  instagram: 'https://instagram.com/ryma.ouichka',
  bookingApiUrl: '', // à renseigner plus tard (intégration serveur)
  analytics: {
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_ID ?? '',
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '',
    whatsappBusinessApiToken: process.env.WHATSAPP_API_TOKEN ?? '',
  },
};

export const STATS = {
  patients: { fr: '1 200+', ar: '+1 200' },
  years: { fr: '8+', ar: '+8' },
  poles: '3',
  satisfaction: '99%',
};

export const CERTIFICATIONS: { title: LocalizedText; issuer: LocalizedText; year: string }[] = [
  {
    title: { fr: 'Diplôme de Kinésithérapie (État Tunisien)', ar: 'شهادة العلاج الطبيعي (الدولة التونسية)' },
    issuer: { fr: 'Institut Supérieur des Sciences de la Santé', ar: 'المعهد العالي لعلوم الصحة' },
    year: '2015',
  },
  {
    title: { fr: 'Certification Rééducation Posturale Globale (RPG)', ar: 'شهادة إعادة التأهيل الوضعي الشامل' },
    issuer: { fr: 'Formation RPG International', ar: 'التكوين الدولي لإعادة التأهيل الوضعي' },
    year: '2017',
  },
  {
    title: { fr: 'Diplôme Universitaire Périnéologie & Rééducation Post-Partum', ar: 'دبلوم جامعي في طب العجان وإعادة التأهيل بعد الولادة' },
    issuer: { fr: 'Université de Tunis El Manar', ar: 'جامعة تونس المنار' },
    year: '2019',
  },
  {
    title: { fr: 'Techniques de Drainage Lymphatique Manuel (méthode Vodder)', ar: 'تقنيات الصرف اللمفاوي اليدوي (طريقة فودر)' },
    issuer: { fr: 'Centre de Formation Vodder', ar: 'مركز تكوين فودر' },
    year: '2020',
  },
  {
    title: { fr: 'Spécialisation en Médecine Esthétique Non-Invasive (cavitation, RF, cryo)', ar: 'تخصص في الطب التجميلي غير الجراحي' },
    issuer: { fr: 'Formation Européenne d\'Appareillage Esthétique', ar: 'تكوين أوروبي في أجهزة التجميل' },
    year: '2022',
  },
];

export const MILESTONES: { year: string; text: LocalizedText }[] = [
  {
    year: '2015',
    text: { fr: 'Obtention du diplôme de kinésithérapie et premiers mois au CHU de Tunis.', ar: 'الحصول على شهادة العلاج الطبيعي وأول أشهر العمل في المستشفى الجامعي.' },
  },
  {
    year: '2017',
    text: { fr: 'Formation RPG et ouverture du premier cabinet à Ezzahra.', ar: 'تكوين في إعادة التأهيل الوضعي وافتتاح أول عيادة في الزهراء.' },
  },
  {
    year: '2019',
    text: { fr: 'Développement du pôle rééducation post-partum et périnéale.', ar: 'تطوير قطاع إعادة التأهيل بعد الولادة وطب العجان.' },
  },
  {
    year: '2022',
    text: { fr: 'Lancement du pôle technologies minceur non-invasives.', ar: 'إطلاق قطاع تقنيات التنحيف غير الجراحية.' },
  },
  {
    year: '2025',
    text: { fr: 'Plus de 1 200 patientes et patients accompagnés.', ar: 'أكثر من 1,200 مريض ومريضة تمت مواكبتهم.' },
  },
];
