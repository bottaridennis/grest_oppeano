import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, X } from 'lucide-react';
import { cn, initials } from '../lib/utils';
import { MESSAGE_TYPE_LABELS, STATUS_LABELS } from '../constants';
import type { MessageType, RegistrationStatus } from '../types';

/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className={cn(
              'relative w-full bg-surface shadow-lift rounded-t-3xl sm:rounded-3xl max-h-[92dvh] flex flex-col',
              size === 'sm' && 'sm:max-w-md',
              size === 'md' && 'sm:max-w-lg',
              size === 'lg' && 'sm:max-w-2xl',
            )}
          >
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                {description && <p className="text-sm text-muted mt-1">{description}</p>}
              </div>
              <button className="btn-icon -mr-2 -mt-1" onClick={onClose} aria-label="Chiudi">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 sm:px-6 pb-6 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1.5">{hint}</span>}
    </label>
  );
}

export function SubmitButton({
  loading,
  children,
  className,
  icon,
}: {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button type="submit" disabled={loading} className={cn('btn btn-primary', className)}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-[1.05]">{title}</h1>
        {description && <p className="text-muted mt-2 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ title, action, icon }: { title: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('text-center py-12 px-6 rounded-2xl border border-dashed border-line-strong bg-surface/60', className)}>
      <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-surface-2 text-muted flex items-center justify-center">{icon}</div>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('w-5 h-5 animate-spin text-brand', className)} />;
}

export function Avatar({ name, className, tone = 'brand' }: { name: string; className?: string; tone?: 'brand' | 'sky' | 'leaf' | 'sun' }) {
  const tones = {
    brand: 'bg-brand-soft text-brand-strong',
    sky: 'bg-sky-soft text-sky',
    leaf: 'bg-leaf-soft text-leaf',
    sun: 'bg-sun-soft text-[#9A6A00]',
  };
  return (
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0', tones[tone], className)}>
      {initials(name) || '?'}
    </div>
  );
}

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  const cls = status === 'confirmed' ? 'badge-success' : status === 'pending' ? 'badge-warning' : 'badge-danger';
  return (
    <span className={cn('badge', cls)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function TypeBadge({ type }: { type: MessageType }) {
  const cls = type === 'urgent' ? 'badge-danger' : type === 'warning' ? 'badge-warning' : 'badge-info';
  return <span className={cn('badge', cls)}>{MESSAGE_TYPE_LABELS[type] ?? type}</span>;
}

export function typeAccent(type: MessageType) {
  return type === 'urgent' ? 'bg-danger' : type === 'warning' ? 'bg-sun' : 'bg-sky';
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'brand',
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'brand' | 'sky' | 'leaf' | 'sun';
  hint?: string;
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    sky: 'bg-sky-soft text-sky',
    leaf: 'bg-leaf-soft text-leaf',
    sun: 'bg-sun-soft text-[#B07A00]',
  };
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', tones[tone])}>{icon}</div>
      </div>
      <p className="font-display text-3xl font-extrabold mt-3 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: NoInfer<T>) => void;
  options: Array<{ value: NoInfer<T>; label: React.ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex p-1 rounded-xl bg-surface-2 border border-line gap-1 overflow-x-auto no-scrollbar max-w-full', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-semibold transition whitespace-nowrap',
            value === o.value ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'leaf' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={cn('h-full rounded-full transition-all duration-700', tone === 'leaf' ? 'bg-leaf' : 'bg-brand')} style={{ width: `${pct}%` }} />
    </div>
  );
}
