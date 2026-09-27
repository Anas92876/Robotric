import { useState } from "react";
import { SEO } from "../../components/seo/SEO";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { ConsultationModal } from "../../components/home/ConsultationModal";
import { WaveDivider, Breadcrumb } from "../../components/ui";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import TechnicalIcon from "../../assets/Technical.svg";

export default function TechnicalConsultationPage() {
  const { t, i18n } = useTranslation("technicalConsultation");
  const isRTL = i18n.language === "ar";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  return (
    <div className="bg-background min-h-screen">
      <SEO title={t("seo.title")} description={t("seo.description")} path="/services/technical-consultation" />

      <LandingHeader onOpenConsultation={() => setIsConsultationModalOpen(true)} />

      <main>
        <section className="relative pt-40 md:pt-48 pb-16 md:pb-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-br from-primary/5 via-white to-accent/5 overflow-hidden">
          <div className={`max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center`} dir={isRTL ? "rtl" : "ltr"}>
            {/* Text Column - Right in RTL, Left in LTR */}
            <div className={`space-y-6 ${isRTL ? 'lg:order-1 text-right' : 'lg:order-1 text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
              {/* Breadcrumb Navigation */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="-mt-4"
              >
                <Breadcrumb
                  items={[
                    { label: t("breadcrumb.services", { defaultValue: isRTL ? "خدماتنا" : "Services" }), path: "/services" },
                    { label: t("hero.headline", { defaultValue: isRTL ? "استشارة تقنية" : "Technical Consultation" }) }
                  ]}
                />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`text-4xl md:text-5xl lg:text-6xl font-black text-text-primary mb-6 ${isRTL ? "font-arabic text-right" : "text-left"}`}
                dir={isRTL ? "rtl" : "ltr"}
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                {t("hero.headline")}
                {t("hero.headlineHighlight") && (
                  <>
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-700">{t("hero.headlineHighlight")}</span>
                  </>
                )}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-lg md:text-xl text-text-secondary mb-8 leading-relaxed ${isRTL ? "font-arabic text-right" : "text-left"}`}
                dir={isRTL ? "rtl" : "ltr"}
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                {t("hero.description")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`flex w-full ${isRTL ? 'justify-end' : 'justify-start'}`}
                style={{ justifyContent: isRTL ? 'flex-end' : 'flex-start' }}
              >
                <motion.button
                  type="button"
                  onClick={() => setIsConsultationModalOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-primary/30 transition-all cursor-pointer ${isRTL ? "font-arabic flex-row-reverse" : ""}`}
                  style={{ backgroundColor: '#003300', color: '#ffffcc', marginLeft: isRTL ? 'auto' : '0', marginRight: isRTL ? '0' : 'auto' }}
                >
                  {t("heroCta.bookConsultation")}
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowIcon className="w-5 h-5" />
                  </motion.div>
                </motion.button>
              </motion.div>
            </div>

            {/* Image Column - Left in RTL, Right in LTR */}
            <div className={`${isRTL ? 'lg:order-2' : 'lg:order-2'} flex items-center justify-center`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: isRTL ? -50 : 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative w-full max-w-md"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl group aspect-[4/3] w-full">
                  <img
                    src="/images/about/image_2026-02-24_03-39-25.webp"
                    alt={t("hero.headline")}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </motion.div>
            </div>
          </div>

          <div className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </section>

        {/* <section className="py-12 md:py-24 bg-gradient-to-r from-primary to-accent text-white flex flex-col items-center text-center">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col items-center text-center" dir={isRTL ? "rtl" : "ltr"}>
            <h2 className={`text-3xl md:text-4xl font-black mb-4 w-full  ${isRTL ? "font-arabic" : ""}`}>{t("cta.title")}</h2>
            <p className={`text-lg mb-8 opacity-90 w-full flex flex-col items-center text-center ${isRTL ? "font-arabic" : ""}`}>{t("cta.description")}</p>
            <button
              type="button"
              onClick={() => setIsConsultationModalOpen(true)}
              className={`inline-block px-8 py-4 bg-white text-primary rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer ${isRTL ? "font-arabic" : ""}`}
            >
              {t("cta.button")}
            </button>
          </div>
        </section> */}
      </main>

      <Footer />
      <ConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
      />
    </div>
  );
}
