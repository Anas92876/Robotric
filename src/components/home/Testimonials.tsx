import { useState, memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Quote, Star, CheckCircle2, MessageSquarePlus } from "lucide-react";

export const Testimonials = memo(() => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';

  const testimonials = useMemo(() => [
    {
      id: 1,
      name: t('testimonials.testimonial1.name'),
      role: t('testimonials.testimonial1.role'),
      content: t('testimonials.testimonial1.content'),
      rating: 5,
      verified: true,
      image: '/images/testimonials/member-1.webp',
    },
    {
      id: 2,
      name: t('testimonials.testimonial2.name'),
      role: t('testimonials.testimonial2.role'),
      content: t('testimonials.testimonial2.content'),
      rating: 5,
      verified: true,
      image: '/images/testimonials/member-2.webp',
    },
    {
      id: 3,
      name: t('testimonials.testimonial3.name'),
      role: t('testimonials.testimonial3.role'),
      content: t('testimonials.testimonial3.content'),
      rating: 5,
      verified: true,
      image: '/images/testimonials/member-3.webp',
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, isRTL]);

  return (
    <section id="testimonials" className="relative py-0 overflow-visible" style={{ backgroundColor: '#cccc99', zIndex: 10, position: 'relative' }}>
      {/* First Wave at the top */}
      <div className="absolute -top-[30px] sm:-top-[35px] md:-top-[40px] lg:-top-[50px] left-0 right-0 w-full max-w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 50, transform: 'rotate(180deg)' }}>
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
      
      {/* Second Wave at the top */}
      <div className="absolute -top-[15px] sm:-top-[18px] md:-top-[20px] lg:-top-[25px] left-0 right-0 w-full max-w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 50, transform: 'rotate(180deg)' }}>
        <svg
          className="relative block w-full h-[15px] sm:h-[18px] md:h-[20px] lg:h-[25px]"
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
      <div className="absolute -bottom-[30px] sm:-bottom-[35px] md:-bottom-[40px] lg:-bottom-[50px] left-0 right-0 w-full max-w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 100 }}>
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


      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12"
        >
          <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-text-primary mb-3 sm:mb-4 md:mb-6 ${isRTL ? 'font-arabic' : ''}`}>
            {t('testimonials.title')}
          </h2>
          <p className={`text-sm sm:text-base md:text-lg lg:text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed px-2 ${isRTL ? 'font-arabic' : ''}`}>
            {t('testimonials.subtitle')}
          </p>

          {/* Decorative Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-8"
          />
        </motion.div>

        {/* Testimonials Grid */}
       {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.15,
                ease: [0.22, 1, 0.36, 1]
              }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group relative"
            >
              <div className="relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-transparent hover:border-primary/30 hover:-translate-y-2 h-full flex flex-col">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 transition-opacity duration-500"
                />
                
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-3xl">
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent ${isRTL ? "-translate-x-full group-hover:translate-x-full" : "translate-x-full group-hover:-translate-x-full"} transition-transform duration-1000`} />
                </div>
                <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                    <div className="relative w-12 h-12 md:w-14 md:h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/30 group-hover:border-primary/50 transition-colors">
                      <Quote className="w-6 h-6 md:w-7 md:h-7 text-primary group-hover:text-primary-600 transition-colors" />
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.15 + i * 0.1 }}
                      >
                        <Star className="w-4 h-4 md:w-5 md:h-5 fill-primary text-primary drop-shadow-[0_0_8px_rgba(0,51,0,0.5)]" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                <blockquote className="flex-grow mb-6">
                  <p className={`text-text-secondary text-base md:text-lg leading-relaxed italic ${isRTL ? 'font-arabic' : ''}`}>
                    "{testimonial.content}"
                  </p>
                </blockquote>

                <div className="flex items-center gap-3 sm:gap-4 pt-4 sm:pt-5 md:pt-6 border-t border-primary/20">
                  <TestimonialAvatar
                    name={testimonial.name}
                    image={testimonial.image}
                  />

                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-semibold text-text-primary text-sm sm:text-base md:text-lg truncate ${isRTL ? 'font-arabic' : ''}`}>
                        {testimonial.name}
                      </h4>
                      {testimonial.verified && (
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary/20 flex-shrink-0" />
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm text-text-secondary flex items-center gap-1 truncate ${isRTL ? 'font-arabic' : ''}`}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </div>
            </motion.div>
          ))}
        </div> */}

        {/* Add Testimonial Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex justify-center mt-8 sm:mt-10 md:mt-12 lg:mt-16 mb-8 sm:mb-10 md:mb-12 lg:mb-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              group relative
              inline-flex items-center gap-2 sm:gap-3
              px-6 sm:px-8 md:px-10
              py-3 sm:py-4 md:py-5
              bg-primary
              rounded-xl sm:rounded-2xl
              font-bold text-sm sm:text-base md:text-lg
              shadow-lg hover:shadow-2xl
              hover:bg-primary-dark
              transition-all duration-300
              overflow-hidden
              cursor-pointer
              ${isRTL ? 'font-arabic flex-row-reverse' : ''}
            `}
            style={{ color: '#cccc99' }}
            onClick={() => {
              window.open('https://wa.me/+963942060440', '_blank', 'noopener,noreferrer');
            }}
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            {/* Button Content */}
            <MessageSquarePlus className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 relative z-10" />
            <span className="relative z-10">
              {t('testimonials.addButton')}
            </span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
});

// Avatar Component with Image Fallback
function TestimonialAvatar({ name, image }: { name: string; image: string }) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex-shrink-0">
      {/* Animated Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-700 rounded-full animate-pulse opacity-50" />

      {/* Avatar Container */}
      <div className="relative w-full h-full rounded-full border-2 border-primary/30 shadow-lg overflow-hidden bg-gradient-to-br from-primary to-primary-600">
        {!imageError ? (
          <>
            <img
              src={image}
              alt={name}
              className={`object-cover transition-opacity duration-300 w-full h-full ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              onLoad={() => setIsLoading(false)}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-base md:text-lg lg:text-xl">
                  {name.charAt(0)}
                </span>
              </div>
            )}
          </>
        ) : (
          // Fallback to initial if image fails
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-sm sm:text-base md:text-lg lg:text-xl">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
