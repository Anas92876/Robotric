import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/** How long each kind stays: problems stay longer so they can be read. */
const DURATION: Record<ToastType, number> = { success: 4000, info: 5000, warning: 7000, error: 8000 };
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    setToasts((prev) => {
      // The same message twice in a row (e.g. a double click) shows once
      // An error with the same message replaces the earlier one (the API layer and the page may both report it)
      const rest = prev.filter((t) => !(t.type === toast.type && (t.title === toast.title || (toast.type === 'error' && !!toast.description)) && t.description === toast.description));
      return [...rest, { ...toast, id: Math.random().toString(36).slice(2) }].slice(-MAX_VISIBLE);
    });
  }, []);

  const success = useCallback((title: string, description?: string) => addToast({ type: 'success', title, description }), [addToast]);
  const error = useCallback((title: string, description?: string) => addToast({ type: 'error', title, description }), [addToast]);
  const warning = useCallback((title: string, description?: string) => addToast({ type: 'warning', title, description }), [addToast]);
  const info = useCallback((title: string, description?: string) => addToast({ type: 'info', title, description }), [addToast]);

  // Global helper for code outside React (the API layer shows request errors with it)
  if (typeof window !== 'undefined') window.__ROBOTRICK_TOAST__ = addToast;

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  const { i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="rt-app pointer-events-none fixed inset-x-3 top-3 z-[9999] flex flex-col items-center gap-2.5 sm:inset-x-auto sm:end-5 sm:top-5 sm:w-[380px] sm:items-stretch"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => <ToastItem key={t.id} toast={t} rtl={rtl} onClose={() => removeToast(t.id)} />)}
      </AnimatePresence>
    </div>
  );
}

/** Colour, icon and words of each kind, in the dashboard palette (flat colours, no gradients). */
const KIND: Record<ToastType, { icon: typeof Info; bar: string; badge: string; title: string }> = {
  success: { icon: CheckCircle2, bar: 'bg-glow', badge: 'bg-success-soft text-success', title: 'text-ink' },
  error: { icon: XCircle, bar: 'bg-danger', badge: 'bg-danger-soft text-danger', title: 'text-danger' },
  warning: { icon: AlertTriangle, bar: 'bg-warning', badge: 'bg-warning-soft text-warning', title: 'text-ink' },
  info: { icon: Info, bar: 'bg-info', badge: 'bg-info-soft text-info', title: 'text-ink' },
};

function ToastItem({ toast, rtl, onClose }: { toast: Toast; rtl: boolean; onClose: () => void }) {
  const { t } = useTranslation('dashboardCommon');
  const k = KIND[toast.type];
  const Icon = k.icon;
  const total = toast.duration ?? DURATION[toast.type];
  const [paused, setPaused] = useState(false);
  const left = useRef(total);
  const started = useRef(Date.now());
  const close = useRef(onClose);
  close.current = onClose;

  // Counts down while visible; hovering or focusing the toast pauses it
  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const id = setTimeout(() => close.current(), left.current);
    return () => { clearTimeout(id); left.current -= Date.now() - started.current; };
  }, [paused]);

  const problem = toast.type === 'error' || toast.type === 'warning';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: rtl ? -40 : 40, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 340 }}
      role={problem ? 'alert' : 'status'}
      aria-live={problem ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative w-full max-w-[420px] overflow-hidden rounded-card border border-line bg-paper shadow-pop"
    >
      <span className={cn('absolute inset-y-0 start-0 w-1.5', k.bar)} aria-hidden />
      <div className="flex items-start gap-3 py-3.5 pe-3 ps-5">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', k.badge)}><Icon className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className={cn('text-sm font-semibold leading-snug', k.title)}>{toast.title}</p>
          {toast.description && <p className="mt-0.5 text-sm leading-snug text-ink-3" dir="auto">{toast.description}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label={t('toastClose')} className="-mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-ink-4 hover:bg-ink/5 hover:text-ink focus-visible:focus-ring">
          <X className="size-4" />
        </button>
      </div>
      <span
        aria-hidden
        className={cn('rt-toast-timer absolute bottom-0 start-0 h-0.5 w-full opacity-60', k.bar)}
        style={{ animationDuration: `${total}ms`, animationPlayState: paused ? 'paused' : 'running' }}
      />
    </motion.div>
  );
}

declare global {
  interface Window {
    __ROBOTRICK_TOAST__?: (toast: Omit<Toast, 'id'>) => void;
  }
}
