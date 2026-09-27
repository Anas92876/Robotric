import { SEO } from "../../components/seo/SEO";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { WaveDivider, Breadcrumb } from "../../components/ui";
import { motion } from "framer-motion";
import { useState } from "react";
import { Printer, Layers, Sparkles, Clock, ArrowRight, ArrowLeft, CheckCircle2, FileCode, Package, Rocket, Star } from "lucide-react";
import { ConsultationModal } from "../../components/home/ConsultationModal";
import { useTranslation } from "react-i18next";

const designIcons = [FileCode, Package, Rocket];
const materialIcons = [Package, Layers, Package];
const projectIcons = [Rocket, Package, Rocket];

export default function ThreeDPrintingPage() {
  const { t, i18n } = useTranslation("threeDPrinting");
  const isRTL = i18n.language === "ar";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  const designCapabilities = (t("design.items", { returnObjects: true }) as { title: string; description: string }[]) || [];
  const materials = (t("materials.items", { returnObjects: true }) as { name: string; description: string }[]) || [];
  const projects = (t("projects.items", { returnObjects: true }) as { title: string; description: string }[]) || [];
  const features = (t("features.items", { returnObjects: true }) as { title: string; description: string }[]) || [];

  return (
    <div className="bg-background min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        path="/services/3d-printing"
      />

      <LandingHeader onOpenConsultation={() => setIsConsultationModalOpen(true)} />

      <main>
        {/* Hero Section */}
        <section className="relative pt-40 md:pt-48 pb-16 md:pb-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-br from-primary/5 via-white to-accent/5 overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Column */}
            <div className="space-y-6 lg:order-1">
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
                    { label: t("hero.headline", { defaultValue: isRTL ? "الطباعة ثلاثية الأبعاد" : "3D Printing" }) }
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
                    src="/images/services/3d-printing.png"
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

        {/* Design Engineering Capabilities Section */}
        <section className="relative py-12 md:py-24 bg-white overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-12 md:mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`text-4xl sm:text-5xl font-black text-text-primary mb-4 text-center ${isRTL ? "font-arabic" : ""}`}
              >
                {t("design.title")} <span className="text-primary">{t("design.titleHighlight")}</span>
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {designCapabilities.map((capability, index) => {
                const Icon = designIcons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ 
                      delay: index * 0.15,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    whileHover={{ y: -10, scale: 1.03 }}
                    className={`group relative bg-white rounded-3xl p-8 md:p-10 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary/30 ${isRTL ? "text-right" : "text-left"}`}
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {/* Animated Background */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 transition-opacity duration-500"
                    />
                    
                    {/* Glow Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
                    </div>
                    
                    <div className="relative z-10">
                      {/* Icon */}
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                        className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300 ${isRTL ? "mr-auto" : "ml-0"}`}
                      >
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
                        <Icon className="w-10 h-10 text-white relative z-10" />
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-2xl bg-primary/40 blur-lg"
                        />
                      </motion.div>
                      
                      <h3 className={`text-2xl md:text-3xl font-bold text-text-primary mb-4 group-hover:text-primary transition-colors duration-300 ${isRTL ? "font-arabic" : ""}`} dir={isRTL ? "rtl" : "ltr"}>{capability.title}</h3>
                      <p className={`text-text-secondary text-base leading-relaxed ${isRTL ? "font-arabic" : ""}`} dir={isRTL ? "rtl" : "ltr"}>{capability.description}</p>
                    </div>

                    {/* Enhanced Corner Decorations */}
                    <div className={`absolute top-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isRTL ? "left-0 rounded-bl-none rounded-br-full" : "right-0 rounded-bl-full"} blur-2xl`} />
                    <div className={`absolute ${isRTL ? "bottom-0 right-0" : "bottom-0 left-0"} w-20 h-20 bg-gradient-to-tl from-accent/10 to-primary/10 rounded-tl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <WaveDivider variant="wave2" flip={true} color="#f9fafb" />

        {/* Materials Library Section */}
        <section className="relative py-12 md:py-24 bg-surface overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-12 md:mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`text-4xl sm:text-5xl font-black text-text-primary mb-4 text-center ${isRTL ? "font-arabic" : ""}`}
              >
                {t("materials.title")} <span className="text-primary">{t("materials.titleHighlight")}</span>
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {materials.map((material, index) => {
                const Icon = materialIcons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ 
                      delay: index * 0.15,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    whileHover={{ y: -10, scale: 1.03 }}
                    className={`group relative bg-white rounded-3xl p-8 md:p-10 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary/30 ${isRTL ? "text-right" : "text-left"}`}
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {/* Animated Background */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 transition-opacity duration-500"
                    />
                    
                    {/* Glow Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
                    </div>
                    
                    <div className="relative z-10">
                      {/* Icon */}
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                        className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300 ${isRTL ? "mr-auto" : "ml-0"}`}
                      >
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
                        <Icon className="w-10 h-10 text-white relative z-10" />
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-2xl bg-primary/40 blur-lg"
                        />
                      </motion.div>
                      
                      <h3 className={`text-2xl md:text-3xl font-bold text-text-primary mb-4 group-hover:text-primary transition-colors duration-300 ${isRTL ? "font-arabic" : ""}`} dir={isRTL ? "rtl" : "ltr"}>{material.name}</h3>
                      <p className={`text-text-secondary text-base leading-relaxed ${isRTL ? "font-arabic" : ""}`} dir={isRTL ? "rtl" : "ltr"}>{material.description}</p>
                    </div>
                    
                    {/* Enhanced Corner Decorations */}
                    <div className={`absolute top-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isRTL ? "left-0 rounded-bl-none rounded-br-full" : "right-0 rounded-bl-full"} blur-2xl`} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <WaveDivider variant="wave1" color="#f9fafb" />

        {/* End-to-End Projects Section */}
        <section className="relative py-12 md:py-24 bg-white overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-12 md:mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`text-4xl sm:text-5xl font-black text-text-primary mb-4 text-center ${isRTL ? "font-arabic" : ""}`}
              >
                {t("projects.title")} <span className="text-primary">{t("projects.titleHighlight")}</span>
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {projects.map((project, index) => {
                const Icon = projectIcons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ 
                      delay: index * 0.15,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    whileHover={{ y: -10, scale: 1.03 }}
                    className={`group relative bg-white rounded-3xl p-8 md:p-10 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary/30 ${isRTL ? "text-right" : "text-left"}`}
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {/* Animated Background */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 transition-opacity duration-500"
                    />
                    
                    {/* Glow Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
                    </div>
                    
                    <div className="relative z-10">
                      {/* Icon */}
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                        className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300 ${isRTL ? "mr-auto" : "ml-0"}`}
                      >
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
                        <Icon className="w-10 h-10 text-white relative z-10" />
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-2xl bg-primary/40 blur-lg"
                        />
                      </motion.div>
                      
                      <h3 className={`text-2xl md:text-3xl font-bold text-text-primary mb-4 group-hover:text-primary transition-colors duration-300 ${isRTL ? "font-arabic" : ""}`} dir={isRTL ? "rtl" : "ltr"}>{project.title}</h3>
                      <p className={`text-text-secondary text-base leading-relaxed ${isRTL ? "font-arabic" : ""}`} dir={isRTL ? "rtl" : "ltr"}>{project.description}</p>
                    </div>
                    
                    {/* Enhanced Corner Decorations */}
                    <div className={`absolute top-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isRTL ? "left-0 rounded-bl-none rounded-br-full" : "right-0 rounded-bl-full"} blur-2xl`} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <WaveDivider variant="wave2" flip={true} color="#ffffff" />

        {/* What Distinguishes Us Section */}
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

          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-0 relative z-10">
            <div className="flex flex-col items-center text-center mb-12 md:mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`text-4xl sm:text-5xl font-black text-text-primary mb-4 text-center ${isRTL ? "font-arabic" : ""}`}
              >
                {t("features.title")}
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {features.slice(0, 3).map((feature, index) => {
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="card-with-circle-3-holder custom-widget with-counter group"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    <div className="_circle">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    </div>

                    <div className="card-with-circle-3">
                      {/* Animated Background Gradient on Hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      
                      {/* Content Container */}
                      <div className="relative z-10">
                        <div className="_title">
                          <span className={isRTL ? "font-arabic" : ""}>{feature.title}</span>
                        </div>

                        <div className="_desc">
                          <span className={isRTL ? "font-arabic" : ""}>{feature.description}</span>
                        </div>
                      </div>
                      
                      {/* Corner Decoration */}
                      <div className={`absolute top-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isRTL ? 'left-0 rounded-bl-none rounded-br-full' : 'right-0'}`} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-24 bg-gradient-to-r from-primary to-accent text-white">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              {t("cta.title")}
            </h2>
            <p className="text-lg mb-8 opacity-90">
              {t("cta.description")}
            </p>
            <motion.button
              type="button"
              onClick={() => setIsConsultationModalOpen(true)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all cursor-pointer overflow-hidden group ${isRTL ? "font-arabic flex-row-reverse" : ""}`}
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
                  <ArrowIcon className="w-5 h-5" />
                </motion.div>
              </span>
              
              {/* Hover shadow */}
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
