import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { useTranslation } from 'react-i18next';

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'dots' | 'pulse';
  text?: string;
  message?: string; // alias for text
  className?: string;
  fullScreen?: boolean;
}

/**
 * Premium Loading State Component
 * Multiple loading animations with glassmorphism
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  text,
  message,
  className = '',
  fullScreen = false,
}) => {
  const { t, i18n } = useTranslation('dashboardCommon');
  const isRTL = i18n.language === 'ar';
  const displayText = text ?? message ?? t('loading');
  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : 'flex items-center justify-center py-20';

  if (type === 'skeleton') {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div className={`${containerClass} ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-primary rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          {displayText && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm transition-colors duration-300 ${isRTL ? 'font-arabic' : ''}`}
              style={{ color: '#003300' + 'CC' }}
            >
              {displayText}
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  if (type === 'pulse') {
    return (
      <div className={`${containerClass} ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            className="w-16 h-16 rounded-full bg-primary"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {displayText && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm transition-colors duration-300 ${isRTL ? 'font-arabic' : ''}`}
              style={{ color: '#003300' + 'CC' }}
            >
              {displayText}
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  // Default: spinner
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${containerClass} ${className}`}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {/* Outer ring */}
          <motion.div
            className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Inner ring */}
          <motion.div
            className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-secondary rounded-full"
            animate={{ rotate: -360 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Center glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary/50 rounded-full blur-md" />
          </div>
        </div>

        {displayText && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-sm font-medium transition-colors duration-300 ${isRTL ? 'font-arabic' : ''}`}
            style={{ color: '#003300' + 'CC' }}
          >
            {displayText}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Inline Loading Spinner (for buttons, etc.)
 */
export const InlineLoader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Loader2 className={`animate-spin ${className}`} />
  );
};

/**
 * Page Loading Overlay
 */
export const PageLoadingOverlay: React.FC<{ isLoading: boolean; text?: string }> = ({
  isLoading,
  text,
}) => {
  if (!isLoading) return null;

  return <LoadingState type="spinner" text={text} fullScreen />;
};

export default LoadingState;
