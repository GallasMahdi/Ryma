export interface LocalizedText {
  fr: string;
  pt?: string;
  en?: string; es?: string;
  ar?: string;
}

export const SITE = {
  name: 'Digital Clínica',
  nameAr: 'العيادة الرقمية',
  tagline: {
    es: "Clínica de fisioterapia y estética avanzada",
    pt: 'Clínica de Fisioterapia & Estética Avançada',
    en: 'Physiotherapy & Advanced Aesthetics Clinic',
    fr: 'Clinique de Kinésithérapie & Soins Avancés',
  } as LocalizedText,
  city: {
    es: "Lisboa, Portugal",
    pt: 'Lisboa, Portugal',
    en: 'Lisbon, Portugal',
    fr: 'Lisbonne, Portugal',
  } as LocalizedText,
  phone: process.env.NEXT_PUBLIC_CLINIC_PHONE || '+351 933 467 880',
  whatsapp: '351933467880',
  whatsappDisplay: '+351 933 467 880',
  email: process.env.NEXT_PUBLIC_CLINIC_EMAIL || '',
  address: {
    es: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || "",
    pt: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || '',
    en: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || '',
    fr: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || '',
  } as LocalizedText,
  hours: {
    es: process.env.NEXT_PUBLIC_CLINIC_HOURS || "Con cita previa",
    pt: process.env.NEXT_PUBLIC_CLINIC_HOURS || 'Por marcação',
    en: process.env.NEXT_PUBLIC_CLINIC_HOURS || 'By appointment',
    fr: process.env.NEXT_PUBLIC_CLINIC_HOURS || 'Sur rendez-vous',
  } as LocalizedText,
  // Professional Information
  professionalName: 'Digital Clínica',
  professionalTitle: {
    es: "Equipo de fisioterapeutas titulados",
    pt: 'Equipa de Fisioterapeutas Licenciados',
    en: 'Licensed Physiotherapy Team',
    fr: 'Équipe de Kinésithérapeutes Diplômés',
  } as LocalizedText,
  professionalLicense: process.env.NEXT_PUBLIC_PROFESSIONAL_LICENSE || '', // e.g., 'C-054321' (Ordem dos Fisioterapeutas)
  professionalOrganization: {
    es: "Colegio de Fisioterapeutas de Portugal",
    pt: 'Ordem dos Fisioterapeutas',
    en: 'Portuguese Order of Physiotherapists',
    fr: 'Ordre des Physiothérapeutes',
  } as LocalizedText,
  // Clinic / Business Legal Identifiers
  clinicNif: process.env.NEXT_PUBLIC_CLINIC_NIF || '', // NIF / Tax ID
  ersRegistration: process.env.NEXT_PUBLIC_ERS_REGISTRATION || '', // ERS (Entidade Reguladora da Saúde) establishment ID
  livroReclamacoesUrl: 'https://www.livroreclamacoes.pt/inicio/',
  mapEmbed: process.env.NEXT_PUBLIC_MAP_EMBED_URL || '',
  googlePlaceId: '',
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
  bookingApiUrl: '',
  analytics: {
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_ID ?? '',
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '',
  },
};
