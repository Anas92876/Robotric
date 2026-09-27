import { useState, memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

export const FAQ = memo(() => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const faqs = useMemo(
    () => t('faq.items', { returnObjects: true }) as Array<{ question: string; answer: string }>,
    [t]
  );

  return (
    <section id="faq" className="relative overflow-hidden -mt-[30px] sm:-mt-[35px] md:-mt-[40px] lg:-mt-[50px] pt-[calc(2.5rem+30px)] sm:pt-[calc(3rem+35px)] md:pt-[calc(5rem+40px)] lg:pt-[calc(6rem+50px)] pb-10 sm:pb-12 md:pb-20 lg:pb-24" style={{ backgroundColor: '#cccc99', zIndex: 1, position: 'relative' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background overlay to cover wave */}
      <div className="absolute top-0 left-0 right-0 h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px]" style={{ backgroundColor: '#cccc99', zIndex: 1 }}></div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10">
        <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black text-text-primary mb-3 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`}>
            {t('faq.title')} <span className="text-primary">{t('faq.titleHighlight')}</span>
          </h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="group relative bg-gradient-to-br from-white via-white to-primary/5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.02] overflow-hidden cursor-pointer"
            >
              {/* Animated Background Gradient on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Shimmer Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              {/* Content Container */}
              <div className="relative z-10">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className={`w-full flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between p-4 sm:p-5 md:p-6 min-h-[56px] sm:min-h-[64px]`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <span className={`font-bold text-base sm:text-lg md:text-xl text-text-primary flex-1 ${isRTL ? 'font-arabic text-right pl-3 sm:pl-4' : 'text-left pr-3 sm:pr-4'}`} dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>{faq.question}</span>
                  <span className={`flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full ${openIndex === index ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'} transition-colors`}>
                    {openIndex === index ? <Minus className="w-5 h-5 sm:w-6 sm:h-6" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </span>
                </button>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    >
                      <div className={`px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 text-sm sm:text-base text-text-secondary leading-relaxed sm:leading-loose ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
