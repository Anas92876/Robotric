import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { OptimizedSpline } from "./OptimizedSpline";

interface HeroProps {
  onOpenConsultation?: () => void;
}

export const Hero = ({ onOpenConsultation }: HeroProps) => {
  const { t, i18n } = useTranslation('home');
  const [typedText, setTypedText] = useState("");
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const isRTL = i18n.language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  
  // Get typing sentences from translations - memoized to prevent infinite loops
  const typingSentences = useMemo(() => {
    const sentences = t('hero.typingSentences', { returnObjects: true }) as string[];
    return Array.isArray(sentences) ? sentences : [];
  }, [t, i18n.language]);

  // Use refs to track typing state that persists across renders
  const typingStateRef = useRef({
    currentIndex: 0,
    isDeleting: false,
    timeoutId: null as NodeJS.Timeout | null
  });

  useEffect(() => {
    if (!typingSentences || typingSentences.length === 0) {
      setTypedText("");
      return;
    }
    
    // Get current sentence
    const currentSentence = typingSentences[currentSentenceIndex];
    
    if (!currentSentence) {
      setTypedText("");
      return;
    }

    // Clear any existing timeout first
    if (typingStateRef.current.timeoutId) {
      clearTimeout(typingStateRef.current.timeoutId);
      typingStateRef.current.timeoutId = null;
    }

    // Reset state when sentence index changes (start fresh for new sentence)
    typingStateRef.current.currentIndex = 0;
    typingStateRef.current.isDeleting = false;
    setTypedText("");
    
    const type = () => {
      const state = typingStateRef.current;
      const sentence = typingSentences[currentSentenceIndex];
      
      if (!sentence) {
        return;
      }

      if (!state.isDeleting && state.currentIndex < sentence.length) {
        // Typing forward
        setTypedText(sentence.slice(0, state.currentIndex + 1));
        state.currentIndex++;
        state.timeoutId = setTimeout(type, isRTL ? 60 : 80);
      } else if (!state.isDeleting && state.currentIndex >= sentence.length) {
        // Pause at end before deleting
        state.timeoutId = setTimeout(() => {
          state.isDeleting = true;
          type();
        }, 3000);
      } else if (state.isDeleting && state.currentIndex > 0) {
        // Deleting backward
        state.currentIndex--;
        setTypedText(sentence.slice(0, state.currentIndex));
        state.timeoutId = setTimeout(type, isRTL ? 40 : 50);
      } else if (state.isDeleting && state.currentIndex === 0) {
        // Move to next sentence
        state.isDeleting = false;
        state.currentIndex = 0;
        setCurrentSentenceIndex((prev) => (prev + 1) % typingSentences.length);
        // Effect will restart with new sentence index
      }
    };

    // Start typing after initial delay
    typingStateRef.current.timeoutId = setTimeout(type, 800);

    // Cleanup function
    return () => {
      if (typingStateRef.current.timeoutId) {
        clearTimeout(typingStateRef.current.timeoutId);
        typingStateRef.current.timeoutId = null;
      }
    };
  }, [currentSentenceIndex, typingSentences, isRTL]);
  return (
    <section id="home" className="relative min-h-[60vh] sm:min-h-[65vh] md:min-h-[70vh] flex items-center justify-center px-3 sm:px-6 md:px-8 lg:px-12 pt-16 sm:pt-20 md:pt-24 pb-0 sm:pb-0 md:pb-0 lg:pb-8 xl:pb-10 2xl:pb-12 overflow-hidden bg-background" style={{ zIndex: 0 }}>
      
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-24 items-center relative z-10">
        
        {/* Left Column: Copy */}
        <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-8 relative z-10 pt-20 sm:pt-24 md:pt-28 lg:pt-0">
          <div className="animate-fade-in-up" style={{ animationDelay: '0s' }}>
            <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-4xl xl:text-5xl font-black tracking-tight text-text-primary leading-[1.1] mb-4 sm:mb-6 md:mb-8 ${isRTL ? 'font-arabic' : ''}`}>
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-700 to-primary">
                  {typedText}
                </span>
                <span className="inline-block ml-1 text-primary animate-pulse">|</span>
              </span>
            </h1>
          </div>

          <p
            className={`text-xl sm:text-2xl md:text-3xl lg:text-xl text-text-secondary max-w-lg leading-relaxed font-medium animate-fade-in-up mb-2 sm:mb-4 md:mb-6 ${isRTL ? 'font-arabic' : ''}`}
            style={{ animationDelay: '0.1s' }}
            dangerouslySetInnerHTML={{ __html: t('hero.description') }}
          />

          <div 
            className="flex flex-col sm:flex-row gap-4 sm:gap-5 md:gap-6 animate-fade-in-up pt-2 sm:pt-4"
            style={{ animationDelay: '0.2s' }}
          >
            <button
              onClick={onOpenConsultation}
              className="px-6 py-4 sm:px-8 sm:py-4 md:px-10 md:py-5 rounded-xl md:rounded-2xl font-bold text-lg sm:text-xl md:text-2xl lg:text-lg hover:opacity-90 hover:shadow-lg transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 group relative overflow-hidden cursor-pointer min-h-[52px] sm:min-h-[56px] md:min-h-[60px]"
              style={{ backgroundColor: '#003300', color: '#cccc99' }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {t('hero.ctaExplore')}
                <ArrowIcon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          </div>

        </div>

        {/* Right Column: Visual */}
        <div
          className="relative mt-0 sm:mt-0 md:mt-0 lg:mt-0 lg:h-[500px] xl:h-[600px] flex items-center justify-center animate-scale-in"
          style={{ animationDelay: '0.3s' }}
        >
          {/* Mobile/Tablet: Robot Image */}
          <div className="lg:hidden relative w-full max-w-sm sm:max-w-md md:max-w-xl flex items-center justify-center z-20">
            <picture>
              <source srcSet="/lori.webp" type="image/webp" />
              <img
                src="/lori.png"
                alt="Robotrick Robot"
                className="w-full h-auto object-contain rounded-2xl"
                loading="eager"
                fetchPriority="high"
                width="520"
                height="520"
              />
            </picture>
          </div>

          {/* Desktop: 3D Spline Component (>= 1024px only).
              placeholderImage is a pre-rendered screenshot of the Spline scene
              with a blur+gradient overlay, shown immediately for fast LCP.
              Place the screenshot at /images/hero-desktop-preview.webp
              (recommended: 800×1000px WebP, <80 KB). */}
          <div className="hidden lg:block relative w-full max-w-md aspect-[4/5] rounded-[2.5rem] overflow-hidden z-20">
            {/* Blur/gradient overlay on top of the placeholder screenshot */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, transparent 60%, rgba(0,51,0,0.18) 100%)',
                backdropFilter: 'blur(0px)',
              }}
            />
            <OptimizedSpline
              scene="https://prod.spline.design/pNr6PeuFEerHyKrB/scene.splinecode"
              width="100%"
              height="100%"
              loadDelay={2000}
              placeholderImage="/images/hero-desktop-preview.webp"
              placeholderAlt="Robotrick 3D Robot"
              className="rounded-[2.5rem]"
              unloadOnScroll={true}
              observeSectionId="home"
            />
          </div>

          {/* Floating Quote Overlay - Only on Desktop */}
          <div className="hidden lg:block absolute -bottom-12 left-6 right-2 bg-white p-4 rounded-xl z-30 min-h-[180px]">
          </div>
        </div>

      </div>
    </section>
  );
};
