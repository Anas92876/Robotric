import type { IconName } from './icons';

// The six services, in the live site's order. Names/descriptions come from home.navigation.servicesDropdown.
export const SERVICES: { slug: string; key: 'training' | 'projects' | 'printing' | 'consultation' | 'curriculumDesign' | 'stemLabSetup'; icon: IconName; tint: string }[] = [
  { slug: 'training', key: 'training', icon: 'robot', tint: 'leaf' },
  { slug: 'technical-projects', key: 'projects', icon: 'gear', tint: 'khaki' },
  { slug: '3d-printing', key: 'printing', icon: 'printer', tint: 'cream' },
  { slug: 'technical-consultation', key: 'consultation', icon: 'chat', tint: 'sand' },
  { slug: 'curriculum-design', key: 'curriculumDesign', icon: 'book', tint: 'moss' },
  { slug: 'stem-lab-setup', key: 'stemLabSetup', icon: 'flask', tint: 'sage' },
];
