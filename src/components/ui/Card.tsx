import type { ReactNode, HTMLAttributes } from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CardProps extends Omit<MotionProps, 'children'> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'premium';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  hover?: boolean; // Alias for hoverable
  animated?: boolean;
  className?: string;
}

/**
 * Premium Card Component with Glassmorphism and Animations
 * Enhanced for world-class UI/UX
 */
function Card({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  hover = false,
  animated = true,
  className,
  ...props
}: CardProps) {
  const isHoverable = hoverable || hover;

  const variants = {
    default: 'bg-gradient-to-br from-white via-white to-[#003300]/5 border border-[#003300]/20 shadow-lg',
    elevated: 'bg-gradient-to-br from-white via-white to-[#003300]/5 border border-[#003300]/20 shadow-lg hover:shadow-2xl',
    outlined: 'bg-transparent border-2 border-[#003300]/30',
    glass: 'backdrop-blur-xl bg-white/90 border border-[#003300]/20 shadow-[0_8px_32px_rgba(0,51,0,0.1)]',
    premium: 'backdrop-blur-xl bg-white/95 border border-[#003300]/20 shadow-[0_8px_32px_rgba(0,51,0,0.15),0_1px_0_rgba(0,51,0,0.05)_inset]',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = isHoverable
    ? 'cursor-pointer hover:shadow-2xl hover:border-[#003300]/40 hover:-translate-y-2 group relative overflow-hidden'
    : '';

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={
          isHoverable
            ? {
                scale: 1.02,
                transition: { type: 'spring', stiffness: 400, damping: 30 },
              }
            : undefined
        }
        className={cn(
          'card-light rounded-xl transition-all duration-300 relative',
          variants[variant],
          paddings[padding],
          hoverStyles,
          className
        )}
        {...props}
      >
        {isHoverable && (
          <>
            {/* Animated Background Gradient on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#003300]/10 via-[#cccc99]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl -z-10" />
            
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl -z-10" />
            
            {/* Corner Decoration */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#003300]/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </>
        )}
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-300 relative',
        variants[variant],
        paddings[padding],
        hoverStyles,
        className
      )}
      {...(props as HTMLAttributes<HTMLDivElement>)}
    >
      {isHoverable && (
        <>
          {/* Animated Background Gradient on Hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#003300]/10 via-[#cccc99]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl -z-10" />
          
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl -z-10" />
          
          {/* Corner Decoration */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#003300]/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Card Header
export interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

function CardHeader({
  title,
  description,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-4', className)}>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-[#003300]">{title}</h3>
        {description && (
          <p className="text-sm text-[#003300]/60 mt-1">{description}</p>
        )}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

// Card Body
export interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

function CardBody({ children, className }: CardBodyProps) {
  return <div className={cn('text-[#003300]', className)}>{children}</div>;
}

// Card Footer
export interface CardFooterProps {
  children: ReactNode;
  className?: string;
  divided?: boolean;
}

function CardFooter({
  children,
  className,
  divided = false,
}: CardFooterProps) {
  return (
    <div
      className={cn(
        'mt-4',
        divided && 'pt-4 border-t border-primary/10',
        className
      )}
    >
      {children}
    </div>
  );
}

// Stats Card variant with Premium Animations
export interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

function StatsCard({
  label,
  value,
  icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <div className={cn('group relative bg-gradient-to-br from-white via-white to-[#003300]/5 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out overflow-hidden cursor-pointer hover:-translate-y-2', className)}>
      {/* Animated Background Gradient on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#003300]/10 via-[#cccc99]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Content Container */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm mb-2 font-medium transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>
            {label}
          </p>
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-3xl font-bold group-hover:scale-105 transition-transform duration-300 inline-block"
            style={{ 
              background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {value}
          </motion.p>
          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-1 mt-2 text-sm font-medium"
              style={{ color: trend.isPositive ? '#10b981' : '#ef4444' }}
            >
              <motion.svg
                animate={{
                  y: trend.isPositive ? [0, -3, 0] : [0, 3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={cn('w-4 h-4', !trend.isPositive && 'rotate-180')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </motion.svg>
              {Math.abs(trend.value)}%
            </motion.div>
          )}
        </div>
        {icon && (
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex-shrink-0 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300"
            style={{ 
              background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
              color: '#ffffcc'
            }}
          >
            {icon}
          </motion.div>
        )}
      </div>

      {/* Animated Bottom Accent Line */}
      <div className="mt-4 h-1 bg-gradient-to-r from-transparent via-[#003300]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full transform scale-x-0 group-hover:scale-x-100 origin-center transition-transform duration-500" />

      {/* Corner Decoration */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#003300]/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}

// Image Card variant
export interface ImageCardProps {
  image: string;
  imageAlt: string;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
}

function ImageCard({
  image,
  imageAlt,
  title,
  description,
  footer,
  onClick,
  className,
}: ImageCardProps) {
  return (
    <Card
      padding="none"
      hoverable={!!onClick}
      onClick={onClick}
      className={className}
    >
      <div className="aspect-video w-full overflow-hidden rounded-t-xl">
        <img
          src={image}
          alt={imageAlt}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-[#003300] mb-1">{title}</h3>
        {description && <p className="text-sm text-[#003300]/60">{description}</p>}
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </Card>
  );
}

// Named exports
export { Card, Card as CardComponent, CardHeader, CardBody, CardFooter, StatsCard, ImageCard };
export default Card;
