import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
  className = '',
}: PaginationProps) => {
  const { t, i18n } = useTranslation('dashboardCommon');
  const isRTL = i18n.language === 'ar';

  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''} ${className}`}>
      <div className={`text-sm text-white/60 ${isRTL ? 'font-arabic text-right' : ''}`}>
        {t('showing')} <span className="font-semibold text-[#003300]">{startItem}</span> {t('to')}{' '}
        <span className="font-semibold text-[#003300]">{endItem}</span> {t('of')}{' '}
        <span className="font-semibold text-[#003300]">{total}</span> {t('results')}
      </div>

      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border-[#003300]/15 hover:border-primary text-[#003300] disabled:opacity-50 disabled:cursor-not-allowed"
          leftIcon={<PrevIcon className="w-4 h-4" />}
        >
          {t('previous')}
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-white/40">
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <Button
                key={pageNum}
                variant={isActive ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={
                  isActive
                    ? ''
                    : 'border-[#003300]/15 hover:border-primary text-[#003300]'
                }
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="border-[#003300]/15 hover:border-primary text-[#003300] disabled:opacity-50 disabled:cursor-not-allowed"
          rightIcon={<NextIcon className="w-4 h-4" />}
        >
          {t('next')}
        </Button>
      </div>
    </div>
  );
};
