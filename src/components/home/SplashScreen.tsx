import { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  /**
   * Icon source URL
   * @default "/images/icon.png"
   */
  iconSrc?: string;
  
  /**
   * Duration to show splash screen (in milliseconds)
   * @default 2000
   */
  duration?: number;
  
  /**
   * Whether to show splash only once (stored in localStorage)
   * @default false
   */
  showOnce?: boolean;
  
  /**
   * Callback when splash screen is dismissed
   */
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  iconSrc = '/images/icon.png',
  duration = 2000,
  showOnce = false,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [iconLoaded, setIconLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Check if splash was already shown (if showOnce is true)
  useEffect(() => {
    if (showOnce) {
      const hasShown = localStorage.getItem('splashShown');
      if (hasShown === 'true') {
        setIsVisible(false);
        onComplete();
        return;
      }
    }
  }, [showOnce, onComplete]);

  // Start progress animation immediately (don't wait for icon)
  useEffect(() => {
    if (isVisible) {
      startTimeRef.current = performance.now();
      // Progress bar completes in 70% of duration for faster feel
      const progressDuration = duration * 0.7;
      
      // Enhanced easing function for ultra-smooth animation (ease-out quint)
      const easeOutQuint = (t: number): number => {
        return 1 - Math.pow(1 - t, 5);
      };
      
      let animationFrameId: number;
      
      // Use requestAnimationFrame for buttery smooth 60fps+ updates
      const animate = () => {
        if (startTimeRef.current) {
          const elapsed = performance.now() - startTimeRef.current;
          const rawProgress = Math.min((elapsed / progressDuration), 1);
          const easedProgress = easeOutQuint(rawProgress);
          const newProgress = easedProgress * 100;
          setProgress(newProgress);
          
          // Trigger completion animation
          if (newProgress >= 100 && !isComplete) {
            setIsComplete(true);
          }
          
          // Continue animation if not complete
          if (rawProgress < 1) {
            animationFrameId = requestAnimationFrame(animate);
          }
        }
      };
      
      // Start animation
      animationFrameId = requestAnimationFrame(animate);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [iconLoaded, isVisible, duration, isComplete]);

  // Auto-dismiss after duration (don't wait for icon)
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        if (showOnce) {
          localStorage.setItem('splashShown', 'true');
        }
        setIsVisible(false);
        setTimeout(() => {
          onComplete();
        }, 200);
      }, duration);

      return () => {
        clearTimeout(timer);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [iconLoaded, duration, showOnce, isVisible, onComplete]);

  if (!isVisible) {
    return null;
  }

  // Calculate square progress
  const size = 170; // Size of the square
  const strokeWidth = 5;
  const cornerRadius = 8; // Rounded corners
  const perimeter = size * 4; // Perimeter of square
  const strokeDashoffset = perimeter - (progress / 100) * perimeter;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative flex items-center justify-center">
        {/* Square Progress Ring with Glow */}
        <svg
          className={`absolute transition-all duration-700 ease-out ${
            iconLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          } ${isComplete ? 'scale-110' : ''}`}
          width="220"
          height="220"
          viewBox="0 0 220 220"
          style={{ 
            transform: 'rotate(-90deg)',
            filter: isComplete ? 'drop-shadow(0 0 20px rgba(0, 51, 0, 0.6))' : 'drop-shadow(0 0 8px rgba(0, 51, 0, 0.3))',
            transition: 'filter 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform, filter'
          }}
        >
          <defs>
            {/* Gradient for progress ring */}
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#003300" stopOpacity="1" />
              <stop offset="50%" stopColor="#2a942a" stopOpacity="1" />
              <stop offset="100%" stopColor="#003300" stopOpacity="1" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background square with subtle shadow */}
          <rect
            x={(220 - size) / 2}
            y={(220 - size) / 2}
            width={size}
            height={size}
            rx={cornerRadius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            opacity="0.3"
          />
          
          {/* Progress square with gradient and glow */}
          <rect
            x={(220 - size) / 2}
            y={(220 - size) / 2}
            width={size}
            height={size}
            rx={cornerRadius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            style={{
              strokeDasharray: perimeter,
              strokeDashoffset: strokeDashoffset,
              transformOrigin: '110px 110px',
              transition: 'stroke-dashoffset 0.05s linear',
            }}
          />
          
          {/* Animated glow square that follows progress */}
          {progress > 0 && (
            <rect
              x={(220 - size) / 2}
              y={(220 - size) / 2}
              width={size}
              height={size}
              rx={cornerRadius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth + 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.2"
              style={{
                strokeDasharray: perimeter,
                strokeDashoffset: strokeDashoffset,
                transformOrigin: '110px 110px',
                transition: 'stroke-dashoffset 0.05s linear',
              }}
            />
          )}
        </svg>

        {/* Icon with completion animation */}
        <img
          src={iconSrc}
          alt="Robotrick Icon"
          className={`h-24 sm:h-32 md:h-40 w-auto relative z-10 transition-all duration-700 ease-out ${
            iconLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          } ${
            isComplete 
              ? 'scale-110 animate-pulse-glow' 
              : ''
          }`}
          onLoad={() => setIconLoaded(true)}
          fetchPriority="high"
          style={{
            filter: isComplete ? 'drop-shadow(0 0 15px rgba(0, 51, 0, 0.5))' : 'none',
            transition: 'filter 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform, filter'
          }}
        />
      </div>
    </div>
  );
};
