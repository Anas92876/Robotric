import { SEO } from "../../components/seo/SEO";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { Breadcrumb } from "../../components/ui";
import { motion } from "framer-motion";
import { Building2, Sparkles, CheckCircle2, ArrowRight, ArrowLeft, Users, Wrench, GraduationCap, Settings, Zap, Star, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ConsultationModal } from "../../components/home/ConsultationModal";

const stepIcons = [Users, Wrench, Settings, GraduationCap];
const featureIcons = [CheckCircle2, Sparkles, Building2];

export default function StemLabSetupPage() {
  const { t, i18n } = useTranslation("stemLabSetup");
  const isRTL = i18n.language === "ar";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  const steps = (t("process.steps", { returnObjects: true }) as { title: string; description: string; items: string[] }[]) || [];
  const features = (t("features.items", { returnObjects: true }) as { title: string; description: string }[]) || [];
  const whyChoose = (t("whyChoose.items", { returnObjects: true }) as { title: string; description: string }[]) || [];

  return (
    <div className="bg-background min-h-screen">
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        path="/services/stem-lab-setup"
      />

      <LandingHeader onOpenConsultation={() => setIsConsultationModalOpen(true)} />

      <main>
        {/* Hero Section */}
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
                    { label: t("hero.headline", { defaultValue: isRTL ? "تجهيز مختبرات STEM" : "STEM Lab Setup" }) }
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
                  {t("heroCta.startProject", { defaultValue: isRTL ? "ابدأ مشروعك" : "Start Your Project" })}
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
                    src="/images/about/image_2026-02-24_03-11-56.webp"
                    alt={t("hero.headline")}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Background Decor */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </section>

        {/* Process Steps Section */}
        <section
          className="relative py-20 md:py-32 overflow-hidden"
          dir={isRTL ? "rtl" : "ltr"}
          style={{ background: 'linear-gradient(135deg, #001a00 0%, #003300 50%, #001f00 100%)' }}
        >
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(#cccc99 1px, transparent 1px), linear-gradient(90deg, #cccc99 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
          {/* Glow orbs */}
          <div className="absolute top-1/4 left-0 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #cccc99 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #003300 0%, #cccc99 60%, transparent 100%)' }} />

          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
            {/* Section header */}
            <div className="text-center mb-16 md:mb-24">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-5 border"
                style={{ background: 'rgba(204,204,153,0.12)', borderColor: 'rgba(204,204,153,0.3)', color: '#cccc99' }}
              >
                <Zap className="w-4 h-4" />
                {t("process.badge", { defaultValue: isRTL ? "كيف نعمل" : "How We Work" })}
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl font-black mb-5"
                style={{ color: '#cccc99' }}
              >
                {t("process.titleHighlight") ? (
                  <>{t("process.title")} <span className="text-white">{t("process.titleHighlight")}</span></>
                ) : (
                  t("process.title")
                )}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-lg max-w-2xl mx-auto"
                style={{ color: 'rgba(204,204,153,0.7)' }}
              >
                {t("process.subtitle")}
              </motion.p>
            </div>

            {/* Steps grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {steps.map((step, index) => {
                const Icon = stepIcons[index];
                const palette = [
                  { card: 'rgba(204,204,153,0.07)', border: 'rgba(204,204,153,0.25)', iconBg: 'linear-gradient(135deg,#cccc99,#b3b380)', iconColor: '#003300', numColor: '#cccc99', dotBg: '#cccc99', dotText: '#003300' },
                  { card: 'rgba(0,68,0,0.5)',        border: 'rgba(0,136,0,0.35)',     iconBg: 'linear-gradient(135deg,#005500,#003300)',   iconColor: '#cccc99', numColor: 'rgba(204,204,153,0.5)', dotBg: '#005500', dotText: '#cccc99' },
                  { card: 'rgba(204,204,153,0.07)', border: 'rgba(204,204,153,0.25)', iconBg: 'linear-gradient(135deg,#cccc99,#b3b380)', iconColor: '#003300', numColor: '#cccc99', dotBg: '#cccc99', dotText: '#003300' },
                  { card: 'rgba(0,68,0,0.5)',        border: 'rgba(0,136,0,0.35)',     iconBg: 'linear-gradient(135deg,#005500,#003300)',   iconColor: '#cccc99', numColor: 'rgba(204,204,153,0.5)', dotBg: '#005500', dotText: '#cccc99' },
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
                      style={{
                        background: p.card,
                        border: `1px solid ${p.border}`,
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      {/* Hover glow */}
                      <div
                        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 30% 30%, rgba(204,204,153,0.08) 0%, transparent 70%)' }}
                      />

                      {/* Step number watermark */}
                      <div
                        className="absolute -bottom-4 -end-4 text-[9rem] font-black leading-none select-none pointer-events-none transition-opacity duration-500 opacity-[0.06] group-hover:opacity-[0.11]"
                        style={{ color: p.numColor }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <div className="relative z-10 flex flex-col h-full">
                        {/* Top row: step badge + icon */}
                        <div className="flex items-start justify-between mb-6">
                          {/* Step badge */}
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-black shadow-lg flex-shrink-0"
                            style={{ background: p.dotBg, color: p.dotText }}
                          >
                            {index + 1}
                          </div>
                          {/* Icon box */}
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
                        <h3 className="text-xl font-bold mb-3 group-hover:opacity-90 transition-opacity" style={{ color: '#cccc99' }}>
                          {step.title}
                        </h3>

                        {/* Description */}
                        <p className="text-sm leading-relaxed mb-5 flex-grow" style={{ color: 'rgba(204,204,153,0.65)' }}>
                          {step.description}
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
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative py-0 overflow-visible" style={{ backgroundColor: '#cccc99' }}>
          {/* Wave at the top */}
          <div className="absolute -top-[40px] md:-top-[50px] left-0 right-0 w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 1, transform: 'rotate(180deg)' }}>
            <svg
              className="relative block w-full h-[40px] md:h-[50px]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1440 96"
              preserveAspectRatio="none"
              style={{ display: 'block' }}
            >
              <path 
                d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" 
                fill="#cccc99"
              />
            </svg>
          </div>
          
          {/* Wave at the bottom */}
          <div className="absolute -bottom-[40px] md:-bottom-[50px] left-0 right-0 w-full overflow-hidden leading-none pointer-events-none" style={{ zIndex: 1 }}>
            <svg
              className="relative block w-full h-[40px] md:h-[50px]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1440 96"
              preserveAspectRatio="none"
              style={{ display: 'block' }}
            >
              <path 
                d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" 
                fill="#cccc99"
              />
            </svg>
          </div>

          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
            <div className="text-center mb-12 md:mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl sm:text-5xl font-black text-text-primary mb-6"
              >
                {t("features.titleHighlight") ? (
                  <>{t("features.title")} <span className="text-primary">{t("features.titleHighlight")}</span></>
                ) : (
                  <span className="text-primary">{t("features.title")}</span>
                )}
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {features.map((feature, index) => {
                const Icon = featureIcons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative bg-gradient-to-br from-white via-white to-primary/5 rounded-2xl p-5 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.02] overflow-hidden cursor-pointer"
                  >
                    {/* Animated Background Gradient on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                      {/* Icon - Centered at Top */}
                      <div className="mb-4 sm:mb-5 md:mb-6 flex items-center justify-center">
                        <div className={`relative w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:shadow-primary/30 transition-all duration-500 group-hover:scale-110`}>
                          <Icon className="w-10 h-10 text-white relative z-10" strokeWidth={2.5} />
                        </div>
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-2xl md:text-3xl font-black text-text-primary mb-4 group-hover:text-primary transition-colors duration-300">
                        {feature.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-text-secondary text-base leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    
                    {/* Corner Decoration */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Enhanced CTA Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-accent">
            <motion.div
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 bg-[length:200%_100%] bg-gradient-to-r from-primary via-accent to-primary opacity-50"
            />
          </div>
          
          {/* Floating Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -30, 0],
                  x: [0, Math.sin(i) * 20, 0],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5,
                }}
                className="absolute w-2 h-2 bg-white/30 rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 3) * 20}%`,
                }}
              />
            ))}
          </div>

          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 text-white"
            >
              {t("cta.title")}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl mb-8 opacity-95 text-white"
            >
              {t("cta.description")}
            </motion.p>
            <motion.a
              href="/#contact"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="relative inline-flex items-center gap-2 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 cursor-pointer overflow-hidden group"
              style={{ backgroundColor: '#003300', color: '#ffffcc' }}
            >
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              {/* Pulsing glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-[#003300] opacity-75 animate-pulse" />
              
              {/* Content */}
              <span className="relative z-10 flex items-center gap-2">
                {t("cta.button")}
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </span>
              
              {/* Hover shadow */}
              <div className="absolute inset-0 rounded-2xl shadow-lg shadow-[#003300]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.a>
          </div>
        </section>
      </main>

      <Footer />
      <ConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
      />
    </div>
  );
}
