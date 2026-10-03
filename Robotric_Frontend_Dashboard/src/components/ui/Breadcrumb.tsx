import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  homePath?: string;
  separator?: React.ReactNode;
}

/**
 * Breadcrumb Navigation Component
 * 
 * A reusable breadcrumb component with RTL/LTR support, proper styling,
 * and integration with React Router.
 * 
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { label: 'Services', path: '/services' },
 *     { label: 'Technical Projects', path: '/services/technical-projects' },
 *     { label: 'Current Page' }
 *   ]}
 * />
 * ```
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className,
  showHome = true,
  homePath = '/',
  separator,
}) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  // Default separator
  const defaultSeparator = (
    <ChevronIcon 
      className="w-4 h-4 text-text-secondary/60" 
      aria-hidden="true"
    />
  );

  const finalSeparator = separator || defaultSeparator;

  // Combine home with items if showHome is true
  const allItems: BreadcrumbItem[] = showHome
    ? [
        {
          label: isRTL ? 'الرئيسية' : 'Home',
          path: homePath,
          icon: <Home className="w-4 h-4" />,
        },
        ...items,
      ]
    : items;

  return (
    <nav
      className={cn(
        'flex items-center gap-2 text-sm -mb-2',
        isRTL ? 'font-arabic' : '',
        className
      )}
      aria-label="Breadcrumb"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <ol className="flex items-center gap-2 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isActive = !item.path || isLast;

          return (
            <li
              key={index}
              className="flex items-center gap-2"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index > 0 && (
                <span className="mx-1" aria-hidden="true">
                  {finalSeparator}
                </span>
              )}

              {isActive ? (
                <span
                  className={cn(
                    'flex items-center gap-1.5 font-medium',
                    isRTL ? 'font-arabic' : '',
                    isLast
                      ? 'text-text-primary'
                      : 'text-text-secondary'
                  )}
                  itemProp="name"
                >
                  {item.icon && (
                    <span className="flex-shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path || '#'}
                  className={cn(
                    'flex items-center gap-1.5 text-text-secondary hover:text-primary transition-colors duration-200 cursor-pointer',
                    isRTL ? 'font-arabic' : ''
                  )}
                  itemProp="item"
                >
                  {item.icon && (
                    <span className="flex-shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}

              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
