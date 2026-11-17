import { useState } from 'react';
import { Archive, ArchiveRestore, Bus, CreditCard, Download, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { GrestData } from '../../hooks/useGrestData';
import type { Survey } from '../../types';
import { cn, downloadCSV, formatDate, localISODate } from '../../lib/utils';
import { deleteDocument, saveDocument, setTripPayment } from '../../lib/actions';
import { EmptyState, Field, Modal, ProgressBar, Segmented, SubmitButton } from '../../components/ui';
import { useConfirm, useToast } from '../../components/feedback';

export default function Surveys({ data }: { data: GrestData }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [editing, setEditing] = useState<Survey | 'new' | null>(null);

  const list = data.surveys.filter((s) => (view === 'active' ? s.active : !s.active));
  const regById = new Map(data.allRegistrations.map((r) => [r.id, r]));

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (s: Survey) => {
    const ok = await confirm({ title: 'Eliminare la gita?', message: <>“{s.title}” verrà eliminata. Le risposte dei genitori resteranno nell’archivio ma non saranno più visibili.</> });
    if (ok) run(() => deleteDocument('surveys', s.id), 'Gita eliminata.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'active', label: `Attive · ${data.surveys.filter((s) => s.active).length}` },
            { value: 'archived', label: `Archiviate · ${data.surveys.filter((s) => !s.active).length}` },
          ]}
        />
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <Plus className="w-4 h-4" /> Nuova gita / sondaggio
        </button>
      </div>

      {list.map((s) => {
        const responses = data.allResponses.filter((r) => r.surveyId === s.id);
        const yes = responses.filter((r) => r.participating);
        const no = responses.length - yes.length;
        const paid = yes.filter((r) => r.paidTripFee).length;
        const closed = !!s.deadline && s.deadline < localISODate();
        const exportCsv = () =>
          downloadCSV(
            `gita-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`,
            ['Cognome', 'Nome', 'Partecipa', 'Pagato'],
            responses.map((r) => {
              const reg = regById.get(r.registrationId);
              return [reg?.childSurname ?? '?', reg?.childName ?? '?', r.participating, !!r.paidTripFee];
            }),
          );

        return (
          <article key={s.id} className="card overflow-hidden">
            <div className="p-5 flex flex-col md:flex-row gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-xl">{s.title}</h3>
                  {closed && <span className="badge badge-neutral">Scaduta</span>}
                </div>
                <p className="text-sm text-muted mt-1">
                  {[
                    s.date && formatDate(s.date, { weekday: 'short', day: 'numeric', month: 'long' }),
                    s.deadline && `adesioni entro ${formatDate(s.deadline, { day: 'numeric', month: 'short' })}`,
                    s.cost ? `€ ${s.cost}` : null,
                    s.departureTime && `partenza ${s.departureTime}`,
                    s.returnTime && `rientro ${s.returnTime}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {s.description && <p className="text-sm text-ink-soft mt-2 line-clamp-2">{s.description}</p>}
                <div className="mt-4 max-w-md">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>
                      <b>{yes.length}</b> partecipanti{s.minParticipants ? ` su ${s.minParticipants} minimi` : ''}
                    </span>
                    <span className="text-muted">{no} non partecipano</span>
                  </div>
                  <ProgressBar value={yes.length} max={s.minParticipants || Math.max(yes.length, 1)} tone={s.minParticipants && yes.length >= s.minParticipants ? 'leaf' : 'brand'} />
                </div>
              </div>
              <div className="flex md:flex-col gap-2 md:items-end">
                <div className="text-right hidden md:block">
                  <p className="font-display text-4xl font-extrabold tabular-nums">{yes.length}</p>
                  <p className="text-xs text-muted">{paid} hanno pagato</p>
                </div>
                <div className="flex gap-1 ml-auto md:ml-0">
                  <button className="btn-icon" title="Modifica" onClick={() => setEditing(s)}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-icon"
                    title={s.active ? 'Archivia' : 'Riattiva'}
                    onClick={() => run(() => saveDocument('surveys', s.id, { active: !s.active }), s.active ? 'Gita archiviata.' : 'Gita riattivata.')}
                  >
                    {s.active ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                  </button>
                  <button className="btn-icon" title="Esporta CSV" onClick={exportCsv} disabled={!responses.length}>
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="btn-icon hover:text-danger" title="Elimina" onClick={() => remove(s)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {yes.length > 0 && (
              <div className="border-t border-line bg-surface-2/50 p-4 sm:px-5">
                <p className="eyebrow mb-3">Partecipanti</p>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {yes.map((r) => {
                    const reg = regById.get(r.registrationId);
                    return (
                      <li key={r.id} className="flex items-center justify-between gap-2 bg-surface rounded-xl border border-line px-3 py-2">
                        <span className="text-sm font-medium truncate">{reg ? `${reg.childName} ${reg.childSurname}` : 'Iscrizione rimossa'}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => run(() => setTripPayment(r.id, !r.paidTripFee))}
                            className={cn('badge cursor-pointer', r.paidTripFee ? 'badge-success' : 'badge-neutral')}
                            title="Cambia stato pagamento"
                          >
                            <CreditCard className="w-3 h-3" /> {r.paidTripFee ? 'Pagato' : 'Da pagare'}
                          </button>
                          <button
                            className="btn-icon w-7 h-7 hover:text-danger"
                            title="Rimuovi risposta"
                            onClick={async () => {
                              if (await confirm({ title: 'Rimuovere la risposta?', message: 'Il genitore potrà rispondere di nuovo.', confirmLabel: 'Rimuovi' }))
                                run(() => deleteDocument('surveyResponses', r.id), 'Risposta rimossa.');
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </article>
        );
      })}

      {list.length === 0 && (
        <EmptyState
          icon={<Bus className="w-6 h-6" />}
          title={view === 'active' ? 'Nessuna gita attiva' : 'Archivio vuoto'}
          description={view === 'active' ? 'Crea una gita o un sondaggio per raccogliere le adesioni dei genitori.' : undefined}
        />
      )}

      <SurveyModal survey={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function SurveyModal({ survey, onClose }: { survey: Survey | 'new' | null; onClose: () => void }) {
  const open = survey !== null;
  const initial = survey && survey !== 'new' ? survey : null;
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica gita' : 'Nuova gita / sondaggio'} size="lg">
      {open && <SurveyForm key={initial?.id ?? 'new'} initial={initial} onDone={onClose} />}
    </Modal>
  );
}

function SurveyForm({ initial, onDone }: { initial: Survey | null; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    date: initial?.date ?? '',
    deadline: initial?.deadline ?? '',
    cost: initial?.cost != null ? String(initial.cost) : '',
    minParticipants: initial?.minParticipants != null ? String(initial.minParticipants) : '',
    departureTime: initial?.departureTime ?? '',
    returnTime: initial?.returnTime ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveDocument('surveys', initial?.id ?? null, {
        title: f.title.trim(),
        description: f.description.trim(),
        date: f.date || null,
        deadline: f.deadline || null,
        cost: f.cost ? Number(f.cost) : null,
        minParticipants: f.minParticipants ? Number(f.minParticipants) : null,
        departureTime: f.departureTime,
        returnTime: f.returnTime,
        ...(initial ? {} : { active: true }),
      });
      toast.success(initial ? 'Gita aggiornata.' : 'Gita pubblicata.');
      onDone();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Titolo">
        <input required className="input" value={f.title} onChange={set('title')} placeholder="Es. Gita al parco acquatico" />
      </Field>
      <Field label="Descrizione">
        <textarea rows={4} className="input" value={f.description} onChange={set('description')} placeholder="Programma, cosa portare, punto di ritrovo…" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Data della gita">
          <input type="date" className="input" value={f.date} onChange={set('date')} />
        </Field>
        <Field label="Scadenza adesioni" hint="Dopo questa data i genitori non potranno più rispondere.">
          <input type="date" className="input" value={f.deadline} onChange={set('deadline')} />
        </Field>
        <Field label="Costo (€)">
          <input type="number" min={0} step="0.5" className="input" value={f.cost} onChange={set('cost')} placeholder="0" />
        </Field>
        <Field label="Partecipanti minimi">
          <input type="number" min={0} className="input" value={f.minParticipants} onChange={set('minParticipants')} />
        </Field>
        <Field label="Orario partenza">
          <input type="time" className="input" value={f.departureTime} onChange={set('departureTime')} />
        </Field>
        <Field label="Orario rientro">
          <input type="time" className="input" value={f.returnTime} onChange={set('returnTime')} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Annulla
        </button>
        <SubmitButton loading={saving}>{initial ? 'Salva' : 'Pubblica'}</SubmitButton>
      </div>
    </form>
  );
}
