export type UserRole = 'admin' | 'parent' | 'animator';

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
  createdAt: any;
}

export interface LegalContent {
  id: string;
  type: 'privacy' | 'cookies' | 'terms';
  content: string;
  updatedAt: any;
}

export interface Registration {
  id: string;
  parentUid: string;
  childName: string;
  childSurname: string;
  birthDate: string;
  allergies?: string[];
  medicalNotes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  paidGrestFee?: boolean;
  createdAt: any;
}

export interface GrestEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  createdAt: any;
}

export interface Attendance {
  id?: string;
  registrationId: string;
  date: string;
  present: boolean;
  recordedAt: any;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  cost?: number;
  departureTime?: string;
  returnTime?: string;
  minParticipants?: number;
  active: boolean;
  createdAt: any;
}

export interface SurveyResponse {
  id?: string;
  surveyId: string;
  parentUid: string;
  registrationId: string;
  participating: boolean;
  paidTripFee?: boolean;
  notes?: string;
  respondedAt: any;
}

export interface ScheduleItem {
  id: string;
  time: string;
  activity: string;
  description?: string;
  day: string;
  createdAt: any;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  createdAt: any;
}
