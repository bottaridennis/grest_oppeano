import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { BOOTSTRAP_ADMIN_EMAILS } from '../constants';
import type { UserProfile } from '../types';

export interface Session {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
}

/** Stato di autenticazione + profilo Firestore in tempo reale (crea il profilo al primo accesso). */
export function useSession(): Session {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    setProfileReady(false);
    setError(null);
    const ref = doc(db, 'users', user.uid);
    let creating = false;

    const unsubscribe = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          setProfile({ ...(snap.data() as UserProfile), uid: user.uid });
          setProfileReady(true);
          return;
        }
        if (creating) return;
        creating = true;
        const [firstName, ...rest] = (user.displayName ?? '').split(' ');
        const newProfile: Record<string, unknown> = {
          uid: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? '',
          role: user.email && BOOTSTRAP_ADMIN_EMAILS.includes(user.email) ? 'admin' : 'parent',
          createdAt: Timestamp.now(),
        };
        if (firstName) newProfile.firstName = firstName;
        if (rest.length) newProfile.lastName = rest.join(' ');
        try {
          await setDoc(ref, newProfile);
        } catch (e) {
          console.error('[session] creazione profilo fallita', e);
          setError(e as Error);
          setProfileReady(true);
        }
      },
      (e) => {
        console.error('[session] lettura profilo fallita', e);
        setError(e);
        setProfileReady(true);
      },
    );
    return unsubscribe;
  }, [user]);

  return { user, profile, loading: !authReady || (!!user && !profileReady), error };
}
