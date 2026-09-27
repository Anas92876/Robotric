import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Star, CheckCircle2, Bot, Brain, Glasses, Printer, Plane, Code, Trophy, PencilRuler, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export const Programs = () => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [activeCategory, setActiveCategory] = useState("Robotics");
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoSlideIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const categories = [
    { name: "Robotics", icon: Bot, color: "blue" },
    { name: "AI", icon: Brain, color: "purple" },
    { name: "3D Printing", icon: Printer, color: "orange" },
    { name: "VR", icon: Glasses, color: "pink" },
    { name: "Drones", icon: Plane, color: "cyan" },
    { name: "Web Dev", icon: Code, color: "green" },
    { name: "Competitions", icon: Trophy, color: "amber" },
    { name: "EngineeringDesign", icon: PencilRuler, color: "teal" },
  ];

  const programsByCategory = useMemo(() => {
    const robotics = t('programs.robotics', { returnObjects: true }) as any[];
    const ai = t('programs.ai', { returnObjects: true }) as any[];
    const vr = t('programs.vr', { returnObjects: true }) as any[];
    const printing = t('programs.3dPrinting', { returnObjects: true }) as any[];
    const drones = t('programs.drones', { returnObjects: true }) as any[];
    const webDev = t('programs.webDev', { returnObjects: true }) as any[];
    const competitions = t('programs.competitions', { returnObjects: true }) as any[];
    const engineeringDesign = t('programs.engineeringDesign', { returnObjects: true }) as any[];
    const popular = t('programs.popular', { returnObjects: true }) as number[];

    let globalIndex = 0;
    const addPopular = (arr: any[]) => {
      return arr.map((item) => {
        const isPopular = popular.includes(globalIndex++);
        return { ...item, popular: isPopular };
      });
    };

    return {
      "Robotics": addPopular(robotics),
      "AI": addPopular(ai),
      "VR": addPopular(vr),
      "3D Printing": addPopular(printing),
      "Drones": addPopular(drones),
      "Web Dev": addPopular(webDev),
      "Competitions": addPopular(competitions),
      "EngineeringDesign": addPopular(engineeringDesign),
    };
  }, [t, i18n.language]);

  const currentPrograms = (programsByCategory as Record<string, any[]>)[activeCategory] || [];
  const cardsPerView = 3;
  const totalSlides = Math.max(1, currentPrograms.length - cardsPerView + 1);
  const canGoPrev = slideIndex > 0;
  const canGoNext = slideIndex < totalSlides - 1;
  const visiblePrograms = currentPrograms.slice(slideIndex, slideIndex + cardsPerView);

  // Auto-slide functionality
  useEffect(() => {
    // Clear any existing interval
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
    }

    // Don't auto-slide if there's only one slide or if paused
    if (totalSlides <= 1 || isPaused) {
      return;
    }

    // Set up auto-slide interval (5 seconds)
    autoSlideIntervalRef.current = setInterval(() => {
      setSlideIndex((prevIndex) => {
        // Loop back to the beginning when reaching the end
        return (prevIndex + 1) % totalSlides;
      });
    }, 5000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
      }
    };
  }, [totalSlides, isPaused, activeCategory]);

  // Reset slide index when category changes
  useEffect(() => {
    setSlideIndex(0);
  }, [activeCategory]);

  return (
    <section id="programs" className="relative bg-background overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`text-4xl sm:text-5xl font-black text-text-primary mb-6 ${isRTL ? 'font-arabic' : ''}`}
          >
            {t('programs.title')} <span className="text-primary">{t('programs.titleHighlight')}</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={`text-lg text-text-secondary max-w-2xl mx-auto ${isRTL ? 'font-arabic' : ''}`}
          >
            {t('programs.description')}
          </motion.p>
        </div>

        {/* Category Filters Section */}
        <div className="mb-12">
          {/* Filter Label */}
          <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
            <Filter className="w-5 h-5 text-primary" />
            <span className={`text-sm font-semibold text-text-secondary uppercase tracking-wider ${isRTL ? 'font-arabic' : ''}`}>
              {t('programs.filterLabel', { defaultValue: isRTL ? 'تصفية حسب الفئة' : 'Filter by Category' })}
            </span>
          </div>

          {/* Filter Buttons Container */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
              {categories.map((category, index) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.name;
                const cardMeta = t(`programs.categoryCards.${category.name}`, { returnObjects: true }) as { ageGroup?: string } | string;
                const ageGroup = typeof cardMeta === 'object' && cardMeta?.ageGroup ? cardMeta.ageGroup : '';
                return (
                  <motion.button
                    key={category.name}
                    type="button"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveCategory(category.name); setSlideIndex(0); }}
                    className={`min-h-[100px] w-full rounded-xl p-4 flex flex-col items-stretch text-start shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden ${
                      isActive
                        ? 'shadow-lg shadow-primary/30 scale-[1.02] ring-2 ring-primary/20'
                        : 'bg-white text-text-primary hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={isActive ? { backgroundColor: '#003300', color: '#ffffcc' } : {}}
                  >
                    {/* Active Indicator Badge */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-2 h-2 rounded-full"
                        style={{ backgroundColor: '#ffffcc' }}
                      />
                    )}
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-primary/10'}`}>
                        <Icon className={`w-5 h-5 shrink-0 ${isActive ? '' : 'text-primary'}`} style={isActive ? { color: '#ffffcc' } : {}} />
                      </div>
                      <span className={`font-bold text-sm truncate ${isRTL ? 'font-arabic' : ''}`}>
                        {t(`programs.categories.${category.name}`)}
                      </span>
                    </div>
                    <div className={`text-xs font-medium whitespace-pre-line ${isActive ? '' : 'text-primary/70'} ${isRTL ? 'font-arabic' : ''}`} style={isActive ? { color: '#ffffcc' } : {}}>
                      {t('programs.labels.Age')} {ageGroup}
                    </div>
                    
                    {/* Active Checkmark */}
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bottom-2 right-2"
                      >
                        <CheckCircle2 className="w-4 h-4" style={{ color: '#ffffcc' }} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Programs Slider */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visiblePrograms.map((program: any, index: number) => (
                <div
                  key={slideIndex * cardsPerView + index}
                  onClick={() => {
                    const message = isRTL 
                      ? `مرحباً، أنا مهتم ببرنامج "${program.title}" (${program.age}). هل يمكنك تقديم المزيد من التفاصيل؟`
                      : `Hello, I'm interested in the "${program.title}" program (${program.age}). Could you please provide more details?`;
                    window.open(`https://wa.me/+963942060440?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  className={`relative bg-white rounded-3xl overflow-visible shadow-lg transition-all duration-300 group hover:-translate-y-2 flex flex-col cursor-pointer ${
                    program.popular
                      ? ' shadow-[0_0_30px_rgba(255,255,204,0.45),0_0_60px_rgba(255,255,204,0.25)] '
                      : ' hover:border-primary/30 hover:shadow-[0_0_30px_rgba(255,255,204,0.4),0_0_60px_rgba(255,255,204,0.2)]'
                  }`}
                >
                  {program.popular && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 15,
                        delay: index * 0.1 
                      }}
                      whileHover={{ scale: 1.05 }}
                      className={`absolute -top-4 ${isRTL ? 'left-4' : 'right-4'} z-30 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold w-fit ${isRTL ? 'font-arabic' : ''}`}
                      style={{ 
                        background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
                        color: '#ffffff',
                        boxShadow: '0 4px 20px rgba(0, 51, 0, 0.4), 0 0 30px rgba(255, 255, 204, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      <motion.div
                        animate={{ 
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 3
                        }}
                      >
                        <Star className="w-3.5 h-3.5 fill-current drop-shadow-sm" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 204, 0.6))' }} />
                      </motion.div>
                      <span className="drop-shadow-sm">{t('programs.labels.Popular')}</span>
                    </motion.div>
                  )}
                  <div className="overflow-hidden rounded-3xl flex flex-col flex-grow">
                    <div className="p-6 flex flex-col flex-grow">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-[#003300] transition-colors" dir="ltr">
                        {program.title}
                      </h3>
                      <p className={`text-text-secondary text-sm leading-relaxed line-clamp-3 ${isRTL ? 'font-arabic' : ''}`}>
                        {program.desc}
                      </p>
                    </div>
                    <ul className="space-y-2 mb-6 flex-grow">
                      {program.features.map((feature: string, i: number) => (
                        <li key={i} className={`flex items-center gap-2 text-sm font-medium text-text-primary ${isRTL ? 'font-arabic' : ''}`}>
                          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#003300' }} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className={`space-y-3 pt-4 border-t ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      <div className="flex items-center text-sm justify-between w-full">
                        <span className={`text-text-secondary font-medium ${isRTL ? 'font-arabic' : ''}`}>{t('programs.labels.Age')}</span>
                        <span className={`font-bold text-text-primary ${isRTL ? 'font-arabic' : ''}`} dir="auto">{program.age}</span>
                      </div>
                      <div className="flex items-center text-sm justify-between w-full">
                        <span className={`text-text-secondary font-medium ${isRTL ? 'font-arabic' : ''}`}>{t('programs.labels.Duration')}</span>
                        <span className={`font-bold text-text-primary text-xs ${isRTL ? 'font-arabic' : ''}`} dir="auto">{program.duration}</span>
                      </div>
                      <div className="flex items-center text-sm justify-between w-full">
                        <span className={`text-text-secondary font-medium ${isRTL ? 'font-arabic' : ''}`}>{t('programs.labels.Level')}</span>
                        <span className={`text-xs font-bold ${isRTL ? 'font-arabic' : ''}`} dir="auto" style={{ color: '#003300' }}>{t(`programs.levels.${program.level}`)}</span>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>

            {totalSlides > 1 && (
              <div className={`flex items-center justify-center gap-4 mt-8 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <button
                  type="button"
                  onClick={() => {
                    setSlideIndex((i) => Math.max(0, i - 1));
                    setIsPaused(true);
                    // Resume auto-slide after 3 seconds
                    setTimeout(() => setIsPaused(false), 3000);
                  }}
                  disabled={!canGoPrev}
                  className="w-11 h-11 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-[#003300] disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                  aria-label={isRTL ? 'السابق' : 'Previous'}
                >
                  <ChevronLeft className="w-6 h-6 text-[#003300] hover:cursor-pointer" />
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSlideIndex(i);
                        setIsPaused(true);
                        // Resume auto-slide after 3 seconds
                        setTimeout(() => setIsPaused(false), 3000);
                      }}
                      className={`rounded-full transition-all ${
                        i === slideIndex
                          ? 'h-2.5 w-8'
                          : 'h-2 w-2'
                      }`}
                      style={{
                        backgroundColor: i === slideIndex ? '#003300' : 'gray',
                      }}
                      aria-label={isRTL ? `الشريحة ${i + 1}` : `Slide ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSlideIndex((i) => Math.min(totalSlides - 1, i + 1));
                    setIsPaused(true);
                    // Resume auto-slide after 3 seconds
                    setTimeout(() => setIsPaused(false), 3000);
                  }}
                  disabled={!canGoNext}
                  className={`w-11 h-11 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-[#003300] disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-shadow ${isRTL ? 'flex-row-reverse rtl' : ''}`}
                  aria-label={isRTL ? 'التالي' : 'Next'}
                >
                  <ChevronRight className="w-6 h-6 text-[#003300] hover:cursor-pointer" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 mb-16 text-center"
        >
          <p className={`text-text-secondary mb-6 ${isRTL ? 'font-arabic' : ''}`}>{t('programs.cta.question')}</p>
          <a
            href="#contact"
            className={`inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-dark shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all ${isRTL ? 'font-arabic flex-row-reverse' : ''}`}
          >
            {t('programs.cta.button')}
            <ArrowIcon className={`w-5 h-5 transition-transform ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
          </a>
        </motion.div>
      </div>
    </section>
  );
};
