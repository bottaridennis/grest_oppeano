import type { User } from 'firebase/auth';
import { ClipboardCheck, FileSignature, PartyPopper, ShieldCheck } from 'lucide-react';
import type { GrestData } from '../hooks/useGrestData';
import type { Navigate } from '../hooks/useHashRoute';
import { createRegistration } from '../lib/actions';
import RegistrationForm from '../components/RegistrationForm';
import { PageHeader, StatusBadge } from '../components/ui';
import { useToast } from '../components/feedback';
import AuthPanel from './Auth';

const STEPS = [
  { icon: FileSignature, title: 'Compila il modulo', text: 'Dati del bambino, allergie e un numero di emergenza.' },
  { icon: ClipboardCheck, title: 'Verifica della segreteria', text: 'Controlliamo i dati e confermiamo l’iscrizione.' },
  { icon: PartyPopper, title: 'Si parte!', text: 'Riceverai avvisi, programma e potrai aderire alle gite.' },
];

export default function Register({ user, data, navigate }: { user: User | null; data: GrestData; navigate: Navigate }) {
  const toast = useToast();

  if (!user) {
    return (
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <PageHeader
            eyebrow="Iscrizioni aperte"
            title="Iscrivi tuo figlio al Grest"
            description="Crea un account o accedi: in pochi minuti potrai completare l’iscrizione e seguire tutte le attività."
          />
          <Steps />
        </div>
        <AuthPanel intro="Accedi o crea un account per procedere con l’iscrizione." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Nuova iscrizione"
        title="Iscrivi un bambino"
        description="Compila i dati: l’iscrizione verrà verificata dalla segreteria del Grest."
      />
      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="card p-5 sm:p-8">
          <RegistrationForm
            siblings={data.myRegistrations}
            submitLabel="Invia iscrizione"
            onSubmit={async (form) => {
              await createRegistration(user.uid, form);
              toast.success('Iscrizione inviata! Ti avviseremo alla conferma.');
              navigate('profilo');
            }}
          />
        </div>
        <aside className="space-y-6">
          <div className="card p-5">
            <p className="eyebrow mb-4">Come funziona</p>
            <Steps compact />
          </div>
          {data.myRegistrations.length > 0 && (
            <div className="card p-5">
              <p className="eyebrow mb-3">Le tue iscrizioni</p>
              <ul className="space-y-2.5">
                {data.myRegistrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <span className="font-medium truncate">
                      {r.childName} {r.childSurname}
                    </span>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted flex gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            I dati sanitari sono visibili solo alla segreteria e agli animatori, nel rispetto dell’informativa privacy.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Steps({ compact }: { compact?: boolean }) {
  return (
    <ol className={compact ? 'space-y-4' : 'space-y-5'}>
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
              <s.icon className="w-5 h-5" />
            </div>
            {i < STEPS.length - 1 && <span className="absolute left-1/2 top-11 h-[calc(100%-1.5rem)] w-px bg-line-strong" />}
          </div>
          <div className="pb-1">
            <p className="font-semibold">{s.title}</p>
            <p className="text-sm text-muted">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
