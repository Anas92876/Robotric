import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, ChevronDown } from 'lucide-react';
import { updateHtmlAttributes } from '../../i18n';

interface LanguageSwitcherProps {
  variant?: 'desktop' | 'mobile';
}

export const LanguageSwitcher = ({ variant = 'desktop' }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isRTL = i18n.language === 'ar';
  const isMobile = variant === 'mobile';

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇸🇾' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    updateHtmlAttributes(lng);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={isMobile ? 'w-full' : 'relative'}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg transition-colors ${
          isMobile
            ? 'w-full px-4 py-3 bg-white border-2 border-border hover:border-primary/50 hover:bg-primary/5 text-text-primary font-semibold justify-between'
            : 'px-3 py-2 hover:bg-primary/10 text-text-secondary hover:text-primary'
        }`}
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Languages className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
          <span className={`font-medium ${isMobile ? 'text-base' : 'text-sm hidden sm:inline'}`}>
            {currentLanguage.flag}
          </span>
          {isMobile && (
            <span className="text-base font-semibold">{currentLanguage.name}</span>
          )}
        </div>
        <ChevronDown className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`${
          isMobile 
            ? 'mt-2 w-full bg-white rounded-xl shadow-lg border border-border overflow-hidden' 
            : `absolute top-full mt-2 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50 min-w-[140px] ${isRTL ? 'left-0' : 'right-0'}`
        }`}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full px-4 py-3 hover:bg-primary/10 transition-colors flex items-center gap-3 ${
                isRTL ? 'text-right' : 'text-left'
              } ${
                i18n.language === lang.code ? 'bg-primary/5 text-primary font-semibold' : 'text-text-secondary'
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className={`${isMobile ? 'text-base' : 'text-sm'} font-medium`}>{lang.name}</span>
              {i18n.language === lang.code && (
                <span className={`w-2 h-2 rounded-full bg-primary ${isRTL ? 'mr-auto' : 'ml-auto'}`}></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
