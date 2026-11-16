import { useMemo } from 'react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useCollection } from './useFirestore';
import type {
  Announcement,
  GrestEvent,
  LegalContent,
  Notification,
  NotificationRead,
  Registration,
  ScheduleItem,
  Survey,
  SurveyResponse,
  UserProfile,
} from '../types';
import type { Session } from './useSession';

type UserRow = UserProfile & { id: string };

export function useGrestData({ user, profile }: Session) {
  const uid = user?.uid ?? '';
  const role = profile?.role;
  const isAdmin = role === 'admin';
  const isStaff = role === 'admin' || role === 'animator';

  const events = useCollection<GrestEvent>('events', () => query(collection(db, 'events'), orderBy('date', 'asc')));
  const announcements = useCollection<Announcement>('announcements', () =>
    query(collection(db, 'announcements'), orderBy('createdAt', 'desc')),
  );
  const schedule = useCollection<ScheduleItem>('schedule', () => query(collection(db, 'schedule'), orderBy('time', 'asc')));
  const surveys = useCollection<Survey>('surveys', () => query(collection(db, 'surveys'), orderBy('createdAt', 'desc')));
  const legal = useCollection<LegalContent>('legal', () => collection(db, 'legalContent'));

  const myRegistrations = useCollection<Registration>(`myRegs:${uid}`, () =>
    uid ? query(collection(db, 'registrations'), where('parentUid', '==', uid)) : null,
  );
  const myResponses = useCollection<SurveyResponse>(`myResp:${uid}`, () =>
    uid ? query(collection(db, 'surveyResponses'), where('parentUid', '==', uid)) : null,
  );
  // Si attende il profilo per evitare letture prima che il documento utente esista.
  const notifications = useCollection<Notification>(`notifs:${uid}:${role}`, () =>
    uid && role ? query(collection(db, 'notifications'), orderBy('createdAt', 'desc')) : null,
  );
  const reads = useCollection<NotificationRead>(`reads:${uid}`, () =>
    uid ? query(collection(db, 'notificationReads'), where('userUid', '==', uid)) : null,
  );

  const allRegistrations = useCollection<Registration>(`allRegs:${isStaff}`, () =>
    isStaff ? query(collection(db, 'registrations'), orderBy('createdAt', 'desc')) : null,
  );
  const allUsers = useCollection<UserRow>(`allUsers:${isAdmin}`, () =>
    isAdmin ? query(collection(db, 'users'), orderBy('createdAt', 'desc')) : null,
  );
  const allResponses = useCollection<SurveyResponse>(`allResp:${isAdmin}`, () =>
    isAdmin ? collection(db, 'surveyResponses') : null,
  );

  const myNotifications = useMemo(
    () =>
      notifications.data.filter((n) => {
        if (isAdmin || n.targetGroup === 'all') return true;
        if (n.targetGroup === 'parents') return role === 'parent';
        if (n.targetGroup === 'animators') return role === 'animator';
        return false;
      }),
    [notifications.data, isAdmin, role],
  );

  const readIds = useMemo(() => new Set(reads.data.map((r) => r.notificationId)), [reads.data]);
  const unreadCount = myNotifications.filter((n) => !readIds.has(n.id)).length;

  const sortedRegistrations = useMemo(
    () => [...myRegistrations.data].sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)),
    [myRegistrations.data],
  );

  return {
    loading: events.loading || announcements.loading,
    events: events.data,
    announcements: announcements.data,
    schedule: schedule.data,
    surveys: surveys.data,
    legal: legal.data,
    myRegistrations: sortedRegistrations,
    myResponses: myResponses.data,
    notifications: myNotifications,
    readIds,
    unreadCount,
    allRegistrations: allRegistrations.data,
    allUsers: allUsers.data as UserProfile[],
    allResponses: allResponses.data,
  };
}

export type GrestData = ReturnType<typeof useGrestData>;
