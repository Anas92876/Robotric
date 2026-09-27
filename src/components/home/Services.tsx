import React, { useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ServicesProps {
  hideHeader?: boolean;
}

export const Services = memo(({ hideHeader = false }: ServicesProps) => {
  const { t, i18n } = useTranslation('home');
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const services = useMemo(() => [
    {
      icon: "/icons/teach.png",
      title: t('services.training.title'),
      description: t('services.training.description'),
      path: "/services/training",
      features: t('services.training.features', { returnObjects: true }) as string[],
      cta: t('services.training.cta')
    },
    {
      icon: "/icons/project-management.png",
      title: t('services.projects.title'),
      description: t('services.projects.description'),
      path: "/services/technical-projects",
      features: t('services.projects.features', { returnObjects: true }) as string[],
      cta: t('services.projects.cta')
    },
    {
      icon: "/icons/3d-printer.png",
      title: t('services.printing.title'),
      description: t('services.printing.description'),
      path: "/services/3d-printing",
      features: t('services.printing.features', { returnObjects: true }) as string[],
      cta: t('services.printing.cta')
    },
    {
      icon: "/icons/consulting.png",
      title: t('services.consultation.title'),
      description: t('services.consultation.description'),
      path: "/services/technical-consultation",
      features: t('services.consultation.features', { returnObjects: true }) as string[],
      cta: t('services.consultation.cta')
    },
    {
      icon: "/icons/evaluation.png",
      title: t('services.curriculumDesign.title'),
      description: t('services.curriculumDesign.description'),
      path: "/services/curriculum-design",
      features: t('services.curriculumDesign.features', { returnObjects: true }) as string[],
      cta: t('services.curriculumDesign.cta')
    },
    {
      icon: "/icons/biotechnology.png",
      title: t('services.stemLabSetup.title'),
      description: t('services.stemLabSetup.description'),
      path: "/services/stem-lab-setup",
      features: t('services.stemLabSetup.features', { returnObjects: true }) as string[],
      cta: t('services.stemLabSetup.cta')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, isRTL]);

  return (
    <section id="services" className={`relative bg-background overflow-hidden ${hideHeader ? 'pt-6 md:pt-8 pb-12 md:pb-24' : '-mt-[30px] sm:-mt-[35px] md:-mt-[40px] lg:-mt-[50px] pt-[calc(2.5rem+30px)] sm:pt-[calc(3rem+35px)] md:pt-[calc(5rem+40px)] lg:pt-[calc(6rem+50px)] pb-10 sm:pb-12 md:pb-20 lg:pb-24'}`} style={{ zIndex: 1, position: 'relative' }}>
      {/* Background overlay to cover wave */}
      <div className="absolute top-0 left-0 right-0 h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px] bg-background" style={{ zIndex: 1 }}></div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10">
        {/* Section Header */}
        {!hideHeader && (
          <div className="text-center mb-12 md:mb-16">
            {/* <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border shadow-sm mb-6 animate-fade-in-up`}
              style={{ animationDelay: '0s' }}
            >
              <Sparkles className="w-4 h-4 text-accent fill-accent" />
              <span className={`text-xs font-bold text-text-primary tracking-wider uppercase ${isRTL ? 'font-arabic' : ''}`}>{t('services.badge')}</span>
            </div> */}

            <h2
              className={`text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-4 sm:mb-6 animate-fade-in-up ${isRTL ? 'font-arabic' : ''}`}
              style={{ animationDelay: '0.1s' }}
            >
              {t('services.title')} <span className="text-primary">{t('services.titleHighlight')}</span>
            </h2>
{/* 
            <p
              className={`text-lg text-text-secondary max-w-2xl mx-auto animate-fade-in-up`}
              style={{ animationDelay: '0.2s' }}
            >
              {t('services.description')}
            </p> */}
          </div>
        )}

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {services.map((service, index) => {
            const row = Math.floor(index / 3);
            const isMiddle = index % 3 === 1;
            const bgColor = (row % 2 === 0 && !isMiddle) || (row % 2 === 1 && isMiddle)
              ? '#ffffcc'
              : '#cccc99';

            return (
              <div
                key={service.path}
                onClick={() => navigate(service.path)}
                className="group relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm transition-all duration-500 ease-out cursor-pointer hover:-translate-y-2 hover:shadow-lg overflow-hidden animate-fade-in-up"
                style={{
                  backgroundColor: bgColor,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {/* Green border - visible by default, more prominent on hover */}
                <div
                  className="absolute inset-0 rounded-2xl sm:rounded-3xl border-2 border-[#003300]/20 transition-opacity duration-500 opacity-30 group-hover:opacity-100"
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  {/* Icon */}
                  <img src={service.icon} alt={service.title} className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-4 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform duration-500 ease-out group-hover:rotate-3" />

                  {/* Title */}
                  <h3 className={`text-lg sm:text-xl md:text-2xl font-bold text-text-primary mb-4 sm:mb-5 md:mb-6 group-hover:text-primary transition-colors duration-300 ${isRTL ? 'font-arabic' : ''}`}>
                    {service.title}
                  </h3>

                  {/* CTA Button */}
                  <div className={`group/btn flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-full border border-[#003300] bg-transparent text-text-primary font-bold text-sm sm:text-base hover:bg-[#003300] hover:text-white hover:border-[#003300] hover:*:text-white transition-all duration-300 min-h-[44px] sm:min-h-[48px] ${isRTL ? 'font-arabic' : ''}`}>
                    <span className="whitespace-nowrap">{service.cta}</span>
                    <ArrowIcon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 flex-shrink-0 ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div
          className="mt-12 md:mt-16 text-center animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
        >
          <p className={`text-sm sm:text-base text-text-secondary mb-3 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`}>{t('services.ctaText')}</p>
          <a
            href="#contact"
            className="relative inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-opacity hover:opacity-90 overflow-hidden group min-h-[44px] sm:min-h-[52px] will-change-transform"
            style={{ backgroundColor: '#003300', color: '#ffffcc' }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-[#003300] opacity-75 animate-pulse" />
            
            {/* Content */}
            <span className="relative z-10 flex items-center gap-2">
              {t('services.ctaButton')}
              <ArrowIcon className="w-5 h-5" />
            </span>
            
            {/* Hover shadow */}
            <div className="absolute inset-0 rounded-2xl shadow-lg shadow-[#003300]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
        </div>
      </div>
    </section>
  );
});
