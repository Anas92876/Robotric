import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

let cachedAccess: boolean | null = null;
let inFlight: Promise<boolean> | null = null;

async function fetchWroAccess(): Promise<boolean> {
  if (cachedAccess !== null) return cachedAccess;
  if (!inFlight) {
    inFlight = api
      .get('/student/documents')
      .then((res) => {
        cachedAccess = !!res.data.wroRequired;
        return cachedAccess;
      })
      .catch(() => {
        cachedAccess = false;
        return false;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/**
 * Returns whether the current student belongs to a course with WRO enabled
 * (Course.wroDocumentsRequired). Result is cached in-memory for the session.
 */
export function useWroAccess(enabled: boolean = true) {
  const [wroAccess, setWroAccess] = useState<boolean>(cachedAccess ?? false);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && cachedAccess === null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    if (cachedAccess !== null) {
      setWroAccess(cachedAccess);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchWroAccess().then((access) => {
      if (!cancelled) {
        setWroAccess(access);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { wroAccess, isLoading };
}
