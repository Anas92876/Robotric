import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { ROUTES } from "../../constants/routes.constants";

export const ContactCTA = () => {
  const { t, i18n } = useTranslation('home');
  const { pathname } = useLocation();
  const isRTL = i18n.language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const isHomePage = pathname === ROUTES.HOME || pathname === '/';

  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const contactButtonClass = "group px-5 sm:px-6 md:px-7 lg:px-8 py-3 sm:py-3.5 md:py-4 lg:py-4.5 bg-primary text-white rounded-xl md:rounded-2xl font-bold text-sm sm:text-base md:text-base lg:text-lg hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 relative overflow-hidden min-h-[44px] sm:min-h-[48px] w-full sm:w-auto sm:min-w-[140px] md:min-w-[160px]";

  return (
    <section className="relative py-6 sm:py-8 md:py-10 lg:py-12 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]" style={{ backgroundColor: '#cccc99' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Wave at the top - creates transition from section above */}
      <div className="absolute -top-[30px] sm:-top-[35px] md:-top-[40px] lg:-top-[50px] left-0 right-0 w-full max-w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 1, transform: 'rotate(180deg)' }}>
        <svg
          className="relative block w-full h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          style={{ display: 'block', maxWidth: '100%' }}
        >
          <path 
            d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" 
            fill="#cccc99"
          />
        </svg>
      </div>
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="contact-us-holder flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 md:gap-8 lg:gap-12 xl:gap-16" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* 1) Image — يمين في العربي، يسار في الإنجليزي */}
          <div className="flex-shrink-0 order-2 md:order-1">
            <img
              src="/images/icon.png"
              alt="contact us"
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 xl:w-52 xl:h-52 object-contain"
            />
          </div>

          {/* 2) Text — بداية النص حسب اللغة */}
          <div className={`contact-us-title flex flex-col gap-2 sm:gap-3 md:gap-2 lg:gap-3 flex-1 px-2 sm:px-4 md:px-0 w-full min-w-0 order-1 md:order-2 text-center md:text-left ${isRTL ? 'md:text-right' : ''}`}>
            <span className={`text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl font-black text-text-primary leading-tight w-full ${isRTL ? 'font-arabic' : ''}`}>
              {t('contactCTA.title1')}
            </span>
            <span className={`text-base sm:text-lg md:text-lg lg:text-2xl xl:text-3xl font-bold text-text-secondary leading-tight w-full ${isRTL ? 'font-arabic' : ''}`}>
              {t('contactCTA.title2')}
            </span>
          </div>

          <div className="contact-us-btns flex flex-col sm:flex-row md:flex-col gap-3 sm:gap-3 md:gap-4 flex-shrink-0 w-full sm:w-auto order-3">
            {isHomePage ? (
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToContact();
                }}
                className={contactButtonClass}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('contactCTA.contactBtn')}
                  <ArrowIcon className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-transform flex-shrink-0 ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </a>
            ) : (
              <Link to={ROUTES.CONTACT} className={contactButtonClass}>
                <span className="relative z-10 flex items-center gap-2">
                  {t('contactCTA.contactBtn')}
                  <ArrowIcon className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-transform flex-shrink-0 ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Link>
            )}

            <a
              href="https://wa.me/+963942060440"
              target="_blank"
              rel="noopener noreferrer"
              className="group px-5 sm:px-6 md:px-7 lg:px-8 py-3 sm:py-3.5 md:py-4 lg:py-4.5 bg-transparent text-primary border-2 border-primary rounded-xl md:rounded-2xl font-bold text-sm sm:text-base md:text-base lg:text-lg hover:bg-primary/5 hover:shadow-lg transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 relative overflow-hidden min-h-[44px] sm:min-h-[48px] w-full sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t('contactCTA.profileBtn')}
                <ArrowIcon className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-transform flex-shrink-0 ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
