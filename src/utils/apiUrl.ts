/**
 * API URL Utility
 * 
 * Centralized URL resolution with production safety checks
 * NO localhost fallbacks in production - fails fast if misconfigured
 */

/**
 * Get the API base URL
 * Throws error in production if not set
 */
export function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  const isProduction = import.meta.env.MODE === 'production';
  
  if (!apiUrl) {
    if (isProduction) {
      throw new Error(
        '❌ VITE_API_URL is NOT set in production!\n' +
        'Set VITE_API_URL environment variable in Vercel dashboard and redeploy.'
      );
    }
    // Development fallback
    return 'http://localhost:4889';
  }
  
  // Remove trailing slash to prevent double slashes
  return apiUrl.replace(/\/$/, '');
}

/**
 * Get the Socket.IO server URL
 * Uses VITE_SOCKET_URL if available, otherwise falls back to VITE_API_URL
 * Throws error in production if neither is set
 */
export function getSocketUrl(): string {
  const socketUrl = import.meta.env.VITE_SOCKET_URL;
  const apiUrl = import.meta.env.VITE_API_URL;
  const isProduction = import.meta.env.MODE === 'production';
  
  // Prefer VITE_SOCKET_URL, fallback to VITE_API_URL
  const url = socketUrl || apiUrl;
  
  if (!url) {
    if (isProduction) {
      throw new Error(
        '❌ VITE_SOCKET_URL and VITE_API_URL are NOT set in production!\n' +
        'Set at least one of these environment variables in Vercel dashboard and redeploy.'
      );
    }
    // Development fallback
    return 'http://localhost:4889';
  }
  
  // Remove trailing slash to prevent double slashes
  return url.replace(/\/$/, '');
}

/**
 * Safely join URL paths, preventing double slashes
 */
export function joinUrl(base: string, ...paths: string[]): string {
  const cleanBase = base.replace(/\/+$/, ''); // Remove trailing slashes
  const cleanPaths = paths
    .map(path => path.replace(/^\/+/, '').replace(/\/+$/, '')) // Remove leading/trailing slashes
    .filter(path => path.length > 0); // Remove empty paths
  
  return [cleanBase, ...cleanPaths].join('/');
}
