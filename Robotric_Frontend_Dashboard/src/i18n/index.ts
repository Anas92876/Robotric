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
    // Dashboard translations are added after the first render (loadDashboardTranslations);
    // re-render components when they arrive instead of leaving the raw keys on screen.
    react: {
      bindI18nStore: 'added',
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

// Dashboard translations are loaded lazily, and only for the language in use
// (the Arabic files are complete, so nobody needs both). Switching language
// loads the other one then.
const DASHBOARD_NAMESPACES = ['dashboardNav', 'dashboardCommon', 'dashboardStudent', 'dashboardTrainer', 'dashboardReception', 'dashboardCLO', 'dashboardAdmin'];
const dashboardLocaleFiles = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*/dashboard*.json');
let dashboardTranslationsWanted = false;

export const loadDashboardTranslations = async (lng: string = i18n.language) => {
  dashboardTranslationsWanted = true;
  const lang = lng === 'ar' ? 'ar' : 'en';
  const missing = DASHBOARD_NAMESPACES.filter((ns) => !i18n.hasResourceBundle(lang, ns));
  await Promise.all(
    missing.map(async (ns) => {
      const file = await dashboardLocaleFiles[`./locales/${lang}/${ns}.json`]();
      i18n.addResourceBundle(lang, ns, file.default, true, true);
    }),
  );
};

// Listen to language changes
i18n.on('languageChanged', (lng) => {
  updateHtmlAttributes(lng);
  if (dashboardTranslationsWanted) void loadDashboardTranslations(lng);
});

// Initialize on load
if (typeof window !== 'undefined') {
  updateHtmlAttributes();
}

export default i18n;
