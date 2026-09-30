import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
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
                  'card-light w-full transform overflow-hidden rounded-xl sm:rounded-2xl',
                  'bg-white',
                  'border border-ink/20',
                  'p-4 sm:p-6 text-left align-middle shadow-lg hover:shadow-2xl transition-all duration-500',
                  'relative group',
                  sizes[size]
                )}
                style={{ zIndex: 1050 }}
              >
                {/* Animated Background Gradient on Hover */}
                <div className="absolute inset-0 bg-ink/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl sm:rounded-2xl -z-10" />
                
                {/* Shimmer Effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-transparent rounded-xl sm:rounded-2xl -z-10" />
                
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
                          className="ml-4 rounded-lg p-1.5 transition-colors"
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

                {/* Corner Decoration */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-ink/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-glow/30 rounded-tr-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  primaryAction?: 'confirm' | 'cancel';
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  primaryAction = 'confirm',
}: ConfirmDialogProps) {


  const iconStyles = {
    danger: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-600',
    info: 'bg-cyan-100 text-cyan-600',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center p-2">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${iconStyles[variant]} mb-4`}>
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#0f1f33' }}>{title}</h3>
        <p className="text-sm mb-6" style={{ color: '#0f1f33' + 'CC' }}>{description}</p>
        <div className="flex gap-3 w-full">
           {/* Primary Button */}
           {primaryAction === 'confirm' ? (
             <button
               type="button"
               onClick={onConfirm}
               disabled={isLoading}
               className={cn(
                 'flex-1 px-4 py-2 rounded-lg text-white transition-all shadow-sm hover:shadow-md disabled:opacity-50 font-medium justify-center',
                 variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'
               )}
             >
               {isLoading ? 'Loading...' : confirmText}
             </button>
           ) : (
             <button
               type="button"
               onClick={onClose}
               disabled={isLoading}
               className="flex-1 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all shadow-sm hover:shadow-md disabled:opacity-50 font-medium justify-center"
             >
               {cancelText}
             </button>
           )}

           {/* Secondary Button */}
           {primaryAction === 'confirm' ? (
             <button
               type="button"
               onClick={onClose}
               disabled={isLoading}
               className="flex-1 px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 font-medium justify-center"
               style={{ 
                 borderColor: '#0f1f33' + '30',
                 color: '#0f1f33',
                 backgroundColor: 'transparent'
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.backgroundColor = '#0f1f33' + '10';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.backgroundColor = 'transparent';
               }}
             >
               {cancelText}
             </button>
           ) : (
             <button
               type="button"
               onClick={onConfirm}
               disabled={isLoading}
               className={cn(
                 'flex-1 px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 font-medium justify-center',
                 variant === 'danger' ? 'border-red-200 text-red-600 hover:bg-red-50' : ''
               )}
               style={variant !== 'danger' ? {
                 borderColor: '#0f1f33' + '30',
                 color: '#0f1f33',
                 backgroundColor: 'transparent'
               } : {}}
               onMouseEnter={(e) => {
                 if (variant !== 'danger') {
                   e.currentTarget.style.backgroundColor = '#0f1f33' + '10';
                 }
               }}
               onMouseLeave={(e) => {
                 if (variant !== 'danger') {
                   e.currentTarget.style.backgroundColor = 'transparent';
                 }
               }}
             >
               {isLoading ? 'Loading...' : confirmText}
             </button>
           )}
        </div>
      </div>
    </Modal>
  );
}

export { Modal, ConfirmDialog };
export default Modal;
