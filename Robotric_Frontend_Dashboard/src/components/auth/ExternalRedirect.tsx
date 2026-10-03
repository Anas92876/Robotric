import { useEffect } from 'react';

/**
 * Leaves the dashboard with a full page load, for pages that live in the
 * public Next.js site (login, home…). The router can't render those pages.
 */
export function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}
