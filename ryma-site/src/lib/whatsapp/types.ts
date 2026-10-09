export type Language = 'pt' | 'en' | 'fr' | 'es';
export type Action = {kind: 'practitioner' | 'practitioners' | 'service' | 'services' | 'date' | 'dates' | 'time' | 'times' | 'confirm' | 'restart'; value?: string};
export type Choice = {id: string; title: string; description?: string; action: Action};
export interface Conversation {
  lang: Language;
  practitionerId?: string;
  practitionerName?: string;
  step: 'practitioner' | 'service' | 'date' | 'time' | 'name' | 'confirm' | 'done';
  service?: string;
  date?: string;
  time?: string;
  name?: string;
  requestId?: string;
  preferredDate?: string;
  period?: 'morning' | 'afternoon';
  choices: Choice[];
  expiresAt: number;
}
export interface IncomingMessage {
  id: string;
  from: string;
  timestamp: number;
  text?: string;
  choice?: string;
}
export type Reply = {type: 'text'; text: {body: string}} | {
  type: 'interactive'; interactive: {
    type: 'list' | 'button';
    body: {text: string};
    action: {button: string; sections: {title: string; rows: {id: string; title: string; description?: string}[]}[]} |
      {buttons: {type: 'reply'; reply: {id: string; title: string}}[]};
  };
};
