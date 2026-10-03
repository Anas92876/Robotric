import 'server-only';
import type { Locale } from './i18n-config';

// All page copy lives in content/<lang>/*.json (extracted from robotrick.net). English defines the shape.
import enSite from '@/content/en/site.json';
import enHome from '@/content/en/home.json';
import enTrainingIntro from '@/content/en/training-intro.json';
import enTrainingMap from '@/content/en/training-map.json';
import enProjects from '@/content/en/technical-projects.json';
import enPrinting from '@/content/en/3d-printing.json';
import enConsultation from '@/content/en/technical-consultation.json';
import enCurriculum from '@/content/en/curriculum-design.json';
import enStem from '@/content/en/stem-lab-setup.json';
import arSite from '@/content/ar/site.json';
import arHome from '@/content/ar/home.json';
import arTrainingIntro from '@/content/ar/training-intro.json';
import arTrainingMap from '@/content/ar/training-map.json';
import arProjects from '@/content/ar/technical-projects.json';
import arPrinting from '@/content/ar/3d-printing.json';
import arConsultation from '@/content/ar/technical-consultation.json';
import arCurriculum from '@/content/ar/curriculum-design.json';
import arStem from '@/content/ar/stem-lab-setup.json';

const en = {
  site: enSite, home: enHome, trainingIntro: enTrainingIntro, trainingMap: enTrainingMap, projects: enProjects,
  printing: enPrinting, consultation: enConsultation, curriculum: enCurriculum, stem: enStem,
};
export type Content = typeof en;

// Arabic files have the same structure; the English-only FAQ corrections are optional there.
const ar = {
  site: arSite, home: arHome, trainingIntro: arTrainingIntro, trainingMap: arTrainingMap, projects: arProjects,
  printing: arPrinting, consultation: arConsultation, curriculum: arCurriculum, stem: arStem,
} as unknown as Content;

export const getContent = (lang: Locale): Content => (lang === 'ar' ? ar : en);
