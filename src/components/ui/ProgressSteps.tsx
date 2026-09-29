import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ProgressStepsProps {
  /**
   * Translation key for the main title
   * Example: "progressSteps.title"
   */
  titleKey: string;
  
  /**
   * Translation key for the steps array
   * Example: "progressSteps.steps"
   */
  stepsKey: string;
  
  /**
   * Current active step index (0-based)
   * Steps before and at this index will show checkmarks with dark green background
   * Steps after this index will show numbers with light yellow background
   */
  currentStep: number;
  
  /**
   * Optional custom className for the container
   */
  className?: string;
  
  /**
   * Optional namespace for translations (defaults to 'home')
   */
  namespace?: string;

  /**
   * Auto-activate steps on mount (defaults to false)
   * When true, steps will automatically activate one by one from 0 to currentStep
   */
  autoActivate?: boolean;

  /**
   * Delay between each step activation in milliseconds (defaults to 800)
   * Only used when autoActivate is true
   */
  activationDelay?: number;
}

/**
 * ProgressSteps Component
 * 
 * A professional, reusable Progress/Steps component with:
 * - RTL/LTR support
 * - Responsive design (Mobile, Tablet, Desktop)
 * - Animated progress line (only shows between completed steps)
 * - Step states: numbers before activation (#003300), checkmarks after (#ffffcc)
 * - Background colors: #ffffcc before activation, #003300 after
 * - Full translation support
 * 
 * @example
 * ```tsx
 * <ProgressSteps
 *   titleKey="progressSteps.title"
 *   stepsKey="progressSteps.steps"
 *   currentStep={2}
 * />
 * ```
 */
export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  titleKey,
  stepsKey,
  currentStep,
  className,
  namespace = 'home',
  autoActivate = false,
  activationDelay = 800,
}) => {
  const { t, i18n } = useTranslation(namespace);
  const isRTL = i18n.language === 'ar';

  // State for auto-activation
  const [activeStep, setActiveStep] = useState<number>(autoActivate ? -1 : currentStep);

  // Get translated title
  const title = t(titleKey);

  // Get translated steps array
  const steps = useMemo(() => {
    const stepsData = t(stepsKey, { returnObjects: true });
    return Array.isArray(stepsData) ? stepsData : [];
  }, [t, stepsKey]);

  // Auto-activation effect
  useEffect(() => {
    if (!autoActivate || steps.length === 0) {
      setActiveStep(currentStep);
      return;
    }

    // Start from -1 (no steps activated)
    setActiveStep(-1);

    // Calculate target step (use currentStep, but ensure it doesn't exceed steps length)
    const maxStep = steps.length - 1;
    const targetStep = currentStep >= 0 
      ? Math.min(currentStep, maxStep) 
      : maxStep;

    // Activate steps one by one
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex <= targetStep && stepIndex < steps.length) {
        setActiveStep(stepIndex);
        stepIndex++;
      } else {
        clearInterval(interval);
      }
    }, activationDelay);

    return () => clearInterval(interval);
  }, [autoActivate, currentStep, steps.length, activationDelay]);

  // Use activeStep for display (either from auto-activation or manual currentStep)
  const displayStep = autoActivate ? activeStep : currentStep;

  // Check if step is completed
  const isStepCompleted = (stepIndex: number): boolean => {
    return stepIndex < displayStep;
  };

  // Check if step is current
  const isStepCurrent = (stepIndex: number): boolean => {
    return stepIndex === displayStep;
  };

  // Check if segment (line between two steps) should be shown
  const isSegmentCompleted = (segmentIndex: number): boolean => {
    // A segment connects step[segmentIndex] to step[segmentIndex + 1]
    // Show line if BOTH steps are activated (completed or current)
    // Line appears when the next step (segmentIndex + 1) is activated
    // This means we've reached at least step[segmentIndex + 1]
    return displayStep >= 0 && segmentIndex + 1 <= displayStep;
  };

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full pt-4 px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {/* Responsive CSS Variables for Line Calculations */}
      <style>{`
        .progress-steps-container {
          --circle-radius: 1.75rem; /* w-14 = 3.5rem / 2 */
          --line-top: 1.75rem; /* center of w-14 circle */
        }
        /* Ensure lines appear for screens 570px and above */
        @media (min-width: 570px) {
          .progress-steps-container {
            --circle-radius: 1.75rem; /* w-14 = 3.5rem / 2 */
            --line-top: 1.75rem; /* center of w-14 circle */
          }
        }
        @media (min-width: 640px) {
          .progress-steps-container {
            --circle-radius: 2rem; /* w-16 = 4rem / 2 */
            --line-top: 2rem; /* center of w-16 circle */
          }
        }
        @media (min-width: 768px) {
          .progress-steps-container {
            --circle-radius: 2.5rem; /* w-20 = 5rem / 2 */
            --line-top: 2.5rem; /* center of w-20 circle */
          }
        }
        @media (min-width: 1024px) {
          .progress-steps-container {
            --circle-radius: 3rem; /* w-24 = 6rem / 2 */
            --line-top: 3rem; /* center of w-24 circle */
          }
        }
      `}</style>

      {/* Main Title */}
      <h2
        className={cn(
          'text-center text-xl xs:text-2xl md:text-3xl lg:text-4xl font-black mb-6 xs:mb-8 md:mb-12',
          '',
          'from-[#003300] to-[#006600]',
          'px-4',
          isRTL && 'font-arabic'
        )}
        style={{
          color: '#003300',
        }}
      >
        {title}
      </h2>

      {/* Steps Container */}
      <div className="relative max-w-6xl mx-auto progress-steps-container">
        {/* Steps - Horizontal layout for larger screens, Vertical for mobile */}
        <div
          className={cn(
            'relative flex items-start w-full',
            // Vertical on mobile, horizontal on desktop
            'flex-col sm:flex-row',
            'sm:items-start items-center',
          )}
          // dir="rtl" on the row makes flex-row go right→left on desktop
          // On mobile flex-col is unaffected by dir
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {steps.map((step: string, index: number) => {
            const isCompleted = isStepCompleted(index);
            const isCurrent = isStepCurrent(index);
            const stepNumber = String(index + 1).padStart(2, '0');
            // Show line if not the last step AND the segment is completed
            const shouldShowLine = index < steps.length - 1 && isSegmentCompleted(index);

            return (
              <React.Fragment key={index}>
                {/* Step Container */}
                <div
                  className={cn(
                    'relative z-20',
                    'transition-all duration-300',
                    'w-full sm:w-auto sm:flex-1',
                    // Allow vertical lines to extend beyond container
                    'sm:overflow-visible overflow-visible',
                    // Better spacing on mobile
                    'mb-4 sm:mb-0'
                  )}
                  style={{
                    minWidth: '60px',
                  }}
                >
                  {/* Step Circle - Centered horizontally */}
                  <div
                    className={cn(
                      'relative w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24',
                      'rounded-full flex items-center justify-center',
                      'transition-all duration-500 ease-out',
                      'shadow-lg z-20',
                      'mx-auto',
                      isCompleted || isCurrent
                        ? 'bg-[#003300] scale-100'
                        : 'bg-[#ffffcc] scale-100'
                    )}
                  >
                    {/* Checkmark or Number */}
                    {isCompleted || isCurrent ? (
                      <Check
                        className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12"
                        strokeWidth={3}
                        style={{ color: '#ffffcc' }}
                      />
                    ) : (
                      <span
                        className={cn(
                          'text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-black'
                        )}
                        style={{ color: '#003300' }}
                      >
                        {stepNumber}
                      </span>
                    )}
                  </div>

                  {/* Step Label - Centered on all screen sizes */}
                  <div
                    className={cn(
                      'mt-2 xs:mt-2.5 sm:mt-3 md:mt-4',
                      'text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold',
                      'transition-colors duration-300',
                      'text-[#003300]',
                      'leading-tight',
                      isRTL && 'font-arabic',
                      // Centered on all screen sizes
                      'text-center mx-auto',
                      // Max width: responsive for mobile
                      'max-w-[200px] xs:max-w-[220px] sm:max-w-[140px]',
                      'w-auto sm:w-full',
                      'px-2'
                    )}
                    style={{
                      wordBreak: 'break-word',
                    }}
                  >
                    {step}
                  </div>

                  {/* Vertical Line (for screens < 640px) - Positioned below label, connecting to next circle */}
                  {/* Always show lines on mobile for visual connection */}
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'absolute sm:hidden',
                        'z-10',
                        'pointer-events-none'
                      )}
                      style={{
                        // Position: centered horizontally
                        left: '50%',
                        transform: 'translateX(-50%)',
                        // Start from bottom edge of current circle
                        // Circle center = var(--line-top) = 1.75rem (base)
                        // Circle bottom = var(--line-top) + var(--circle-radius) = 1.75rem + 1.75rem = 3.5rem
                        top: `calc(var(--line-top) + var(--circle-radius))`,
                        // Height: from bottom of current circle to top of next circle
                        // = label margin (mt-2 = 0.5rem) + label height (approx 2.5-3rem for 2-line Arabic text) + next circle radius
                        // More accurate: mt-2 (0.5rem) + text height (2-3rem) + next circle top offset
                        // Next circle top = next circle center - radius = var(--line-top) - var(--circle-radius)
                        // But we're starting from current circle bottom, so:
                        // Distance = (label space) + (next circle center - next circle radius) - (current circle bottom)
                        // Simplified: label margin + label height + next circle radius
                        // Adjusted for mobile with better spacing
                        height: `calc(0.5rem + 3rem + var(--circle-radius))`,
                        width: '0.5rem',
                      }}
                    >
                      <div
                        className={cn(
                          'h-full bg-[#003300] transition-all duration-700 ease-out',
                          'w-0.5'
                        )}
                        style={{
                          // Ensure line touches both circle edges
                          height: '100%',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Horizontal Line (for screens >= 640px) */}
                {shouldShowLine && (
                  <div
                    className={cn(
                      'hidden sm:flex',
                      'relative flex-1',
                      'items-center',
                      'z-10'
                    )}
                    style={{
                      height: '0',
                      marginTop: 'var(--line-top)',
                      transform: 'translateY(-50%)',
                      marginLeft: 'calc(-1 * var(--circle-radius))',
                      marginRight: 'calc(-1 * var(--circle-radius))',
                      width: 'calc(100% + 2 * var(--circle-radius))',
                    }}
                  >
                    {/* Line - Only show if segment is completed */}
                    {shouldShowLine ? (
                      <div
                        className={cn(
                          'w-full bg-[#003300] transition-all duration-700 ease-out',
                          'h-0.5 sm:h-1'
                        )}
                      />
                    ) : (
                      <div className="w-full h-0.5 sm:h-1" />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
