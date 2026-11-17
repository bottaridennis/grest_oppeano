import { lazy, Suspense, useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { Bell, ClipboardCheck, Home as HomeIcon, LogIn, LogOut, Settings, Sun, UserCircle, UserPlus } from 'lucide-react';
import { auth } from './firebase';
import { APP_NAME, APP_TAGLINE, GREST_YEAR, ROLE_LABELS } from './constants';
import type { LegalType } from './types';
import { useSession } from './hooks/useSession';
import { useGrestData } from './hooks/useGrestData';
import { useHashRoute, type Navigate } from './hooks/useHashRoute';
import { cn, displayName } from './lib/utils';
import { FeedbackProvider, useToast } from './components/feedback';
import { Avatar, Spinner } from './components/ui';
import { ChangePasswordModal, CompleteProfileModal } from './components/AccountModals';
import Home from './views/Home';
import Register from './views/Register';
import AuthPanel from './views/Auth';
import Profile from './views/Profile';
import Notifications from './views/Notifications';
import Legal from './views/Legal';
import StaffView from './views/staff/StaffView';
// Il pannello admin (con i grafici) viene caricato solo quando serve.
const AdminView = lazy(() => import('./views/admin/AdminView'));

const LEGAL_ROUTES: Record<string, LegalType> = { privacy: 'privacy', cookie: 'cookies', termini: 'terms' };

export default function App() {
  return (
    <FeedbackProvider>
      <Shell />
    </FeedbackProvider>
  );
}

function Shell() {
  const session = useSession();
  const data = useGrestData(session);
  const { segments, navigate } = useHashRoute();
  const toast = useToast();
  const { user, profile } = session;
  const [route = '', sub] = segments;

  const role = profile?.role;
  const isAdmin = role === 'admin';
  const isStaff = role === 'admin' || role === 'animator';

  useEffect(() => {
    if (session.error) toast.error(session.error, 'Impossibile caricare il profilo.');
  }, [session.error]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dopo l'accesso dalla pagina "accedi" si torna alla home.
  useEffect(() => {
    if (user && route === 'accedi') navigate('');
  }, [user, route, navigate]);

  if (session.loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <Logo />
        <Spinner />
      </div>
    );
  }

  const needsLogin = (el: React.ReactNode) => (user && profile ? el : <AuthGate navigate={navigate} />);

  let page: React.ReactNode;
  switch (route) {
    case '':
      page = <Home user={user} profile={profile} data={data} navigate={navigate} />;
      break;
    case 'iscrizioni':
      page = <Register user={user} data={data} navigate={navigate} />;
      break;
    case 'accedi':
      page = <AuthGate navigate={navigate} />;
      break;
    case 'notifiche':
      page = needsLogin(user && <Notifications user={user} data={data} />);
      break;
    case 'profilo':
      page = needsLogin(user && profile && <Profile user={user} profile={profile} data={data} navigate={navigate} />);
      break;
    case 'staff':
      page = needsLogin(isStaff ? <StaffView data={data} /> : <NotAllowed navigate={navigate} />);
      break;
    case 'admin':
      page = needsLogin(isAdmin && user ? <AdminView tab={sub} data={data} user={user} navigate={navigate} /> : <NotAllowed navigate={navigate} />);
      break;
    default:
      page = LEGAL_ROUTES[route] ? <Legal type={LEGAL_ROUTES[route]} legal={data.legal} /> : <NotFound navigate={navigate} />;
  }

  const needsProfile = !!profile && (!profile.firstName?.trim() || !profile.lastName?.trim());

  return (
    <div className="min-h-dvh flex flex-col">
      <Header route={route} navigate={navigate} unread={data.unreadCount} session={session} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-28 md:pb-16">
        <div key={route} className="animate-fade-up">
          <Suspense
            fallback={
              <div className="py-24 flex justify-center">
                <Spinner />
              </div>
            }
          >
            {page}
          </Suspense>
        </div>
      </main>

      <Footer navigate={navigate} />
      <MobileNav route={route} navigate={navigate} unread={data.unreadCount} isLogged={!!user} isStaff={isStaff} isAdmin={isAdmin} />

      {user && profile?.mustChangePassword && <ChangePasswordModal open user={user} forced onClose={() => {}} />}
      {profile && !profile.mustChangePassword && needsProfile && <CompleteProfileModal open profile={profile} />}
      <CookieNotice navigate={navigate} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 group" aria-label={`${APP_NAME} – home`}>
      <span className="w-10 h-10 rounded-2xl bg-brand text-white flex items-center justify-center shadow-[0_6px_16px_-6px_rgb(240_89_42/0.7)] group-hover:rotate-12 transition-transform">
        <Sun className="w-5 h-5" strokeWidth={2.5} />
      </span>
      <span className="text-left leading-none">
        <span className="block font-display font-extrabold text-lg tracking-tight">
          Grest <span className="text-brand">Oppeano</span>
        </span>
        <span className="block text-[11px] text-muted font-medium mt-1">{APP_TAGLINE}</span>
      </span>
    </button>
  );
}

function Header({
  route,
  navigate,
  unread,
  session,
}: {
  route: string;
  navigate: Navigate;
  unread: number;
  session: ReturnType<typeof useSession>;
}) {
  const { user, profile } = session;
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = profile?.role === 'admin';
  const isStaff = isAdmin || profile?.role === 'animator';

  const links = [
    { id: '', label: 'Home' },
    { id: 'iscrizioni', label: 'Iscrizioni' },
    ...(user ? [{ id: 'notifiche', label: 'Notifiche', badge: unread }] : []),
    ...(isStaff ? [{ id: 'staff', label: 'Animatori' }] : []),
    ...(isAdmin ? [{ id: 'admin', label: 'Amministrazione' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-line/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-6">
        <Logo onClick={() => navigate('')} />

        <nav className="hidden md:flex items-center gap-1" aria-label="Navigazione principale">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => navigate(l.id)}
              className={cn(
                'relative px-3.5 py-2 rounded-xl text-sm font-semibold transition',
                route === l.id ? 'text-ink bg-surface-2' : 'text-muted hover:text-ink',
              )}
            >
              {l.label}
              {'badge' in l && !!l.badge && (
                <span className="ml-1.5 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-brand text-white text-[11px] tabular-nums">
                  {l.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && profile ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-2xl pl-1 pr-1 sm:pr-3 py-1 hover:bg-surface-2 transition"
                aria-expanded={menuOpen}
                aria-label="Menu utente"
              >
                <Avatar name={displayName(profile)} className="w-9 h-9" />
                <span className="hidden sm:block text-left leading-tight">
                  <span className="block text-sm font-semibold max-w-36 truncate">{profile.firstName || displayName(profile)}</span>
                  <span className="block text-[11px] text-muted">{ROLE_LABELS[profile.role]}</span>
                </span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-60 card p-1.5 shadow-lift animate-fade-up">
                    <div className="px-3 py-2.5 border-b border-line mb-1">
                      <p className="font-semibold text-sm truncate">{displayName(profile)}</p>
                      <p className="text-xs text-muted truncate">{user.email}</p>
                    </div>
                    {[
                      { id: 'profilo', label: 'Il mio profilo', icon: UserCircle },
                      { id: 'notifiche', label: 'Notifiche', icon: Bell },
                      ...(isStaff ? [{ id: 'staff', label: 'Area animatori', icon: ClipboardCheck }] : []),
                      ...(isAdmin ? [{ id: 'admin', label: 'Amministrazione', icon: Settings }] : []),
                    ].map((i) => (
                      <button
                        key={i.id}
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(i.id);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-surface-2"
                      >
                        <i.icon className="w-4 h-4 text-muted" /> {i.label}
                      </button>
                    ))}
                    <button
                      onClick={async () => {
                        setMenuOpen(false);
                        await signOut(auth);
                        navigate('');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-danger-soft text-danger"
                    >
                      <LogOut className="w-4 h-4" /> Esci
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <button className="btn btn-ghost hidden sm:inline-flex" onClick={() => navigate('accedi')}>
                Accedi
              </button>
              <button className="btn btn-primary" onClick={() => navigate('iscrizioni')}>
                <span className="sm:hidden">Accedi</span>
                <span className="hidden sm:inline">Iscriviti</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileNav({
  route,
  navigate,
  unread,
  isLogged,
  isStaff,
  isAdmin,
}: {
  route: string;
  navigate: Navigate;
  unread: number;
  isLogged: boolean;
  isStaff: boolean;
  isAdmin: boolean;
}) {
  const items = [
    { id: '', label: 'Home', icon: HomeIcon },
    { id: 'iscrizioni', label: 'Iscrizioni', icon: UserPlus },
    ...(isLogged ? [{ id: 'notifiche', label: 'Avvisi', icon: Bell, badge: unread }] : []),
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Settings }] : isStaff ? [{ id: 'staff', label: 'Animatori', icon: ClipboardCheck }] : []),
    isLogged ? { id: 'profilo', label: 'Profilo', icon: UserCircle } : { id: 'accedi', label: 'Accedi', icon: LogIn },
  ];
  return (
    <nav
      aria-label="Navigazione"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex">
        {items.map((i) => {
          const active = route === i.id;
          return (
            <button
              key={i.id}
              onClick={() => navigate(i.id)}
              className={cn('flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold transition', active ? 'text-brand' : 'text-muted')}
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative">
                <i.icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 2} />
                {'badge' in i && !!i.badge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-[10px] flex items-center justify-center">
                    {i.badge}
                  </span>
                )}
              </span>
              {i.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Footer({ navigate }: { navigate: Navigate }) {
  return (
    <footer className="border-t border-line bg-surface mb-[68px] md:mb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo onClick={() => navigate('')} />
          <p className="text-sm text-muted mt-4 max-w-sm">Un’esperienza di crescita, gioco e condivisione per i ragazzi della nostra parrocchia.</p>
        </div>
        <div>
          <p className="eyebrow mb-3">Informazioni</p>
          <ul className="space-y-2 text-sm">
            <li>
              <button className="text-ink-soft hover:text-brand" onClick={() => navigate('privacy')}>
                Privacy
              </button>
            </li>
            <li>
              <button className="text-ink-soft hover:text-brand" onClick={() => navigate('cookie')}>
                Cookie
              </button>
            </li>
            <li>
              <button className="text-ink-soft hover:text-brand" onClick={() => navigate('termini')}>
                Termini e condizioni
              </button>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Dove siamo</p>
          <address className="not-italic text-sm text-ink-soft leading-relaxed">
            Parrocchia di Oppeano
            <br />
            Via Roma, 1
            <br />
            37050 Oppeano (VR)
          </address>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 py-5 text-xs text-muted">
          © {GREST_YEAR} {APP_NAME} · {APP_TAGLINE}
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */

function AuthGate({ navigate }: { navigate: Navigate }) {
  return (
    <div className="py-6 sm:py-12">
      <AuthPanel />
      <p className="text-center text-sm text-muted mt-6">
        Vuoi solo dare un’occhiata?{' '}
        <button className="text-brand-strong font-semibold hover:underline" onClick={() => navigate('')}>
          Torna alla home
        </button>
      </p>
    </div>
  );
}

function NotAllowed({ navigate }: { navigate: Navigate }) {
  return (
    <div className="text-center py-20">
      <h1 className="text-3xl font-extrabold">Accesso riservato</h1>
      <p className="text-muted mt-2">Questa sezione è disponibile solo per lo staff del Grest.</p>
      <button className="btn btn-primary mt-6" onClick={() => navigate('')}>
        Torna alla home
      </button>
    </div>
  );
}

function NotFound({ navigate }: { navigate: Navigate }) {
  return (
    <div className="text-center py-20">
      <p className="font-display text-7xl font-extrabold text-brand">404</p>
      <h1 className="text-2xl font-bold mt-2">Pagina non trovata</h1>
      <button className="btn btn-primary mt-6" onClick={() => navigate('')}>
        Torna alla home
      </button>
    </div>
  );
}

function CookieNotice({ navigate }: { navigate: Navigate }) {
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem('cookie-consent');
    } catch {
      return false;
    }
  });
  if (!show) return null;
  const accept = () => {
    try {
      localStorage.setItem('cookie-consent', 'true');
    } catch {
      /* archiviazione non disponibile */
    }
    setShow(false);
  };
  return (
    <div className="fixed z-[150] bottom-20 md:bottom-6 inset-x-4 md:left-6 md:right-auto md:max-w-md card shadow-lift p-5 animate-fade-up">
      <p className="font-semibold">Solo cookie tecnici 🍪</p>
      <p className="text-sm text-muted mt-1">
        Usiamo esclusivamente cookie e archiviazione locale necessari all’accesso e al funzionamento del sito.{' '}
        <button className="text-brand-strong font-semibold hover:underline" onClick={() => navigate('cookie')}>
          Scopri di più
        </button>
      </p>
      <button className="btn btn-dark btn-sm mt-4" onClick={accept}>
        Ho capito
      </button>
    </div>
  );
}
