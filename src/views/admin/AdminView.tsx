import type { User } from 'firebase/auth';
import { type LucideIcon, Bell, BarChart3, Bus, CalendarDays, ClipboardCheck, Clock, LayoutDashboard, Megaphone, Scale, Users as UsersIcon, UserCog } from 'lucide-react';
import type { GrestData } from '../../hooks/useGrestData';
import type { Navigate } from '../../hooks/useHashRoute';
import { cn } from '../../lib/utils';
import Dashboard from './Dashboard';
import Statistics from './Statistics';
import Registrations from './Registrations';
import Surveys from './Surveys';
import Users from './Users';
import LegalEditor from './LegalEditor';
import { AnnouncementsAdmin, EventsAdmin, NotificationsAdmin, ScheduleAdmin } from './Content';
import AttendancePanel from '../staff/AttendancePanel';

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const SECTIONS: Array<{ group: string; items: Section[] }> = [
  {
    group: 'Generale',
    items: [
      { id: 'panoramica', label: 'Panoramica', icon: LayoutDashboard, description: 'Il Grest a colpo d’occhio.' },
      { id: 'statistiche', label: 'Statistiche', icon: BarChart3, description: 'Andamento di presenze, iscrizioni e adesioni.' },
    ],
  },
  {
    group: 'Partecipanti',
    items: [
      { id: 'iscrizioni', label: 'Iscrizioni', icon: UsersIcon, description: 'Verifica, conferma e gestisci le iscrizioni e le quote.' },
      { id: 'presenze', label: 'Presenze', icon: ClipboardCheck, description: 'Registro presenze giornaliero.' },
      { id: 'gite', label: 'Gite e sondaggi', icon: Bus, description: 'Crea gite, raccogli adesioni e pagamenti.' },
    ],
  },
  {
    group: 'Contenuti',
    items: [
      { id: 'programma', label: 'Programma', icon: Clock, description: 'Gli orari della settimana tipo.' },
      { id: 'eventi', label: 'Eventi', icon: CalendarDays, description: 'Feste, serate e appuntamenti speciali.' },
      { id: 'annunci', label: 'Annunci', icon: Megaphone, description: 'Comunicazioni pubbliche in home page.' },
      { id: 'notifiche', label: 'Notifiche', icon: Bell, description: 'Avvisi mirati a genitori o animatori.' },
    ],
  },
  {
    group: 'Sistema',
    items: [
      { id: 'utenti', label: 'Utenti', icon: UserCog, description: 'Account, ruoli e accessi.' },
      { id: 'legale', label: 'Pagine legali', icon: Scale, description: 'Privacy, cookie e termini.' },
    ],
  },
];

const ALL = SECTIONS.flatMap((s) => s.items);

export default function AdminView({ tab, data, user, navigate }: { tab?: string; data: GrestData; user: User; navigate: Navigate }) {
  const current = ALL.find((i) => i.id === tab) ?? ALL[0];
  const go = (id: string) => navigate(`admin/${id}`);
  const pending = data.allRegistrations.filter((r) => r.status === 'pending').length;

  return (
    <div className="lg:grid lg:grid-cols-[230px_1fr] gap-8">
      {/* Navigazione: barra laterale su desktop, scorrimento orizzontale su mobile */}
      <nav aria-label="Sezioni amministrazione" className="lg:sticky lg:top-24 lg:self-start mb-6 lg:mb-0">
        <div className="lg:hidden -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max">
            {ALL.map((i) => (
              <button key={i.id} onClick={() => go(i.id)} className={cn('chip whitespace-nowrap', current.id === i.id && 'chip-on')}>
                <i.icon className="w-3.5 h-3.5" /> {i.label}
                {i.id === 'iscrizioni' && pending > 0 && <span className="badge badge-warning ml-0.5">{pending}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="hidden lg:block space-y-5">
          {SECTIONS.map((s) => (
            <div key={s.group}>
              <p className="eyebrow px-3 mb-1.5">{s.group}</p>
              <ul className="space-y-0.5">
                {s.items.map((i) => (
                  <li key={i.id}>
                    <button
                      onClick={() => go(i.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition',
                        current.id === i.id ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-2',
                      )}
                    >
                      <i.icon className="w-4 h-4" /> {i.label}
                      {i.id === 'iscrizioni' && pending > 0 && (
                        <span className={cn('ml-auto badge', current.id === i.id ? 'bg-white/15 text-white' : 'badge-warning')}>{pending}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="min-w-0">
        <header className="mb-6">
          <p className="eyebrow mb-1.5">Amministrazione</p>
          <h1 className="text-3xl font-extrabold">{current.label}</h1>
          <p className="text-muted mt-1">{current.description}</p>
        </header>
        <div key={current.id} className="animate-fade-up">
          {current.id === 'panoramica' && <Dashboard data={data} go={go} />}
          {current.id === 'statistiche' && <Statistics data={data} />}
          {current.id === 'iscrizioni' && <Registrations data={data} />}
          {current.id === 'presenze' && <AttendancePanel registrations={data.allRegistrations} />}
          {current.id === 'gite' && <Surveys data={data} />}
          {current.id === 'programma' && <ScheduleAdmin data={data} />}
          {current.id === 'eventi' && <EventsAdmin data={data} />}
          {current.id === 'annunci' && <AnnouncementsAdmin data={data} />}
          {current.id === 'notifiche' && <NotificationsAdmin data={data} user={user} />}
          {current.id === 'utenti' && <Users data={data} me={user} />}
          {current.id === 'legale' && <LegalEditor data={data} />}
        </div>
      </div>
    </div>
  );
}
