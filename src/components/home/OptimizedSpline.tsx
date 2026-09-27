import React, { lazy, Suspense, useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';

// Lazy load Spline component - this reduces initial bundle size significantly
const Spline = lazy(() => import('@splinetool/react-spline'));

// Error Boundary for catching Spline loading errors
interface ErrorBoundaryProps {
  children: ReactNode;
  onError: (error: Error) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Error is handled by parent component
    }
    return this.props.children;
  }
}

// Wrapper component to handle Spline loading state
interface SplineWrapperProps {
  scene: string;
  onLoad: () => void;
  isLoaded: boolean;
  width: string | number;
  height: string | number;
  isPaused?: boolean; // NEW: Add pause prop
}

const SplineWrapper: React.FC<SplineWrapperProps> = ({
  scene,
  onLoad,
  isLoaded,
  width,
  height,
  isPaused = false, // NEW
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const splineRef = useRef<any>(null); // NEW: Reference to Spline instance

  useEffect(() => {
    // Detect when Spline canvas is rendered (indicates it's loaded)
    const checkLoaded = () => {
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) {
          onLoad();
        }
      }
    };

    // Check immediately and then periodically
    checkLoaded();
    const interval = setInterval(checkLoaded, 100);
    
    // Also check after a delay as fallback
    const timeout = setTimeout(() => {
      checkLoaded();
      clearInterval(interval);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onLoad]);

  // NEW: Handle pause/resume of Spline scene
  useEffect(() => {
    if (splineRef.current && isLoaded) {
      try {
        // Access the Spline application instance
        const splineApp = (splineRef.current as any).application;
        if (splineApp) {
          if (isPaused) {
            // Pause the scene (freezes in current position)
            if (typeof splineApp.pause === 'function') {
              splineApp.pause();
            }
          } else {
            // Resume the scene
            if (typeof splineApp.play === 'function') {
              splineApp.play();
            }
          }
        }
      } catch (error) {
        // Silently fail if pause/play methods aren't available
        console.debug('Spline pause/resume not available:', error);
      }
    }
  }, [isPaused, isLoaded]);

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 transition-opacity duration-500 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      } ${isPaused ? 'pointer-events-none' : ''}`}
      style={{ 
        width, 
        height,
        // Hide when paused but keep in DOM to maintain state
        visibility: isPaused ? 'hidden' : 'visible',
      }}
    >
      <Spline 
        scene={scene} 
        ref={splineRef} // NEW: Add ref to access Spline instance
      />
    </div>
  );
};

interface OptimizedSplineProps {
  /**
   * URL to the Spline scene file
   */
  scene: string;
  
  /**
   * Width of the container (for preventing layout shift)
   * @default "100%"
   */
  width?: string | number;
  
  /**
   * Height of the container (for preventing layout shift)
   * @default "600px"
   */
  height?: string | number;
  
  /**
   * Delay before loading Spline (in milliseconds)
   * @default 1500
   */
  loadDelay?: number;
  
  /**
   * Custom placeholder image URL (shown immediately for LCP)
   * If not provided, uses a gradient placeholder
   */
  placeholderImage?: string;
  
  /**
   * Alt text for placeholder image
   * @default "3D Scene Loading"
   */
  placeholderAlt?: string;
  
  /**
   * Custom fallback component while Spline is loading
   */
  fallback?: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether to disable on mobile devices
   * @default true
   */
  disableOnMobile?: boolean;
  
  /**
   * Callback when Spline scene has loaded
   */
  onLoad?: () => void;
  
  /**
   * Callback when Spline scene fails to load
   */
  onError?: (error: Error) => void;
  
  /**
   * Whether to unload Spline when scrolled out of viewport for better performance
   * When enabled, scene will pause (freeze) instead of unmounting to maintain state
   * @default true
   */
  unloadOnScroll?: boolean;
  
  /**
   * ID of the parent section to observe for visibility (e.g., "home")
   * If not provided, observes the component itself
   */
  observeSectionId?: string;
}

/**
 * Production-ready optimized Spline 3D component
 * 
 * Features:
 * - Fast-loading placeholder image for better LCP
 * - Lazy-loads Spline after main content is painted
 * - Configurable delay for better perceived performance
 * - Prevents layout shift with fixed dimensions
 * - Works with Vite and React 18
 * - Mobile-optimized (can disable on mobile)
 * - Scroll-based pause: Freezes scene in last position when scrolled away (maintains state)
 * - Automatic resume when scrolled back into view
 * - Falls back to unmounting after delay if completely out of view
 * 
 * @example
 * ```tsx
 * <OptimizedSpline
 *   scene="https://prod.spline.design/pNr6PeuFEerHyKrB/scene.splinecode"
 *   width="100%"
 *   height="600px"
 *   loadDelay={2000}
 *   placeholderImage="/images/hero-placeholder.jpg"
 *   unloadOnScroll={true}
 *   observeSectionId="home"
 * />
 * ```
 */
export const OptimizedSpline: React.FC<OptimizedSplineProps> = ({
  scene,
  width = '100%',
  height = '600px',
  loadDelay = 1500,
  placeholderImage,
  placeholderAlt = '3D Scene Loading',
  fallback,
  className = '',
  disableOnMobile = true,
  unloadOnScroll = true,
  observeSectionId,
  onLoad,
  onError,
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false); // NEW: Track pause state
  const containerRef = useRef<HTMLDivElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile/tablet: disable Spline below 1024px (lg breakpoint).
  // Matches the Hero's `hidden lg:block` container so Spline never
  // loads on any device that shows the robot fallback image instead.
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // IntersectionObserver to detect visibility - MODIFIED to pause instead of unmount
  useEffect(() => {
    if (!unloadOnScroll) {
      setIsVisible(true);
      setIsPaused(false);
      return;
    }

    const setupObserver = (element: HTMLElement) => {
      // Cleanup existing observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          // Use requestAnimationFrame for smooth updates
          requestAnimationFrame(() => {
            entries.forEach((entry) => {
              // Consider visible if at least 30% is in viewport
              const visible = entry.isIntersecting && entry.intersectionRatio > 0.3;
              setIsVisible(visible);
              
              // NEW: Instead of immediately unmounting, pause the scene when not visible
              if (!visible && isLoaded) {
                // Pause the scene (freezes in current position)
                setIsPaused(true);
                
                // Optional: Still unmount after a longer delay to save memory
                // Only do this if user is completely out of view (intersectionRatio === 0)
                if (entry.intersectionRatio === 0) {
                  if (cleanupTimeoutRef.current) {
                    clearTimeout(cleanupTimeoutRef.current);
                  }
                  cleanupTimeoutRef.current = setTimeout(() => {
                    // Only unmount if still not visible after 3 seconds
                    setShouldLoad(false);
                    setIsLoaded(false);
                    setIsPaused(false);
                  }, 3000);
                } else {
                  // Cancel cleanup if partially visible
                  if (cleanupTimeoutRef.current) {
                    clearTimeout(cleanupTimeoutRef.current);
                    cleanupTimeoutRef.current = null;
                  }
                }
              } else if (visible) {
                // Resume when visible again
                setIsPaused(false);
                
                // Cancel any pending cleanup
                if (cleanupTimeoutRef.current) {
                  clearTimeout(cleanupTimeoutRef.current);
                  cleanupTimeoutRef.current = null;
                }
                
                // If not loaded yet, start loading
                if (!isLoaded && !shouldLoad) {
                  setShouldLoad(true);
                }
              }
            });
          });
        },
        {
          root: null,
          rootMargin: '50px', // Start loading 50px before entering viewport
          threshold: [0, 0.3, 0.5, 1], // Multiple thresholds for smooth detection
        }
      );

      observerRef.current.observe(element);
    };

    // Wait for DOM to be ready
    const elementToObserve = observeSectionId 
      ? document.getElementById(observeSectionId)
      : containerRef.current;

    if (elementToObserve) {
      setupObserver(elementToObserve);
    } else {
      // Fallback: observe container when it's available
      const checkElement = () => {
        const el = observeSectionId 
          ? document.getElementById(observeSectionId)
          : containerRef.current;
        if (el) {
          setupObserver(el);
        }
      };
      const timeout = setTimeout(checkElement, 100);
      return () => {
        clearTimeout(timeout);
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
        }
      };
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [unloadOnScroll, observeSectionId, isLoaded, shouldLoad]);

  // Wait for main content to paint, then start loading Spline - only when visible
  useEffect(() => {
    // Don't start loading if not visible and unloadOnScroll is enabled
    if (!isVisible && unloadOnScroll) {
      // Clear any pending loads
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      // Only prevent loading if we haven't loaded yet
      if (!isLoaded) {
        setShouldLoad(false);
      }
      return;
    }

    // Use requestIdleCallback for better performance, fallback to setTimeout
    const startLoading = () => {
      if (disableOnMobile && isMobile) {
        return; // Don't load on mobile if disabled
      }

      // Wait for next frame to ensure main content is painted
      requestAnimationFrame(() => {
        // Additional delay for better perceived performance
        loadTimeoutRef.current = setTimeout(() => {
          setShouldLoad(true);
        }, loadDelay);
      });
    };

    // Use requestIdleCallback if available (runs when browser is idle)
    if ('requestIdleCallback' in window) {
      const idleId = requestIdleCallback(startLoading, { timeout: 2000 });
      return () => {
        cancelIdleCallback(idleId);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      };
    } else {
      // Fallback: wait for page load + delay
      if (document.readyState === 'complete') {
        startLoading();
      } else {
        window.addEventListener('load', startLoading);
        return () => {
          window.removeEventListener('load', startLoading);
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
          }
        };
      }
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [loadDelay, disableOnMobile, isMobile, isVisible, unloadOnScroll, isLoaded]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (error: Error) => {
    setHasError(true);
    onError?.(error);
  };

  // Default placeholder - gradient with loading indicator
  const defaultPlaceholder = (
    <div 
      className="w-full h-full bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 flex items-center justify-center relative overflow-hidden"
      style={{ width, height }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 animate-pulse" />
    </div>
  );

  // Image placeholder (better for LCP)
  const imagePlaceholder = placeholderImage ? (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={{ width, height }}
    >
      <img
        src={placeholderImage}
        alt={placeholderAlt}
        className="w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
        width={typeof width === 'number' ? width : undefined}
        height={typeof height === 'number' ? height : undefined}
      />
    </div>
  ) : null;

  // Error state
  if (hasError) {
    return (
      <div 
        className={`w-full h-full bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-secondary">Failed to load 3D scene</p>
        </div>
      </div>
    );
  }

  // Mobile fallback (if disabled on mobile)
  if (disableOnMobile && isMobile) {
    return (
      <div 
        className={`w-full h-full ${className}`}
        style={{ width, height }}
      >
        {imagePlaceholder || defaultPlaceholder}
      </div>
    );
  }

  // Container with fixed dimensions to prevent layout shift
  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ 
        width, 
        height,
        minHeight: typeof height === 'number' ? `${height}px` : height,
      }}
    >
      {/* Show placeholder only when Spline is not loaded (not when paused) */}
      {!isLoaded && (
        imagePlaceholder || fallback || defaultPlaceholder
      )}

      {/* Keep mounted but paused when not visible - maintains state */}
      {shouldLoad && (
        <ErrorBoundary onError={handleError}>
          <Suspense fallback={fallback || defaultPlaceholder}>
            <SplineWrapper
              scene={scene}
              onLoad={handleLoad}
              isLoaded={isLoaded}
              width={width}
              height={height}
              isPaused={isPaused} // NEW: Pass pause state
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
};

export default OptimizedSpline;
