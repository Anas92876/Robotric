import { cn } from '../../lib/utils';

/**
 * The Robotrick wordmark, coloured by CSS (mask over the logo image) exactly
 * like the public site, so it follows the brand tokens.
 */
export function BrandLogo({ lang, className }: { lang: 'en' | 'ar'; className?: string }) {
  const src = `/dash-assets/images/logo-${lang}.png`;
  return (
    <span
      role="img"
      aria-label="Robotrick"
      className={cn('block h-7 bg-ink', lang === 'ar' ? 'aspect-[1230/226]' : 'aspect-[1260/230]', className)}
      style={{
        WebkitMask: `url(${src}) center / contain no-repeat`,
        mask: `url(${src}) center / contain no-repeat`,
      }}
    />
  );
}
