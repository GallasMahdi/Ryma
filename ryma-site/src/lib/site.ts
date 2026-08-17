export interface LocalizedText {
  fr: string;
  pt?: string;
  en?: string;
  ar?: string;
}

export const SITE = {
  name: 'Ryma Ouichka',
  nameAr: 'ريما ويشكة',
  tagline: {
    pt: 'Clínica de Fisioterapia & Estética Avançada',
    en: 'Physiotherapy & Advanced Aesthetics Clinic',
    fr: 'Clinique de Kinésithérapie & Soins Avancés',
  } as LocalizedText,
  city: {
    pt: 'Lisboa, Portugal',
    en: 'Lisbon, Portugal',
    fr: 'Lisbonne, Portugal',
  } as LocalizedText,
  phone: '+351 912 345 678',
  whatsapp: '351912345678',
  whatsappDisplay: '+351 912 345 678',
  email: 'contacto@ryma-ouichka.pt',
  address: {
    pt: 'Avenida da Liberdade 120, 1250-146 Lisboa, Portugal',
    en: 'Avenida da Liberdade 120, 1250-146 Lisbon, Portugal',
    fr: 'Avenida da Liberdade 120, 1250-146 Lisbonne, Portugal',
  } as LocalizedText,
  hours: {
    pt: 'Seg – Sáb : 08h30 – 19h00 | Domingo Encerrado',
    en: 'Mon – Sat: 08:30 – 19:00 | Sunday Closed',
    fr: 'Lun – Sam : 08h30 – 19h00 | Dimanche fermé',
  } as LocalizedText,
  // Professional Information
  professionalName: 'Ryma Ouichka',
  professionalTitle: {
    pt: 'Fisioterapeuta Licenciada',
    en: 'Licensed Physiotherapist',
    fr: 'Kinésithérapeute Diplômée',
  } as LocalizedText,
  professionalLicense: process.env.NEXT_PUBLIC_PROFESSIONAL_LICENSE || '', // e.g., 'C-054321' (Ordem dos Fisioterapeutas)
  professionalOrganization: {
    pt: 'Ordem dos Fisioterapeutas',
    en: 'Portuguese Order of Physiotherapists',
    fr: 'Ordre des Physiothérapeutes',
  } as LocalizedText,
  // Clinic / Business Legal Identifiers
  clinicNif: process.env.NEXT_PUBLIC_CLINIC_NIF || '', // NIF / Tax ID
  ersRegistration: process.env.NEXT_PUBLIC_ERS_REGISTRATION || '', // ERS (Entidade Reguladora da Saúde) establishment ID
  livroReclamacoesUrl: 'https://www.livroreclamacoes.pt/inicio/',
  mapEmbed: 'https://www.google.com/maps/embed?pb=',
  googlePlaceId: '',
  facebook: 'https://facebook.com/rymaouichka',
  instagram: 'https://instagram.com/ryma.ouichka',
  bookingApiUrl: '',
  analytics: {
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_ID ?? '',
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '',
    whatsappBusinessApiToken: process.env.WHATSAPP_API_TOKEN ?? '',
  },
};

export const STATS = {
  patients: { pt: '1 200+', en: '1,200+', fr: '1 200+' },
  years: { pt: '8+', en: '8+', fr: '8+' },
  poles: '3',
  satisfaction: '99%',
};

export const CERTIFICATIONS: { title: LocalizedText; issuer: LocalizedText; year: string }[] = [
  {
    title: {
      pt: 'Licenciatura em Fisioterapia',
      en: 'Bachelor of Science in Physiotherapy',
      fr: 'Diplôme d\'État en Kinésithérapie / Physiothérapie',
    },
    issuer: {
      pt: 'Escola Superior de Saúde / Ensino Universitário de Saúde',
      en: 'School of Health Sciences / University Health Faculty',
      fr: 'Institut Supérieur des Sciences de la Santé',
    },
    year: '2015',
  },
  {
    title: {
      pt: 'Certificação em Reeducação Postural Global (RPG)',
      en: 'Global Postural Reeducation (GPR) Certification',
      fr: 'Certification Rééducation Posturale Globale (RPG)',
    },
    issuer: {
      pt: 'Formação RPG Internacional',
      en: 'GPR International Institute',
      fr: 'Formation RPG International',
    },
    year: '2017',
  },
  {
    title: {
      pt: 'Especialização em Fisioterapia da Mulher & Pavimento Pélvico',
      en: 'Specialization in Women\'s Health & Pelvic Floor Rehabilitation',
      fr: 'Spécialisation Périnéologie & Rééducation Post-Partum',
    },
    issuer: {
      pt: 'Pós-Graduação Universitária em Saúde da Mulher',
      en: 'University Postgraduate in Women\'s Health',
      fr: 'Formation Universitaire en Santé de la Femme',
    },
    year: '2019',
  },
  {
    title: {
      pt: 'Técnicas Avançadas de Drenagem Linfática Manual (Método Vodder)',
      en: 'Advanced Manual Lymphatic Drainage (Vodder Method)',
      fr: 'Techniques de Drainage Lymphatique Manuel (Méthode Vodder)',
    },
    issuer: {
      pt: 'Centro de Certificação Vodder',
      en: 'Vodder Certification Center',
      fr: 'Centre de Formation Vodder',
    },
    year: '2020',
  },
  {
    title: {
      pt: 'Especialização em Fisioterapia Dermato-Funcional & Tecnologias Não Invasivas',
      en: 'Specialization in Dermatofunctional Physiotherapy & Non-Invasive Technologies',
      fr: 'Spécialisation en Soins Dermato-Fonctionnels & Appareillage',
    },
    issuer: {
      pt: 'Academia Europeia de Tecnologias Clínicas',
      en: 'European Clinical Technologies Academy',
      fr: 'Formation Européenne d\'Appareillage Esthétique',
    },
    year: '2022',
  },
];

export const MILESTONES: { year: string; text: LocalizedText }[] = [
  {
    year: '2015',
    text: {
      pt: 'Conclusão da Licenciatura em Fisioterapia e início de prática clínica hospitalar.',
      en: 'Completion of Physiotherapy degree and start of hospital clinical practice.',
      fr: 'Obtention du diplôme de kinésithérapie et début de pratique clinique hospitalière.',
    },
  },
  {
    year: '2017',
    text: {
      pt: 'Especialização em RPG e abertura do espaço clínico de reabilitação postural.',
      en: 'Specialization in GPR and opening of dedicated postural clinic.',
      fr: 'Formation RPG et ouverture du cabinet de rééducation.',
    },
  },
  {
    year: '2019',
    text: {
      pt: 'Criação do polo de saúde da mulher, reabilitação pélvica e cuidados pós-parto.',
      en: 'Establishment of women\'s health, pelvic floor, and postpartum care division.',
      fr: 'Développement du pôle santé de la femme et rééducation périnéale.',
    },
  },
  {
    year: '2022',
    text: {
      pt: 'Integração de protocolos avançados de estética dermato-funcional não invasiva.',
      en: 'Integration of advanced non-invasive dermatofunctional body contouring protocols.',
      fr: 'Lancement du pôle technologies minceur non-invasives.',
    },
  },
  {
    year: '2026',
    text: {
      pt: 'Mais de 1 200 utentes acompanhados com taxas de satisfação de 99%.',
      en: 'Over 1,200 patients cared for with a 99% satisfaction rate.',
      fr: 'Plus de 1 200 patientes et patients accompagnés avec 99% de satisfaction.',
    },
  },
];
