import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { Contact } from "../../components/home/Contact";
import { SEO } from "../../components/seo/SEO";

export const ContactPage: React.FC = () => {
  const { i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    const dir = isRTL ? 'rtl' : 'ltr';
    const lang = isRTL ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [isRTL]);

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'font-arabic' : ''}`}>
      <SEO
        title="Contact Us"
        titleAr="تواصل معنا"
        description="Get in touch with Robotrick in Aleppo, Syria. Contact us for robotics training, technical projects, 3D printing, STEM solutions, and technical consultation."
        descriptionAr="تواصل مع روبوتريك في حلب، سوريا. اتصل بنا للتدريب على الروبوتات، المشاريع التقنية، الطباعة ثلاثية الأبعاد، حلول STEM والاستشارات التقنية."
        path="/contact"
      />
      <LandingHeader />
      <main className="flex-1 pt-20">
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
