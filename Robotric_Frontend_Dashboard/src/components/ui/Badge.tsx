import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  onRemove?: () => void;
  icon?: ReactNode;
  className?: string;
}

function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  onRemove,
  icon,
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-ink border-gray-300',
    primary: 'bg-primary/10 text-primary border-primary/30',
    secondary: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    success: 'bg-green-100 text-green-700 border-green-300',
    error: 'bg-red-100 text-red-700 border-red-300',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    info: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border',
        'transition-colors',
        rounded ? 'rounded-full' : 'rounded-md',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 ml-1 hover:opacity-70 transition-opacity focus:outline-none"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// Dot Badge variant (status indicator)
export interface DotBadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  children?: ReactNode;
  pulse?: boolean;
  className?: string;
}

function DotBadge({
  variant = 'default',
  children,
  pulse = false,
  className,
}: DotBadgeProps) {
  const variants = {
    default: 'bg-gray-400',
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-cyan-500',
  };

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              variants[variant]
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full h-2 w-2',
            variants[variant]
          )}
        />
      </span>
      {children && <span className="text-sm text-ink">{children}</span>}
    </span>
  );
}

// Number Badge variant (notification counter)
export interface NumberBadgeProps {
  count: number;
  max?: number;
  variant?: 'primary' | 'error';
  className?: string;
}

function NumberBadge({
  count,
  max = 99,
  variant = 'error',
  className,
}: NumberBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  const variants = {
    primary: 'bg-primary text-frost',
    error: 'bg-red-500 text-white',
  };

  if (count === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[20px] h-5 px-1.5 rounded-full',
        'text-xs font-semibold',
        variants[variant],
        className
      )}
    >
      {displayCount}
    </span>
  );
}

export { Badge, DotBadge, NumberBadge };
export default Badge;
