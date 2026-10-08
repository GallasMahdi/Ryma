export type ServicePole = 'kinesitherapie' | 'minceur' | 'bilan';
export type CareGoal = 'posture' | 'slimming' | 'drainage' | 'postpartum';
export type TreatmentBodyZone = 'torso' | 'legs' | 'arms' | 'back';

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
  careGoals?: CareGoal[];
  bodyZones?: TreatmentBodyZone[];
}

export function getLocalizedText(obj: LocalizedString | undefined, lang: string): string {
  if (!obj) return '';
  if (lang === 'pt' && obj.pt) return obj.pt;
  if (lang === 'en' && obj.en) return obj.en;
  return obj.fr || obj.pt || obj.en || '';
}

export function getLocalizedList(obj: LocalizedList | undefined, lang: string): string[] {
  if (!obj) return [];
  if (lang === 'pt' && obj.pt?.length) return obj.pt;
  if (lang === 'en' && obj.en?.length) return obj.en;
  return obj.fr?.length ? obj.fr : obj.pt?.length ? obj.pt : obj.en || [];
}
