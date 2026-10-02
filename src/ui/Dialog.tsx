import type { ReactNode } from 'react';
import { Dialog as HDialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons at the bottom (end side). */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeLabel?: string;
}

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/** Accessible modal: traps focus, closes on Esc and backdrop click, restores focus after. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', closeLabel = 'Close' }: DialogProps) {
  return (
    <HDialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop transition className="fixed inset-0 bg-ink-deep/40 backdrop-blur-[2px] transition-opacity duration-150 data-[closed]:opacity-0" />
      <div className="fixed inset-0 flex items-end justify-center overflow-y-auto p-4 sm:items-center">
        <DialogPanel
          transition
          className={cn(
            'rt-app w-full rounded-feature bg-paper shadow-pop transition duration-150 data-[closed]:translate-y-2 data-[closed]:opacity-0',
            widths[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold text-ink">{title}</DialogTitle>
              {description && <Description className="mt-1 text-sm text-ink-3">{description}</Description>}
            </div>
            <button type="button" onClick={onClose} aria-label={closeLabel} className="-me-2 grid size-9 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-ink/5 hover:text-ink focus-visible:focus-ring">
              <X className="size-5" />
            </button>
          </div>
          {children && <div className="px-6 pt-4">{children}</div>}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
          {!footer && <div className="h-6" />}
        </DialogPanel>
      </div>
    </HDialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** 'danger' for destructive actions (red button and icon). */
  tone?: 'danger' | 'default';
  loading?: boolean;
}

/**
 * "Are you sure?" card for actions that need a second click (delete, publish, close…).
 * Danger actions get a red icon and button; everything else the navy question mark.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, cancelLabel, tone = 'default', loading }: ConfirmDialogProps) {
  const danger = tone === 'danger';
  const Icon = danger ? AlertTriangle : HelpCircle;
  return (
    <HDialog open={open} onClose={loading ? () => {} : onClose} className="relative z-50" role="alertdialog">
      <DialogBackdrop transition className="fixed inset-0 bg-ink-deep/45 backdrop-blur-[2px] transition-opacity duration-150 data-[closed]:opacity-0" />
      <div className="fixed inset-0 flex items-end justify-center overflow-y-auto p-4 sm:items-center">
        <DialogPanel transition className="rt-app w-full max-w-sm overflow-hidden rounded-feature bg-paper text-center shadow-pop transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0">
          <div className="px-6 pb-2 pt-6">
            <span className={cn('mx-auto grid size-14 place-items-center rounded-full ring-8', danger ? 'bg-danger-soft text-danger ring-danger-soft/50' : 'bg-frost text-ink ring-frost/50')}>
              <Icon className="size-7" aria-hidden />
            </span>
            <DialogTitle className="mt-4 text-lg font-semibold text-ink">{title}</DialogTitle>
            <Description as="div" className="mt-2 text-sm leading-relaxed text-ink-3">{message}</Description>
          </div>
          <div className="grid grid-cols-2 gap-2 px-6 pb-6 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={loading} className="w-full" data-autofocus={danger || undefined}>{cancelLabel}</Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} className="w-full" data-autofocus={!danger || undefined}>{confirmLabel}</Button>
          </div>
        </DialogPanel>
      </div>
    </HDialog>
  );
}
