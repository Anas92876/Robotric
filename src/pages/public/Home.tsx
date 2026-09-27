import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Footer } from "../../components/layout/Footer";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { SEO } from "../../components/seo/SEO";
import { Hero } from "../../components/home/Hero";
import { SocialProof } from "../../components/home/SocialProof";
import { SplashScreen } from "../../components/home/SplashScreen";
import { ConsultationModal } from "../../components/home/ConsultationModal";
import { MessageCircle } from "lucide-react";
// Lazy load below-fold components for better initial load performance
const About = lazy(() => import("../../components/home/About").then(module => ({ default: module.About })));
const Services = lazy(() => import("../../components/home/Services").then(module => ({ default: module.Services })));
const WhyChooseUs = lazy(() => import("../../components/home/WhyChooseUs").then(module => ({ default: module.WhyChooseUs })));
const Gallery = lazy(() => import("../../components/home/Gallery").then(module => ({ default: module.Gallery })));
const FAQ = lazy(() => import("../../components/home/FAQ").then(module => ({ default: module.FAQ })));
const Testimonials = lazy(() => import("../../components/home/Testimonials").then(module => ({ default: module.Testimonials })));
const Contact = lazy(() => import("../../components/home/Contact").then(module => ({ default: module.Contact })));

// Fallback component for lazy loaded sections
const SectionFallback = () => (
  <div className="min-h-[400px]" />
);

export default function Home() {
  const { i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  // Check synchronously so returning visitors never see opacity-0 flash
  // Splash is desktop-only (skip on mobile/tablet)
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isDesktop = window.innerWidth >= 1024;
    return isDesktop && localStorage.getItem('splashShown') !== 'true';
  });
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  
  return (
    <div className={`bg-background min-h-screen relative ${isRTL ? 'font-arabic' : ''}`} style={{ overflowX: 'hidden', overflowY: 'visible' }}>
      <SEO
        title="Home"
        titleAr="الرئيسية"
        description="Robotrick is a professional robotics and technology company in Aleppo, Syria. We offer training programs, custom technical projects, 3D printing, and STEM solutions."
        descriptionAr="روبوتريك شركة متخصصة في الروبوتات والتكنولوجيا في حلب، سوريا. نقدم برامج تدريبية، مشاريع تقنية، طباعة ثلاثية الأبعاد وحلول STEM احترافية."
        path="/"
      />

      {/* Logo Splash Screen - Shows First */}
      {showSplash && (
        <SplashScreen
          iconSrc="/images/icon.png"
          duration={1200}
          showOnce={true}
          onComplete={() => setShowSplash(false)}
        />
      )}

      {/* Main Content - Fades in after splash */}
      <div className={`${showSplash ? 'opacity-0 pointer-events-none' : 'opacity-100 transition-opacity duration-500'} overflow-visible`}>
        <LandingHeader onOpenConsultation={() => setIsConsultationModalOpen(true)} />

        <main className="overflow-visible">
          <Hero onOpenConsultation={() => setIsConsultationModalOpen(true)} />

          <SocialProof />

          {/* About section - Disabled for now, can be re-enabled in the future */}
          {/* <Suspense fallback={<SectionFallback />}>
            <About />
          </Suspense> */}

          {/* <Achievements /> */}

          <Suspense fallback={<SectionFallback />}>
            <Services />
          </Suspense>

          <Suspense fallback={<SectionFallback />}>
            <WhyChooseUs />
          </Suspense>

          {/* Gallery section - Disabled for now, can be re-enabled in the future */}
          {/* <Suspense fallback={<SectionFallback />}>
            <Gallery />
          </Suspense> */}

          <Suspense fallback={<SectionFallback />}>
            <FAQ />
          </Suspense>

          <Suspense fallback={<SectionFallback />}>
            <Testimonials />
          </Suspense>

          <Suspense fallback={<SectionFallback />}>
            <Contact />
          </Suspense>
        </main>

        <Footer />

        {/* WhatsApp Floating Button - Sticky & Always Visible */}
        <a
          href="https://wa.me/+963942060440"
          target="_blank"
          rel="noopener noreferrer"
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center z-50 transition-all hover:scale-110 hover:opacity-90 group ${isRTL ? 'right-auto left-4 sm:left-6 md:left-8' : ''}`}
          style={{ backgroundColor: '#003300', color: '#cccc99' }}
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform" />
        </a>

        {/* Consultation Modal */}
        <ConsultationModal 
          isOpen={isConsultationModalOpen} 
          onClose={() => setIsConsultationModalOpen(false)} 
        />
      </div>
    </div>
  );
}
