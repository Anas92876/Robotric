import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useIntersectionObserver } from "../../hooks/common/useIntersectionObserver";

export const Gallery = () => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const [item1Ref, isItem1Visible] = useIntersectionObserver({ threshold: 0.1, once: true });
  const [item2Ref, isItem2Visible] = useIntersectionObserver({ threshold: 0.1, once: true });
  const [item3Ref, isItem3Visible] = useIntersectionObserver({ threshold: 0.1, once: true });

  return (
    <section id="gallery" className="relative py-12 md:py-24 bg-surface overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-6">
          <div>
            <h2 className={`text-3xl sm:text-4xl font-black text-text-primary mb-2 ${isRTL ? 'font-arabic' : ''}`}>
              {t('gallery.title')} <span className="text-primary">{t('gallery.titleHighlight')}</span>
            </h2>
            <p className={`text-text-secondary ${isRTL ? 'font-arabic' : ''}`}>{t('gallery.description')}</p>
          </div>
            <button
              onClick={() => navigate("/gallery")}
              className={`px-6 py-3 rounded-xl border border-border bg-white font-bold text-text-primary hover:bg-primary hover:text-white transition-all cursor-pointer ${isRTL ? 'font-arabic' : ''}`}
            >
              {t('gallery.cta')}
            </button>
        </div>

        {/* Masonry-style Grid (Simplified with CSS Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] md:h-[500px]">
          
          {/* Large Item */}
          <div 
            ref={item1Ref as React.RefObject<HTMLDivElement>}
            className="md:col-span-2 md:row-span-2 relative rounded-3xl overflow-hidden group animate-scale-in"
            style={{ animationDelay: '0s' }}
          >
            <img 
              src="/images/image-6.jpg" 
              alt="Competition Day - Robotrick Students"
              width="800"
              height="600"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white font-bold bg-black/50 px-4 py-2 rounded-full">Competition Day</p>
            </div>
          </div>

          {/* Small Item 1 */}
          <div 
            ref={item2Ref as React.RefObject<HTMLDivElement>}
            className="relative rounded-3xl overflow-hidden group bg-white animate-scale-in"
            style={{ animationDelay: '0.1s' }}
          >
            <img 
              src="/images/image-7.jpg" 
              alt="Students Building Robots"
              width="400"
              height="300"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
            />
          </div>

          {/* Small Item 2 */}
          <div 
            ref={item3Ref as React.RefObject<HTMLDivElement>}
            className="relative rounded-3xl overflow-hidden group bg-white animate-scale-in"
            style={{ animationDelay: '0.2s' }}
          >
            <img 
              src="/images/image-8.jpg" 
              alt="Robotics Workshop"
              width="400"
              height="300"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
            />
          </div>

        </div>
      </div>
    </section>
  );
};
