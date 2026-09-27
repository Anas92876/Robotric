import { memo } from "react";
import { useTranslation } from "react-i18next";
import { LightweightCounter } from "./LightweightCounter";
import { useIntersectionObserver } from "../../hooks/common/useIntersectionObserver";

// Wrapper to use the custom SVG/PNG icons as components with Tailwind sizing classes
const HoursIcon = ({ className }: { className?: string }) => (
  <img src="/icons/clock.png" alt="" className={className} />
);

const ProjectsIcon = ({ className }: { className?: string }) => (
  <img src="/icons/task-management.png" alt="" className={className} />
);

const YearsIcon = ({ className }: { className?: string }) => (
  <img src="/icons/calendar.png" alt="" className={className} />
);

const TechnicalIcon = ({ className }: { className?: string }) => (
  <img src="/icons/consulting.png" alt="" className={className} />
);

const TrainingIcon = ({ className }: { className?: string }) => (
  <img src="/icons/learning.png" alt="" className={className} />
);

const StudentsIcon = ({ className }: { className?: string }) => (
  <img src="/icons/student.png" alt="" className={className} />
);

export const SocialProof = memo(() => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const [sectionRef, isSectionVisible] = useIntersectionObserver({ threshold: 0.1, once: true });
  
  const stats = [
    {
      icon: StudentsIcon,
      value: 2600,
      suffix: "+",
      label: t("socialProof.students"),
      bgColor: "bg-primary/10",
      iconColor: "",
    },
    {
      icon: HoursIcon,
      value: 12000,
      suffix: "+",
      label: t("socialProof.trainingHours"),
      bgColor: "bg-accent/20",
      iconColor: "text-[#003300]",
    },
    {
      icon: TrainingIcon,
      value: 25,
      suffix: "+",
      label: t("socialProof.trainingPrograms"),
      bgColor: "bg-primary/15",
      iconColor: "text-[#003300]",
    },
    {
      icon: YearsIcon,
      value: 6,
      suffix: "",
      label: t("socialProof.yearsExperience"),
      textValue: "6",
      bgColor: "bg-secondary/30",
      iconColor: "",
    },
    {
      icon: ProjectsIcon,
      value: 30,
      suffix: "+",
      label: t("socialProof.projects"),
      bgColor: "bg-accent/15",
      iconColor: "",
    },
    {
      icon: TechnicalIcon,
      value: 15,
      suffix: "+",
      label: t("socialProof.technicalStudies"),
      bgColor: "bg-primary/10",
      iconColor: "",
    },
  ];

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="py-6 md:py-8 relative overflow-visible"
      style={{ backgroundColor: '#cccc99', zIndex: 2 }}
    >
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
      
      {/* Animated Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-80 pointer-events-none animate-pulse-glow" />
      
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0, 51, 0, 0.08) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0, 51, 0, 0.08) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`
                relative
                bg-gradient-to-br from-white via-white to-primary/5
                rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6
                shadow-lg hover:shadow-2xl
                transition-all duration-500 ease-out
                group
                hover:-translate-y-2
                hover:scale-[1.02]
                overflow-hidden
                cursor-pointer
                ${isSectionVisible ? 'animate-scale-in' : 'opacity-0 scale-95'}
              `}
              style={{ 
                animationDelay: `${index * 0.08}s`,
                animationFillMode: 'both'
              }}
            >
              {/* Animated Background Gradient on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Shimmer Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              {/* Content Container */}
              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Icon - Centered at Top, Larger for Students */}
                <div className="mb-3 sm:mb-4 md:mb-5 lg:mb-6 flex items-center justify-center">
                  <stat.icon 
                    className={`
                      ${stat.icon === StudentsIcon 
                        ? "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28" 
                        : "w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-24 lg:h-24"}
                      ${stat.iconColor}
                      group-hover:scale-110
                      transition-transform duration-300
                    `}
                  />
                </div>
                
                {/* Value with Smaller Font Size */}
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mb-1 sm:mb-2 tracking-tight">
                  {stat.textValue ? (
                    <span className="bg-gradient-to-r from-primary via-green-700 to-primary bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 inline-block">
                      {stat.textValue}
                    </span>
                  ) : (
                    <span className="bg-gradient-to-r from-primary via-green-700 to-primary bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 inline-block">
                      <LightweightCounter value={stat.value} suffix={stat.suffix} />
                    </span>
                  )}
                </div>
                
                {/* Label with Smooth Color Transition */}
                <div className={`
                  text-xs sm:text-sm md:text-base font-bold
                  text-text-secondary
                  group-hover:text-primary
                  transition-all duration-300
                  ${isRTL ? 'font-arabic' : ''}
                  group-hover:translate-x-1
                  px-1
                `}>
                  {stat.label}
                </div>

                {/* Animated Bottom Accent Line */}
                <div className="mt-4 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full transform scale-x-0 group-hover:scale-x-100 origin-center transition-transform duration-500" />
              </div>

              {/* Corner Decoration */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
