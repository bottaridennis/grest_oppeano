import { ArrowRight, Bus, CheckCircle2, Clock, CreditCard, Users } from 'lucide-react';
import type { GrestData } from '../../hooks/useGrestData';
import { formatDate } from '../../lib/utils';
import { Avatar, ProgressBar, StatCard, StatusBadge } from '../../components/ui';

export default function Dashboard({ data, go }: { data: GrestData; go: (tab: string) => void }) {
  const regs = data.allRegistrations;
  const confirmed = regs.filter((r) => r.status === 'confirmed');
  const pending = regs.filter((r) => r.status === 'pending');
  const unpaid = confirmed.filter((r) => !r.paidGrestFee).length;
  const activeSurveys = data.surveys.filter((s) => s.active);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Confermate" value={confirmed.length} icon={<CheckCircle2 className="w-5 h-5" />} tone="leaf" />
        <StatCard label="Da verificare" value={pending.length} icon={<Clock className="w-5 h-5" />} tone="sun" />
        <StatCard label="Quote da incassare" value={unpaid} icon={<CreditCard className="w-5 h-5" />} tone="brand" hint="su iscrizioni confermate" />
        <StatCard label="Utenti registrati" value={data.allUsers.length} icon={<Users className="w-5 h-5" />} tone="sky" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Iscrizioni da verificare</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => go('iscrizioni')}>
              Tutte <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <ul className="divide-y divide-line">
            {pending.slice(0, 6).map((r) => (
              <li key={r.id} className="py-3 flex items-center gap-3">
                <Avatar name={`${r.childName} ${r.childSurname}`} tone="sun" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    {r.childName} {r.childSurname}
                  </p>
                  <p className="text-xs text-muted">Ricevuta il {formatDate(r.createdAt)}</p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
            {pending.length === 0 && <li className="py-6 text-sm text-muted text-center">Nessuna iscrizione in attesa. Ottimo lavoro!</li>}
          </ul>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Adesioni alle gite</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => go('gite')}>
              Gestisci <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-5">
            {activeSurveys.slice(0, 4).map((s) => {
              const yes = data.allResponses.filter((r) => r.surveyId === s.id && r.participating).length;
              const target = s.minParticipants || Math.max(confirmed.length, 1);
              return (
                <li key={s.id}>
                  <div className="flex justify-between text-sm mb-2 gap-3">
                    <span className="font-semibold truncate">{s.title}</span>
                    <span className="text-muted tabular-nums shrink-0">
                      <b className="text-ink">{yes}</b> / {target}
                      {s.minParticipants ? ' min.' : ''}
                    </span>
                  </div>
                  <ProgressBar value={yes} max={target} tone={s.minParticipants && yes >= s.minParticipants ? 'leaf' : 'brand'} />
                </li>
              );
            })}
            {activeSurveys.length === 0 && (
              <li className="py-6 text-sm text-muted text-center flex flex-col items-center gap-2">
                <Bus className="w-5 h-5" /> Nessuna gita attiva.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
