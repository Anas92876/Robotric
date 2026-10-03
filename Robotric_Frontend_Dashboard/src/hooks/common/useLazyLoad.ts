import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to lazy load content when it enters the viewport
 * @param options IntersectionObserver options
 * @returns [ref, isInView] - ref to attach to element, boolean indicating if element is in view
 */
export const useLazyLoad = (options?: IntersectionObserverInit) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before element enters viewport
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isInView] as const;
};
