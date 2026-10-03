import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'glow';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-tint-sand text-ink-2',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  glow: 'bg-glow text-ink',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Small status / category label. */
export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex w-fit items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
