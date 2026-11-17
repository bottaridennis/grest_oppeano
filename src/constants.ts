import type { LegalType, MessageType, RegistrationStatus, TargetGroup, UserRole } from './types';

export const APP_NAME = 'Grest Oppeano';
export const APP_TAGLINE = 'Comunità in Cammino';
export const GREST_YEAR = 2026;

/** Email che ottiene automaticamente il ruolo admin al primo accesso (deve coincidere con firestore.rules). */
export const BOOTSTRAP_ADMIN_EMAILS = ['dennisbottari@gmail.com'];

export const COMMON_ALLERGIES = [
  'Glutine (Celiachia)',
  'Lattosio',
  'Uova',
  'Frutta a guscio',
  'Arachidi',
  'Pesce / Crostacei',
  'Soia',
  'Fragole',
  'Kiwi',
  'Nichel',
  'Polline / Graminacee',
];

/** Indice compatibile con Date.getDay() (0 = domenica). */
export const WEEK_DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
/** Ordine di visualizzazione (lunedì → domenica). */
export const WEEK_DAYS_ORDERED = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Amministratore',
  parent: 'Genitore',
  animator: 'Animatore',
};

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: 'In attesa',
  confirmed: 'Confermata',
  cancelled: 'Annullata',
};

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  info: 'Info',
  warning: 'Avviso',
  urgent: 'Urgente',
};

export const TARGET_LABELS: Record<TargetGroup, string> = {
  all: 'Tutti',
  parents: 'Genitori',
  animators: 'Animatori',
};

export const LEGAL_TITLES: Record<LegalType, string> = {
  privacy: 'Informativa sulla privacy',
  cookies: 'Cookie policy',
  terms: 'Termini e condizioni',
};

export const DEFAULT_LEGAL_CONTENT: Record<LegalType, string> = {
  privacy:
    'Il Grest Oppeano tratta i dati personali nel rispetto del Regolamento UE 2016/679 (GDPR).\n\nI dati sono raccolti esclusivamente per finalità organizzative, assicurative e di sicurezza legate alle attività estive e non vengono ceduti a terzi.\n\nPer esercitare i tuoi diritti (accesso, rettifica, cancellazione) contatta la parrocchia.',
  cookies:
    'Questo sito utilizza esclusivamente cookie e archiviazione locale tecnici, necessari al funzionamento (autenticazione e sessione).\n\nNon utilizziamo cookie di profilazione o di tracciamento di terze parti.',
  terms:
    "L'iscrizione al Grest comporta l'accettazione del regolamento interno.\n\nI genitori sono responsabili della veridicità dei dati forniti, in particolare riguardo ad allergie e note mediche, e si impegnano a comunicarne tempestivamente ogni variazione.",
};
