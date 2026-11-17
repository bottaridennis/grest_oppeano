import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Euro,
  Heart,
  MapPin,
  Megaphone,
  Plus,
  Sun,
  Bus,
  Users,
  CheckCircle2,
  Hourglass,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { GREST_YEAR, WEEK_DAYS_ORDERED } from '../constants';
import type { GrestData } from '../hooks/useGrestData';
import type { Navigate } from '../hooks/useHashRoute';
import type { Survey, UserProfile } from '../types';
import { cn, formatDate, localISODate, parseISODate, relativeTime, todayWeekDay } from '../lib/utils';
import { answerSurvey } from '../lib/actions';
import { EmptyState, SectionTitle, Segmented, StatusBadge, typeAccent, TypeBadge } from '../components/ui';
import { useToast } from '../components/feedback';

interface Props {
  user: User | null;
  profile: UserProfile | null;
  data: GrestData;
  navigate: Navigate;
}

export default function Home({ user, profile, data, navigate }: Props) {
  const today = localISODate();
  const weekDay = todayWeekDay();
  const todaySchedule = data.schedule.filter((s) => s.day === weekDay).sort((a, b) => a.time.localeCompare(b.time));
  const upcomingEvents = data.events.filter((e) => e.date >= today);
  const nextEvent = upcomingEvents[0];
  const activeSurveys = data.surveys.filter((s) => s.active);

  return (
    <div className="space-y-14 sm:space-y-20">
      <Hero
        isLogged={!!user}
        navigate={navigate}
        todaySchedule={todaySchedule.slice(0, 4)}
        weekDay={weekDay}
        nextEvent={nextEvent ? { title: nextEvent.title, date: nextEvent.date, location: nextEvent.location } : undefined}
      />

      {user && profile?.role === 'parent' && <FamilyStrip data={data} navigate={navigate} />}

      {data.announcements.length > 0 && <Announcements data={data} />}

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-12 items-start">
        <section id="gite">
          <SectionTitle
            title="Gite e sondaggi"
            icon={<Bus className="w-5 h-5 text-brand" />}
            action={<span className="badge badge-neutral">{activeSurveys.length} attivi</span>}
          />
          <div className="space-y-4">
            {activeSurveys.map((s) => (
              <SurveyCard key={s.id} survey={s} user={user} data={data} navigate={navigate} />
            ))}
            {activeSurveys.length === 0 && (
              <EmptyState
                icon={<Bus className="w-6 h-6" />}
                title="Nessuna gita in programma"
                description="Quando verranno organizzate nuove uscite le troverai qui."
              />
            )}
          </div>
        </section>

        <aside className="space-y-10">
          <section id="eventi">
            <SectionTitle title="Prossimi eventi" icon={<CalendarDays className="w-5 h-5 text-brand" />} />
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map((e) => {
                const d = parseISODate(e.date);
                return (
                  <article key={e.id} className="card p-4 flex gap-4">
                    <div className="w-14 shrink-0 rounded-xl bg-brand-soft text-brand-strong text-center py-2">
                      <p className="text-[10px] font-bold uppercase">{d?.toLocaleDateString('it-IT', { month: 'short' })}</p>
                      <p className="font-display text-2xl font-extrabold leading-none">{d?.getDate()}</p>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug">{e.title}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted">
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
                      {e.description && <p className="text-sm text-ink-soft mt-2 line-clamp-3">{e.description}</p>}
                    </div>
                  </article>
                );
              })}
              {upcomingEvents.length === 0 && (
                <EmptyState icon={<CalendarDays className="w-6 h-6" />} title="Nessun evento in arrivo" />
              )}
            </div>
          </section>

          <WeeklySchedule data={data} />
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Hero({
  isLogged,
  navigate,
  todaySchedule,
  weekDay,
  nextEvent,
}: {
  isLogged: boolean;
  navigate: Navigate;
  todaySchedule: GrestData['schedule'];
  weekDay: string;
  nextEvent?: { title: string; date: string; location?: string };
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-ink text-white">
      {/* decorazioni */}
      <div aria-hidden className="absolute -top-20 -right-20 w-44 h-44 sm:-top-24 sm:-right-24 sm:w-80 sm:h-80 rounded-full bg-brand/90" />
      <div aria-hidden className="hidden lg:block absolute top-40 -right-10 w-40 h-40 rounded-full bg-sun" />
      <div aria-hidden className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-sky/30 blur-3xl" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}
      />

      <div className="relative grid lg:grid-cols-[1.25fr_1fr] gap-10 p-6 sm:p-10 lg:p-14">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <Sun className="w-4 h-4 text-sun" /> Estate {GREST_YEAR} · Oppeano
          </span>
          <h1 className="text-white text-[2.6rem] leading-[1] sm:text-6xl lg:text-7xl font-extrabold mt-6">
            Un'estate da
            <br />
            vivere <span className="text-sun">insieme</span>.
          </h1>
          <p className="text-white/75 text-lg mt-5 max-w-lg">
            Gioco, amicizia e crescita nel cuore della nostra parrocchia. Iscrizioni, gite, programma e avvisi: tutto in un unico posto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('iscrizioni')}>
              {isLogged ? 'Iscrivi un bambino' : 'Iscrivi tuo figlio'} <ArrowRight className="w-5 h-5" />
            </button>
            <button
              className="btn btn-lg bg-white/10 text-white border border-white/15 hover:bg-white/15"
              onClick={() => document.getElementById('programma')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Vedi il programma
            </button>
          </div>
        </div>

        <div className="relative self-center">
          <div className="rounded-3xl bg-white text-ink p-5 sm:p-6 shadow-lift rotate-[-1.5deg]">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Oggi · {weekDay}</p>
              <span className="badge badge-brand">Live</span>
            </div>
            <ul className="mt-4 space-y-3">
              {todaySchedule.map((s) => (
                <li key={s.id} className="flex gap-3 items-start">
                  <span className="font-display font-bold text-sm text-brand tabular-nums w-12 shrink-0 pt-0.5">{s.time}</span>
                  <span className="font-medium leading-snug">{s.activity}</span>
                </li>
              ))}
              {todaySchedule.length === 0 && <li className="text-sm text-muted">Nessuna attività in programma oggi.</li>}
            </ul>
            {nextEvent && (
              <div className="mt-5 pt-4 border-t border-line flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sun-soft text-[#9A6A00] flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted">Prossimo evento · {formatDate(nextEvent.date, { day: 'numeric', month: 'long' })}</p>
                  <p className="font-semibold truncate">{nextEvent.title}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function FamilyStrip({ data, navigate }: { data: GrestData; navigate: Navigate }) {
  const regs = data.myRegistrations;
  return (
    <section>
      <SectionTitle
        title="La tua famiglia"
        icon={<Heart className="w-5 h-5 text-brand" />}
        action={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('profilo')}>
            Gestisci <ArrowRight className="w-4 h-4" />
          </button>
        }
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {regs.map((r) => (
          <div key={r.id} className="card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {r.childName} {r.childSurname}
              </p>
              <p className="text-xs text-muted mt-0.5">{r.paidGrestFee ? 'Quota versata' : 'Quota da versare'}</p>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
        <button
          onClick={() => navigate('iscrizioni')}
          className="rounded-2xl border-2 border-dashed border-line-strong p-4 flex items-center gap-3 text-ink-soft hover:border-brand hover:text-brand transition"
        >
          <span className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </span>
          <span className="font-semibold">Nuova iscrizione</span>
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Announcements({ data }: { data: GrestData }) {
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? data.announcements : data.announcements.slice(0, 3);
  return (
    <section>
      <SectionTitle
        title="Comunicazioni"
        icon={<Megaphone className="w-5 h-5 text-brand" />}
        action={
          data.announcements.length > 3 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Mostra meno' : `Vedi tutte (${data.announcements.length})`}
            </button>
          )
        }
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((a) => (
          <article key={a.id} className="card relative overflow-hidden p-5 pl-6">
            <span className={cn('absolute left-0 top-0 bottom-0 w-1.5', typeAccent(a.type))} />
            <div className="flex items-center justify-between gap-2">
              <TypeBadge type={a.type} />
              <span className="text-xs text-muted">{relativeTime(a.createdAt)}</span>
            </div>
            <h3 className="font-bold text-lg mt-3 leading-snug">{a.title}</h3>
            <p className="text-sm text-ink-soft mt-1.5 whitespace-pre-line">{a.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function WeeklySchedule({ data }: { data: GrestData }) {
  const [day, setDay] = useState(todayWeekDay());
  const days = useMemo(() => {
    const withItems = new Set(data.schedule.map((s) => s.day));
    const list = WEEK_DAYS_ORDERED.filter((d) => withItems.has(d) || d === todayWeekDay());
    return list.length ? list : WEEK_DAYS_ORDERED.slice(0, 5);
  }, [data.schedule]);
  const items = data.schedule.filter((s) => s.day === day).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <section id="programma" className="scroll-mt-24">
      <SectionTitle title="Programma" icon={<Clock className="w-5 h-5 text-brand" />} />
      <Segmented
        className="mb-4 w-full"
        value={day}
        onChange={setDay}
        options={days.map((d) => ({ value: d, label: d.slice(0, 3) }))}
      />
      <div className="card divide-y divide-line">
        {items.map((s) => (
          <div key={s.id} className="p-4 flex gap-4">
            <span className="font-display font-bold text-brand tabular-nums w-12 shrink-0">{s.time}</span>
            <div className="min-w-0">
              <p className="font-semibold">{s.activity}</p>
              {s.description && <p className="text-sm text-muted mt-0.5">{s.description}</p>}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="p-6 text-sm text-muted text-center">Nessuna attività per {day.toLowerCase()}.</p>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function SurveyCard({ survey, user, data, navigate }: { survey: Survey; user: User | null; data: GrestData; navigate: Navigate }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const today = localISODate();
  const closed = !!survey.deadline && survey.deadline < today;
  const confirmed = data.myRegistrations.filter((r) => r.status === 'confirmed');

  const respond = async (registrationId: string, participating: boolean) => {
    if (!user) return;
    const existing = data.myResponses.find((r) => r.surveyId === survey.id && r.registrationId === registrationId);
    if (existing?.participating === participating) return;
    setBusy(registrationId);
    try {
      await answerSurvey(user.uid, existing, survey.id, registrationId, participating);
      toast.success(participating ? 'Partecipazione confermata' : 'Risposta registrata');
    } catch (e) {
      toast.error(e, 'Impossibile salvare la risposta.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="card overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-snug">{survey.title}</h3>
            {survey.date && <p className="text-sm text-muted mt-0.5">{formatDate(survey.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
          </div>
          {closed ? (
            <span className="badge badge-neutral">Iscrizioni chiuse</span>
          ) : survey.deadline ? (
            <span className="badge badge-warning">
              <Hourglass className="w-3 h-3" /> Entro il {formatDate(survey.deadline, { day: 'numeric', month: 'short' })}
            </span>
          ) : null}
        </div>
        {survey.description && <p className="text-ink-soft mt-3 whitespace-pre-line">{survey.description}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          {survey.cost != null && survey.cost > 0 && (
            <span className="chip">
              <Euro className="w-3.5 h-3.5" /> {survey.cost.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          )}
          {survey.departureTime && (
            <span className="chip">
              <Clock className="w-3.5 h-3.5" /> Partenza {survey.departureTime}
            </span>
          )}
          {survey.returnTime && (
            <span className="chip">
              <Clock className="w-3.5 h-3.5" /> Rientro {survey.returnTime}
            </span>
          )}
          {survey.minParticipants ? (
            <span className="chip">
              <Users className="w-3.5 h-3.5" /> Min. {survey.minParticipants} partecipanti
            </span>
          ) : null}
        </div>
      </div>

      <div className="bg-surface-2/60 border-t border-line p-4 sm:px-6">
        {!user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted">Accedi per indicare chi parteciperà.</p>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('accedi')}>
              Accedi
            </button>
          </div>
        ) : confirmed.length === 0 ? (
          <p className="text-sm text-muted">Potrai rispondere quando almeno un'iscrizione sarà confermata.</p>
        ) : (
          <ul className="space-y-2">
            {confirmed.map((reg) => {
              const response = data.myResponses.find((r) => r.surveyId === survey.id && r.registrationId === reg.id);
              return (
                <li key={reg.id} className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate flex items-center gap-2">
                    {reg.childName}
                    {response?.participating && response.paidTripFee && (
                      <span className="badge badge-success">
                        <CheckCircle2 className="w-3 h-3" /> Pagato
                      </span>
                    )}
                  </span>
                  <div className="flex gap-1.5 shrink-0" role="group" aria-label={`Partecipazione di ${reg.childName}`}>
                    <button
                      disabled={closed || busy === reg.id}
                      onClick={() => respond(reg.id, true)}
                      className={cn('btn btn-sm', response?.participating === true ? 'bg-leaf text-white' : 'btn-secondary')}
                      aria-pressed={response?.participating === true}
                    >
                      Partecipa
                    </button>
                    <button
                      disabled={closed || busy === reg.id}
                      onClick={() => respond(reg.id, false)}
                      className={cn('btn btn-sm', response?.participating === false ? 'bg-ink text-white' : 'btn-secondary')}
                      aria-pressed={response?.participating === false}
                    >
                      No
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
