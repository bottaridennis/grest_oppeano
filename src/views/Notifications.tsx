import { useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { Bell, CheckCheck } from 'lucide-react';
import type { GrestData } from '../hooks/useGrestData';
import { cn, formatDateTime, relativeTime } from '../lib/utils';
import { markNotificationsRead } from '../lib/actions';
import { EmptyState, PageHeader, typeAccent, TypeBadge } from '../components/ui';
import { useToast } from '../components/feedback';

export default function Notifications({ user, data }: { user: User; data: GrestData }) {
  const toast = useToast();
  const unreadIds = data.notifications.filter((n) => !data.readIds.has(n.id)).map((n) => n.id);
  // Le notifiche non lette al momento dell'apertura restano evidenziate durante la visita.
  const highlighted = useRef<Set<string> | null>(null);
  if (highlighted.current === null && data.notifications.length) highlighted.current = new Set(unreadIds);

  const markAll = async (silent = false) => {
    try {
      await markNotificationsRead(user.uid, unreadIds);
      if (!silent) toast.success('Tutte le notifiche sono state lette.');
    } catch (e) {
      if (!silent) toast.error(e);
    }
  };

  // Dopo qualche secondo sulla pagina, le notifiche vengono segnate come lette.
  useEffect(() => {
    if (!unreadIds.length) return;
    const t = setTimeout(() => markAll(true), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadIds.join(',')]);

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        eyebrow="Avvisi"
        title="Notifiche"
        description="Comunicazioni inviate dalla segreteria del Grest."
        actions={
          unreadIds.length > 0 && (
            <button className="btn btn-secondary" onClick={() => markAll()}>
              <CheckCheck className="w-4 h-4" /> Segna tutte come lette
            </button>
          )
        }
      />
      <div className="space-y-3">
        {data.notifications.map((n) => {
          const isNew = highlighted.current?.has(n.id) || !data.readIds.has(n.id);
          return (
            <article key={n.id} className={cn('card relative overflow-hidden p-5 pl-6', isNew && 'ring-2 ring-brand/20')}>
              <span className={cn('absolute left-0 top-0 bottom-0 w-1.5', typeAccent(n.type))} />
              <div className="flex items-center gap-2 flex-wrap">
                <TypeBadge type={n.type} />
                {isNew && <span className="badge badge-brand">Nuova</span>}
                <span className="text-xs text-muted ml-auto" title={formatDateTime(n.createdAt)}>
                  {relativeTime(n.createdAt)}
                </span>
              </div>
              <h3 className="font-bold text-lg mt-2">{n.title}</h3>
              <p className="text-ink-soft mt-1 whitespace-pre-line">{n.message}</p>
            </article>
          );
        })}
        {data.notifications.length === 0 && (
          <EmptyState icon={<Bell className="w-6 h-6" />} title="Nessuna notifica" description="Quando la segreteria invierà un avviso lo troverai qui." />
        )}
      </div>
    </div>
  );
}
