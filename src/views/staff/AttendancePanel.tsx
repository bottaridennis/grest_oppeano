import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Download, Search, UserCheck, UserX } from 'lucide-react';
import { db } from '../../firebase';
import { useCollection } from '../../hooks/useFirestore';
import type { Attendance, Registration } from '../../types';
import { addDays, cn, downloadCSV, formatDate, localISODate, matches, parseISODate } from '../../lib/utils';
import { setAttendance, setAttendanceBulk } from '../../lib/actions';
import { Avatar, EmptyState, ProgressBar } from '../../components/ui';
import { useToast } from '../../components/feedback';

/** Registro presenze giornaliero, condiviso tra admin e animatori. */
export default function AttendancePanel({ registrations }: { registrations: Registration[] }) {
  const toast = useToast();
  const [date, setDate] = useState(localISODate());
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  const { data: records, loading } = useCollection<Attendance>(`attendance:${date}`, () =>
    query(collection(db, 'attendance'), where('date', '==', date)),
  );

  const byReg = useMemo(() => {
    const map = new Map<string, Attendance>();
    for (const r of records) {
      const prev = map.get(r.registrationId);
      if (!prev || (r.recordedAt?.toMillis?.() ?? 0) > (prev.recordedAt?.toMillis?.() ?? 0)) map.set(r.registrationId, r);
    }
    return map;
  }, [records]);

  const kids = useMemo(
    () =>
      registrations
        .filter((r) => r.status === 'confirmed')
        .sort((a, b) => `${a.childSurname} ${a.childName}`.localeCompare(`${b.childSurname} ${b.childName}`, 'it')),
    [registrations],
  );
  const visible = kids.filter((k) => matches(search, k.childName, k.childSurname, `${k.childName} ${k.childSurname}`));
  const presentCount = kids.filter((k) => byReg.get(k.id)?.present).length;

  const shift = (days: number) => setDate(localISODate(addDays(parseISODate(date) ?? new Date(), days)));

  const toggle = async (reg: Registration, present: boolean) => {
    setPending(reg.id);
    try {
      await setAttendance(reg.id, date, present, byReg.get(reg.id));
    } catch (e) {
      toast.error(e, 'Impossibile salvare la presenza.');
    } finally {
      setPending(null);
    }
  };

  const markAll = async (present: boolean) => {
    const targets = visible.filter((k) => !!byReg.get(k.id)?.present !== present);
    if (!targets.length) return;
    try {
      await setAttendanceBulk(targets.map((k) => ({ registrationId: k.id, existing: byReg.get(k.id) })), date, present);
      toast.success(`${targets.length} ${present ? 'presenze' : 'assenze'} registrate.`);
    } catch (e) {
      toast.error(e);
    }
  };

  const exportCsv = () =>
    downloadCSV(
      `presenze-${date}.csv`,
      ['Cognome', 'Nome', 'Data', 'Presente', 'Allergie'],
      kids.map((k) => [k.childSurname, k.childName, date, !!byReg.get(k.id)?.present, (k.allergies ?? []).join(', ')]),
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button className="btn-icon border border-line bg-surface" onClick={() => shift(-1)} aria-label="Giorno precedente">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <label className="relative">
            <CalendarDays className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="input pl-9 w-44" />
          </label>
          <button className="btn-icon border border-line bg-surface" onClick={() => shift(1)} aria-label="Giorno successivo">
            <ChevronRight className="w-4 h-4" />
          </button>
          {date !== localISODate() && (
            <button className="btn btn-ghost btn-sm" onClick={() => setDate(localISODate())}>
              Oggi
            </button>
          )}
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input className="input pl-9" placeholder="Cerca bambino…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => markAll(true)} disabled={!visible.length}>
            <UserCheck className="w-4 h-4" /> Tutti presenti
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => markAll(false)} disabled={!visible.length}>
            <UserX className="w-4 h-4" /> Tutti assenti
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!kids.length} title="Esporta CSV">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="card p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold">{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="text-muted tabular-nums">
              <b className="text-ink">{presentCount}</b> / {kids.length} presenti
            </span>
          </div>
          <ProgressBar value={presentCount} max={kids.length} tone="leaf" />
        </div>
      </div>

      {kids.length === 0 ? (
        <EmptyState icon={<UserCheck className="w-6 h-6" />} title="Nessun iscritto confermato" description="Le presenze si registrano per le iscrizioni confermate." />
      ) : (
        <div className={cn('grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5', loading && 'opacity-60')}>
          {visible.map((k) => {
            const present = !!byReg.get(k.id)?.present;
            return (
              <button
                key={k.id}
                disabled={pending === k.id}
                onClick={() => toggle(k, !present)}
                aria-pressed={present}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-2xl border text-left transition',
                  present ? 'bg-leaf-soft border-leaf/40' : 'bg-surface border-line hover:border-line-strong',
                )}
              >
                <Avatar name={`${k.childName} ${k.childSurname}`} tone={present ? 'leaf' : 'sky'} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    {k.childName} {k.childSurname}
                  </p>
                  {!!k.allergies?.length && (
                    <p className="text-xs text-danger flex items-center gap-1 truncate">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {k.allergies.join(', ')}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition',
                    present ? 'bg-leaf text-white' : 'border-2 border-line-strong text-transparent',
                  )}
                >
                  <Check className="w-4 h-4" />
                </span>
              </button>
            );
          })}
          {visible.length === 0 && <p className="text-sm text-muted col-span-full">Nessun risultato per “{search}”.</p>}
        </div>
      )}
    </div>
  );
}
