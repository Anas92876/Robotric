import React from "react";
import { Code, Trophy, ArrowRight, Target, Rocket } from "lucide-react";
import { useIntersectionObserver } from "../../hooks/common/useIntersectionObserver";

export const Methodology = () => {
  const [headerRef, isHeaderVisible] = useIntersectionObserver({ threshold: 0.1, once: true });
  
  const steps = [
    {
      icon: Code,
      title: "Learn Fundamentals",
      subtitle: "Step 01",
      desc: "Master the basics of electronics and coding with hands-on kits. We start from zero and build a strong foundation.",
      color: "blue",
      image: "/api/placeholder/400/300" // Placeholder for user image
    },
    {
      icon: Rocket,
      title: "Build Projects",
      subtitle: "Step 02",
      desc: "Apply your skills to build real robots, drones, and smart systems. Every student builds their own portfolio.",
      color: "green",
      image: "/api/placeholder/400/300" // Placeholder for user image
    },
    {
      icon: Trophy,
      title: "Compete & Win",
      subtitle: "Step 03",
      desc: "Join our elite teams and compete in national and international tournaments. Prove your skills on the global stage.",
      color: "purple",
      image: "/api/placeholder/400/300" // Placeholder for user image
    },
  ];

  return (
    <section id="methodology" className="relative py-12 md:py-24 bg-background overflow-hidden">
       {/* Background Decor */}
       <div className="absolute top-0 right-0 w-1/2 h-full bg-surface -skew-x-12 translate-x-1/3 -z-10" />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div ref={headerRef as React.RefObject<HTMLDivElement>} className="text-center mb-12 md:mb-16">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border shadow-sm mb-6 animate-fade-in-up"
            style={{ animationDelay: '0s' }}
          >
            <Target className="w-4 h-4 text-accent fill-accent" />
            <span className="text-xs font-bold text-text-primary tracking-wider uppercase">Proven Methodology</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-text-primary mb-6">
            The Robotrick <span className="text-primary">Journey</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            We don't just teach theory. We build innovators through a proven 3-step process that guarantees results.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          
          {steps.map((step, index) => {
            const [cardRef, isCardVisible] = useIntersectionObserver({ threshold: 0.1, once: true });
            return (
            <div key={index} className="relative">
              <div
                ref={cardRef as React.RefObject<HTMLDivElement>}
                className="group relative z-10 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Card Container */}
                <div className="bg-white rounded-[2.5rem] overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 h-full flex flex-col">
                  
                  {/* Image Area */}
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    <img 
                      src={`/images/image-${9 + index}.jpg`}
                      alt={`${step.title} - ${step.subtitle}`}
                      width="400"
                      height="300"
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br from-${step.color}-500/20 to-transparent`} />

                    {/* Step Number Badge */}
                    <div className="absolute top-4 right-4 bg-white/95 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/50">
                      {step.subtitle}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 pt-0 relative flex-grow flex flex-col">
                    {/* Floating Icon - Moved to Left */}
                    <div className={`absolute -top-10 left-8 w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center border border-border group-hover:scale-110 transition-transform duration-300`}>
                      <div className={`w-12 h-12 rounded-xl bg-${step.color}-50 flex items-center justify-center`}>
                        <step.icon className={`w-6 h-6 text-${step.color}-600`} />
                      </div>
                    </div>

                    <div className="mt-14 text-left">
                      <h3 className="text-2xl font-bold text-text-primary mb-3 group-hover:text-primary transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-text-secondary leading-relaxed text-sm">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Arrow (Desktop Only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-8 transform -translate-y-1/2 z-0">
                  <div className="animate-fade-in" style={{ animationDelay: `${0.5 + (index * 0.2)}s` }}>
                    <ArrowRight className="w-8 h-8 lg:w-10 lg:h-10 text-primary/30 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Mobile Connector */}
              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-4">
                  <ArrowRight className="w-6 h-6 text-gray-300 rotate-90" />
                </div>
              )}
            </div>
          );
          })}
        </div>
      </div>
    </section>
  );
};
