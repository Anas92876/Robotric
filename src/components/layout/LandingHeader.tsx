import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../providers/AuthProvider";
import { ROUTES } from "../../constants/routes.constants";
import { ArrowRight, ArrowLeft, Menu, X, ChevronDown, GraduationCap, Wrench, Printer, Calendar, MessageCircle, Building2 } from "lucide-react";
import { throttle } from "../../utils/throttle";
import { updateHtmlAttributes } from "../../i18n";

interface LandingHeaderProps {
  className?: string;
  onOpenConsultation?: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  className = "",
  onOpenConsultation,
}) => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);

  // Handle scroll effect for header background
  useEffect(() => {
    const handleScroll = throttle(() => {
      setIsScrolled(window.scrollY > 50);
    }, 200);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when clicking outside or on navigation links
  const handleMobileNavClick = () => {
    setIsMobileMenuOpen(false);
    setIsServicesDropdownOpen(false);
  };

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const isHomePage = location.pathname === ROUTES.HOME || location.pathname === '/';

    if (!isHomePage) {
      navigate(`/#${sectionId}`);
      setIsMobileMenuOpen(false);
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setIsMobileMenuOpen(false);
  };

  const servicesDropdownItems = [
    {
      path: "/services/training",
      label: t('navigation.servicesDropdown.training'),
      icon: GraduationCap,
      description: t('navigation.servicesDropdown.trainingDesc'),
    },
    {
      path: "/services/technical-projects",
      label: t('navigation.servicesDropdown.projects'),
      icon: Wrench,
      description: t('navigation.servicesDropdown.projectsDesc'),
    },
    {
      path: "/services/3d-printing",
      label: t('navigation.servicesDropdown.printing'),
      icon: Printer,
      description: t('navigation.servicesDropdown.printingDesc'),
    },
    {
      path: "/services/technical-consultation",
      label: t('navigation.servicesDropdown.consultation'),
      icon: MessageCircle,
      description: t('navigation.servicesDropdown.consultationDesc'),
    },
    {
      path: "/services/curriculum-design",
      label: t('navigation.servicesDropdown.curriculumDesign'),
      icon: GraduationCap,
      description: t('navigation.servicesDropdown.curriculumDesignDesc'),
    },
    {
      path: "/services/stem-lab-setup",
      label: t('navigation.servicesDropdown.stemLabSetup'),
      icon: Building2,
      description: t('navigation.servicesDropdown.stemLabSetupDesc'),
    },
  ];

  const navigationItems = [
    { path: ROUTES.ABOUT, label: t('navigation.about') },
    { path: ROUTES.SERVICES, label: t('navigation.services') },
    { path: ROUTES.BLOG, label: t('navigation.blog'), soon: true },
    { path: ROUTES.JOIN_US, label: t('navigation.joinUs') },
    { path: ROUTES.CONTACT, label: t('navigation.contact') },
  ];

  // Reverse navigation items order for RTL (starts from right: Contact -> About, ends with English)
  const displayNavigationItems = isRTL ? [...navigationItems].reverse() : navigationItems;

  return (
    <header
      className={`fixed top-4 left-0 right-0 z-40 transition-all duration-300 ${className}`}
    >
      {/* Mobile Header */}
      <div className="lg:hidden rounded-3xl sm:rounded-[2rem] md:rounded-[2.5rem] mx-4" style={{ backgroundColor: '#003300' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20 sm:h-24 md:h-28">
            {/* Logo */}
            <button
              onClick={() => {
                const isHomePage = location.pathname === ROUTES.HOME || location.pathname === '/';
                if (isHomePage) {
                  scrollToSection("home");
                } else {
                  navigate(ROUTES.HOME);
                }
              }}
              className="flex items-center cursor-pointer"
            >
              <picture>
                <source srcSet={isRTL ? "/images/header/header-logo-ar.webp" : "/images/header/header-logo-en.webp"} type="image/webp" />
                <img
                  src={isRTL ? "/images/header/header-logo-ar.png" : "/images/header/header-logo-en.png"}
                  alt="Robotrick Logo"
                  className="h-16 sm:h-20 md:h-24 w-auto object-contain max-w-[220px] sm:max-w-[260px] md:max-w-[300px]"
                  width="300" height="96" fetchPriority="high"
                />
              </picture>
            </button>

            {/* Burger Menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md hover:opacity-80 transition-colors"
              style={{ color: '#cccc99' }}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Header - Matching 2P Design */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#003300] rounded-[3rem] px-6 py-4 shadow-[0_0_20px_rgba(0,0,0,0.15)]" style={{ backgroundColor: '#003300' }}>
        <div className="flex items-center justify-between h-20">
            {/* Logo - Right side in RTL */}
            <div className="flex-shrink-0">
              <button
            onClick={() => {
              const isHomePage = location.pathname === ROUTES.HOME || location.pathname === '/';
              if (isHomePage) {
                scrollToSection("home");
              } else {
                navigate(ROUTES.HOME);
              }
            }}
                className="flex items-center group cursor-pointer"
          >
            <picture>
              <source srcSet={isRTL ? "/images/header/header-logo-ar.webp" : "/images/header/header-logo-en.webp"} type="image/webp" />
              <img
                src={isRTL ? "/images/header/header-logo-ar.png" : "/images/header/header-logo-en.png"}
                alt="Robotrick Logo"
                className="h-20 xl:h-24 2xl:h-28 w-auto object-contain group-hover:opacity-80 transition-opacity duration-300 max-w-[240px] xl:max-w-[280px]"
                width="280" height="112" fetchPriority="high"
              />
            </picture>
              </button>
            </div>

            {/* Navigation Menu - Center */}
            <nav className="flex-shrink-0 flex-1 flex justify-center">
              <ul className={`flex items-center gap-3 xl:gap-4 2xl:gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Language Switcher - First item in RTL (rightmost), last in LTR */}
                {isRTL && (
                  <li>
                    <button
                      onClick={() => {
                        const newLang = i18n.language === 'ar' ? 'en' : 'ar';
                        i18n.changeLanguage(newLang);
                        updateHtmlAttributes(newLang);
                      }}
                      className={`text-base font-medium transition-colors cursor-pointer ${isRTL ? 'font-arabic' : ''}`}
                      style={{ color: '#cccc99' }}
                    >
                      {i18n.language === 'ar' ? 'English' : 'العربية'}
                    </button>
                  </li>
                )}
                
                {displayNavigationItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`text-sm xl:text-base font-medium hover:opacity-80 px-2 xl:px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 xl:gap-2 cursor-pointer whitespace-nowrap ${isRTL ? 'font-arabic' : ''}`}
                      style={{ color: '#cccc99' }}
                    >
                      <span>{item.label}</span>
                      {item.soon && (
                        <span className="text-xs px-1.5 xl:px-2 py-0.5 rounded-full bg-[#cccc99]/20 text-[#cccc99] border border-[#cccc99]/30" style={{ fontSize: '0.65rem' }}>
                          {isRTL ? 'قريبًا' : 'Soon'}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
                
                {/* Language Switcher - Last item in LTR (rightmost), first in RTL */}
                {!isRTL && (
                  <li>
                    <button
                      onClick={() => {
                        const newLang = i18n.language === 'ar' ? 'en' : 'ar';
                        i18n.changeLanguage(newLang);
                        updateHtmlAttributes(newLang);
                      }}
                      className={`text-base font-medium transition-colors cursor-pointer ${isRTL ? 'font-arabic' : ''}`}
                      style={{ color: '#cccc99' }}
                    >
                      {i18n.language === 'ar' ? 'English' : 'العربية'}
                    </button>
                  </li>
                )}
              </ul>
            </nav>

            {/* Actions: CTA + Dashboard - Left side in RTL */}
            <div className="flex-shrink-0 flex items-center gap-4">
              {/* Book Consultation Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenConsultation) {
                    onOpenConsultation();
                  } else {
                    scrollToSection("contact");
                  }
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 hover:shadow-lg transition-all duration-300 flex items-center gap-2 cursor-pointer ${isRTL ? 'font-arabic flex-row-reverse' : ''}`}
                style={{ backgroundColor: '#cccc99', color: '#003300' }}
              >
                <span>{t('navigation.followUs')}</span>
                <ArrowIcon className="w-4 h-4" />
              </motion.button>

              {isAuthenticated && (
                <Link to={ROUTES.DASHBOARD}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-6 py-2.5 border-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all duration-300 flex items-center gap-2 cursor-pointer ${isRTL ? 'font-arabic flex-row-reverse' : ''}`}
                    style={{ backgroundColor: '#cccc99', color: '#003300', borderColor: '#cccc99' }}
                  >
                    {t('navigation.dashboard')}
                    <ArrowIcon className="w-4 h-4" />
                  </motion.button>
                </Link>
              )}
            </div>
          </div>
          </div>
        </div>
          </div>

      {/* Mobile Navigation Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
            initial={{ x: isRTL ? "100%" : "-100%", opacity: 0 }}
            animate={{ x: "0%", opacity: 1 }}
            exit={{ x: isRTL ? "100%" : "-100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-72 sm:w-80 shadow-xl z-50 p-4 sm:p-6 overflow-y-auto lg:hidden`}
            style={{ backgroundColor: '#003300' }}
          >
            <div className="flex justify-between items-center mb-8">
                      <button
                        onClick={() => {
                  const isHomePage = location.pathname === ROUTES.HOME || location.pathname === '/';
                  if (isHomePage) {
                    scrollToSection("home");
                          } else {
                    navigate(ROUTES.HOME);
                  }
                  handleMobileNavClick();
                }}
                className="cursor-pointer"
              >
                <picture>
                  <source srcSet={isRTL ? "/images/header/header-logo-ar.webp" : "/images/header/header-logo-en.webp"} type="image/webp" />
                  <img
                    src={isRTL ? "/images/header/header-logo-ar.png" : "/images/header/header-logo-en.png"}
                    alt="Robotrick Logo"
                    className="h-12 sm:h-14 w-auto object-contain max-w-[160px] sm:max-w-[180px]"
                    width="180" height="56" fetchPriority="high"
                  />
                </picture>
              </button>
              <button
                onClick={handleMobileNavClick}
                className="p-2 rounded-md hover:opacity-80 transition-colors"
                style={{ color: '#cccc99' }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="space-y-4">
              {/* Language Switcher - First item in RTL mobile menu */}
              {isRTL && (
                <div>
                  <button
                    onClick={() => {
                      const newLang = i18n.language === 'ar' ? 'en' : 'ar';
                      i18n.changeLanguage(newLang);
                      updateHtmlAttributes(newLang);
                    }}
                    className={`flex items-center justify-between w-full font-medium hover:opacity-80 transition-colors py-2 cursor-pointer ${isRTL ? 'font-arabic text-right' : 'text-left'}`}
                    style={{ color: '#cccc99' }}
                  >
                    <span>{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
                  </button>
                </div>
              )}
              
              {displayNavigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleMobileNavClick}
                  className={`flex items-center justify-between w-full font-medium hover:opacity-80 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${isRTL ? 'font-arabic text-right' : 'text-left'}`}
                  style={{ color: '#cccc99' }}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.soon && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#cccc99]/20 text-[#cccc99] border border-[#cccc99]/30" style={{ fontSize: '0.65rem' }}>
                        {isRTL ? 'قريبًا' : 'Soon'}
                      </span>
                    )}
                  </span>
                </Link>
              ))}

              {/* Language Switcher - Last item in LTR mobile menu */}
              {!isRTL && (
                <div>
                  <button
                    onClick={() => {
                      const newLang = i18n.language === 'ar' ? 'en' : 'ar';
                      i18n.changeLanguage(newLang);
                      updateHtmlAttributes(newLang);
                    }}
                    className={`flex items-center justify-between w-full font-medium hover:opacity-80 transition-colors py-2 cursor-pointer ${isRTL ? 'font-arabic text-right' : 'text-left'}`}
                    style={{ color: '#cccc99' }}
                  >
                    <span>{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
                  </button>
                </div>
              )}
            </nav>

            <div className="pt-4 px-2 pb-2 space-y-3 mt-8">
              
              {/* Book Consultation Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenConsultation) {
                    onOpenConsultation();
                  } else {
                    scrollToSection("contact");
                  }
                  handleMobileNavClick();
                }}
                className={`w-full px-4 sm:px-6 py-3 rounded-xl font-bold text-base shadow-md hover:opacity-90 transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[52px] ${isRTL ? 'font-arabic flex-row-reverse' : ''}`}
                style={{ backgroundColor: '#cccc99', color: '#003300' }}
              >
                <span className="truncate">{t('navigation.followUs')}</span>
                <ArrowIcon className="w-5 h-5 flex-shrink-0" />
                    </button>

                  {isAuthenticated && (
                    <Link to={ROUTES.DASHBOARD} onClick={handleMobileNavClick}>
                  <button className={`w-full px-4 sm:px-6 py-3 rounded-xl font-bold text-base shadow-md hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer min-h-[52px] ${isRTL ? 'font-arabic flex-row-reverse' : ''}`} style={{ backgroundColor: '#cccc99', color: '#003300' }}>
                    <span className="truncate">{t('navigation.dashboard')}</span>
                    <ArrowIcon className="w-5 h-5 flex-shrink-0" />
                      </button>
                    </Link>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </header>
  );
};
