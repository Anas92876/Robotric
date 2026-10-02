import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';
/** What happened, which picks the animation. Worked out from the words when not given. */
export type ToastAction = 'saved' | 'created' | 'deleted' | 'sent' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
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
const DURATION: Record<ToastType, number> = { success: 2600, info: 4000, warning: 6000, error: 7000 };
const MAX_VISIBLE = 3;

// English and Arabic words that tell what a success message is about
const WORDS: [ToastAction, RegExp][] = [
  ['deleted', /delet|remov|cancel|archiv|discard|declin|reject|رُفض|رفض|حُذف|حذف|أُزيل|إزالة|أُلغي|ألغي|أُرشف|تجاهل/i],
  ['created', /creat|added|\badd\b|new |upload|publish|enroll|أُنشئ|أنشئ|أُضيف|أضيف|رُفع|نُشر|سُجّل|جديد/i],
  ['sent', /sent|send|invit|returned|أُرسل|أرسل|إرسال|أُعيد/i],
];
function actionOf(t: Omit<Toast, 'id'>): ToastAction {
  if (t.action) return t.action;
  if (t.type === 'error') return 'error';
  if (t.type === 'warning') return 'warning';
  if (t.type === 'info') return 'info';
  return WORDS.find(([, re]) => re.test(t.title))?.[0] ?? 'saved';
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    setToasts((prev) => {
      // The same message again (a double click, or the API layer and the page reporting one error) shows once
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

/** Notifications rise in the middle of the screen; the page behind stays usable. */
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  const { i18n } = useTranslation();
  return (
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="rt-app pointer-events-none fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 px-4">
      <MotionConfig reducedMotion="user">
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((t) => <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />)}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}

/** Colours of each action, from the dashboard palette (flat, no gradients). */
const LOOK: Record<ToastAction, { ring: string; fill: string; stroke: string; title: string }> = {
  saved: { ring: 'bg-success-soft', fill: 'bg-glow', stroke: '#0f1f33', title: 'text-ink' },
  created: { ring: 'bg-success-soft', fill: 'bg-ink', stroke: '#3fd360', title: 'text-ink' },
  deleted: { ring: 'bg-danger-soft', fill: 'bg-danger', stroke: '#ffffff', title: 'text-ink' },
  sent: { ring: 'bg-info-soft', fill: 'bg-info', stroke: '#ffffff', title: 'text-ink' },
  error: { ring: 'bg-danger-soft', fill: 'bg-danger', stroke: '#ffffff', title: 'text-danger' },
  warning: { ring: 'bg-warning-soft', fill: 'bg-warning', stroke: '#ffffff', title: 'text-ink' },
  info: { ring: 'bg-info-soft', fill: 'bg-ink', stroke: '#ffffff', title: 'text-ink' },
};

const draw = (delay: number, duration = 0.35) => ({ initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { pathLength: { delay, duration, ease: 'easeOut' as const }, opacity: { delay, duration: 0.01 } } });

/** The moving picture of what happened. */
function ActionIcon({ action }: { action: ToastAction }) {
  const look = LOOK[action];
  const svg = { width: 34, height: 34, viewBox: '0 0 24 24', fill: 'none', stroke: look.stroke, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <div className="relative grid size-20 place-items-center" aria-hidden>
      {/* soft halo that breathes out once */}
      <motion.span className={cn('absolute inset-0 rounded-full', look.ring)} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 1.15, 1], opacity: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} />
      {action === 'created' && [0, 1, 2, 3, 4, 5].map((i) => (
        <motion.span key={i} className="absolute size-1.5 rounded-full bg-glow"
          initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: Math.cos((i * Math.PI) / 3) * 44, y: Math.sin((i * Math.PI) / 3) * 44, opacity: [0, 1, 0] }} transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }} />
      ))}
      <motion.span className={cn('relative grid size-14 place-items-center rounded-full', look.fill)}
        initial={{ scale: 0 }} animate={action === 'error' ? { scale: 1, x: [0, -6, 6, -4, 4, 0] } : { scale: 1 }}
        transition={action === 'error' ? { scale: { type: 'spring', stiffness: 420, damping: 18 }, x: { delay: 0.3, duration: 0.45 } } : { type: 'spring', stiffness: 420, damping: 16, delay: 0.08 }}>
        {action === 'saved' && (
          <svg {...svg}><motion.path d="M5 12.5l4.5 4.5L19 7.5" {...draw(0.25, 0.4)} /></svg>
        )}
        {action === 'created' && (
          <motion.svg {...svg} initial={{ rotate: -120, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}>
            <path d="M12 5v14M5 12h14" />
          </motion.svg>
        )}
        {action === 'deleted' && (
          <motion.svg {...svg} animate={{ rotate: [0, -8, 8, -5, 0] }} transition={{ delay: 0.55, duration: 0.45 }}>
            <motion.g initial={{ y: 0, rotate: 0 }} animate={{ y: [0, -3, 0], rotate: [0, -18, 0] }} transition={{ delay: 0.2, duration: 0.5 }} style={{ originX: '4px', originY: '6px' }}>
              <path d="M4 6h16" /><path d="M9 6V4h6v2" />
            </motion.g>
            <path d="M6.5 6l1 13h9l1-13" /><motion.path d="M10 10v6M14 10v6" {...draw(0.35, 0.3)} />
          </motion.svg>
        )}
        {action === 'sent' && (
          <motion.svg {...svg} initial={{ x: -26, y: 18, opacity: 0, rotate: -20 }} animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 15, delay: 0.15 }}>
            <path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z" /><path d="M10 13l4.5-4.5" />
          </motion.svg>
        )}
        {action === 'error' && (
          <svg {...svg}><motion.path d="M7 7l10 10" {...draw(0.15, 0.25)} /><motion.path d="M17 7L7 17" {...draw(0.32, 0.25)} /></svg>
        )}
        {action === 'warning' && (
          <motion.svg {...svg} initial={{ y: -10, opacity: 0 }} animate={{ y: [-10, 3, 0], opacity: 1 }} transition={{ delay: 0.15, duration: 0.5 }}>
            <path d="M12 6v8" /><path d="M12 18.5v.01" strokeWidth={3.2} />
          </motion.svg>
        )}
        {action === 'info' && (
          <svg {...svg}><motion.path d="M12 11v6" {...draw(0.2, 0.25)} /><motion.path d="M12 7.5v.01" strokeWidth={3.2} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }} /></svg>
        )}
      </motion.span>
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { t } = useTranslation('dashboardCommon');
  const action = actionOf(toast);
  const look = LOOK[action];
  const total = toast.duration ?? DURATION[toast.type];
  const [paused, setPaused] = useState(false);
  const left = useRef(total);
  const started = useRef(Date.now());
  const close = useRef(onClose);
  close.current = onClose;

  // Counts down while visible; hovering or focusing the card pauses it
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
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -16, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', damping: 22, stiffness: 320 }}
      role={problem ? 'alert' : 'status'}
      aria-live={problem ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative w-full max-w-[340px] rounded-feature border border-line bg-paper px-6 pb-6 pt-7 text-center shadow-pop"
    >
      <button type="button" onClick={onClose} aria-label={t('toastClose')} className="absolute end-2.5 top-2.5 grid size-8 place-items-center rounded-full text-ink-4 hover:bg-ink/5 hover:text-ink focus-visible:focus-ring">
        <X className="size-4" />
      </button>
      <div className="flex justify-center"><ActionIcon action={action} /></div>
      <motion.p className={cn('mt-4 text-base font-semibold leading-snug', look.title)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {toast.title}
      </motion.p>
      {toast.description && (
        <motion.p className="mt-1.5 text-sm leading-snug text-ink-3" dir="auto" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          {toast.description}
        </motion.p>
      )}
    </motion.div>
  );
}

declare global {
  interface Window {
    __ROBOTRICK_TOAST__?: (toast: Omit<Toast, 'id'>) => void;
  }
}
