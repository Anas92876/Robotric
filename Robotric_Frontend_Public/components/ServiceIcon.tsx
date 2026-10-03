// Services menu icons — from react-icons (Lucide set), one per service
import { Icon, type IconName } from '@/lib/icons';

const SERVICE_ICONS: Record<string, IconName> = {
  training: 'robot',
  projects: 'gear',
  printing: 'printer',
  consultation: 'chat',
  curriculumDesign: 'graduation',
  stemLabSetup: 'flask',
};

export default function ServiceIcon({ name, className }: { name: string; className?: string }) {
  return <Icon name={SERVICE_ICONS[name] ?? 'robot'} className={className} />;
}
