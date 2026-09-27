import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useLazyLoad } from '../../hooks/common/useLazyLoad';

// Lazy load the Spline component to reduce initial bundle size
// Spline exports a default export, so we need to handle it correctly with lazy()
const Spline = lazy(() => import('@splinetool/react-spline'));

interface LazySplineProps {
  scene: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Lazy-loaded Spline 3D component that only loads when it enters the viewport
 * Disabled on mobile devices for better performance
 * This significantly reduces initial bundle size and improves page load performance
 */
export const LazySpline: React.FC<LazySplineProps> = ({ 
  scene, 
  className = '',
  fallback 
}) => {
  const [ref, shouldLoad] = useLazyLoad({
    rootMargin: '100px', // Start loading 100px before element enters viewport
    threshold: 0.1,
  });
  const [shouldRender, setShouldRender] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const isMobileDevice = width < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Delay Spline rendering to avoid blocking LCP (only on desktop)
  useEffect(() => {
    if (shouldLoad && !isMobile) {
      // Increased delay to 3000ms for better performance
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [shouldLoad, isMobile]);

  const defaultFallback = (
    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 rounded-[2.5rem] flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-text-secondary font-medium">Loading 3D scene...</p>
      </div>
    </div>
  );

  // Static fallback for mobile devices
  const mobileFallback = (
    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-[2.5rem] flex items-center justify-center">
      <div className="text-center p-6">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="text-sm sm:text-base font-bold text-primary">Innovation Hub</p>
        <p className="text-xs text-text-secondary mt-1">Robotics & Technology</p>
      </div>
    </div>
  );

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={`w-full h-full ${className}`}>
      {isMobile ? (
        mobileFallback
      ) : shouldLoad && shouldRender ? (
        <Suspense fallback={fallback || defaultFallback}>
          <Spline scene={scene} />
        </Suspense>
      ) : (
        fallback || defaultFallback
      )}
    </div>
  );
};
