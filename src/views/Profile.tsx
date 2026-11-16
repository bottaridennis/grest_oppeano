import { useState } from 'react';
import { GoogleAuthProvider, linkWithPopup, type User } from 'firebase/auth';
import { Baby, CalendarDays, CreditCard, KeyRound, Pencil, Phone, Plus, Undo2 } from 'lucide-react';
import type { GrestData } from '../hooks/useGrestData';
import type { Navigate } from '../hooks/useHashRoute';
import type { Registration, UserProfile } from '../types';
import { ROLE_LABELS } from '../constants';
import { ageFrom, displayName, formatDate } from '../lib/utils';
import { setRegistrationStatus, updateRegistration, updateUser } from '../lib/actions';
import RegistrationForm from '../components/RegistrationForm';
import { ChangePasswordModal } from '../components/AccountModals';
import { Avatar, EmptyState, Field, Modal, PageHeader, SectionTitle, StatusBadge, SubmitButton } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';
import { GoogleIcon } from './Auth';

export default function Profile({ user, profile, data, navigate }: { user: User; profile: UserProfile; data: GrestData; navigate: Navigate }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ firstName: profile.firstName ?? '', lastName: profile.lastName ?? '', phone: profile.phone ?? '' });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);

  const hasPassword = user.providerData.some((p) => p.providerId === 'password');
  const hasGoogle = user.providerData.some((p) => p.providerId === 'google.com');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(user.uid, { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim() });
      toast.success('Profilo aggiornato.');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  const linkGoogle = async () => {
    try {
      await linkWithPopup(user, new GoogleAuthProvider());
      toast.success('Account Google collegato.');
    } catch (err) {
      toast.error(err, 'Collegamento non riuscito.');
    }
  };

  const withdraw = async (r: Registration) => {
    const ok = await confirm({
      title: 'Ritirare l’iscrizione?',
      message: (
        <>
          L’iscrizione di <b>{r.childName}</b> verrà segnata come annullata. Per riattivarla dovrai contattare la segreteria.
        </>
      ),
      confirmLabel: 'Ritira iscrizione',
    });
    if (!ok) return;
    try {
      await setRegistrationStatus(r.id, 'cancelled');
      toast.success('Iscrizione ritirata.');
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Area personale" title={`Ciao, ${profile.firstName || displayName(profile)}!`} description="Gestisci i tuoi dati e le iscrizioni dei tuoi figli." />

      <div className="grid lg:grid-cols-[360px_1fr] gap-8 items-start">
        <div className="space-y-6">
          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <Avatar name={displayName(profile)} className="w-12 h-12 text-base" />
              <div className="min-w-0">
                <p className="font-semibold truncate">{displayName(profile)}</p>
                <p className="text-sm text-muted truncate">{user.email}</p>
              </div>
              <span className="badge badge-neutral ml-auto">{ROLE_LABELS[profile.role]}</span>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome">
                  <input required className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </Field>
                <Field label="Cognome">
                  <input required className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </Field>
              </div>
              <Field label="Telefono">
                <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <SubmitButton loading={saving} className="w-full">
                Salva modifiche
              </SubmitButton>
            </form>
          </div>

          <div className="card p-5 sm:p-6 space-y-3">
            <p className="eyebrow">Sicurezza</p>
            {hasPassword && (
              <button className="btn btn-secondary w-full justify-start" onClick={() => setPwdOpen(true)}>
                <KeyRound className="w-4 h-4" /> Cambia password
              </button>
            )}
            {hasGoogle ? (
              <p className="text-sm text-muted flex items-center gap-2">
                <GoogleIcon className="w-4 h-4" /> Account Google collegato
              </p>
            ) : (
              <button className="btn btn-secondary w-full justify-start" onClick={linkGoogle}>
                <GoogleIcon className="w-4 h-4" /> Collega account Google
              </button>
            )}
          </div>
        </div>

        <section>
          <SectionTitle
            title="I miei bambini"
            icon={<Baby className="w-5 h-5 text-brand" />}
            action={
              <button className="btn btn-primary btn-sm" onClick={() => navigate('iscrizioni')}>
                <Plus className="w-4 h-4" /> Nuova iscrizione
              </button>
            }
          />
          <div className="grid md:grid-cols-2 gap-4">
            {data.myRegistrations.map((r) => {
              const age = ageFrom(r.birthDate);
              return (
                <article key={r.id} className="card p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={`${r.childName} ${r.childSurname}`} tone="sky" />
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg leading-tight truncate">
                          {r.childName} {r.childSurname}
                        </h3>
                        <p className="text-sm text-muted">{age !== null ? `${age} anni` : ''}</p>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-ink-soft">
                      <CalendarDays className="w-4 h-4 text-muted" /> Nato/a il {formatDate(r.birthDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {r.emergencyPhone && (
                      <div className="flex items-center gap-2 text-ink-soft">
                        <Phone className="w-4 h-4 text-muted" /> Emergenze: {r.emergencyPhone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-ink-soft">
                      <CreditCard className="w-4 h-4 text-muted" />
                      {r.paidGrestFee ? <span className="text-leaf font-semibold">Quota versata</span> : 'Quota da versare in segreteria'}
                    </div>
                  </dl>

                  {!!r.allergies?.length && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {r.allergies.map((a) => (
                        <span key={a} className="badge badge-danger">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.medicalNotes && <p className="mt-3 text-sm text-muted bg-surface-2 rounded-xl p-3 whitespace-pre-line">{r.medicalNotes}</p>}

                  {r.status !== 'cancelled' && (
                    <div className="flex gap-2 mt-auto pt-5">
                      <button className="btn btn-secondary btn-sm flex-1" onClick={() => setEditing(r)}>
                        <Pencil className="w-4 h-4" /> Modifica
                      </button>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => withdraw(r)}>
                        <Undo2 className="w-4 h-4" /> Ritira
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {data.myRegistrations.length === 0 && (
            <EmptyState
              icon={<Baby className="w-6 h-6" />}
              title="Nessuna iscrizione"
              description="Non hai ancora iscritto nessun bambino al Grest."
              action={
                <button className="btn btn-primary" onClick={() => navigate('iscrizioni')}>
                  Iscrivi ora
                </button>
              }
            />
          )}
        </section>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifica iscrizione" size="lg">
        {editing && (
          <RegistrationForm
            initial={editing}
            siblings={data.myRegistrations}
            submitLabel="Salva modifiche"
            onCancel={() => setEditing(null)}
            onSubmit={async (f) => {
              await updateRegistration(editing.id, f);
              toast.success('Iscrizione aggiornata.');
              setEditing(null);
            }}
          />
        )}
      </Modal>

      <ChangePasswordModal open={pwdOpen} user={user} onClose={() => setPwdOpen(false)} />
    </div>
  );
}
