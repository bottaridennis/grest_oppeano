import { useState } from 'react';
import type { User } from 'firebase/auth';
import { Baby, Mail, Pencil, Phone, Search, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react';
import type { GrestData } from '../../hooks/useGrestData';
import type { UserProfile, UserRole } from '../../types';
import { ROLE_LABELS } from '../../constants';
import { displayName, formatDate, matches } from '../../lib/utils';
import { createManualUser, deleteDocument, updateUser } from '../../lib/actions';
import { Avatar, EmptyState, Field, Modal, Segmented, SubmitButton } from '../../components/ui';
import { useConfirm, useToast } from '../../components/feedback';

const ROLES: UserRole[] = ['parent', 'animator', 'admin'];

export default function Users({ data, me }: { data: GrestData; me: User }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | UserRole>('all');
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [creating, setCreating] = useState(false);

  const childrenCount = (uid: string) => data.allRegistrations.filter((r) => r.parentUid === uid && r.status !== 'cancelled').length;
  const list = data.allUsers.filter((u) => (role === 'all' || u.role === role) && matches(search, displayName(u), u.email, u.phone));

  const changeRole = async (u: UserProfile, r: UserRole) => {
    if (u.role === r) return;
    if (r === 'admin' && !(await confirm({ title: 'Promuovere ad amministratore?', message: <>{displayName(u)} avrà accesso completo a tutti i dati del Grest.</>, confirmLabel: 'Promuovi', tone: 'primary' }))) return;
    try {
      await updateUser(u.uid, { role: r });
      toast.success(`${displayName(u)} è ora ${ROLE_LABELS[r].toLowerCase()}.`);
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (u: UserProfile) => {
    const ok = await confirm({
      title: 'Rimuovere il profilo?',
      message: (
        <>
          Il profilo di <b>{displayName(u)}</b> verrà rimosso dall’app. Le sue credenziali di accesso restano attive finché non vengono eliminate dalla console Firebase: al prossimo accesso verrà ricreato come genitore.
        </>
      ),
      confirmLabel: 'Rimuovi',
    });
    if (!ok) return;
    try {
      await deleteDocument('users', u.uid);
      toast.success('Profilo rimosso.');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
        <Segmented
          value={role}
          onChange={setRole}
          options={[{ value: 'all' as const, label: `Tutti · ${data.allUsers.length}` }, ...ROLES.map((r) => ({ value: r, label: `${ROLE_LABELS[r]} · ${data.allUsers.filter((u) => u.role === r).length}` }))]}
        />
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input className="input pl-9" placeholder="Cerca per nome, email o telefono…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <UserPlus className="w-4 h-4" /> Crea utente
        </button>
      </div>

      <div className="card divide-y divide-line">
        {list.map((u) => {
          const kids = childrenCount(u.uid);
          const isMe = u.uid === me.uid;
          return (
            <div key={u.uid} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={displayName(u)} tone={u.role === 'admin' ? 'brand' : u.role === 'animator' ? 'leaf' : 'sky'} />
                <div className="min-w-0">
                  <p className="font-semibold truncate flex items-center gap-2">
                    {displayName(u)}
                    {isMe && <span className="badge badge-brand">Tu</span>}
                    {u.isManual && <span className="badge badge-neutral">Creato da admin</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-3 text-sm text-muted">
                    {u.email && (
                      <a href={`mailto:${u.email}`} className="inline-flex items-center gap-1 hover:text-brand truncate">
                        <Mail className="w-3.5 h-3.5" /> {u.email}
                      </a>
                    )}
                    {u.phone && (
                      <a href={`tel:${u.phone}`} className="inline-flex items-center gap-1 hover:text-brand">
                        <Phone className="w-3.5 h-3.5" /> {u.phone}
                      </a>
                    )}
                    {kids > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Baby className="w-3.5 h-3.5" /> {kids} {kids === 1 ? 'figlio' : 'figli'}
                      </span>
                    )}
                    <span>dal {formatDate(u.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Ruolo"
                  disabled={isMe}
                  className="input py-1.5 w-44"
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value as UserRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button className="btn-icon" title="Modifica" onClick={() => setEditing(u)}>
                  <Pencil className="w-4 h-4" />
                </button>
                {!isMe && (
                  <button className="btn-icon hover:text-danger" title="Rimuovi" onClick={() => remove(u)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {list.length === 0 && <EmptyState className="border-0" icon={<UsersIcon className="w-6 h-6" />} title="Nessun utente trovato" />}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifica utente" size="sm">
        {editing && <EditUserForm key={editing.uid} user={editing} onDone={() => setEditing(null)} />}
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)} title="Crea utente" description="Per chi non può registrarsi da solo: comunica la password temporanea, verrà chiesto di cambiarla al primo accesso.">
        {creating && <CreateUserForm onDone={() => setCreating(false)} />}
      </Modal>
    </div>
  );
}

function EditUserForm({ user, onDone }: { user: UserProfile; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ firstName: user.firstName ?? '', lastName: user.lastName ?? '', phone: user.phone ?? '' });
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await updateUser(user.uid, { firstName: f.firstName.trim(), lastName: f.lastName.trim(), phone: f.phone.trim() });
          toast.success('Utente aggiornato.');
          onDone();
        } catch (err) {
          toast.error(err);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome">
          <input required className="input" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
        </Field>
        <Field label="Cognome">
          <input required className="input" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
        </Field>
      </div>
      <Field label="Telefono">
        <input type="tel" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </Field>
      <Field label="Email">
        <input disabled className="input" value={user.email ?? ''} />
      </Field>
      <SubmitButton loading={saving} className="w-full">
        Salva
      </SubmitButton>
    </form>
  );
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'parent' as UserRole, password: generatePassword() });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  if (created) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">Utente creato. Comunica queste credenziali all’interessato:</p>
        <div className="rounded-xl bg-surface-2 p-4 font-mono text-sm space-y-1 select-all">
          <p>Email: {created.email}</p>
          <p>Password: {created.password}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            className="btn btn-secondary"
            onClick={() => {
              navigator.clipboard?.writeText(`Email: ${created.email}\nPassword temporanea: ${created.password}`);
              toast.success('Credenziali copiate.');
            }}
          >
            Copia
          </button>
          <button className="btn btn-primary" onClick={onDone}>
            Fatto
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await createManualUser(f);
          setCreated({ email: f.email.trim(), password: f.password });
        } catch (err) {
          toast.error(err, 'Impossibile creare l’utente.');
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome">
          <input required className="input" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
        </Field>
        <Field label="Cognome">
          <input required className="input" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
        </Field>
      </div>
      <Field label="Email">
        <input required type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefono">
          <input type="tel" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="Ruolo">
          <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as UserRole })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Password temporanea" hint="Generata automaticamente, puoi modificarla (min. 6 caratteri).">
        <div className="flex gap-2">
          <input required minLength={6} className="input font-mono" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <button type="button" className="btn btn-secondary" onClick={() => setF({ ...f, password: generatePassword() })}>
            Rigenera
          </button>
        </div>
      </Field>
      <SubmitButton loading={saving} className="w-full">
        Crea utente
      </SubmitButton>
    </form>
  );
}
