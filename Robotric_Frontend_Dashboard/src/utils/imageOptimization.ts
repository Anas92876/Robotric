/**
 * Image optimization utilities
 * 
 * Note: WebP conversion should be done manually using image processing tools.
 * This utility provides helper functions for generating responsive image srcsets.
 */

/**
 * Generate srcset for responsive images
 * @param basePath Base path to image (without extension)
 * @param widths Array of widths in pixels
 * @param extension File extension (default: 'jpg')
 * @returns srcset string
 */
export function generateSrcSet(
  basePath: string,
  widths: number[],
  extension: string = 'jpg'
): string {
  return widths
    .map((width) => `${basePath}-${width}w.${extension} ${width}w`)
    .join(', ');
}

/**
 * Generate sizes attribute for responsive images
 * @param breakpoints Array of breakpoint objects with media query and size
 * @returns sizes string
 */
export function generateSizes(
  breakpoints: Array<{ media: string; size: string }>
): string {
  return breakpoints
    .map((bp) => `${bp.media} ${bp.size}`)
    .join(', ') + ', 100vw';
}

/**
 * Default responsive image sizes for common layouts
 */
export const defaultSizes = {
  fullWidth: '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px',
  halfWidth: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px',
  thirdWidth: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px',
  gallery: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
};

/**
 * Common responsive image widths
 */
export const responsiveWidths = {
  small: [400, 800],
  medium: [600, 1200],
  large: [800, 1600],
  xlarge: [1200, 2400],
};
