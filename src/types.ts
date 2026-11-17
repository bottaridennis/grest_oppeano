import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'parent' | 'animator';
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled';
export type MessageType = 'info' | 'warning' | 'urgent';
export type TargetGroup = 'all' | 'parents' | 'animators';
export type LegalType = 'privacy' | 'cookies' | 'terms';

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isManual?: boolean;
  mustChangePassword?: boolean;
  phone?: string;
  createdAt: Timestamp;
}

export interface LegalContent {
  id: string;
  type: LegalType;
  content: string;
  updatedAt: Timestamp;
}

export interface Registration {
  id: string;
  parentUid: string;
  childName: string;
  childSurname: string;
  birthDate: string;
  allergies?: string[];
  medicalNotes?: string;
  emergencyPhone?: string;
  status: RegistrationStatus;
  paidGrestFee?: boolean;
  createdAt: Timestamp;
}

export interface GrestEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  createdAt: Timestamp;
}

export interface Attendance {
  id: string;
  registrationId: string;
  date: string;
  present: boolean;
  recordedAt: Timestamp;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  deadline?: string | null;
  date?: string | null;
  cost?: number | null;
  departureTime?: string;
  returnTime?: string;
  minParticipants?: number | null;
  active: boolean;
  createdAt: Timestamp;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  parentUid: string;
  registrationId: string;
  participating: boolean;
  paidTripFee?: boolean;
  notes?: string;
  respondedAt: Timestamp;
}

export interface ScheduleItem {
  id: string;
  time: string;
  activity: string;
  description?: string;
  day: string;
  createdAt: Timestamp;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: MessageType;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: MessageType;
  targetGroup: TargetGroup;
  createdAt: Timestamp;
  senderUid: string;
}

export interface NotificationRead {
  id: string;
  notificationId: string;
  userUid: string;
  readAt: Timestamp;
}
