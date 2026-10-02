import { Fragment, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { ConfirmDialog as NewConfirmDialog } from '../../ui/Dialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  footer?: ReactNode;
}

function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  footer,
}: ModalProps) {
  const sizes = {
    sm: 'max-w-[calc(100vw-2rem)] sm:max-w-md',
    md: 'max-w-[calc(100vw-2rem)] sm:max-w-lg',
    lg: 'max-w-[calc(100vw-2rem)] sm:max-w-2xl',
    xl: 'max-w-[calc(100vw-2rem)] sm:max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)] sm:max-w-7xl',
  };

  // Escape closes the dialog (Headless UI's own onClose is switched off below so that a click on
  // the page scrollbar does not close it; the overlay click is handled by hand)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Handle overlay click - only close if clicking directly on overlay, not scrollbar
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnOverlayClick) return;

    // Only close if clicking directly on the overlay div, not its children or scrollbar
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative"
        style={{ zIndex: 1050 }}
        onClose={() => {}} // Disable default onClose, we handle it manually
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-ink-deep/40 backdrop-blur-[2px]"
            style={{ zIndex: 1040 }}
          />
        </Transition.Child>

        {/* Modal Container */}
        <div
          className="fixed inset-0 overflow-y-auto"
          style={{ zIndex: 1050 }}
          onClick={handleOverlayClick}
        >
          <div className="flex min-h-full items-center justify-center p-4" onClick={handleOverlayClick}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  // Same look as the new kit's Dialog; no hover effects (a dialog holds data, it should not move)
                  'rt-app card-light w-full transform overflow-hidden rounded-feature',
                  'bg-paper border border-line',
                  'p-4 sm:p-6 text-start align-middle shadow-pop',
                  'relative',
                  sizes[size]
                )}
                style={{ zIndex: 1050 }}
              >
                {/* Content Container */}
                <div className="relative z-10">
                  {/* Header */}
                  {(title || showCloseButton) && (
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {title && (
                          <Dialog.Title
                            as="h3"
                            className="text-xl font-semibold"
                            style={{ color: '#0f1f33' }}
                          >
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description className="mt-1 text-sm" style={{ color: '#0f1f33' + 'CC' }}>
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                      {showCloseButton && (
                        <button
                          type="button"
                          className="ms-4 rounded-lg p-1.5 transition-colors"
                          style={{ color: '#0f1f33' + 'CC' }}
                          onClick={onClose}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0f1f33' + '10';
                            e.currentTarget.style.color = '#0f1f33';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#0f1f33' + 'CC';
                          }}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div style={{ color: '#0f1f33', position: 'relative', zIndex: 1, opacity: 1, visibility: 'visible' }}>{children}</div>

                  {/* Footer */}
                  {footer && (
                    <div className="mt-6 flex items-center justify-end gap-3">
                      {footer}
                    </div>
                  )}
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Confirmation Dialog Variant
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  primaryAction?: 'confirm' | 'cancel';
}

/** Old call style kept for the remaining older forms; it shows the new confirm card. */
function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmText, cancelText, variant = 'danger', isLoading }: ConfirmDialogProps) {
  const { t } = useTranslation('dashboardCommon');
  return (
    <NewConfirmDialog open={isOpen} onClose={onClose} onConfirm={onConfirm} title={title} message={description} tone={variant === 'danger' ? 'danger' : 'default'} loading={isLoading}
      confirmLabel={confirmText ?? t('confirmYes')} cancelLabel={cancelText ?? t('cto.cancel')} />
  );
}

export { Modal, ConfirmDialog };
export default Modal;
