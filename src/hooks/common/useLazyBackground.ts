import { useEffect, useRef, useState } from 'react';

interface UseLazyBackgroundOptions extends IntersectionObserverInit {
  once?: boolean;
}

/**
 * Hook to lazy load background patterns only when section enters viewport
 * Improves initial page load performance by deferring background rendering
 */
export const useLazyBackground = (
  options?: UseLazyBackgroundOptions
): [React.RefObject<HTMLElement>, boolean] => {
  const [shouldRender, setShouldRender] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Small delay to ensure main content is painted first
          setTimeout(() => {
            setShouldRender(true);
          }, 100);
          if (options?.once !== false) {
            observer.disconnect();
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px', // Start loading slightly before entering viewport
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, shouldRender];
};
