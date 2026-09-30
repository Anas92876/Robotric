import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-primary text-frost hover:bg-ink-deep focus:ring-primary/50 shadow-md hover:shadow-lg',
      secondary:
        'bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-cyan-500/50 shadow-md hover:shadow-lg',
      outline:
        'border-2 border-primary/30 hover:border-primary bg-white hover:bg-primary/5 text-ink focus:ring-primary/50',
      ghost:
        'bg-transparent hover:bg-primary/5 text-ink focus:ring-primary/50',
      danger:
        'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/50 shadow-md hover:shadow-lg',
      success:
        'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500/50 shadow-md hover:shadow-lg',
    };

    const sizes = {
      xs: 'px-2.5 py-1.5 text-xs gap-1.5 min-h-[44px] sm:min-h-[28px]',
      sm: 'px-3 py-2 text-sm gap-2 min-h-[44px] sm:min-h-[32px]',
      md: 'px-4 py-2.5 text-base gap-2 min-h-[44px]',
      lg: 'px-5 py-3 text-lg gap-2.5 min-h-[48px]',
      xl: 'px-6 py-3.5 text-xl gap-3 min-h-[52px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;
