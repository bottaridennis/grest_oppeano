import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { createAuthAccount, db } from '../firebase';
import type {
  Attendance,
  LegalContent,
  LegalType,
  MessageType,
  RegistrationStatus,
  SurveyResponse,
  TargetGroup,
  UserRole,
} from '../types';

/** Rimuove i campi `undefined` (Firestore li rifiuta). */
function clean<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as T;
}

export type CollectionName =
  | 'events'
  | 'schedule'
  | 'surveys'
  | 'announcements'
  | 'registrations'
  | 'surveyResponses'
  | 'notifications'
  | 'users'
  | 'legalContent';

export function deleteDocument(col: CollectionName, id: string) {
  return deleteDoc(doc(db, col, id));
}

/** Crea (id null) o aggiorna un documento. Alla creazione aggiunge `createdAt`. */
export async function saveDocument(col: CollectionName, id: string | null, data: Record<string, unknown>) {
  if (id) {
    await updateDoc(doc(db, col, id), clean(data));
    return id;
  }
  const ref = await addDoc(collection(db, col), clean({ ...data, createdAt: Timestamp.now() }));
  return ref.id;
}

/* ---------------- Iscrizioni ---------------- */

export interface RegistrationInput {
  childName: string;
  childSurname: string;
  birthDate: string;
  allergies: string[];
  medicalNotes: string;
  emergencyPhone: string;
}

export function createRegistration(parentUid: string, data: RegistrationInput) {
  return addDoc(collection(db, 'registrations'), {
    ...data,
    childName: data.childName.trim(),
    childSurname: data.childSurname.trim(),
    parentUid,
    status: 'pending' satisfies RegistrationStatus,
    paidGrestFee: false,
    createdAt: Timestamp.now(),
  });
}

export function updateRegistration(id: string, data: RegistrationInput) {
  return updateDoc(doc(db, 'registrations', id), {
    ...data,
    childName: data.childName.trim(),
    childSurname: data.childSurname.trim(),
  });
}

export function setRegistrationStatus(id: string, status: RegistrationStatus) {
  return updateDoc(doc(db, 'registrations', id), { status });
}

export function setGrestPayment(id: string, paid: boolean) {
  return updateDoc(doc(db, 'registrations', id), { paidGrestFee: paid });
}

export function linkRegistrationParent(id: string, parentUid: string) {
  return updateDoc(doc(db, 'registrations', id), { parentUid });
}

/* ---------------- Sondaggi ---------------- */

export async function answerSurvey(
  parentUid: string,
  existing: SurveyResponse | undefined,
  surveyId: string,
  registrationId: string,
  participating: boolean,
) {
  if (existing) {
    await updateDoc(doc(db, 'surveyResponses', existing.id), { participating, respondedAt: Timestamp.now() });
    return;
  }
  await addDoc(collection(db, 'surveyResponses'), {
    surveyId,
    parentUid,
    registrationId,
    participating,
    paidTripFee: false,
    respondedAt: Timestamp.now(),
  });
}

export function setTripPayment(responseId: string, paid: boolean) {
  return updateDoc(doc(db, 'surveyResponses', responseId), { paidTripFee: paid });
}

/* ---------------- Presenze ---------------- */

export function setAttendance(registrationId: string, date: string, present: boolean, existing?: Attendance) {
  // I nuovi record usano un id deterministico (data_iscrizione) per evitare duplicati.
  const id = existing?.id ?? `${date}_${registrationId}`;
  return setDoc(doc(db, 'attendance', id), { registrationId, date, present, recordedAt: Timestamp.now() });
}

export async function setAttendanceBulk(
  items: Array<{ registrationId: string; existing?: Attendance }>,
  date: string,
  present: boolean,
) {
  const batch = writeBatch(db);
  for (const { registrationId, existing } of items) {
    const id = existing?.id ?? `${date}_${registrationId}`;
    batch.set(doc(db, 'attendance', id), { registrationId, date, present, recordedAt: Timestamp.now() });
  }
  await batch.commit();
}

/* ---------------- Notifiche ---------------- */

export function sendNotification(
  senderUid: string,
  data: { title: string; message: string; type: MessageType; targetGroup: TargetGroup },
) {
  return addDoc(collection(db, 'notifications'), { ...data, senderUid, createdAt: Timestamp.now() });
}

export async function markNotificationsRead(userUid: string, notificationIds: string[]) {
  if (!notificationIds.length) return;
  const batch = writeBatch(db);
  for (const notificationId of notificationIds) {
    batch.set(doc(db, 'notificationReads', `${notificationId}_${userUid}`), {
      notificationId,
      userUid,
      readAt: Timestamp.now(),
    });
  }
  await batch.commit();
}

/* ---------------- Contenuti legali ---------------- */

export function saveLegal(type: LegalType, content: string, existing?: LegalContent) {
  const ref = doc(db, 'legalContent', existing?.id ?? type);
  return setDoc(ref, { type, content, updatedAt: Timestamp.now() });
}

/* ---------------- Utenti ---------------- */

export function updateUser(uid: string, data: Partial<{ firstName: string; lastName: string; phone: string; role: UserRole; mustChangePassword: boolean }>) {
  return updateDoc(doc(db, 'users', uid), clean(data));
}

export async function createManualUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
}) {
  const uid = await createAuthAccount(input.email.trim(), input.password);
  await setDoc(doc(db, 'users', uid), {
    uid,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    displayName: `${input.firstName} ${input.lastName}`.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    role: input.role,
    isManual: true,
    mustChangePassword: true,
    createdAt: Timestamp.now(),
  });
  return uid;
}
