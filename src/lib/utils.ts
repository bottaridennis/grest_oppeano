import type { Timestamp } from 'firebase/firestore';
import { WEEK_DAYS } from '../constants';
import type { UserProfile } from '../types';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/** Data locale in formato YYYY-MM-DD (evita gli slittamenti di toISOString in UTC). */
export function localISODate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Converte una stringa YYYY-MM-DD in Date locale (mezzanotte locale, non UTC). */
export function parseISODate(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function toDate(value: Timestamp | Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return parseISODate(value) ?? new Date(value);
  if (typeof (value as Timestamp).toDate === 'function') return (value as Timestamp).toDate();
  return null;
}

export function formatDate(value: Timestamp | Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('it-IT', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: Timestamp | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(value: Timestamp | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '';
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'adesso';
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h fa`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} g fa`;
  return formatDate(date);
}

export function todayWeekDay(): string {
  return WEEK_DAYS[new Date().getDay()];
}

export function ageFrom(birthDate: string): number | null {
  const birth = parseISODate(birthDate);
  if (!birth) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function displayName(u?: Partial<UserProfile> | null): string {
  if (!u) return 'Utente';
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return full || u.displayName || u.email || 'Utente senza nome';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function matches(query: string, ...fields: Array<string | undefined | null>): boolean {
  const q = normalize(query);
  if (!q) return true;
  return fields.some((f) => f && normalize(f).includes(q));
}

/** Esporta righe in CSV (separatore ";" per compatibilità con Excel in italiano). */
export function downloadCSV(filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'Sì' : 'No') : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const content = [headers, ...rows].map((r) => r.map(escape).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Email o password non corretti.',
  'auth/wrong-password': 'Email o password non corretti.',
  'auth/user-not-found': 'Nessun account associato a questa email.',
  'auth/invalid-email': "L'indirizzo email non è valido.",
  'auth/email-already-in-use': 'Esiste già un account con questa email.',
  'auth/weak-password': 'La password deve contenere almeno 6 caratteri.',
  'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
  'auth/popup-closed-by-user': 'Accesso annullato.',
  'auth/cancelled-popup-request': 'Accesso annullato.',
  'auth/popup-blocked': 'Il browser ha bloccato la finestra di accesso. Consenti i popup e riprova.',
  'auth/requires-recent-login': 'Per sicurezza, esci e accedi di nuovo prima di questa operazione.',
  'auth/credential-already-in-use': 'Questo account Google è già collegato a un altro utente.',
  'auth/provider-already-linked': 'Il tuo account è già collegato a Google.',
  'auth/network-request-failed': 'Problema di connessione. Controlla la rete e riprova.',
  'permission-denied': 'Non hai i permessi per eseguire questa operazione.',
  'unavailable': 'Servizio momentaneamente non raggiungibile. Riprova.',
};

export function errorMessage(error: unknown, fallback = 'Si è verificato un errore imprevisto.'): string {
  const code = (error as { code?: string })?.code;
  if (code && FIREBASE_ERRORS[code]) return FIREBASE_ERRORS[code];
  if (code?.startsWith('auth/')) return fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
