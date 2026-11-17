import { useState } from 'react';
import { updatePassword, type User } from 'firebase/auth';
import { updateUser } from '../lib/actions';
import { Field, Modal, SubmitButton } from './ui';
import { useToast } from './feedback';
import type { UserProfile } from '../types';

export function ChangePasswordModal({
  open,
  user,
  forced,
  onClose,
}: {
  open: boolean;
  user: User;
  forced?: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pwd.length < 6) return setError('La password deve contenere almeno 6 caratteri.');
    if (pwd !== confirm) return setError('Le password non coincidono.');
    setLoading(true);
    try {
      await updatePassword(user, pwd);
      if (forced) await updateUser(user.uid, { mustChangePassword: false });
      toast.success('Password aggiornata.');
      setPwd('');
      setConfirm('');
      onClose();
    } catch (err) {
      toast.error(err, 'Impossibile aggiornare la password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={forced ? () => {} : onClose}
      title={forced ? 'Imposta una nuova password' : 'Cambia password'}
      description={forced ? 'Al primo accesso è necessario sostituire la password temporanea ricevuta dalla segreteria.' : undefined}
      size="sm"
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-sm text-danger font-medium">{error}</p>}
        <Field label="Nuova password">
          <input type="password" autoComplete="new-password" required className="input" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </Field>
        <Field label="Conferma password">
          <input type="password" autoComplete="new-password" required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <SubmitButton loading={loading} className="w-full">
          Aggiorna password
        </SubmitButton>
      </form>
    </Modal>
  );
}

export function CompleteProfileModal({ open, profile }: { open: boolean; profile: UserProfile }) {
  const toast = useToast();
  const [firstName, setFirstName] = useState(profile.firstName ?? '');
  const [lastName, setLastName] = useState(profile.lastName ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUser(profile.uid, { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
      toast.success('Profilo completato. Benvenuto!');
    } catch (err) {
      toast.error(err, 'Impossibile salvare il profilo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={() => {}} title="Completa il tuo profilo" description="Ci servono nome e cognome per riconoscerti e contattarti." size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome">
            <input required autoComplete="given-name" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Cognome">
            <input required autoComplete="family-name" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <Field label="Telefono (facoltativo)">
          <input type="tel" autoComplete="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <SubmitButton loading={loading} className="w-full">
          Salva e continua
        </SubmitButton>
      </form>
    </Modal>
  );
}
