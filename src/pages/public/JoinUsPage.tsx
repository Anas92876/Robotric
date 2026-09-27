import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Home,
  MessageCircle,
  Send,
} from "lucide-react";
import { Link } from "react-router-dom";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { SEO } from "../../components/seo/SEO";
import { ROUTES } from "../../constants/routes.constants";
import {
  JOB_APPLICATION_WHATSAPP,
  JOB_POSITIONS,
} from "../../data/jobPositions";

const JoinUsPage: React.FC = () => {
  const { t, i18n } = useTranslation("home");
  const isRTL = i18n.language === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", isRTL ? "ar" : "en");
  }, [dir, isRTL]);

  return (
    <div
      className={`min-h-screen overflow-x-hidden bg-background ${
        isRTL ? "font-arabic" : ""
      }`}
      dir={dir}
    >
      <SEO
        title="Join Us"
        titleAr="انضم إلينا"
        description="Explore Robotrick career opportunities and open each role on its own shareable page."
        descriptionAr="استكشف الوظائف المتاحة في روبوتريك وافتح كل منصب ضمن صفحة مستقلة قابلة للمشاركة."
        keywords="careers, job openings, robotics trainer, content creator, Robotrick"
        keywordsAr="وظائف, فرص عمل, مدرب روبوتيك, صانع محتوى, روبوتريك"
        path={ROUTES.JOIN_US}
      />

      <LandingHeader />

      <main className="pt-16 sm:pt-20">
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:px-16">
          <nav className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#003300]/6 bg-white/80 px-4 py-2 shadow-sm">
              <Link
                to={ROUTES.HOME}
                className="flex items-center gap-1.5 text-sm text-primary/50 transition-colors hover:text-primary"
              >
                <Home className="h-3.5 w-3.5" />
                {isRTL ? "الرئيسية" : "Home"}
              </Link>
              {isRTL ? (
                <ChevronLeft className="h-3.5 w-3.5 text-primary/25" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-primary/25" />
              )}
              <span className="text-sm font-bold text-primary">
                {isRTL ? "انضم إلينا" : "Join Us"}
              </span>
            </div>
          </nav>

          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              <p className="mb-4 text-xs font-black uppercase tracking-widest text-[#003300]/40">
                {isRTL ? "فرص العمل" : "Career Opportunities"}
              </p>
              <h1 className="mb-5 text-3xl font-black leading-tight text-primary sm:text-4xl lg:text-5xl">
                {t("joinUs.hero.title")}
              </h1>
              <p className="mb-8 text-base leading-relaxed text-primary/60 sm:text-lg">
                {t("joinUs.hero.subtitle")}
              </p>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-3 rtl:space-x-reverse">
                  {JOB_POSITIONS.slice(0, 4).map((job) => (
                    <div
                      key={job.id}
                      className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm"
                    >
                      <img
                        src={job.imageSrc}
                        alt={isRTL ? job.titleAr : job.titleEn}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-primary/50">
                  {isRTL
                    ? `${JOB_POSITIONS.length} وظائف متاحة`
                    : `${JOB_POSITIONS.length} open positions`}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="relative h-64 overflow-hidden rounded-3xl shadow-2xl sm:h-80 lg:h-[420px]"
            >
              <img
                src="/images/job/image.png"
                alt={isRTL ? "فريق روبوتريك" : "Robotrick team"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001a00]/80 via-[#003300]/10 to-transparent" />
              <div className="absolute bottom-6 start-6 end-6">
                <p className="text-lg font-black leading-tight text-white">
                  {isRTL
                    ? "كل وظيفة الآن لها صفحة مستقلة قابلة للمشاركة"
                    : "Every role now has its own shareable page"}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {isRTL
                    ? "افتح أي منصب وشارك رابطه مباشرة"
                    : "Open any position and share its direct link"}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-20 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 sm:mb-14"
          >
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#003300]/40">
              {isRTL ? "الوظائف المتاحة" : "Open Positions"}
            </p>
            <h2 className="text-2xl font-black text-[#003300] sm:text-3xl lg:text-4xl">
              {t("joinUs.jobOpportunities.title")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#003300]/55 sm:text-base">
              {isRTL
                ? "كل بطاقة تقودك إلى صفحة وظيفة مستقلة فيها كل التفاصيل"
                : "Each card opens a dedicated role page with full details"}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {JOB_POSITIONS.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.07 }}
              >
                <Link
                  to={`${ROUTES.JOIN_US}/${job.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#003300]/6 bg-white text-start shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-52 overflow-hidden sm:h-56">
                    <img
                      src={job.imageSrc}
                      alt={isRTL ? job.titleAr : job.titleEn}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#001a00]/75 via-transparent to-transparent" />

                    {job.badge && (
                      <div className="absolute start-4 top-4">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-black tracking-wide"
                          style={{ backgroundColor: "#cccc99", color: "#003300" }}
                        >
                          {isRTL ? "جديد" : "NEW"}
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-4 start-4 end-4">
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/60">
                        {isRTL ? job.subtitleAr : job.subtitleEn}
                      </p>
                      <h3 className="text-xl font-black leading-tight text-white">
                        {isRTL ? job.titleAr : job.titleEn}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-6">
                    <p className="line-clamp-2 text-sm leading-relaxed text-[#003300]/55">
                      {isRTL ? job.descriptionAr : job.descriptionEn}
                    </p>

                    <div className="mt-auto flex items-center justify-between border-t border-[#003300]/6 pt-4">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[#003300]/35">
                        {job.whatsapp ? (
                          <>
                            <MessageCircle className="h-3.5 w-3.5" />
                            {isRTL ? "واتساب" : "WhatsApp"}
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            {isRTL ? "نموذج إلكتروني" : "Online Form"}
                          </>
                        )}
                      </span>
                      <span
                        className={`flex items-center gap-1.5 text-sm font-black text-[#003300] transition-all group-hover:gap-2.5 ${
                          isRTL ? "flex-row-reverse" : ""
                        }`}
                      >
                        {isRTL ? "فتح الصفحة" : "Open Page"}
                        <ArrowIcon className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-4 py-12 sm:px-8 sm:py-20 lg:px-16">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl border border-[#003300]/6 bg-white p-8 shadow-lg sm:p-12"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, #003300 1px, transparent 0)",
                  backgroundSize: "28px 28px",
                }}
              />
              <div className="relative">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#003300]/40">
                  {isRTL ? "كيف تتقدم" : "How to Apply"}
                </p>
                <h2 className="mb-2 text-2xl font-black text-[#003300] sm:text-3xl">
                  {t("joinUs.apply.title")}
                </h2>
                <p className="mb-10 text-sm text-[#003300]/50">
                  {isRTL
                    ? "افتح صفحة المنصب المناسب لك، راجع التفاصيل، ثم قدّم مباشرة من نفس الصفحة."
                    : "Open the role page that fits you, review the details, and apply directly from that page."}
                </p>

                <div className="mb-10 space-y-5">
                  {[1, 2, 3].map((step, index) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: isRTL ? 16 : -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start gap-5 ${
                        isRTL ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-black"
                        style={{ backgroundColor: "#003300", color: "#cccc99" }}
                      >
                        {step}
                      </div>
                      <p className="flex-1 pt-2.5 text-sm leading-relaxed text-[#003300]/60">
                        {step === 2
                          ? isRTL
                            ? "افتح صفحة الوظيفة المناسبة لك عبر الرابط المباشر وشاركها أو احفظها بسهولة."
                            : "Open the position page through its direct URL so you can share or save it easily."
                          : t(`joinUs.apply.step${step}`)}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <a
                  href={JOB_APPLICATION_WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold shadow-md transition-all hover:opacity-90 hover:shadow-lg ${
                    isRTL ? "flex-row-reverse" : ""
                  }`}
                  style={{ backgroundColor: "#003300", color: "#cccc99" }}
                >
                  <MessageCircle className="h-5 w-5" />
                  {t("joinUs.apply.cta")}
                  <ArrowIcon className="h-5 w-5" />
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default JoinUsPage;
