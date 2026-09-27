import { useState } from "react";
import { SEO } from "../../components/seo/SEO";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { ConsultationModal } from "../../components/home/ConsultationModal";
import { Services } from "../../components/home/Services";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ServicesPage() {
  const { t, i18n } = useTranslation("home");
  const isRTL = i18n.language === "ar";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  return (
    <div className="bg-background min-h-screen">
      <SEO
        title="Our Services"
        titleAr="خدماتنا"
        description="Discover Robotrick's comprehensive technology services: robotics training, technical projects, 3D printing, STEM lab setup, curriculum design, and technical consultation in Syria."
        descriptionAr="اكتشف خدمات روبوتريك الشاملة: التدريب على الروبوتات، المشاريع التقنية، الطباعة ثلاثية الأبعاد، إعداد مختبرات STEM، تصميم المناهج والاستشارات التقنية في سوريا."
        path="/services"
      />

      <LandingHeader onOpenConsultation={() => setIsConsultationModalOpen(true)} />

      <main>
        {/* Hero Section */}
        <section className="relative pt-40 pb-8 md:pb-12 px-6 sm:px-8 lg:px-12 bg-gradient-to-br from-primary/5 via-white to-accent/5 overflow-hidden">
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-4xl md:text-6xl font-black text-text-primary mb-6 text-center ${isRTL ? "font-arabic" : ""}`}
            >
              {t("services.title")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-700">{t("services.titleHighlight")}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-12 text-center ${isRTL ? "font-arabic" : ""}`}
            >
              {t("services.description", { defaultValue: isRTL ? "نقدم حلولاً شاملة في الروبوتات والذكاء الاصطناعي والتكنولوجيا المتطورة" : "We provide comprehensive solutions in robotics, AI, and advanced technology" })}
            </motion.p>
          </div>

          {/* Background Decor */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </section>

        {/* Services Section - Using shared component */}
        <Services hideHeader={true} />

      </main>

      <Footer />
      <ConsultationModal isOpen={isConsultationModalOpen} onClose={() => setIsConsultationModalOpen(false)} />
    </div>
  );
}
