// All icons come from the react-icons library:
//   • Lucide set (react-icons/lu) for every interface icon
//   • Tabler set (react-icons/tb) for the drone, which Lucide doesn't include
//   • Font Awesome 6 brands (react-icons/fa6) for the social / WhatsApp logos
// Components use <Icon name="…" /> so the whole site shares one consistent mapping.
import type { IconType } from 'react-icons';
import {
  LuArrowLeft, LuArrowRight, LuArrowUpRight, LuAward, LuBookOpen, LuBot, LuBrainCircuit, LuBox, LuCalendarDays, LuCheck, LuChevronDown,
  LuChevronLeft, LuChevronRight, LuChevronUp, LuClock, LuCodeXml, LuCog, LuCompass, LuCpu, LuEye, LuEyeOff, LuFileText, LuFlaskConical,
  LuGlasses, LuGraduationCap, LuHeart, LuImage, LuLayers, LuLeaf, LuLightbulb, LuLock, LuLogIn, LuMail, LuMapPin, LuMedal, LuMenu,
  LuMessagesSquare, LuPaintbrush, LuPhone, LuPlay, LuPlus, LuPrinter, LuScale, LuSchool, LuSearch, LuShieldCheck, LuSnowflake,
  LuSparkles, LuSquareCheck, LuSun, LuTarget, LuTrophy, LuUsers, LuWrench, LuX, LuZap,
} from 'react-icons/lu';
import { TbDrone } from 'react-icons/tb';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa6';

const ICONS = {
  // Training departments & services
  robot: LuBot, bot: LuBot, drone: TbDrone, ai: LuBrainCircuit, cube: LuBox, vr: LuGlasses, compass: LuCompass, code: LuCodeXml, chip: LuCpu,
  gear: LuCog, printer: LuPrinter, chat: LuMessagesSquare, book: LuBookOpen, graduation: LuGraduationCap, flask: LuFlaskConical, school: LuSchool,
  // Achievements & values
  trophy: LuTrophy, medal: LuMedal, award: LuAward, target: LuTarget, spark: LuSparkles, heart: LuHeart, leaf: LuLeaf, users: LuUsers,
  // Seasons & time
  sun: LuSun, snow: LuSnowflake, calendar: LuCalendarDays, clock: LuClock,
  // Features & misc
  check: LuCheck, checkSquare: LuSquareCheck, shield: LuShieldCheck, doc: LuFileText, lock: LuLock, tool: LuWrench, wrench: LuWrench,
  layers: LuLayers, bolt: LuZap, scale: LuScale, brush: LuPaintbrush, lightbulb: LuLightbulb, image: LuImage, play: LuPlay,
  // Contact
  phone: LuPhone, mail: LuMail, pin: LuMapPin, search: LuSearch,
  // UI controls
  menu: LuMenu, x: LuX, plus: LuPlus, chevron: LuChevronDown, chevronUp: LuChevronUp, chevronLeft: LuChevronLeft, chevronRight: LuChevronRight,
  arrowRight: LuArrowRight, arrowLeft: LuArrowLeft, arrowUpRight: LuArrowUpRight, eye: LuEye, eyeOff: LuEyeOff, logIn: LuLogIn,
  // Brands
  whatsapp: FaWhatsapp, facebook: FaFacebookF, instagram: FaInstagram, linkedin: FaLinkedinIn,
} satisfies Record<string, IconType>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const Cmp = ICONS[name];
  return <Cmp className={className} aria-hidden="true" focusable="false" />;
}
