import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes.constants";
import { ContactCTA } from "../home/ContactCTA";

// SVG Icons - Memoized and with proper accessibility
// Outline location pin icon
const LocationIcon = memo(() => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
));
LocationIcon.displayName = 'LocationIcon';

const EmailIcon = memo(() => (
  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="14" viewBox="0 0 21 14" fill="none" aria-hidden="true">
    <g clipPath="url(#clip0_email)">
      <path d="M18.6405 13.3963H2.84772C1.61217 13.3963 0.598389 12.4163 0.598389 11.2219V2.37097C0.598389 1.17656 1.61217 0.196533 2.84772 0.196533H18.6405C19.8761 0.196533 20.8899 1.17656 20.8899 2.37097V11.2065C20.8899 12.4009 19.8761 13.381 18.6405 13.381V13.3963ZM2.84772 1.345C2.26162 1.345 1.77057 1.80439 1.77057 2.38628V11.2219C1.77057 11.7884 2.24578 12.2631 2.84772 12.2631H18.6405C19.2266 12.2631 19.7177 11.8037 19.7177 11.2219V2.37097C19.7177 1.80439 19.2425 1.32969 18.6405 1.32969H2.84772V1.345Z" fill="currentColor"/>
      <path d="M10.7524 7.77656C10.2613 7.77656 9.75442 7.63874 9.34257 7.36311L2.51538 2.84579C2.2461 2.66204 2.18273 2.30984 2.35698 2.04952C2.54706 1.7892 2.91139 1.72795 3.18068 1.89639L9.99202 6.3984C10.4356 6.68934 11.0375 6.68934 11.481 6.3984L18.3082 1.88108C18.5775 1.71263 18.9418 1.77389 19.1319 2.03421C19.322 2.29453 19.2428 2.64672 18.9735 2.83048L12.1621 7.33248C11.7345 7.60812 11.2434 7.74593 10.7524 7.74593V7.77656Z" fill="currentColor"/>
      <path d="M2.84775 11.7887C2.6735 11.7887 2.51508 11.7121 2.38835 11.5896C2.18241 11.3445 2.2141 10.9923 2.46756 10.7779L7.45758 6.76569C7.71105 6.56661 8.0754 6.59723 8.28134 6.84226C8.48727 7.08728 8.45559 7.4395 8.20213 7.65389L3.2121 11.6661C3.10121 11.758 2.97448 11.804 2.83191 11.804L2.84775 11.7887Z" fill="currentColor"/>
      <path d="M18.6412 11.7888C18.5145 11.7888 18.3719 11.7429 18.2611 11.651L13.271 7.63876C13.0176 7.43968 12.9859 7.07214 13.1918 6.82712C13.3978 6.5821 13.7779 6.55147 14.0156 6.75055L19.0056 10.7628C19.2591 10.9619 19.2907 11.3294 19.0848 11.5744C18.9739 11.7123 18.7997 11.7735 18.6254 11.7735L18.6412 11.7888Z" fill="currentColor"/>
    </g>
    <defs>
      <clipPath id="clip0_email">
        <rect width="20.3073" height="13.1998" fill="white" transform="translate(0.598389 0.196533)"/>
      </clipPath>
    </defs>
  </svg>
));
EmailIcon.displayName = 'EmailIcon';

const PhoneIcon = memo(() => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <g clipPath="url(#clip0_phone)">
      <path d="M17.6532 7.81629C16.1361 4.33102 13.4025 1.61114 9.97192 0.176033C9.6849 0.053024 9.35687 0.203369 9.24753 0.490391C9.13819 0.791081 9.27487 1.11911 9.56189 1.24212C12.7191 2.56788 15.234 5.06908 16.6418 8.28099C16.7374 8.49967 16.9425 8.62268 17.1475 8.62268C17.2295 8.62268 17.2978 8.60901 17.3798 8.56801C17.6668 8.43133 17.7899 8.10331 17.6668 7.80262" fill="currentColor"/>
      <path d="M9.26154 4.31721C11.175 5.12361 12.7058 6.62706 13.5532 8.58154C13.6489 8.78656 13.8402 8.90957 14.0452 8.90957C14.1136 8.90957 14.1956 8.8959 14.2639 8.8549C14.5373 8.73189 14.6603 8.40386 14.5373 8.11684C13.5805 5.90267 11.8447 4.19421 9.67157 3.27847C9.39821 3.16913 9.08386 3.3058 8.97451 3.57916C8.86517 3.86618 9.00185 4.19421 9.2752 4.30355" fill="currentColor"/>
      <path d="M14.7142 11.0413C14.4135 10.7406 14.0582 10.5902 13.7165 10.5902C13.3749 10.5902 13.0332 10.7406 12.7188 11.0413C12.2542 11.5059 11.7895 11.9569 11.3248 12.4353C11.2428 12.5173 11.1745 12.5583 11.1062 12.5583C11.0515 12.5583 11.0105 12.5446 10.9422 12.5036C10.6415 12.3396 10.3272 12.2029 10.0265 12.0253C8.67346 11.1779 7.55278 10.0846 6.54144 8.85456C6.04943 8.23955 5.59843 7.59721 5.29776 6.8592C5.22942 6.70887 5.24309 6.6132 5.36609 6.4902C5.83076 6.03919 6.28177 5.57452 6.74644 5.12351C7.38878 4.48117 7.38878 3.72949 6.74644 3.08715C6.37744 2.71815 6.0221 2.36281 5.65309 1.99381C5.28409 1.6248 4.90142 1.24213 4.53241 0.873125C4.23174 0.572454 3.8764 0.422119 3.53473 0.422119C3.19306 0.422119 2.85139 0.572454 2.53705 0.873125C2.07238 1.3378 1.62138 1.80247 1.14304 2.26714C0.719364 2.67715 0.487028 3.18282 0.446027 3.78416C0.377693 4.75451 0.610029 5.67019 0.9517 6.5722C1.63504 8.43089 2.68739 10.0709 3.9584 11.5743C5.68043 13.6106 7.71679 15.2233 10.1221 16.3987C11.2018 16.918 12.3225 17.328 13.5389 17.3963C13.6072 17.3963 13.6892 17.3963 13.7575 17.3963C14.5092 17.3963 15.1515 17.164 15.6846 16.5763C16.0809 16.1253 16.5319 15.729 16.9556 15.2916C17.5842 14.663 17.5842 13.8976 16.9556 13.2689C16.2176 12.5173 15.4659 11.7793 14.7142 11.0413ZM16.1356 14.499C15.9989 14.6356 15.8486 14.7723 15.7119 14.9226C15.4249 15.2096 15.1105 15.4966 14.8235 15.8246C14.5502 16.139 14.2222 16.2757 13.7439 16.2757C13.6892 16.2757 13.6345 16.2757 13.5935 16.2757C12.6915 16.221 11.7622 15.9613 10.6142 15.401C8.38646 14.3213 6.44577 12.7906 4.81942 10.8636C3.52107 9.31923 2.60539 7.80221 2.00405 6.18953C1.64871 5.26018 1.52571 4.5495 1.56671 3.8935C1.59404 3.55183 1.70338 3.30582 1.93571 3.10082C2.23638 2.81382 2.50972 2.54048 2.79672 2.23981C2.97439 2.06214 3.15206 1.8708 3.3434 1.69314C3.43907 1.59747 3.52107 1.57013 3.5484 1.57013C3.57573 1.57013 3.64407 1.59747 3.7534 1.69314C3.99941 1.93914 4.24541 2.18514 4.49141 2.43114L4.86042 2.80015C5.05175 2.99149 5.22942 3.16915 5.42076 3.36049C5.61209 3.55183 5.77609 3.71583 5.95376 3.8935C6.15877 4.0985 6.1451 4.1395 5.95376 4.33084L5.76243 4.52217C5.37976 4.91851 4.98342 5.30118 4.58708 5.69752C4.14974 6.13486 4.02674 6.72253 4.27274 7.31021C4.58708 8.07555 5.03808 8.78623 5.68043 9.5789C6.85577 11.0276 8.08579 12.1483 9.43881 12.9956C9.65748 13.1323 9.88981 13.2416 10.0811 13.3373C10.1905 13.392 10.2998 13.4466 10.3818 13.4876C10.6142 13.6243 10.8465 13.679 11.0925 13.679C11.3658 13.679 11.7622 13.597 12.1312 13.2143C12.5822 12.7496 13.0332 12.2986 13.5115 11.8339C13.6072 11.7383 13.6892 11.7109 13.7029 11.7109C13.7165 11.7109 13.7985 11.7383 13.8942 11.8339C14.6459 12.5719 15.3839 13.3099 16.1219 14.0616C16.2996 14.2393 16.3132 14.294 16.1219 14.4853" fill="currentColor"/>
    </g>
    <defs>
      <clipPath id="clip0_phone">
        <rect width="17.2612" height="17.2612" fill="white" transform="translate(0.432861 0.135132)"/>
      </clipPath>
    </defs>
  </svg>
));
PhoneIcon.displayName = 'PhoneIcon';

const FacebookIcon = () => (
  <svg aria-hidden="true" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
    <path d="M22 12.07C22 6.48 17.52 2 12 2S2 6.48 2 12.07c0 5.02 3.66 9.17 8.44 9.93v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34v7.03C18.34 21.24 22 17.09 22 12.07z" />
  </svg>
);

const InstagramIcon = () => (
  <svg aria-hidden="true" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zm4.25 3.25a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5zm0 1.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5zm5.25.75a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
  </svg>
);

const WhatsappIcon = () => (
  <svg aria-hidden="true" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.028-.967-.271-.099-.468-.148-.666.15-.198.297-.767.967-.94 1.166-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.173.198-.297.298-.495.099-.198.05-.372-.025-.521-.075-.149-.666-1.611-.912-2.207-.242-.579-.487-.5-.666-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.075-.792.372-.271.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.205 5.077 4.381.711.306 1.263.489 1.694.625.712.227 1.361.195 1.874.118.572-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.075-.124-.271-.198-.568-.347z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg aria-hidden="true" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export const Footer: React.FC = memo(() => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Contact CTA Section - Appears above footer on all pages */}
      <ContactCTA />
      
      <footer className="relative pt-6 sm:pt-8 pb-4 sm:pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" style={{ backgroundColor: '#003300' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Main Footer Content - Compact with vertical dividers */}
        <div className={`flex flex-col lg:flex-row gap-0 mb-4 sm:mb-6 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
          {/* Contact Info */}
          <div className={`flex-1 px-3 sm:px-4 py-4 sm:py-5 md:py-6 ${isRTL ? '' : 'lg:border-r'}`} style={{ borderColor: 'rgba(204, 204, 153, 0.3)' }}>
        {/* Logo */}
            <div className={`mb-3 sm:mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Link 
                to="/" 
                className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded transition-opacity hover:opacity-80"
                aria-label={isRTL ? 'الصفحة الرئيسية' : 'Home'}
              >
          <img
            src="/logo.png"
            alt="Robotrick Logo"
                  className="h-16 sm:h-18 md:h-20 w-auto object-contain max-w-[140px] sm:max-w-[160px] md:max-w-[180px]"
                  loading="lazy"
          />
              </Link>
        </div>

            <h2 className={`font-bold text-sm sm:text-base mb-2 sm:mb-3 relative pb-2 ${isRTL ? 'font-arabic' : ''}`} style={{ color: '#cccc99', textAlign: isRTL ? 'right' : 'left' }}>
              {t('footer.contactInfo')}
              <span className={`absolute bottom-0 w-10 sm:w-12 h-0.5`} style={{ backgroundColor: '#cccc99', [isRTL ? 'right' : 'left']: 0 }}></span>
            </h2>
            
            {/* Address */}
            <address className="mb-2 sm:mb-3 not-italic">
              <a
                href="https://maps.app.goo.gl/hiXH455azQDmafsp8"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-start gap-2 hover:opacity-80 transition-opacity text-xs sm:text-sm min-h-[44px] ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ color: '#cccc99', textAlign: isRTL ? 'right' : 'left' }}
                aria-label={`${t('footer.address')} - ${isRTL ? 'افتح في خرائط جوجل' : 'Open in Google Maps'}`}
              >
                <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 mt-0.5" style={{ color: '#cccc99' }}>
                  <LocationIcon />
                </div>
                <span className={`flex-1 ${isRTL ? 'font-arabic' : ''}`} style={{ whiteSpace: 'pre-line' }}>
                  {t('footer.address')}
                </span>
              </a>
            </address>

            {/* Email and Phone */}
            <div className="space-y-2">
              <a
                href="mailto:robotrick.co@gmail.com"
                className={`flex items-center gap-2 hover:opacity-80 transition-opacity text-xs sm:text-sm min-h-[44px] ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ color: '#cccc99', textAlign: isRTL ? 'right' : 'left' }}
                aria-label={`${isRTL ? 'أرسل بريد إلكتروني إلى' : 'Send email to'} robotrick.co@gmail.com`}
              >
                <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#cccc99' }}>
                  <EmailIcon />
                </div>
                <span className={`flex-1 break-all ${isRTL ? 'font-arabic' : ''}`}>robotrick.co@gmail.com</span>
              </a>
              <a
                href="tel:+963942060440"
                className={`flex items-center gap-2 hover:opacity-80 transition-opacity text-xs sm:text-sm min-h-[44px] ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ color: '#cccc99', textAlign: isRTL ? 'right' : 'left' }}
                aria-label={`${isRTL ? 'اتصل على' : 'Call'} 0942060440`}
              >
                <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#cccc99' }}>
                  <PhoneIcon />
                </div>
                <span className={`flex-1 ${isRTL ? 'font-arabic' : ''}`}>0942060440</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <nav aria-label={t('footer.quickLinks')} className={`flex-1 px-3 sm:px-4 py-4 sm:py-5 md:py-6 ${isRTL ? 'lg:border-l' : 'lg:border-r'}`} style={{ borderColor: 'rgba(204, 204, 153, 0.3)' }}>
            <h2 className={`font-bold text-sm sm:text-base mb-2 sm:mb-3 relative pb-2 ${isRTL ? 'font-arabic' : ''}`} style={{ color: '#cccc99', textAlign: isRTL ? 'right' : 'left' }}>
              {t('footer.quickLinks')}
              <span className={`absolute bottom-0 w-10 sm:w-12 h-0.5`} style={{ backgroundColor: '#cccc99', [isRTL ? 'right' : 'left']: 0 }}></span>
            </h2>
            <ul className="space-y-1 sm:space-y-1.5">
              <li>
                <Link
                  to={ROUTES.ABOUT}
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.about')}
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.SERVICES}
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.services')}
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.BLOG}
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.blog')}
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.JOIN_US}
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.joinUs')}
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.CONTACT}
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.contact')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Services */}
          <nav aria-label={t('navigation.services')} className={`flex-1 px-3 sm:px-4 py-4 sm:py-5 md:py-6 ${isRTL ? 'lg:border-l' : ''}`} style={{ borderColor: 'rgba(204, 204, 153, 0.3)' }}>
            <h2 className={`font-bold text-sm sm:text-base mb-2 sm:mb-3 relative pb-2 ${isRTL ? 'font-arabic' : ''}`} style={{ color: '#cccc99', textAlign: isRTL ? 'right' : 'left' }}>
              {t('navigation.services')}
              <span className={`absolute bottom-0 w-10 sm:w-12 h-0.5`} style={{ backgroundColor: '#cccc99', [isRTL ? 'right' : 'left']: 0 }}></span>
            </h2>
            <ul className="space-y-1 sm:space-y-1.5">
              <li>
                <Link
                  to="/services/training"
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.servicesDropdown.training')}
                </Link>
              </li>
              <li>
                <Link
                  to="/services/technical-projects"
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.servicesDropdown.projects')}
                </Link>
              </li>
              <li>
                <Link
                  to="/services/3d-printing"
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.servicesDropdown.printing')}
                </Link>
              </li>
              <li>
                <Link
                  to="/services/technical-consultation"
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.servicesDropdown.consultation')}
                </Link>
              </li>
              <li>
                <Link
                  to="/services/curriculum-design"
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.servicesDropdown.curriculumDesign')}
                </Link>
              </li>
              <li>
                <Link
                  to="/services/stem-lab-setup"
                  className={`hover:opacity-80 transition-opacity text-xs sm:text-sm block py-2 sm:py-2.5 min-h-[44px] flex items-center ${isRTL ? 'font-arabic' : ''} focus:outline-none focus-visible:ring-2 rounded`}
                  style={{ color: '#cccc99' }}
                >
                  {t('navigation.servicesDropdown.stemLabSetup')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Social Media Links */}
        <div className="pt-3 sm:pt-4 mb-3 sm:mb-4">
          <div className="flex items-center justify-center gap-5 sm:gap-6 md:gap-8">
            <a
              href="https://www.facebook.com/profile.php?id=61561504957102"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-11 h-11 sm:w-12 sm:h-12 hover:opacity-80 transition-opacity flex items-center justify-center focus:outline-none focus-visible:ring-2 rounded min-w-[44px] min-h-[44px]"
              style={{ color: '#cccc99' }}
            >
              <FacebookIcon />
            </a>
            <a
              href="https://www.instagram.com/robo_trick01/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-11 h-11 sm:w-12 sm:h-12 hover:opacity-80 transition-opacity flex items-center justify-center focus:outline-none focus-visible:ring-2 rounded min-w-[44px] min-h-[44px]"
              style={{ color: '#cccc99' }}
            >
              <InstagramIcon />
            </a>
            <a
              href="https://wa.me/+963942060440"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-11 h-11 sm:w-12 sm:h-12 hover:opacity-80 transition-opacity flex items-center justify-center focus:outline-none focus-visible:ring-2 rounded min-w-[44px] min-h-[44px]"
              style={{ color: '#cccc99' }}
            >
              <WhatsappIcon />
            </a>
            <a
              href="https://www.linkedin.com/company/robotrick-co/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-11 h-11 sm:w-12 sm:h-12 hover:opacity-80 transition-opacity flex items-center justify-center focus:outline-none focus-visible:ring-2 rounded min-w-[44px] min-h-[44px]"
              style={{ color: '#cccc99' }}
            >
              <LinkedinIcon />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-3 sm:pt-4">
          <div className="flex flex-col items-center gap-1 text-xs sm:text-sm text-center px-2">
            <p className={`${isRTL ? 'font-arabic' : ''} leading-relaxed`} style={{ color: '#cccc99' }}>
              © {currentYear} <span className="font-bold" style={{ color: '#cccc99' }}>Robotrick</span> — {t('footer.copyright')}
            </p>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
});

Footer.displayName = 'Footer';

export default Footer;
