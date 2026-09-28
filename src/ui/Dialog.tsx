import type { ReactNode } from 'react';
import { Dialog as HDialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { AlertTriangle, X } from 'lucide-react';
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

/** "Are you sure?" dialog for actions that need a second click. */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, cancelLabel, tone = 'default', loading }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="size-5" />
          </div>
        )}
        <div className="text-sm leading-relaxed text-ink-2">{message}</div>
      </div>
    </Dialog>
  );
}
