import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Public namespaces — always needed
import enHome from './locales/en/home.json';
import arHome from './locales/ar/home.json';
import enTraining from './locales/en/training.json';
import arTraining from './locales/ar/training.json';
import enTechnicalProjects from './locales/en/technicalProjects.json';
import arTechnicalProjects from './locales/ar/technicalProjects.json';
import enThreeDPrinting from './locales/en/threeDPrinting.json';
import arThreeDPrinting from './locales/ar/threeDPrinting.json';
import enTechnicalConsultation from './locales/en/technicalConsultation.json';
import arTechnicalConsultation from './locales/ar/technicalConsultation.json';
import enCurriculumDesign from './locales/en/curriculumDesign.json';
import arCurriculumDesign from './locales/ar/curriculumDesign.json';
import enStemLabSetup from './locales/en/stemLabSetup.json';
import arStemLabSetup from './locales/ar/stemLabSetup.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        home: enHome,
        training: enTraining,
        technicalProjects: enTechnicalProjects,
        threeDPrinting: enThreeDPrinting,
        technicalConsultation: enTechnicalConsultation,
        curriculumDesign: enCurriculumDesign,
        stemLabSetup: enStemLabSetup,
      },
      ar: {
        home: arHome,
        training: arTraining,
        technicalProjects: arTechnicalProjects,
        threeDPrinting: arThreeDPrinting,
        technicalConsultation: arTechnicalConsultation,
        curriculumDesign: arCurriculumDesign,
        stemLabSetup: arStemLabSetup,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'home',
    ns: ['home', 'training', 'technicalProjects', 'threeDPrinting', 'technicalConsultation', 'curriculumDesign', 'stemLabSetup'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Helper to get current direction
export const getDirection = (lng?: string): 'ltr' | 'rtl' => {
  const language = lng || i18n.language;
  return language === 'ar' ? 'rtl' : 'ltr';
};

// Update HTML dir and lang attributes
export const updateHtmlAttributes = (lng?: string) => {
  const language = lng || i18n.language;
  const dir = getDirection(language);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
  }
};

// Lazy-load dashboard translations — only needed when user is authenticated
export const loadDashboardTranslations = async () => {
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const langs = ['en', 'ar'];

  const namespaces = ['dashboardNav', 'dashboardCommon', 'dashboardStudent', 'dashboardTrainer', 'dashboardReception', 'dashboardCLO', 'dashboardAdmin'];

  const alreadyLoaded = namespaces.every(ns => i18n.hasResourceBundle('en', ns));
  if (alreadyLoaded) return;

  const [
    enNav, arNav,
    enCommon, arCommon,
    enStudent, arStudent,
    enTrainer, arTrainer,
    enReception, arReception,
    enCLO, arCLO,
    enAdmin, arAdmin,
  ] = await Promise.all([
    import('./locales/en/dashboardNav.json'),
    import('./locales/ar/dashboardNav.json'),
    import('./locales/en/dashboardCommon.json'),
    import('./locales/ar/dashboardCommon.json'),
    import('./locales/en/dashboardStudent.json'),
    import('./locales/ar/dashboardStudent.json'),
    import('./locales/en/dashboardTrainer.json'),
    import('./locales/ar/dashboardTrainer.json'),
    import('./locales/en/dashboardReception.json'),
    import('./locales/ar/dashboardReception.json'),
    import('./locales/en/dashboardCLO.json'),
    import('./locales/ar/dashboardCLO.json'),
    import('./locales/en/dashboardAdmin.json'),
    import('./locales/ar/dashboardAdmin.json'),
  ]);

  i18n.addResourceBundle('en', 'dashboardNav', enNav.default, true, true);
  i18n.addResourceBundle('ar', 'dashboardNav', arNav.default, true, true);
  i18n.addResourceBundle('en', 'dashboardCommon', enCommon.default, true, true);
  i18n.addResourceBundle('ar', 'dashboardCommon', arCommon.default, true, true);
  i18n.addResourceBundle('en', 'dashboardStudent', enStudent.default, true, true);
  i18n.addResourceBundle('ar', 'dashboardStudent', arStudent.default, true, true);
  i18n.addResourceBundle('en', 'dashboardTrainer', enTrainer.default, true, true);
  i18n.addResourceBundle('ar', 'dashboardTrainer', arTrainer.default, true, true);
  i18n.addResourceBundle('en', 'dashboardReception', enReception.default, true, true);
  i18n.addResourceBundle('ar', 'dashboardReception', arReception.default, true, true);
  i18n.addResourceBundle('en', 'dashboardCLO', enCLO.default, true, true);
  i18n.addResourceBundle('ar', 'dashboardCLO', arCLO.default, true, true);
  i18n.addResourceBundle('en', 'dashboardAdmin', enAdmin.default, true, true);
  i18n.addResourceBundle('ar', 'dashboardAdmin', arAdmin.default, true, true);
};

// Inject Arabic font stylesheet only for Arabic locale.
// Skipping this for English visitors saves ~150–200 KB of font data.
const ARABIC_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700;900&display=swap';

let arabicFontsLoaded = false;
const loadArabicFonts = () => {
  if (arabicFontsLoaded || typeof document === 'undefined') return;
  arabicFontsLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = ARABIC_FONT_URL;
  document.head.appendChild(link);
};

// Listen to language changes
i18n.on('languageChanged', (lng) => {
  updateHtmlAttributes(lng);
  if (lng === 'ar') loadArabicFonts();
});

// Initialize on load
if (typeof window !== 'undefined') {
  updateHtmlAttributes();
  // Load Arabic fonts immediately if user's saved language is Arabic
  if (i18n.language === 'ar') loadArabicFonts();
}

export default i18n;
