import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { Award, Users, Zap } from "lucide-react";
import { useIntersectionObserver } from "../../hooks/common/useIntersectionObserver";

export const WhyChooseUs = memo(() => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const [headerRef] = useIntersectionObserver({ threshold: 0.1, once: true });
  
  const values = [
    {
      icon: Award,
      title: t('whyChooseUs.excellence.title'),
      description: t('whyChooseUs.excellence.description'),
      gradient: "from-primary to-accent"
    },
    {
      icon: Users,
      title: t('whyChooseUs.team.title'),
      description: t('whyChooseUs.team.description'),
      gradient: "from-primary to-accent"
    },
    {
      icon: Zap,
      title: t('whyChooseUs.technology.title'),
      description: t('whyChooseUs.technology.description'),
      gradient: "from-primary to-accent"
    }
  ];

  return (
    <section id="why-choose-us" className="relative py-8 md:py-12 overflow-visible" style={{ backgroundColor: '#cccc99' }}>
      {/* Wave at the top */}
      <div className="absolute -top-[30px] sm:-top-[35px] md:-top-[40px] lg:-top-[50px] left-0 right-0 w-full max-w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 1, transform: 'rotate(180deg)' }}>
        <svg
          className="relative block w-full h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          style={{ display: 'block', maxWidth: '100%' }}
        >
          <path 
            d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" 
            fill="#cccc99"
          />
        </svg>
      </div>
      
      {/* Wave at the bottom */}
      <div className="absolute -bottom-[30px] sm:-bottom-[35px] md:-bottom-[40px] lg:-bottom-[50px] left-0 right-0 w-full max-w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 1 }}>
        <svg
          className="relative block w-full h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          style={{ display: 'block', maxWidth: '100%' }}
        >
          <path 
            d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" 
            fill="#cccc99"
          />
        </svg>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10">
        {/* Section Header */}
        <div ref={headerRef as React.RefObject<HTMLDivElement>} className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          {/* <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border shadow-sm mb-6 animate-fade-in-up"
            style={{ animationDelay: '0s' }}
          >
            <Sparkles className="w-4 h-4 text-primary fill-primary" />
            <span className={`text-xs font-bold text-text-primary tracking-wider uppercase ${isRTL ? 'font-arabic' : ''}`}>{t('whyChooseUs.badge')}</span>
          </div> */}

          <h2
            className={`text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-4 sm:mb-5 md:mb-6 animate-fade-in-up ${isRTL ? 'font-arabic' : ''}`}
            style={{ animationDelay: '0.1s' }}
          >
            {t('whyChooseUs.title')} <span className="text-primary">{t('whyChooseUs.titleHighlight')}</span>
          </h2>

          <p
            className={`text-sm sm:text-base md:text-lg text-text-secondary max-w-2xl mx-auto animate-fade-in-up px-2 ${isRTL ? 'font-arabic' : ''}`}
            style={{ animationDelay: '0.2s' }}
          >
            {t('whyChooseUs.description')}
          </p>
        </div>

        {/* Value Propositions Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-white via-white to-primary/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.02] overflow-hidden cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Animated Background Gradient on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Shimmer Effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                
                {/* Content Container */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  {/* Icon */}
                  <div className="mb-3 sm:mb-4 md:mb-5 lg:mb-6 flex items-center justify-center">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" strokeWidth={2} />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h3 className={`text-lg sm:text-xl md:text-2xl font-bold text-text-primary mb-2 sm:mb-3 group-hover:text-primary transition-colors duration-300 ${isRTL ? 'font-arabic' : ''}`}>
                    {value.title}
                  </h3>

                  {/* Description */}
                  <p className={`text-text-secondary text-xs sm:text-sm md:text-base leading-relaxed px-1 ${isRTL ? 'font-arabic' : ''}`}>
                    {value.description}
                  </p>

                  {/* Animated Bottom Accent Line */}
                  <div className="mt-3 sm:mt-4 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full transform scale-x-0 group-hover:scale-x-100 origin-center transition-transform duration-500" />
                </div>

                {/* Corner Decoration */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
