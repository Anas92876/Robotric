import React, { useMemo, useCallback } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StepperStep {
  id: number;
  label: string;
}

export interface StepperProps {
  /**
   * Array of step objects with id and label
   */
  steps: StepperStep[];
  
  /**
   * Current active step index (0-based)
   */
  currentStep: number;
  
  /**
   * Direction of the stepper (default: "ltr")
   */
  direction?: 'rtl' | 'ltr';
  
  /**
   * Optional custom className for the container
   */
  className?: string;
  
  /**
   * Optional variant for theming
   * - default: Primary green theme
   * - muted: Subtle grey theme
   */
  variant?: 'default' | 'muted';
  
  /**
   * Optional custom colors via CSS variables
   * Overrides default colors when provided
   */
  colors?: {
    primary?: string;
    completed?: string;
    active?: string;
    muted?: string;
  };
  
  /**
   * Optional onClick handler for step circles
   * If provided, steps become clickable
   */
  onStepClick?: (stepIndex: number) => void;
}

/**
 * Stepper Component
 * 
 * A production-ready, accessible progress stepper component with:
 * - Full RTL/LTR support
 * - Responsive design (horizontal on desktop, vertical on mobile)
 * - Premium UI with smooth animations
 * - Full keyboard navigation
 * - ARIA attributes for accessibility
 * - Customizable theming
 * 
 * @example
 * ```tsx
 * <Stepper
 *   steps={[
 *     { id: 1, label: "Step 1" },
 *     { id: 2, label: "Step 2" },
 *     { id: 3, label: "Step 3" }
 *   ]}
 *   currentStep={1}
 *   direction="ltr"
 * />
 * ```
 */
export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  direction = 'ltr',
  className,
  variant = 'default',
  colors,
  onStepClick,
}) => {
  const isRTL = direction === 'rtl';
  
  // Validation: Check for empty steps array
  const validatedSteps = useMemo(() => {
    if (!steps || steps.length === 0) {
      console.warn('Stepper: steps array is empty');
      return [];
    }
    
    // Check for duplicate IDs
    const ids = steps.map(s => s.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.warn('Stepper: duplicate step IDs detected');
    }
    
    return steps;
  }, [steps]);
  
  // Validation: Clamp currentStep to valid range
  const validatedCurrentStep = useMemo(() => {
    if (validatedSteps.length === 0) return 0;
    if (currentStep < 0) {
      console.warn(`Stepper: currentStep (${currentStep}) is negative, clamping to 0`);
      return 0;
    }
    if (currentStep >= validatedSteps.length) {
      console.warn(`Stepper: currentStep (${currentStep}) exceeds steps length, clamping to ${validatedSteps.length - 1}`);
      return validatedSteps.length - 1;
    }
    return currentStep;
  }, [currentStep, validatedSteps.length]);
  
  // Early return for empty steps
  if (validatedSteps.length === 0) {
    return null;
  }
  
  // Color theme configuration
  const themeColors = useMemo(() => ({
    default: {
      primary: colors?.primary || '#003300',
      completed: colors?.completed || '#003300',
      active: colors?.active || '#003300',
      muted: colors?.muted || '#e5e7eb',
      text: '#ffffff',
      textMuted: '#6b7280',
    },
    muted: {
      primary: colors?.primary || '#6b7280',
      completed: colors?.completed || '#10b981',
      active: colors?.active || '#3b82f6',
      muted: colors?.muted || '#e5e7eb',
      text: '#ffffff',
      textMuted: '#6b7280',
    },
  }), [colors]);
  
  const colorsConfig = themeColors[variant];
  
  /**
   * Determine step state
   */
  const getStepState = useCallback((stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (stepIndex < validatedCurrentStep) return 'completed';
    if (stepIndex === validatedCurrentStep) return 'current';
    return 'upcoming';
  }, [validatedCurrentStep]);
  
  /**
   * Check if a connecting line should be shown
   */
  const shouldShowLine = useCallback((stepIndex: number): boolean => {
    // Show line if the next step is completed or current
    return stepIndex < validatedSteps.length - 1 && stepIndex < validatedCurrentStep;
  }, [validatedSteps.length, validatedCurrentStep]);
  
  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent, stepIndex: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onStepClick && stepIndex <= validatedCurrentStep) {
        onStepClick(stepIndex);
      }
    }
  }, [onStepClick, validatedCurrentStep]);
  
  /**
   * Handle step click
   */
  const handleStepClick = useCallback((stepIndex: number) => {
    if (onStepClick && stepIndex <= validatedCurrentStep) {
      onStepClick(stepIndex);
    }
  }, [onStepClick, validatedCurrentStep]);
  
  // CSS Variables for responsive circle sizes and line positioning
  const circleSizes = {
    base: { size: '3rem', radius: '1.5rem' }, // w-12 h-12
    sm: { size: '3.5rem', radius: '1.75rem' }, // w-14 h-14
    md: { size: '4rem', radius: '2rem' }, // w-16 h-16
  };
  
  return (
    <div
      className={cn(
        'w-full',
        className
      )}
      dir={direction}
      role="navigation"
      aria-label="Progress steps"
    >
      {/* CSS Variables for responsive line positioning */}
      <style>{`
        .stepper-container {
          --circle-size-base: ${circleSizes.base.size};
          --circle-radius-base: ${circleSizes.base.radius};
          --circle-size-sm: ${circleSizes.sm.size};
          --circle-radius-sm: ${circleSizes.sm.radius};
          --circle-size-md: ${circleSizes.md.size};
          --circle-radius-md: ${circleSizes.md.radius};
        }
        @media (min-width: 640px) {
          .stepper-container {
            --circle-size: var(--circle-size-sm);
            --circle-radius: var(--circle-radius-sm);
          }
        }
        @media (min-width: 768px) {
          .stepper-container {
            --circle-size: var(--circle-size-md);
            --circle-radius: var(--circle-radius-md);
          }
        }
      `}</style>
      
      <div
        className={cn(
          'relative flex w-full stepper-container',
          // Vertical layout on mobile, horizontal on desktop
          'flex-col sm:flex-row',
          // RTL support: reverse flex direction
          isRTL && 'sm:flex-row-reverse',
          // Alignment
          'items-start sm:items-center',
          'gap-4 sm:gap-2'
        )}
        dir={direction}
      >
        {validatedSteps.map((step, index) => {
          const state = getStepState(index);
          const isCompleted = state === 'completed';
          const isCurrent = state === 'current';
          const isUpcoming = state === 'upcoming';
          const showLine = shouldShowLine(index);
          const isClickable = onStepClick && index <= validatedCurrentStep;
          
          return (
            <React.Fragment key={step.id}>
              {/* Step Container */}
              <div
                className={cn(
                  'relative z-20 flex flex-col items-center',
                  'w-full sm:w-auto sm:flex-1',
                  'transition-all duration-300',
                  // Mobile spacing
                  'mb-2 sm:mb-0'
                )}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'relative',
                    'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16',
                    'rounded-full',
                    'flex items-center justify-center',
                    'transition-all duration-500 ease-out',
                    'shadow-md',
                    'border-2',
                    // State-based styling
                    isCompleted && 'scale-100 shadow-lg',
                    isCurrent && 'scale-105 shadow-xl',
                    isUpcoming && 'scale-100',
                    // Focus styles for keyboard navigation
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    isClickable && 'cursor-pointer hover:scale-110',
                    !isClickable && 'cursor-default'
                  )}
                  style={{
                    backgroundColor: isCompleted || isCurrent 
                      ? colorsConfig.completed 
                      : colorsConfig.muted,
                    borderColor: isCurrent 
                      ? colorsConfig.active 
                      : isCompleted 
                        ? colorsConfig.completed 
                        : colorsConfig.muted,
                    '--tw-ring-color': colorsConfig.active,
                    '--tw-ring-offset-color': '#ffffff',
                  } as React.CSSProperties}
                  tabIndex={isClickable ? 0 : -1}
                  role={isClickable ? "button" : "presentation"}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-disabled={isUpcoming ? true : false}
                  aria-label={`Step ${index + 1}: ${step.label}. ${isCompleted ? 'Completed' : isCurrent ? 'Current step' : 'Upcoming'}`}
                  onClick={isClickable ? () => handleStepClick(index) : undefined}
                  onKeyDown={isClickable ? (e) => handleKeyDown(e, index) : undefined}
                >
                  {/* Checkmark for completed steps */}
                  {isCompleted ? (
                    <Check
                      className={cn(
                        'w-5 h-5 sm:w-6 sm:h-6',
                        'transition-all duration-300',
                        'animate-fade-in animate-scale-in'
                      )}
                      style={{ color: colorsConfig.text }}
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  ) : (
                    /* Step number for current and upcoming */
                    <span
                      className={cn(
                        'text-sm sm:text-base md:text-lg',
                        'font-bold',
                        'transition-colors duration-300'
                      )}
                      style={{
                        color: isCurrent ? colorsConfig.text : colorsConfig.textMuted,
                      }}
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  )}
                </div>
                
                {/* Step Label */}
                <div
                  className={cn(
                    'mt-2 sm:mt-3',
                    'text-xs sm:text-sm md:text-base',
                    'font-medium',
                    'text-center',
                    'transition-colors duration-300',
                    'max-w-[120px] sm:max-w-[140px] md:max-w-[180px]',
                    'px-2',
                    // State-based text color
                    isCompleted && 'text-gray-700',
                    isCurrent && 'text-gray-900 font-semibold',
                    isUpcoming && 'text-gray-500',
                    // Truncate long labels
                    'truncate',
                    // RTL text direction
                    isRTL && 'font-arabic'
                  )}
                  title={step.label}
                  dir={direction}
                >
                  {step.label}
                </div>
                
                {/* Vertical Line (Mobile) */}
                {index < validatedSteps.length - 1 && (
                  <div
                    className={cn(
                      'absolute sm:hidden',
                      'z-10',
                      'pointer-events-none',
                      'top-full',
                      // Center horizontally regardless of direction
                      'left-1/2 -translate-x-1/2'
                    )}
                    style={{
                      width: '2px',
                      // Better calculation: from bottom of circle to top of next circle
                      // Circle bottom = circle size (3rem) + label margin (0.5rem) + label height (approx 1.5rem)
                      // Next circle top = 0
                      // So height = label margin + label height + spacing
                      height: 'calc(0.5rem + 1.5rem + 0.5rem)',
                      minHeight: '2.5rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    <div
                      className={cn(
                        'w-full h-full',
                        'transition-all duration-700 ease-out',
                        showLine ? 'opacity-100' : 'opacity-30'
                      )}
                      style={{
                        backgroundColor: showLine 
                          ? colorsConfig.completed 
                          : colorsConfig.muted,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>
              
              {/* Horizontal Line (Desktop) */}
              {index < validatedSteps.length - 1 && (
                <div
                  className={cn(
                    'hidden sm:flex',
                    'relative flex-1',
                    'items-center',
                    'z-10',
                    'h-0',
                    // Position line at circle center
                    'self-center'
                  )}
                  style={{
                    // Use CSS variables for responsive positioning
                    marginTop: 'calc(var(--circle-radius, 1.75rem) - 1px)',
                    // Negative margins to connect circles - works for both RTL and LTR
                    marginInlineStart: 'calc(-1 * var(--circle-radius, 1.75rem))',
                    marginInlineEnd: 'calc(-1 * var(--circle-radius, 1.75rem))',
                  }}
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      'w-full h-0.5 sm:h-1',
                      'transition-all duration-700 ease-out',
                      showLine ? 'opacity-100' : 'opacity-30'
                    )}
                    style={{
                      backgroundColor: showLine 
                        ? colorsConfig.completed 
                        : colorsConfig.muted,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
