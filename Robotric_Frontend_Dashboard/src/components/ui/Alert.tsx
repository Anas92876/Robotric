import type { ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  variant = 'info',
  title,
  children,
  icon,
  onClose,
  className,
}: AlertProps) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const DefaultIcon = icons[variant];
  const hasCustomIcon = icon !== undefined;

  const variants = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  };

  return (
    <div
      className={cn(
        'relative flex gap-3 p-4 rounded-lg border',
        variants[variant],
        className
      )}
    >
      {hasCustomIcon ? (
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
      ) : (
        <DefaultIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <h5 className="font-semibold mb-1">{title}</h5>
        )}
        <div className="text-sm opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-current hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Banner variant (full width, sticky/fixed)
export interface BannerProps extends Omit<AlertProps, 'className'> {
  position?: 'top' | 'bottom';
  sticky?: boolean;
  className?: string;
}

export function Banner({
  variant = 'info',
  title,
  children,
  icon,
  onClose,
  position = 'top',
  sticky = false,
  className,
}: BannerProps) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const DefaultIcon = icons[variant];
  const hasCustomIcon = icon !== undefined;

  const variants = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-cyan-500 text-white',
  };

  const positions = {
    top: sticky ? 'sticky top-0' : 'relative',
    bottom: sticky ? 'sticky bottom-0' : 'relative',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 px-4 py-3',
        'backdrop-blur-sm z-sticky',
        variants[variant],
        positions[position],
        className
      )}
    >
      {hasCustomIcon ? (
        <div className="flex-shrink-0">{icon}</div>
      ) : (
        <DefaultIcon className="w-5 h-5 flex-shrink-0" />
      )}
      <div className="flex-1 text-center">
        {title && <span className="font-semibold mr-2">{title}</span>}
        <span className="text-sm">{children}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Inline Alert (compact variant)
export interface InlineAlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  children: ReactNode;
  className?: string;
}

export function InlineAlert({
  variant = 'info',
  children,
  className,
}: InlineAlertProps) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = icons[variant];

  const variants = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-cyan-600',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 text-sm',
        variants[variant],
        className
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}
