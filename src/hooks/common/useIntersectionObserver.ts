import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  once?: boolean;
}

/**
 * Lightweight Intersection Observer hook to replace Framer Motion's useInView
 * Reduces bundle size and improves performance
 */
export const useIntersectionObserver = (
  options?: UseIntersectionObserverOptions
): [React.RefObject<HTMLElement>, boolean] => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const { once = true, ...observerOptions } = options || {};

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          // Optionally disconnect after first intersection
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsIntersecting(false);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
        ...observerOptions,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref as React.RefObject<HTMLElement>, isIntersecting];
};
