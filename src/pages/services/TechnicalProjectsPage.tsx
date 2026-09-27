import { useState } from "react";
import { SEO } from "../../components/seo/SEO";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { ConsultationModal } from "../../components/home/ConsultationModal";
import { WaveDivider, Breadcrumb } from "../../components/ui";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, Search, Settings, FileText, Wrench, TestTube, Layers, Code, Cpu, Shield, FileCheck, Headphones, Lock, Star, Bot, Zap, Network } from "lucide-react";
import { useTranslation } from "react-i18next";

import TechnicalIcon from "../../assets/Technical.svg";

const capabilityIcons = [Bot, Zap, Network];
const journeyIcons = [Search, Layers, Code, Wrench, TestTube];
const featuresIcons = [Layers, FileCheck, Headphones, Lock];

export default function TechnicalProjectsPage() {
  const { t, i18n } = useTranslation("technicalProjects");
  const isRTL = i18n.language === "ar";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  const capabilities = (t("capabilities.items", { returnObjects: true }) as { title: string; description: string }[]) || [];
  const journeySteps = (t("journey.steps", { returnObjects: true }) as { title: string; subtitle: string; items: string[] }[]) || [];
  const features = (t("features.items", { returnObjects: true }) as { title: string; description: string }[]) || [];

  return (
    <div className="bg-background min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      <SEO title={t("seo.title")} description={t("seo.description")} path="/services/technical-projects" />

      <LandingHeader onOpenConsultation={() => setIsConsultationModalOpen(true)} />

      <main>
        {/* Hero Section */}
        <section className="relative pt-40 md:pt-48 pb-16 md:pb-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-br from-primary/5 via-white to-accent/5 overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Column */}
            <div className={`space-y-6 ${isRTL ? 'lg:order-1' : 'lg:order-1'}`}>
              {/* Breadcrumb */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="-mt-4"
              >
                <Breadcrumb
                  items={[
                    { label: t("breadcrumb.services", { defaultValue: isRTL ? "خدماتنا" : "Services" }), path: "/services" },
                    { label: t("breadcrumb.technical", { defaultValue: isRTL ? "المشاريع التقنية" : "Technical Projects" }) }
                  ]}
                />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`text-4xl md:text-5xl lg:text-6xl font-black text-text-primary mb-6 ${isRTL ? "font-arabic" : ""}`}
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
                className={`text-lg md:text-xl text-text-secondary mb-8 leading-relaxed ${isRTL ? "font-arabic" : ""}`}
              >
                {t("hero.description")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  type="button"
                  onClick={() => setIsConsultationModalOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-primary/30 transition-all cursor-pointer ${isRTL ? "font-arabic" : ""}`}
                  style={{ backgroundColor: '#003300', color: '#ffffcc' }}
                >
                  {t("heroCta.startProject")}
                  <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <ArrowIcon className="w-5 h-5" />
                  </motion.div>
                </motion.button>
              </motion.div>
            </div>

            {/* Image Column */}
            <div className={`${isRTL ? 'lg:order-2' : 'lg:order-2'} flex items-center justify-center`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: isRTL ? -50 : 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative w-full max-w-md"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl group aspect-[4/3] w-full">
                  <img
                    src="/images/services/tech.png"
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

        {/* Capabilities Section */}
        <section className="relative pt-0 pb-12 md:pb-24 bg-white overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="flex flex-col items-center text-center mb-12 md:mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`text-4xl sm:text-5xl font-black text-text-primary mb-6 text-center ${isRTL ? "font-arabic" : ""}`}
              >
                {t("capabilities.title")} {t("capabilities.titleHighlight")}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className={`text-lg text-text-secondary max-w-2xl text-center ${isRTL ? "font-arabic" : ""}`}
              >
                {t("capabilities.description")}
              </motion.p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {capabilities.map((capability, index) => {
                const Icon = capabilityIcons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative bg-white rounded-3xl p-8 shadow-md hover:shadow-xl hover:shadow-primary/15 transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative z-10">
                      <motion.div
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg ${isRTL ? "mr-0" : ""}`}
                      >
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                        <Icon className="w-8 h-8 text-white relative z-10" />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl"
                        />
                      </motion.div>

                      <h3 className={`text-2xl font-bold text-text-primary mb-3 group-hover:text-primary transition-colors ${isRTL ? "font-arabic" : ""}`}>{capability.title}</h3>
                      <p className={`text-text-secondary text-sm leading-relaxed ${isRTL ? "font-arabic" : ""}`}>{capability.description}</p>
                    </div>

                    <div className={`absolute top-0 w-24 h-24 bg-gradient-to-br from-primary to-accent opacity-5 ${isRTL ? "left-0 rounded-br-full" : "right-0 rounded-bl-full"}`} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Project Journey Section */}
        <section
          className="relative py-20 md:py-32 overflow-hidden"
          dir={isRTL ? "rtl" : "ltr"}
          style={{ background: 'linear-gradient(135deg, #001a00 0%, #003300 50%, #001f00 100%)' }}
        >
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(#cccc99 1px, transparent 1px), linear-gradient(90deg, #cccc99 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
          {/* Glow orbs */}
          <div className="absolute top-1/4 left-0 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #cccc99 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #cccc99 0%, transparent 70%)' }} />

          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
            {/* Header */}
            <div className="text-center mb-16 md:mb-24">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-5 border"
                style={{ background: 'rgba(204,204,153,0.12)', borderColor: 'rgba(204,204,153,0.3)', color: '#cccc99' }}
              >
                <Zap className="w-4 h-4" />
                {t("journey.badge", { defaultValue: isRTL ? "رحلة المشروع" : "Project Journey" })}
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl font-black mb-5"
                style={{ color: '#cccc99' }}
              >
                {t("journey.title")} <span className="text-white">{t("journey.titleHighlight")}</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-lg max-w-2xl mx-auto"
                style={{ color: 'rgba(204,204,153,0.7)' }}
              >
                {t("journey.description")}
              </motion.p>
            </div>

            {/* Steps grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {journeySteps.map((step, index) => {
                const Icon = journeyIcons[index];
                const palette = [
                  { card: 'rgba(204,204,153,0.07)', border: 'rgba(204,204,153,0.25)', iconBg: 'linear-gradient(135deg,#cccc99,#b3b380)', iconColor: '#003300', numColor: '#cccc99', dotBg: '#cccc99', dotText: '#003300' },
                  { card: 'rgba(0,68,0,0.5)',        border: 'rgba(0,136,0,0.35)',     iconBg: 'linear-gradient(135deg,#005500,#003300)', iconColor: '#cccc99', numColor: 'rgba(204,204,153,0.5)', dotBg: '#005500', dotText: '#cccc99' },
                  { card: 'rgba(204,204,153,0.07)', border: 'rgba(204,204,153,0.25)', iconBg: 'linear-gradient(135deg,#cccc99,#b3b380)', iconColor: '#003300', numColor: '#cccc99', dotBg: '#cccc99', dotText: '#003300' },
                  { card: 'rgba(0,68,0,0.5)',        border: 'rgba(0,136,0,0.35)',     iconBg: 'linear-gradient(135deg,#005500,#003300)', iconColor: '#cccc99', numColor: 'rgba(204,204,153,0.5)', dotBg: '#005500', dotText: '#cccc99' },
                  { card: 'rgba(204,204,153,0.07)', border: 'rgba(204,204,153,0.25)', iconBg: 'linear-gradient(135deg,#cccc99,#b3b380)', iconColor: '#003300', numColor: '#cccc99', dotBg: '#cccc99', dotText: '#003300' },
                ];
                const p = palette[index % palette.length];

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: index * 0.1, type: "spring", stiffness: 80, damping: 16 }}
                  >
                    <motion.div
                      whileHover={{ y: -6, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="group relative h-full rounded-3xl p-7 md:p-8 overflow-hidden cursor-default"
                      style={{ background: p.card, border: `1px solid ${p.border}`, backdropFilter: 'blur(12px)' }}
                    >
                      {/* Hover glow */}
                      <div
                        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 30% 30%, rgba(204,204,153,0.08) 0%, transparent 70%)' }}
                      />
                      {/* Watermark number */}
                      <div
                        className="absolute -bottom-4 -end-4 text-[9rem] font-black leading-none select-none pointer-events-none opacity-[0.06] group-hover:opacity-[0.11] transition-opacity duration-500"
                        style={{ color: p.numColor }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <div className="relative z-10 flex flex-col h-full">
                        {/* Top row */}
                        <div className="flex items-start justify-between mb-6">
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-black shadow-lg flex-shrink-0"
                            style={{ background: p.dotBg, color: p.dotText }}
                          >
                            {index + 1}
                          </div>
                          <motion.div
                            whileHover={{ rotate: 8, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0"
                            style={{ background: p.iconBg }}
                          >
                            <Icon className="w-7 h-7" style={{ color: p.iconColor }} />
                          </motion.div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold mb-2 group-hover:opacity-90 transition-opacity" style={{ color: '#cccc99' }}>
                          {step.title}
                        </h3>

                        {/* Subtitle */}
                        <p className="text-sm leading-relaxed mb-5 flex-grow" style={{ color: 'rgba(204,204,153,0.65)' }}>
                          {step.subtitle}
                        </p>

                        {/* Bullet items */}
                        {step.items && step.items.length > 0 && (
                          <ul className="space-y-2 mt-auto pt-4" style={{ borderTop: '1px solid rgba(204,204,153,0.12)' }}>
                            {step.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: p.dotBg }} />
                                <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Corner accent */}
                      <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-400" />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What Distinguishes Us Section */}
        <section className="relative py-0 overflow-visible" style={{ backgroundColor: '#cccc99' }}>
          <div className="absolute -top-[40px] md:-top-[50px] left-0 right-0 w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 1, transform: 'rotate(180deg)' }}>
            <svg className="relative block w-full h-[40px] md:h-[50px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 96" preserveAspectRatio="none" style={{ display: 'block' }}>
              <path d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" fill="#cccc99" />
            </svg>
          </div>

          <div className="absolute -bottom-[40px] md:-bottom-[50px] left-0 right-0 w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 1 }}>
            <svg className="relative block w-full h-[40px] md:h-[50px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 96" preserveAspectRatio="none" style={{ display: 'block' }}>
              <path d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" fill="#cccc99" />
            </svg>
          </div>

          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
            <div className="flex flex-col items-center text-center mb-12 md:mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`text-4xl sm:text-5xl font-black mb-4 text-center text-primary ${isRTL ? "font-arabic" : ""}`}
              >
                {t("features.title")}
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {features.slice(0, 3).map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="card-with-circle-3-holder custom-widget with-counter group"
                >
                  <div className="_circle">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="card-with-circle-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <div className="relative z-10">
                      <div className="_title">
                        <span className={isRTL ? "font-arabic" : ""}>{feature.title}</span>
                      </div>
                      <div className="_desc">
                        <span className={isRTL ? "font-arabic" : ""}>{feature.description}</span>
                      </div>
                    </div>

                    <div className={`absolute top-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isRTL ? 'left-0 rounded-br-full' : 'right-0 rounded-bl-full'}`} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <WaveDivider variant="wave2" flip={true} color="#ffffff" />

        {/* CTA Section */}
        <section className="py-12 md:py-24 bg-gradient-to-r from-primary to-accent text-white flex flex-col items-center text-center">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col items-center text-center">
            <h2 className={`text-3xl md:text-4xl font-black mb-4 w-full ${isRTL ? "font-arabic" : ""}`}>{t("cta.title")}</h2>
            <p className={`text-lg mb-8 opacity-90 w-full text-center ${isRTL ? "font-arabic" : ""}`}>{t("cta.description")}</p>
            <motion.button
              type="button"
              onClick={() => setIsConsultationModalOpen(true)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all cursor-pointer overflow-hidden group ${isRTL ? "font-arabic" : ""}`}
              style={{ backgroundColor: '#003300', color: '#ffffcc' }}
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="absolute inset-0 rounded-2xl bg-[#003300] opacity-75 animate-pulse" />
              <span className="relative z-10 flex items-center gap-2">
                {t("cta.button")}
                <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ArrowIcon className="w-5 h-5" />
                </motion.div>
              </span>
              <div className="absolute inset-0 rounded-2xl shadow-lg shadow-[#003300]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
          </div>
        </section>
      </main>

      <Footer />
      <ConsultationModal isOpen={isConsultationModalOpen} onClose={() => setIsConsultationModalOpen(false)} />
    </div>
  );
}
