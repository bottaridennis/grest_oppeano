import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react';
import { auth } from '../firebase';
import { Field, Segmented, SubmitButton } from '../components/ui';
import { useToast } from '../components/feedback';

export function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

type Mode = 'login' | 'register' | 'reset';

export default function AuthPanel({ intro }: { intro?: string }) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else if (mode === 'register') {
        if (password !== confirm) throw new Error('Le password non coincidono.');
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        toast.success('Account creato! Completa il tuo profilo.');
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        toast.success('Ti abbiamo inviato un’email per reimpostare la password.');
        setMode('login');
      }
    } catch (err) {
      toast.error(err, mode === 'reset' ? 'Impossibile inviare l’email di recupero.' : 'Accesso non riuscito.');
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if ((err as { code?: string }).code !== 'auth/popup-closed-by-user') toast.error(err, 'Accesso con Google non riuscito.');
    }
  };

  return (
    <div className="card p-6 sm:p-8 w-full max-w-md mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-5">
        {mode === 'reset' ? <KeyRound className="w-6 h-6" /> : mode === 'register' ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
      </div>
      <h2 className="text-2xl font-bold">
        {mode === 'reset' ? 'Recupera password' : mode === 'register' ? 'Crea il tuo account' : 'Bentornato!'}
      </h2>
      <p className="text-sm text-muted mt-1 mb-6">
        {mode === 'reset'
          ? 'Inserisci la tua email: riceverai un link per scegliere una nuova password.'
          : intro ?? 'Accedi per iscrivere i tuoi figli, rispondere alle gite e ricevere gli avvisi.'}
      </p>

      {mode !== 'reset' && (
        <>
          <button type="button" onClick={google} className="btn btn-secondary w-full py-3">
            <GoogleIcon /> Continua con Google
          </button>
          <div className="flex items-center gap-3 my-5 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> oppure con email <span className="h-px flex-1 bg-line" />
          </div>
          <Segmented
            className="w-full mb-5 [&>button]:flex-1"
            value={mode}
            onChange={(m) => setMode(m)}
            options={[
              { value: 'login', label: 'Accedi' },
              { value: 'register', label: 'Registrati' },
            ]}
          />
        </>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <div className="relative">
            <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10"
              placeholder="nome@esempio.it"
            />
          </div>
        </Field>
        {mode !== 'reset' && (
          <Field label="Password" hint={mode === 'register' ? 'Almeno 6 caratteri.' : undefined}>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </Field>
        )}
        {mode === 'register' && (
          <Field label="Conferma password">
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </Field>
        )}
        <SubmitButton loading={loading} className="w-full py-3">
          {mode === 'login' ? 'Accedi' : mode === 'register' ? 'Crea account' : 'Invia link di recupero'}
        </SubmitButton>
      </form>

      <div className="mt-5 text-center text-sm">
        {mode === 'login' && (
          <button className="text-brand-strong font-semibold hover:underline" onClick={() => setMode('reset')}>
            Password dimenticata?
          </button>
        )}
        {mode === 'reset' && (
          <button className="text-brand-strong font-semibold hover:underline" onClick={() => setMode('login')}>
            Torna all’accesso
          </button>
        )}
      </div>
    </div>
  );
}
