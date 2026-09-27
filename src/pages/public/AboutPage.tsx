import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { SEO } from "../../components/seo/SEO";
import { About } from "../../components/home/About";
import { ConsultationModal } from "../../components/home/ConsultationModal";

export const AboutPage: React.FC = () => {
  const { i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  useEffect(() => {
    const dir = isRTL ? 'rtl' : 'ltr';
    const lang = isRTL ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [isRTL]);

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'font-arabic' : ''}`}>
      <SEO
        title="About Us"
        titleAr="من نحن"
        description="Robotrick is a professional robotics and technology company founded in Aleppo, Syria in 2022. Equipped lab, expert team, and advanced tools delivering cutting-edge technology solutions."
        descriptionAr="روبوتريك شركة متخصصة في الروبوتات والتكنولوجيا تأسست في حلب عام 2022. مختبر متكامل وفريق متخصص يقدم حلولاً تكنولوجية متطورة."
        path="/about"
      />
      <LandingHeader onOpenConsultation={() => setIsConsultationModalOpen(true)} />
      <main className="flex-1 pt-20">
        <About />
      </main>
      <Footer />

      {/* WhatsApp Floating Button */}
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

      <ConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
      />
    </div>
  );
};

export default AboutPage;
