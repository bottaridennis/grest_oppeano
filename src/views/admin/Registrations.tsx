import { useMemo, useState } from 'react';
import {
  Check,
  CreditCard,
  Download,
  Link2,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import type { GrestData } from '../../hooks/useGrestData';
import type { Registration, RegistrationStatus, UserProfile } from '../../types';
import { STATUS_LABELS } from '../../constants';
import { ageFrom, cn, displayName, downloadCSV, formatDate, matches } from '../../lib/utils';
import {
  createRegistration,
  deleteDocument,
  linkRegistrationParent,
  setGrestPayment,
  setRegistrationStatus,
  updateRegistration,
} from '../../lib/actions';
import RegistrationForm from '../../components/RegistrationForm';
import { Avatar, EmptyState, Field, Modal, Segmented, StatusBadge } from '../../components/ui';
import { useConfirm, useToast } from '../../components/feedback';

type Filter = 'all' | RegistrationStatus;

export default function Registrations({ data }: { data: GrestData }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [linking, setLinking] = useState<Registration | null>(null);
  const [creating, setCreating] = useState(false);

  const usersById = useMemo(() => new Map(data.allUsers.map((u) => [u.uid, u])), [data.allUsers]);
  const regs = data.allRegistrations;

  const visible = regs.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (onlyUnpaid && r.paidGrestFee) return false;
    const parent = usersById.get(r.parentUid);
    return matches(search, r.childName, r.childSurname, `${r.childName} ${r.childSurname}`, displayName(parent), parent?.email);
  });

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (r: Registration) => {
    const ok = await confirm({
      title: 'Eliminare l’iscrizione?',
      message: (
        <>
          L’iscrizione di <b>{r.childName} {r.childSurname}</b> verrà eliminata definitivamente. Per conservarne lo storico puoi invece annullarla.
        </>
      ),
    });
    if (ok) run(() => deleteDocument('registrations', r.id), 'Iscrizione eliminata.');
  };

  const exportCsv = () =>
    downloadCSV(
      `iscrizioni-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Cognome', 'Nome', 'Data di nascita', 'Età', 'Stato', 'Quota pagata', 'Allergie', 'Note mediche', 'Tel. emergenza', 'Genitore', 'Email genitore', 'Tel. genitore', 'Data iscrizione'],
      visible.map((r) => {
        const p = usersById.get(r.parentUid);
        return [
          r.childSurname,
          r.childName,
          formatDate(r.birthDate, { day: '2-digit', month: '2-digit', year: 'numeric' }),
          ageFrom(r.birthDate),
          STATUS_LABELS[r.status],
          !!r.paidGrestFee,
          (r.allergies ?? []).join(', '),
          r.medicalNotes,
          r.emergencyPhone,
          p ? displayName(p) : '',
          p?.email,
          p?.phone,
          formatDate(r.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric' }),
        ];
      }),
    );

  const count = (s: RegistrationStatus) => regs.filter((r) => r.status === s).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `Tutte · ${regs.length}` },
            { value: 'pending', label: `In attesa · ${count('pending')}` },
            { value: 'confirmed', label: `Confermate · ${count('confirmed')}` },
            { value: 'cancelled', label: `Annullate · ${count('cancelled')}` },
          ]}
        />
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input className="input pl-9" placeholder="Cerca bambino o genitore…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className={cn('chip', onlyUnpaid && 'chip-on')} onClick={() => setOnlyUnpaid((v) => !v)} aria-pressed={onlyUnpaid}>
            <CreditCard className="w-3.5 h-3.5" /> Quota da pagare
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={!visible.length}>
            <Download className="w-4 h-4" /> CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> Nuova
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {visible.map((r) => {
          const parent = usersById.get(r.parentUid);
          const age = ageFrom(r.birthDate);
          return (
            <article key={r.id} className={cn('card p-4 sm:p-5', r.status === 'cancelled' && 'opacity-70')}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex gap-3 flex-1 min-w-0">
                  <Avatar name={`${r.childName} ${r.childSurname}`} tone={r.status === 'confirmed' ? 'leaf' : r.status === 'pending' ? 'sun' : 'brand'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-lg leading-tight">
                        {r.childName} {r.childSurname}
                      </h3>
                      <StatusBadge status={r.status} />
                      <button
                        onClick={() => run(() => setGrestPayment(r.id, !r.paidGrestFee), r.paidGrestFee ? 'Quota segnata come non pagata.' : 'Quota registrata.')}
                        className={cn('badge cursor-pointer hover:brightness-95', r.paidGrestFee ? 'badge-success' : 'badge-neutral')}
                        title="Clicca per cambiare lo stato del pagamento"
                      >
                        <CreditCard className="w-3 h-3" /> {r.paidGrestFee ? 'Quota pagata' : 'Quota non pagata'}
                      </button>
                    </div>
                    <p className="text-sm text-muted mt-1">
                      {age !== null ? `${age} anni · ` : ''}nato/a il {formatDate(r.birthDate)} · iscritto il {formatDate(r.createdAt)}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      {parent ? (
                        <>
                          <span className="font-medium">{displayName(parent)}</span>
                          {parent.email && (
                            <a className="text-muted hover:text-brand inline-flex items-center gap-1" href={`mailto:${parent.email}`}>
                              <Mail className="w-3.5 h-3.5" /> {parent.email}
                            </a>
                          )}
                          {parent.phone && (
                            <a className="text-muted hover:text-brand inline-flex items-center gap-1" href={`tel:${parent.phone}`}>
                              <Phone className="w-3.5 h-3.5" /> {parent.phone}
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-danger">Genitore non trovato</span>
                      )}
                      {r.emergencyPhone && (
                        <span className="text-muted inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> Emergenze: {r.emergencyPhone}
                        </span>
                      )}
                    </div>

                    {(!!r.allergies?.length || r.medicalNotes) && (
                      <div className="mt-3 flex flex-wrap gap-1.5 items-start">
                        {r.allergies?.map((a) => (
                          <span key={a} className="badge badge-danger">
                            {a}
                          </span>
                        ))}
                        {r.medicalNotes && <p className="w-full text-sm text-ink-soft bg-surface-2 rounded-xl p-2.5 mt-1 whitespace-pre-line">{r.medicalNotes}</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap lg:flex-col lg:items-end gap-2 lg:w-44 shrink-0">
                  {r.status === 'pending' && (
                    <button className="btn btn-sm bg-leaf text-white hover:brightness-95 flex-1 lg:flex-none lg:w-full" onClick={() => run(() => setRegistrationStatus(r.id, 'confirmed'), 'Iscrizione confermata.')}>
                      <Check className="w-4 h-4" /> Conferma
                    </button>
                  )}
                  {r.status === 'cancelled' ? (
                    <button className="btn btn-secondary btn-sm flex-1 lg:flex-none lg:w-full" onClick={() => run(() => setRegistrationStatus(r.id, 'pending'), 'Iscrizione ripristinata.')}>
                      <RotateCcw className="w-4 h-4" /> Ripristina
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-sm flex-1 lg:flex-none lg:w-full" onClick={() => run(() => setRegistrationStatus(r.id, 'cancelled'), 'Iscrizione annullata.')}>
                      <XCircle className="w-4 h-4" /> Annulla
                    </button>
                  )}
                  <RowMenu
                    onEdit={() => setEditing(r)}
                    onLink={() => setLinking(r)}
                    onDelete={() => remove(r)}
                  />
                </div>
              </div>
            </article>
          );
        })}
        {visible.length === 0 && (
          <EmptyState icon={<Users className="w-6 h-6" />} title="Nessuna iscrizione" description={search || filter !== 'all' ? 'Prova a modificare i filtri.' : 'Le iscrizioni dei genitori compariranno qui.'} />
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifica iscrizione" size="lg">
        {editing && (
          <RegistrationForm
            initial={editing}
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

      <Modal open={!!linking} onClose={() => setLinking(null)} title="Collega a un genitore" description={linking ? `${linking.childName} ${linking.childSurname}` : ''}>
        {linking && (
          <ParentPicker
            users={data.allUsers}
            selected={linking.parentUid}
            onSelect={(uid) =>
              run(async () => {
                await linkRegistrationParent(linking.id, uid);
                setLinking(null);
              }, 'Genitore collegato.')
            }
          />
        )}
      </Modal>

      <CreateForParent open={creating} onClose={() => setCreating(false)} users={data.allUsers} registrations={regs} />
    </div>
  );
}

function RowMenu({ onEdit, onLink, onDelete }: { onEdit: () => void; onLink: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const item = 'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-surface-2 text-left';
  return (
    <div className="relative">
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Altre azioni">
        <MoreHorizontal className="w-4 h-4" /> <span className="lg:hidden">Altro</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-52 card p-1.5 shadow-lift animate-fade-up">
            <button className={item} onClick={() => { setOpen(false); onEdit(); }}>
              <Pencil className="w-4 h-4 text-muted" /> Modifica dati
            </button>
            <button className={item} onClick={() => { setOpen(false); onLink(); }}>
              <Link2 className="w-4 h-4 text-muted" /> Cambia genitore
            </button>
            <button className={cn(item, 'text-danger')} onClick={() => { setOpen(false); onDelete(); }}>
              <Trash2 className="w-4 h-4" /> Elimina
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ParentPicker({ users, selected, onSelect }: { users: UserProfile[]; selected?: string; onSelect: (uid: string) => void }) {
  const [search, setSearch] = useState('');
  const list = users.filter((u) => matches(search, displayName(u), u.email, u.phone)).slice(0, 50);
  return (
    <div>
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input autoFocus className="input pl-9" placeholder="Cerca per nome o email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <ul className="max-h-80 overflow-y-auto -mx-1">
        {list.map((u) => (
          <li key={u.uid}>
            <button type="button" onClick={() => onSelect(u.uid)} className={cn('w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-surface-2', selected === u.uid && 'bg-brand-soft')}>
              <Avatar name={displayName(u)} tone="sky" className="w-9 h-9" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{displayName(u)}</p>
                <p className="text-xs text-muted truncate">{u.email || u.phone || '—'}</p>
              </div>
              {selected === u.uid && <Check className="w-4 h-4 text-brand" />}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-sm text-muted text-center">Nessun utente trovato.</li>}
      </ul>
    </div>
  );
}

function CreateForParent({ open, onClose, users, registrations }: { open: boolean; onClose: () => void; users: UserProfile[]; registrations: Registration[] }) {
  const toast = useToast();
  const [parentUid, setParentUid] = useState<string>('');
  const parent = users.find((u) => u.uid === parentUid);
  const close = () => {
    setParentUid('');
    onClose();
  };
  return (
    <Modal open={open} onClose={close} title="Nuova iscrizione" description="Inserisci un’iscrizione per conto di un genitore registrato." size="lg">
      {!parent ? (
        <Field label="Genitore">
          <ParentPicker users={users} onSelect={setParentUid} />
        </Field>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2">
            <Avatar name={displayName(parent)} tone="sky" className="w-9 h-9" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{displayName(parent)}</p>
              <p className="text-xs text-muted">{parent.email}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setParentUid('')}>
              Cambia
            </button>
          </div>
          <RegistrationForm
            siblings={registrations.filter((r) => r.parentUid === parent.uid)}
            submitLabel="Crea iscrizione"
            onCancel={close}
            onSubmit={async (f) => {
              await createRegistration(parent.uid, f);
              toast.success('Iscrizione creata.');
              close();
            }}
          />
        </div>
      )}
    </Modal>
  );
}
