import { Avatar } from "../ui/Avatar";
import { Linkedin, Twitter, ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

// Simple social icon components
const X = ({ className }: { className?: string }) => (
  <Twitter className={className} />
);

const LinkedIn = ({ className }: { className?: string }) => (
  <Linkedin className={className} />
);

const Dribbble = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm6.344 4.102c1.35.45 2.538 1.2 3.504 2.148.12.12.228.24.324.36-.45.9-1.05 1.725-1.8 2.4-.15-.45-.33-.9-.54-1.35-.75-.15-1.575-.3-2.4-.3-.3 0-.6.015-.9.045-1.2-2.25-2.7-4.35-4.5-6.15 1.875.45 3.6 1.2 5.1 2.25.15.12.3.24.435.36.15.15.3.3.435.45zm-3.75 1.8c.3 0 .6.03.9.075.15.45.3.9.42 1.35-1.35-.3-2.7-.45-4.05-.45-1.05 0-2.1.15-3.15.45.6-1.2 1.35-2.25 2.25-3.15 1.2.45 2.4 1.05 3.45 1.8.15.15.3.3.435.45.15.15.3.3.435.45.15.15.3.3.42.45zm-4.5-3.15c1.8 1.8 3.3 3.9 4.5 6.15-1.2.3-2.4.45-3.6.45-1.05 0-2.1-.15-3.15-.45 1.2-2.25 2.7-4.35 4.5-6.15zm-6.15 3.15c.15-.15.3-.3.45-.45 1.5-1.05 3.225-1.8 5.1-2.25-1.8 1.8-3.3 3.9-4.5 6.15-1.2-.3-2.4-.45-3.6-.45-.75 0-1.5.075-2.25.225.45-.9 1.05-1.725 1.8-2.4zm-2.25 3.6c.75 0 1.5.075 2.25.225.15.45.3.9.42 1.35-1.35.3-2.7.6-3.9 1.05-.15-.45-.3-.9-.42-1.35.6-.15 1.2-.225 1.8-.225zm2.25 1.05c1.2.45 2.55.75 3.9 1.05-.15.45-.3.9-.42 1.35-1.2-.3-2.4-.6-3.6-1.05.15-.45.3-.9.42-1.35zm3.75 1.05c1.35 0 2.7.15 4.05.45.15.45.3.9.42 1.35-1.35.3-2.7.6-3.9 1.05-.15-.45-.3-.9-.42-1.35-.6-.15-1.2-.225-1.8-.225zm3.75 1.05c1.2.45 2.55.75 3.9 1.05-.15.45-.3.9-.42 1.35-1.2-.3-2.4-.6-3.6-1.05.15-.45.3-.9.42-1.35zm-3.75 1.05c.6 0 1.2.075 1.8.225.15.45.3.9.42 1.35-1.35.3-2.7.6-3.9 1.05-.15-.45-.3-.9-.42-1.35-.6-.15-1.2-.225-1.8-.225zm3.75 1.05c1.2.45 2.55.75 3.9 1.05-.15.45-.3.9-.42 1.35-1.2-.3-2.4-.6-3.6-1.05.15-.45.3-.9.42-1.35zm-3.75 1.05c.6 0 1.2.075 1.8.225.15.45.3.9.42 1.35-1.35.3-2.7.6-3.9 1.05-.15-.45-.3-.9-.42-1.35-.6-.15-1.2-.225-1.8-.225z"/>
  </svg>
);

const teamMembers = [
  {
    name: "Amélie Laurent",
    title: "Founder & CEO",
    summary: "Former co-founder of Opendoor. Early staff at Spotify and Clearbit.",
    avatarUrl: "https://www.untitledui.com/images/avatars/amelie-laurent?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Nikolas Gibbons",
    title: "Engineering Manager",
    summary: "Lead engineering teams at Figma, Pitch, and Protocol Labs.",
    avatarUrl: "https://www.untitledui.com/images/avatars/nikolas-gibbons?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Sienna Hewitt",
    title: "Product Manager",
    summary: "Former PM for Linear, Lambda School, and On Deck.",
    avatarUrl: "https://www.untitledui.com/images/avatars/sienna-hewitt?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Lily-Rose Chedjou",
    title: "Frontend Developer",
    summary: "Former frontend dev for Linear, Coinbase, and Postscript.",
    avatarUrl: "https://www.untitledui.com/images/avatars/lily-rose-chedjou?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
];

export const TeamSectionSimple01 = () => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="py-16 md:py-24 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className={`mx-auto flex w-full max-w-3xl flex-col items-center text-center ${isRTL ? 'font-arabic' : ''}`}>
          <h2 className={`text-4xl sm:text-5xl font-black text-text-primary mb-6 leading-tight ${isRTL ? 'font-arabic' : ''}`}>
            {t('joinUs.team.title')} <span className="text-primary">{t('joinUs.team.titleHighlight')}</span>
          </h2>
          <p className={`text-lg md:text-xl text-text-secondary max-w-2xl leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
            {t('joinUs.team.description')}
          </p>
        </div>

        <div className="mt-12 md:mt-16">
          <ul className="grid w-full grid-cols-1 justify-items-center gap-x-8 gap-y-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {teamMembers.map((item) => (
              <li key={item.title} className="flex flex-col items-center gap-4 md:gap-5">
                <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img
                      src={item.avatarUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
                <div className={`text-center ${isRTL ? 'font-arabic' : ''}`}>
                  <h3 className={`text-lg font-semibold text-primary ${isRTL ? 'font-arabic' : ''}`}>{item.name}</h3>
                  <p className={`text-base text-text-secondary ${isRTL ? 'font-arabic' : ''}`}>{item.title}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <div className={`mt-12 md:mt-16 text-center ${isRTL ? 'font-arabic' : ''}`}>
          <a
            href="https://wa.me/+963942060440"
            target="_blank"
            rel="noopener noreferrer"
            className={`group relative inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-dark shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 active:scale-95 overflow-hidden ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
            
            {/* Content */}
            <span className="relative z-10 flex items-center gap-2">
              {t('joinUs.team.cta')}
              <ArrowIcon className={`w-5 h-5 transition-all duration-300 ${isRTL ? 'group-hover:-translate-x-2 group-hover:scale-110' : 'group-hover:translate-x-2 group-hover:scale-110'}`} />
            </span>
            
            {/* Pulse ring effect */}
            <div className="absolute inset-0 rounded-2xl border-2 border-white/30 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500"></div>
          </a>
        </div>
      </div>
    </section>
  );
};
