import { SEO } from "../../components/seo/SEO";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Category = "All" | "Training" | "Projects" | "3D Printing" | "Competitions";

interface GalleryItem {
  id: number;
  image: string;
  title: string;
  category: Category;
}

export default function GalleryPage() {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const dir = isRTL ? 'rtl' : 'ltr';
    const lang = isRTL ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [isRTL]);

  const categories: Category[] = ["All", "Training", "Projects", "3D Printing", "Competitions"];

  const galleryItems: GalleryItem[] = [
    { id: 1, image: "/images/image-1.jpg", title: "Student Workshop Session", category: "Training" },
    { id: 2, image: "/images/image-2.jpg", title: "Robotrick Team Photo", category: "Training" },
    { id: 3, image: "/images/image-3.jpg", title: "Lab Session - Learning Robotics", category: "Training" },
    { id: 4, image: "/images/image-4.jpg", title: "Robotics Competition", category: "Competitions" },
    { id: 5, image: "/images/image-5.jpg", title: "Awards and Achievements", category: "Competitions" },
    { id: 6, image: "/images/image-6.jpg", title: "Competition Day", category: "Competitions" },
    { id: 7, image: "/images/image-7.jpg", title: "Students Building Robots", category: "Training" },
    { id: 8, image: "/images/image-8.jpg", title: "Robotics Workshop", category: "Training" },
    { id: 9, image: "/images/image-9.jpg", title: "Technical Project", category: "Projects" },
    { id: 10, image: "/images/image-10.jpg", title: "3D Printing Creation", category: "3D Printing" },
    { id: 11, image: "/images/image-11.jpg", title: "Training Session", category: "Training" },
    { id: 12, image: "/images/image-12.jpg", title: "Competition Preparation", category: "Competitions" },
    { id: 13, image: "/images/image-13.jpg", title: "Custom Robot Project", category: "Projects" },
    { id: 14, image: "/images/image-14.jpg", title: "3D Printed Model", category: "3D Printing" },
    { id: 15, image: "/images/image-15.jpg", title: "Student Achievement", category: "Training" },
    { id: 16, image: "/images/image-16.jpg", title: "Innovation Showcase", category: "Projects" },
    { id: 17, image: "/images/image-17.jpg", title: "Advanced Training", category: "Training" },
  ];

  const filteredItems = activeCategory === "All"
    ? galleryItems
    : galleryItems.filter(item => item.category === activeCategory);

  const getCategoryTranslation = (category: Category): string => {
    const categoryMap: Record<Category, string> = {
      "All": t('gallery.categories.all'),
      "Training": t('gallery.categories.training'),
      "Projects": t('gallery.categories.projects'),
      "3D Printing": t('gallery.categories.3dPrinting'),
      "Competitions": t('gallery.categories.competitions'),
    };
    return categoryMap[category];
  };

  const openLightbox = (item: GalleryItem, index: number) => {
    setSelectedImage(item);
    setCurrentImageIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!selectedImage) return;
    
    const currentIndex = filteredItems.findIndex(item => item.id === selectedImage.id);
    let newIndex: number;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % filteredItems.length;
    } else {
      newIndex = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    }
    
    setSelectedImage(filteredItems[newIndex]);
    setCurrentImageIndex(newIndex);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateImage(isRTL ? 'next' : 'prev');
      if (e.key === 'ArrowRight') navigateImage(isRTL ? 'prev' : 'next');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, isRTL]);

  return (
    <div className={`bg-background min-h-screen ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <SEO
        title="Gallery"
        titleAr="المعرض"
        description="Explore Robotrick's gallery showcasing our robotics training sessions, technical projects, 3D printing work, and competition achievements in Aleppo, Syria."
        descriptionAr="استكشف معرض روبوتريك الذي يعرض جلسات التدريب على الروبوتات، المشاريع التقنية، أعمال الطباعة ثلاثية الأبعاد وإنجازات المسابقات في حلب، سوريا."
        path="/gallery"
      />

      <LandingHeader />

      <main>
        {/* Hero Section */}
        <section className="relative pt-40 md:pt-48 pb-16 md:pb-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-br from-primary/5 via-white to-accent/5 overflow-hidden">
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-4xl md:text-6xl font-black text-text-primary mb-6 ${isRTL ? 'font-arabic' : ''}`}
            >
              {t('gallery.pageTitle')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-lg md:text-xl text-text-secondary max-w-3xl mx-auto ${isRTL ? 'font-arabic' : ''}`}
            >
              {t('gallery.pageSubtitle')}
            </motion.p>
          </div>

          {/* Background Decor */}
          <div className={`absolute top-20 ${isRTL ? 'right-20' : 'left-20'} w-64 h-64 bg-primary/20 rounded-full blur-3xl`} />
          <div className={`absolute bottom-20 ${isRTL ? 'left-20' : 'right-20'} w-96 h-96 bg-accent/20 rounded-full blur-3xl`} />
        </section>

        {/* Gallery Section */}
        <section className="relative py-12 md:py-24 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            {/* Category Filter */}
            <div className={`flex flex-wrap justify-center gap-3 mb-12 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${isRTL ? 'font-arabic' : ''} ${
                    activeCategory === category
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-white border border-border text-text-primary hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {getCategoryTranslation(category)}
                </button>
              ))}
            </div>

            {/* Gallery Grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => openLightbox(item, index)}
                    className="group relative aspect-[4/3] rounded-3xl overflow-hidden bg-gray-200 cursor-pointer"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className={`absolute bottom-0 ${isRTL ? 'right-0' : 'left-0'} right-0 p-6`}>
                        <p className={`text-white font-bold text-lg mb-1 ${isRTL ? 'font-arabic text-right' : 'text-left'}`}>
                          {item.title}
                        </p>
                        <p className={`text-white/80 text-sm ${isRTL ? 'font-arabic text-right' : 'text-left'}`}>
                          {getCategoryTranslation(item.category)}
                        </p>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-primary ${isRTL ? 'font-arabic' : ''}`}>
                      {getCategoryTranslation(item.category)}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Empty State */}
            {filteredItems.length === 0 && (
              <div className="text-center py-20">
                <p className={`text-text-secondary text-lg ${isRTL ? 'font-arabic' : ''}`}>
                  {t('gallery.emptyState')}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-24 bg-gradient-to-r from-primary to-accent text-white">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
            <h2 className={`text-3xl md:text-4xl font-black mb-4 ${isRTL ? 'font-arabic' : ''}`}>
              {t('gallery.ctaTitle')}
            </h2>
            <p className={`text-lg mb-8 opacity-90 ${isRTL ? 'font-arabic' : ''}`}>
              {t('gallery.ctaDescription')}
            </p>
            <a
              href="/#contact"
              className={`inline-block px-8 py-4 bg-white text-primary rounded-2xl font-bold text-lg hover:shadow-2xl transition-all hover:scale-105 ${isRTL ? 'font-arabic' : ''}`}
            >
              {t('gallery.ctaButton')}
            </a>
          </div>
        </section>
      </main>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all`}
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Navigation Buttons */}
              {filteredItems.length > 1 && (
                <>
                  <button
                    onClick={() => navigateImage('prev')}
                    className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all`}
                    aria-label="Previous"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => navigateImage('next')}
                    className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all`}
                    aria-label="Next"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Image */}
              <img
                src={selectedImage.image}
                alt={selectedImage.title}
                className="w-full h-auto max-h-[90vh] object-contain rounded-2xl"
              />

              {/* Image Info */}
              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-2xl ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className={`text-white font-bold text-2xl mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                  {selectedImage.title}
                </h3>
                <p className={`text-white/80 text-sm ${isRTL ? 'font-arabic' : ''}`}>
                  {getCategoryTranslation(selectedImage.category)} • {currentImageIndex + 1} / {filteredItems.length}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
