import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glow';
type Size = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shown before the label (after it in RTL, automatically). */
  icon?: ReactNode;
  loading?: boolean;
  /** A square button with only an icon; give it an aria-label. */
  iconOnly?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white border-ink hover:bg-ink-deep hover:border-ink-deep',
  secondary: 'bg-transparent text-ink border-ink hover:bg-ink hover:text-white',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-ink/5',
  danger: 'bg-danger text-white border-danger hover:brightness-95',
  glow: 'bg-glow text-ink-deep border-glow hover:bg-frost hover:border-frost',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 [&_svg]:size-4',
  md: 'h-11 px-5 text-sm gap-2 [&_svg]:size-[18px]',
};

/** The one button of the dashboard — pill shaped, like the public site. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading, iconOnly, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-pill border-[1.5px] font-medium leading-none',
        'transition-colors duration-150 focus-visible:focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant],
        sizes[size],
        iconOnly && (size === 'sm' ? 'w-9 px-0' : 'w-11 px-0'),
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : icon}
      {!iconOnly && children}
    </button>
  );
});
