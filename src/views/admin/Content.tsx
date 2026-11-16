import { useState } from 'react';
import type { User } from 'firebase/auth';
import { Bell, CalendarDays, Check, Clock, MapPin, Megaphone, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import type { GrestData } from '../../hooks/useGrestData';
import type { Announcement, GrestEvent, MessageType, ScheduleItem, TargetGroup } from '../../types';
import { TARGET_LABELS, WEEK_DAYS_ORDERED } from '../../constants';
import { cn, formatDate, localISODate, parseISODate, relativeTime } from '../../lib/utils';
import { deleteDocument, saveDocument, sendNotification, type CollectionName } from '../../lib/actions';
import { EmptyState, Field, Modal, Segmented, SubmitButton, typeAccent, TypeBadge } from '../../components/ui';
import { useConfirm, useToast } from '../../components/feedback';

/* ------------------------------------------------------------------ */
/* Helpers condivisi                                                   */
/* ------------------------------------------------------------------ */

function useCrud() {
  const toast = useToast();
  const confirm = useConfirm();
  const remove = async (col: CollectionName, id: string, label: string) => {
    if (!(await confirm({ title: `Eliminare ${label}?`, message: 'L’operazione non può essere annullata.' }))) return;
    try {
      await deleteDocument(col, id);
      toast.success('Eliminato.');
    } catch (e) {
      toast.error(e);
    }
  };
  return { toast, remove };
}

function Toolbar({ children, onNew, newLabel }: { children?: React.ReactNode; onNew: () => void; newLabel: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>{children}</div>
      <button className="btn btn-primary" onClick={onNew}>
        <Plus className="w-4 h-4" /> {newLabel}
      </button>
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-1 shrink-0">
      {onEdit && (
        <button className="btn-icon" title="Modifica" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </button>
      )}
      <button className="btn-icon hover:text-danger" title="Elimina" onClick={onDelete}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function FormFooter({ saving, onCancel, label }: { saving: boolean; onCancel: () => void; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" className="btn btn-secondary" onClick={onCancel}>
        Annulla
      </button>
      <SubmitButton loading={saving}>{label}</SubmitButton>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Eventi                                                              */
/* ------------------------------------------------------------------ */

export function EventsAdmin({ data }: { data: GrestData }) {
  const { toast, remove } = useCrud();
  const [editing, setEditing] = useState<GrestEvent | 'new' | null>(null);
  const [showPast, setShowPast] = useState(false);
  const today = localISODate();
  const list = data.events.filter((e) => (showPast ? e.date < today : e.date >= today));
  if (showPast) list.reverse();

  return (
    <div>
      <Toolbar onNew={() => setEditing('new')} newLabel="Nuovo evento">
        <Segmented
          value={showPast ? 'past' : 'next'}
          onChange={(v) => setShowPast(v === 'past')}
          options={[
            { value: 'next', label: 'In programma' },
            { value: 'past', label: 'Passati' },
          ]}
        />
      </Toolbar>
      <div className="space-y-3">
        {list.map((e) => {
          const d = parseISODate(e.date);
          return (
            <article key={e.id} className="card p-4 flex gap-4 items-start">
              <div className="w-14 shrink-0 rounded-xl bg-brand-soft text-brand-strong text-center py-2">
                <p className="text-[10px] font-bold uppercase">{d?.toLocaleDateString('it-IT', { month: 'short' })}</p>
                <p className="font-display text-2xl font-extrabold leading-none">{d?.getDate()}</p>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">{e.title}</h3>
                <div className="flex flex-wrap gap-x-3 text-sm text-muted mt-0.5">
                  {e.time && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {e.time}
                    </span>
                  )}
                  {e.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {e.location}
                    </span>
                  )}
                </div>
                {e.description && <p className="text-sm text-ink-soft mt-1.5 line-clamp-2">{e.description}</p>}
              </div>
              <RowActions onEdit={() => setEditing(e)} onDelete={() => remove('events', e.id, 'l’evento')} />
            </article>
          );
        })}
        {list.length === 0 && <EmptyState icon={<CalendarDays className="w-6 h-6" />} title={showPast ? 'Nessun evento passato' : 'Nessun evento in programma'} />}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? 'Modifica evento' : 'Nuovo evento'}>
        {editing !== null && (
          <EventForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
            onSave={async (payload, id) => {
              await saveDocument('events', id, payload);
              toast.success(id ? 'Evento aggiornato.' : 'Evento creato.');
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function EventForm({ initial, onDone, onSave }: { initial: GrestEvent | null; onDone: () => void; onSave: (p: Record<string, unknown>, id: string | null) => Promise<void> }) {
  const toast = useToast();
  const [f, setF] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    date: initial?.date ?? '',
    time: initial?.time ?? '',
    location: initial?.location ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSave({ ...f, title: f.title.trim(), location: f.location.trim() }, initial?.id ?? null);
          onDone();
        } catch (err) {
          toast.error(err);
        } finally {
          setSaving(false);
        }
      }}
    >
      <Field label="Titolo">
        <input required className="input" value={f.title} onChange={set('title')} placeholder="Es. Festa di inizio Grest" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data">
          <input required type="date" className="input" value={f.date} onChange={set('date')} />
        </Field>
        <Field label="Ora">
          <input type="time" className="input" value={f.time} onChange={set('time')} />
        </Field>
      </div>
      <Field label="Luogo">
        <input className="input" value={f.location} onChange={set('location')} placeholder="Es. Campo sportivo parrocchiale" />
      </Field>
      <Field label="Descrizione">
        <textarea rows={4} className="input" value={f.description} onChange={set('description')} />
      </Field>
      <FormFooter saving={saving} onCancel={onDone} label={initial ? 'Salva' : 'Crea evento'} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Programma / orari                                                   */
/* ------------------------------------------------------------------ */

export function ScheduleAdmin({ data }: { data: GrestData }) {
  const { toast, remove } = useCrud();
  const [editing, setEditing] = useState<ScheduleItem | 'new' | null>(null);
  const days = WEEK_DAYS_ORDERED.filter((d) => data.schedule.some((s) => s.day === d));

  return (
    <div>
      <Toolbar onNew={() => setEditing('new')} newLabel="Nuova attività">
        <p className="text-sm text-muted">{data.schedule.length} attività in programma</p>
      </Toolbar>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {days.map((day) => (
          <section key={day} className="card overflow-hidden">
            <h3 className="px-4 py-3 border-b border-line bg-surface-2/60 font-bold">{day}</h3>
            <ul className="divide-y divide-line">
              {data.schedule
                .filter((s) => s.day === day)
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((s) => (
                  <li key={s.id} className="px-4 py-3 flex items-start gap-3">
                    <span className="font-display font-bold text-brand tabular-nums w-12 shrink-0 pt-0.5">{s.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold leading-snug">{s.activity}</p>
                      {s.description && <p className="text-xs text-muted mt-0.5">{s.description}</p>}
                    </div>
                    <RowActions onEdit={() => setEditing(s)} onDelete={() => remove('schedule', s.id, 'l’attività')} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      {days.length === 0 && <EmptyState icon={<Clock className="w-6 h-6" />} title="Programma vuoto" description="Aggiungi le attività della giornata tipo: potrai copiarle su più giorni." />}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? 'Modifica attività' : 'Nuova attività'}>
        {editing !== null && (
          <ScheduleForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
            onSaved={(n) => toast.success(n > 1 ? `${n} attività aggiunte.` : 'Attività salvata.')}
          />
        )}
      </Modal>
    </div>
  );
}

function ScheduleForm({ initial, onDone, onSaved }: { initial: ScheduleItem | null; onDone: () => void; onSaved: (n: number) => void }) {
  const toast = useToast();
  const [time, setTime] = useState(initial?.time ?? '');
  const [activity, setActivity] = useState(initial?.activity ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [days, setDays] = useState<string[]>(initial ? [initial.day] : ['Lunedì']);
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: string) => {
    if (initial) return setDays([d]);
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!days.length) return toast.error('Seleziona almeno un giorno.');
        setSaving(true);
        try {
          const base = { time, activity: activity.trim(), description: description.trim() };
          if (initial) await saveDocument('schedule', initial.id, { ...base, day: days[0] });
          else await Promise.all(days.map((day) => saveDocument('schedule', null, { ...base, day })));
          onSaved(initial ? 1 : days.length);
          onDone();
        } catch (err) {
          toast.error(err);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid grid-cols-[120px_1fr] gap-4">
        <Field label="Orario">
          <input required type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Attività">
          <input required className="input" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Es. Accoglienza e preghiera" />
        </Field>
      </div>
      <div>
        <span className="field-label">{initial ? 'Giorno' : 'Giorni (puoi selezionarne più di uno)'}</span>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS_ORDERED.map((d) => (
            <button type="button" key={d} onClick={() => toggleDay(d)} className={cn('chip', days.includes(d) && 'chip-on')} aria-pressed={days.includes(d)}>
              {days.includes(d) && <Check className="w-3.5 h-3.5" />}
              {d}
            </button>
          ))}
        </div>
      </div>
      <Field label="Descrizione (facoltativa)">
        <textarea rows={3} className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <FormFooter saving={saving} onCancel={onDone} label={initial ? 'Salva' : 'Aggiungi'} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Annunci & Notifiche                                                 */
/* ------------------------------------------------------------------ */

const TYPE_OPTIONS: Array<{ value: MessageType; label: string }> = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Avviso' },
  { value: 'urgent', label: 'Urgente' },
];

export function AnnouncementsAdmin({ data }: { data: GrestData }) {
  const { toast, remove } = useCrud();
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  return (
    <div>
      <Toolbar onNew={() => setEditing('new')} newLabel="Nuovo annuncio">
        <p className="text-sm text-muted">Gli annunci sono visibili a tutti nella home page.</p>
      </Toolbar>
      <div className="grid md:grid-cols-2 gap-4">
        {data.announcements.map((a) => (
          <article key={a.id} className="card relative overflow-hidden p-5 pl-6">
            <span className={cn('absolute left-0 top-0 bottom-0 w-1.5', typeAccent(a.type))} />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <TypeBadge type={a.type} />
                <span className="text-xs text-muted">{formatDate(a.createdAt)}</span>
              </div>
              <RowActions onEdit={() => setEditing(a)} onDelete={() => remove('announcements', a.id, 'l’annuncio')} />
            </div>
            <h3 className="font-bold text-lg mt-1">{a.title}</h3>
            <p className="text-sm text-ink-soft mt-1 whitespace-pre-line line-clamp-4">{a.content}</p>
          </article>
        ))}
      </div>
      {data.announcements.length === 0 && <EmptyState icon={<Megaphone className="w-6 h-6" />} title="Nessun annuncio pubblicato" />}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? 'Modifica annuncio' : 'Nuovo annuncio'}>
        {editing !== null && (
          <MessageForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : { title: editing.title, body: editing.content, type: editing.type }}
            bodyLabel="Contenuto"
            submitLabel={editing === 'new' ? 'Pubblica' : 'Salva'}
            onCancel={() => setEditing(null)}
            onSubmit={async ({ title, body, type }) => {
              await saveDocument('announcements', editing === 'new' ? null : editing.id, { title, content: body, type });
              toast.success(editing === 'new' ? 'Annuncio pubblicato.' : 'Annuncio aggiornato.');
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

export function NotificationsAdmin({ data, user }: { data: GrestData; user: User }) {
  const { toast, remove } = useCrud();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Toolbar onNew={() => setOpen(true)} newLabel="Invia notifica">
        <p className="text-sm text-muted">Le notifiche compaiono nell’area personale degli utenti selezionati.</p>
      </Toolbar>
      <div className="space-y-3">
        {data.notifications.map((n) => (
          <article key={n.id} className="card relative overflow-hidden p-4 pl-5 flex gap-4 items-start">
            <span className={cn('absolute left-0 top-0 bottom-0 w-1.5', typeAccent(n.type))} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={n.type} />
                <span className="badge badge-neutral">→ {TARGET_LABELS[n.targetGroup]}</span>
                <span className="text-xs text-muted">{relativeTime(n.createdAt)}</span>
              </div>
              <h3 className="font-bold mt-1.5">{n.title}</h3>
              <p className="text-sm text-ink-soft whitespace-pre-line">{n.message}</p>
            </div>
            <RowActions onDelete={() => remove('notifications', n.id, 'la notifica')} />
          </article>
        ))}
        {data.notifications.length === 0 && <EmptyState icon={<Bell className="w-6 h-6" />} title="Nessuna notifica inviata" />}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Invia notifica">
        {open && (
          <MessageForm
            withTarget
            bodyLabel="Messaggio"
            submitLabel="Invia"
            submitIcon={<Send className="w-4 h-4" />}
            onCancel={() => setOpen(false)}
            onSubmit={async ({ title, body, type, target }) => {
              await sendNotification(user.uid, { title, message: body, type, targetGroup: target });
              toast.success('Notifica inviata.');
              setOpen(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function MessageForm({
  initial,
  withTarget,
  bodyLabel,
  submitLabel,
  submitIcon,
  onCancel,
  onSubmit,
}: {
  initial?: { title: string; body: string; type: MessageType };
  withTarget?: boolean;
  bodyLabel: string;
  submitLabel: string;
  submitIcon?: React.ReactNode;
  onCancel: () => void;
  onSubmit: (v: { title: string; body: string; type: MessageType; target: TargetGroup }) => Promise<void>;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [type, setType] = useState<MessageType>(initial?.type ?? 'info');
  const [target, setTarget] = useState<TargetGroup>('all');
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSubmit({ title: title.trim(), body: body.trim(), type, target });
        } catch (err) {
          toast.error(err);
        } finally {
          setSaving(false);
        }
      }}
    >
      <Field label="Titolo">
        <input required maxLength={199} className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={bodyLabel}>
        <textarea required maxLength={1999} rows={5} className="input" value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="flex flex-col sm:flex-row gap-4">
        <div>
          <span className="field-label">Priorità</span>
          <Segmented value={type} onChange={setType} options={TYPE_OPTIONS} />
        </div>
        {withTarget && (
          <div>
            <span className="field-label">Destinatari</span>
            <Segmented
              value={target}
              onChange={setTarget}
              options={(Object.keys(TARGET_LABELS) as TargetGroup[]).map((t) => ({ value: t, label: TARGET_LABELS[t] }))}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annulla
        </button>
        <SubmitButton loading={saving} icon={submitIcon}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
