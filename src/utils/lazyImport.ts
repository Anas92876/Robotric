import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * retryLazy is a utility to retry a lazy import module if it fails.
 * This is useful for handling ChunkLoadErrors when a new version is deployed.
 * 
 * @param componentImport - The import function for the component
 * @returns A React.lazy component
 */
export const lazyImport = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): LazyExoticComponent<T> => {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assuming that the user is not on the latest version of the application.
        // Let's refresh the page immediately.
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        
        // This return is just to satisfy TypeScript, assuming reload happens instantly
        return { default: (() => null) as unknown as T }; 
      }

      // The page has already been reloaded
      // Assuming that user is already using the latest version of the application.
      // Let's let the application crash and raise the error.
      throw error;
    }
  });
};
