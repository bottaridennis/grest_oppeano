import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Modal } from './ui';
import { errorMessage } from '../lib/utils';

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; message: string }

interface ToastApi {
  success: (message: string) => void;
  error: (errorOrMessage: unknown, fallback?: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve essere usato dentro <FeedbackProvider>');
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Confirm dialog                                                      */
/* ------------------------------------------------------------------ */

interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm deve essere usato dentro <FeedbackProvider>');
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);

  const api = useRef<ToastApi>({
    success: (m) => push('success', m),
    info: (m) => push('info', m),
    error: (e, fallback) => {
      console.error(e);
      push('error', typeof e === 'string' ? e : errorMessage(e, fallback));
    },
  }).current;

  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    [],
  );
  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={api}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <Modal open={!!confirmState} onClose={() => closeConfirm(false)} title={confirmState?.title ?? ''} size="sm">
          <div className="flex gap-4">
            <div
              className={`hidden sm:flex w-11 h-11 shrink-0 rounded-xl items-center justify-center ${
                confirmState?.tone === 'primary' ? 'bg-brand-soft text-brand' : 'bg-danger-soft text-danger'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-sm text-ink-soft leading-relaxed">{confirmState?.message}</div>
          </div>
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => closeConfirm(false)}>
              Annulla
            </button>
            <button
              autoFocus
              className={`btn ${confirmState?.tone === 'primary' ? 'btn-primary' : 'btn-danger'}`}
              onClick={() => closeConfirm(true)}
            >
              {confirmState?.confirmLabel ?? 'Elimina'}
            </button>
          </div>
        </Modal>

        <div
          aria-live="polite"
          className="fixed z-[300] bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 w-[calc(100%-2rem)] max-w-sm flex flex-col gap-2 pointer-events-none"
        >
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-ink text-white px-4 py-3 shadow-lift"
              >
                {t.kind === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-px" />}
                {t.kind === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-px" />}
                {t.kind === 'info' && <Info className="w-5 h-5 text-sky-300 shrink-0 mt-px" />}
                <p className="text-sm leading-snug flex-1">{t.message}</p>
                <button
                  aria-label="Chiudi"
                  onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
                  className="text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
