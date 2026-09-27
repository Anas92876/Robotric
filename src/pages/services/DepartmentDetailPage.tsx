import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, MessageCircle, CheckCircle2,
  Award, Clock, Users, ChevronDown, ChevronUp, ImageIcon, X,
} from "lucide-react";
import { api, type ApiRequestConfig } from "../../lib/api";
import { SEO } from "../../components/seo/SEO";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { ConsultationModal } from "../../components/home/ConsultationModal";

/* ── fallback images per department index ───────────────────── */
const DEPT_FALLBACKS: string[][] = [
  ["/images/training/image-kids.jpeg",  "/images/training/image-eng.jpeg"],   // 0 Robotics
  ["/images/training/image-drone.jpeg", "/images/training/image-kids.jpeg"],  // 1 Drone
  ["/images/training/image-eng.jpeg",   "/images/training/image-vr.jpeg"],    // 2 AI
  ["/images/training/image-eng.jpeg",   "/images/training/image-kids.jpeg"],  // 3 3D Print
  ["/images/training/image-vr.jpeg",    "/images/training/image-eng.jpeg"],   // 4 VR
  ["/images/training/image-eng.jpeg",   "/images/training/image-kids.jpeg"],  // 5 Eng Design
  ["/images/training/image-kids.jpeg",  "/images/training/image-eng.jpeg"],   // 6 Web
  ["/images/training/image-eng.jpeg",   "/images/training/image-drone.jpeg"], // 7 Embedded
];

const DEPT_ACCENT = "#15803d"; // yearRound brand color

/* ── ProgramCard ─────────────────────────────────────────────── */
function ProgramCard({
  prog,
  isRTL,
  onWhatsApp,
}: {
  prog: any;
  isRTL: boolean;
  onWhatsApp: (title: string) => void;
}) {
  const { t } = useTranslation("training");
  const whatYouLearn: string[] = prog.whatYouLearn ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden flex flex-col"
    >
      {/* top accent bar */}
      <div className="h-1.5" style={{ backgroundColor: DEPT_ACCENT }} />

      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* title + certificate badge */}
        <div className="flex items-start justify-between gap-3">
          <h3
            className={`text-lg font-black text-text-primary leading-tight flex-1 ${isRTL ? "font-arabic" : ""}`}
          >
            {prog.title}
          </h3>
          {prog.certificate && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: "#fef9c3", color: "#854d0e" }}
            >
              <Award className="w-3 h-3" />
              {isRTL ? "شهادة" : "Cert"}
            </span>
          )}
        </div>

        {/* description */}
        {prog.description && (
          <p className={`text-sm text-text-secondary leading-relaxed ${isRTL ? "font-arabic" : ""}`}>
            {prog.description}
          </p>
        )}

        {/* meta row */}
        <div className="flex flex-wrap gap-2">
          {prog.age && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-secondary text-text-secondary border border-border">
              <Users className="w-3 h-3" />
              <span className={isRTL ? "font-arabic" : ""}>{prog.age}</span>
            </span>
          )}
          {prog.levels && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-secondary text-text-secondary border border-border">
              <span className={isRTL ? "font-arabic" : ""}>{t("map.levelsLabel")}: {prog.levels}</span>
            </span>
          )}
          {prog.hoursPerLevel && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-secondary text-text-secondary border border-border">
              <Clock className="w-3 h-3" />
              <span className={isRTL ? "font-arabic" : ""}>{prog.hoursPerLevel}</span>
            </span>
          )}
        </div>

        {/* prerequisite */}
        {prog.prerequisite && (
          <p className={`text-xs text-text-secondary ${isRTL ? "font-arabic" : ""}`}>
            <span className="font-semibold">{isRTL ? "المتطلبات: " : "Prerequisite: "}</span>
            {prog.prerequisite}
          </p>
        )}

        {/* what you'll learn */}
        {whatYouLearn.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className={`text-xs font-bold text-text-primary ${isRTL ? "font-arabic" : ""}`}>
              {isRTL ? "ستتعلم:" : "You'll learn:"}
            </p>
            <ul className="space-y-1.5">
              {whatYouLearn.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2
                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                    style={{ color: DEPT_ACCENT }}
                  />
                  <span className={`text-xs text-text-secondary leading-snug ${isRTL ? "font-arabic" : ""}`}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* spacer */}
        <div className="flex-1" />

        {/* enroll button */}
        <motion.button
          type="button"
          onClick={() => onWhatsApp(prog.title)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow transition-all cursor-pointer"
          style={{ backgroundColor: DEPT_ACCENT, color: "#fff" }}
        >
          <MessageCircle className="w-4 h-4" />
          <span className={isRTL ? "font-arabic" : ""}>{t("map.enrollCta")}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── FaqAccordion ────────────────────────────────────────────── */
function FaqAccordion({
  faq,
  isRTL,
}: {
  faq: { question: string; answer: string }[];
  isRTL: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (!faq.length) return null;

  return (
    <div className="space-y-3">
      {faq.map((item, i) => (
        <div
          key={i}
          className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm"
        >
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 p-5 text-start cursor-pointer hover:bg-surface-secondary/50 transition-colors"
          >
            <span className={`font-bold text-sm text-text-primary ${isRTL ? "font-arabic" : ""}`}>
              {item.question}
            </span>
            {open === i
              ? <ChevronUp className="w-4 h-4 text-text-secondary flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-text-secondary flex-shrink-0" />
            }
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                key="body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <p
                  className={`px-5 pb-5 text-sm text-text-secondary leading-relaxed ${isRTL ? "font-arabic" : ""}`}
                >
                  {item.answer}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────── */

export default function DepartmentDetailPage() {
  const { deptIndex = "0" } = useParams<{ deptIndex: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("training");
  const isRTL = i18n.language === "ar";
  const lang  = isRTL ? "ar" : "en";
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;
  const ArrowFwd  = isRTL ? ArrowLeft  : ArrowRight;

  const [cmsData, setCmsData]           = useState<Record<"ar" | "en", any> | null>(null);
  const [lightbox, setLightbox]         = useState<string | null>(null);
  const [isConsultOpen, setConsultOpen] = useState(false);

  useEffect(() => {
    api.get("/public/training-content", { skipAuth: true } as ApiRequestConfig)
      .then(r => { if (r.data?.data) setCmsData(r.data.data); })
      .catch(() => {});
  }, []);

  /* ── resolve department ───────────────────────────────────── */
  const idx = parseInt(deptIndex, 10);
  const i18nYearRound = t("map.tracks.yearRound", { returnObjects: true }) as any;
  const cmsYearRound  = cmsData?.[lang]?.tracks?.yearRound;
  const depts         = (cmsYearRound?.departments?.length ? cmsYearRound.departments : null) ?? i18nYearRound?.departments ?? [];
  const dept          = depts[idx];

  /* FAQ is shared — try CMS first, fallback to i18n */
  const faq: { question: string; answer: string }[] =
    (cmsYearRound?.faq?.length ? cmsYearRound.faq : null) ?? i18nYearRound?.faq ?? [];

  /* cover image — check both langs (images shared) */
  const otherLang = lang === "ar" ? "en" : "ar";
  const coverUrl  =
    dept?.coverImage?.url ||
    cmsData?.[otherLang]?.tracks?.yearRound?.departments?.[idx]?.coverImage?.url ||
    (DEPT_FALLBACKS[idx] ?? DEPT_FALLBACKS[0])[0];

  if (!dept) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center space-y-4">
          <p className="text-text-secondary">{isRTL ? "القسم غير موجود." : "Department not found."}</p>
          <button
            onClick={() => navigate("/services/training")}
            className="text-primary font-bold underline cursor-pointer"
          >
            {t("breadcrumb.training")}
          </button>
        </div>
      </div>
    );
  }

  const programs: any[] = dept.programs ?? [];

  const openWhatsApp = (programTitle?: string) => {
    const subject = programTitle ? `"${programTitle}"` : `"${dept.name}"`;
    const msg = `${t("map.whatsappPrefix")} ${subject} ${t("map.whatsappSuffix")}`;
    window.open(`https://wa.me/+963942060440?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="bg-background min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      <SEO
        title={`${dept.name} — Robotrick`}
        description={dept.description || dept.tagline}
        path={`/services/training/yearround/${deptIndex}`}
      />
      <LandingHeader onOpenConsultation={() => setConsultOpen(true)} />

      <main>

        {/* ══════════════════════════════════════════════════════
            HERO — department cover image + name + tagline
        ══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden" style={{ minHeight: "65vh" }}>

          {/* photo layer */}
          <div className="absolute inset-0 z-0">
            <img
              src={coverUrl}
              alt={dept.name}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.10) 100%)",
            }} />
          </div>

          {/* back button + hero content */}
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 pt-36 md:pt-44 pb-20"
          >
            {/* back */}
            <button
              onClick={() => navigate("/services/training")}
              className="inline-flex items-center gap-2 font-semibold text-sm transition-colors cursor-pointer mb-8"
              style={{ color: "rgba(204,204,153,0.70)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#cccc99")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(204,204,153,0.70)")}
            >
              <ArrowBack className="w-4 h-4 flex-shrink-0" />
              <span className={isRTL ? "font-arabic" : ""}>{t("breadcrumb.training")}</span>
            </button>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              className="max-w-2xl space-y-4"
            >
              {/* track pill */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: "rgba(204,204,153,0.15)",
                  color: "#cccc99",
                  border: "1px solid rgba(204,204,153,0.35)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DEPT_ACCENT }}
                />
                <span className={isRTL ? "font-arabic" : ""}>
                  {i18nYearRound?.title ?? (isRTL ? "برامج على مدار السنة" : "Year-Round Programs")}
                </span>
              </div>

              {/* department name */}
              <h1
                className={`text-3xl sm:text-4xl md:text-5xl font-black leading-tight ${isRTL ? "font-arabic" : ""}`}
                style={{ color: "#cccc99" }}
              >
                {dept.name}
              </h1>

              {/* tagline */}
              {dept.tagline && (
                <p
                  className={`text-lg font-semibold ${isRTL ? "font-arabic" : ""}`}
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {dept.tagline}
                </p>
              )}

              {/* description */}
              {dept.description && (
                <p
                  className={`text-base leading-relaxed ${isRTL ? "font-arabic" : ""}`}
                  style={{ color: "rgba(204,204,153,0.80)" }}
                >
                  {dept.description}
                </p>
              )}

              {/* program count badge */}
              {programs.length > 0 && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: "rgba(204,204,153,0.15)",
                    color: "#cccc99",
                    border: "1px solid rgba(204,204,153,0.30)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <span className={isRTL ? "font-arabic" : ""}>
                    {programs.length} {isRTL ? "برنامج" : programs.length === 1 ? "Program" : "Programs"}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PROGRAMS GRID
        ══════════════════════════════════════════════════════ */}
        {programs.length > 0 && (
          <section className="py-16 md:py-24 px-6 sm:px-8 lg:px-12 bg-white">
            <div className="max-w-6xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>

              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`text-2xl sm:text-3xl font-black text-text-primary mb-3 ${isRTL ? "font-arabic" : ""}`}
              >
                {isRTL ? (
                  <><span className="text-primary">البرامج</span> المتاحة</>
                ) : (
                  <>Available <span className="text-primary">Programs</span></>
                )}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 }}
                className={`text-text-secondary text-sm mb-10 ${isRTL ? "font-arabic" : ""}`}
              >
                {isRTL
                  ? "اختر البرنامج المناسب لعمرك ومستواك"
                  : "Choose the program that matches your age and level"}
              </motion.p>

              <div className={`grid gap-6 ${programs.length === 1 ? "max-w-md" : programs.length === 2 ? "sm:grid-cols-2 max-w-2xl" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                {programs.map((prog, i) => (
                  <ProgramCard
                    key={i}
                    prog={prog}
                    isRTL={isRTL}
                    onWhatsApp={openWhatsApp}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            FAQ — shared across all year-round departments
        ══════════════════════════════════════════════════════ */}
        {faq.length > 0 && (
          <section style={{ backgroundColor: "#f7f5ec" }} className="py-16 md:py-24 px-6 sm:px-8 lg:px-12">
            <div className="max-w-3xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>

              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`text-2xl sm:text-3xl font-black text-text-primary mb-3 ${isRTL ? "font-arabic" : ""}`}
              >
                {isRTL ? (
                  <>الأسئلة <span className="text-primary">الشائعة</span></>
                ) : (
                  <>Frequently Asked <span className="text-primary">Questions</span></>
                )}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 }}
                className={`text-text-secondary text-sm mb-10 ${isRTL ? "font-arabic" : ""}`}
              >
                {isRTL
                  ? "كل ما تحتاج معرفته قبل التسجيل"
                  : "Everything you need to know before enrolling"}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.12 }}
              >
                <FaqAccordion faq={faq} isRTL={isRTL} />
              </motion.div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            CTA BANNER
        ══════════════════════════════════════════════════════ */}
        <section
          className="py-16 md:py-24 px-6 sm:px-8 lg:px-12 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #001a00 0%, #003300 50%, #001f00 100%)" }}
        >
          {/* grid texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(204,204,153,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(204,204,153,0.04) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* glow orb */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(204,204,153,0.10) 0%, transparent 70%)" }}
          />

          <div className="relative max-w-3xl mx-auto text-center space-y-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`text-2xl sm:text-3xl font-black leading-tight ${isRTL ? "font-arabic" : ""}`}
              style={{ color: "#cccc99" }}
            >
              {isRTL ? (
                <>مستعد <span style={{ color: "#fff" }}>للانضمام إلينا؟</span></>
              ) : (
                <>Ready to <span style={{ color: "#fff" }}>Get Started?</span></>
              )}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className={`max-w-lg mx-auto text-base ${isRTL ? "font-arabic" : ""}`}
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              {isRTL
                ? "تواصل معنا الآن عبر واتساب وسنجيب على جميع أسئلتك واحتياجاتك."
                : "Contact us on WhatsApp and we'll answer all your questions."}
            </motion.p>

            <motion.button
              type="button"
              onClick={() => openWhatsApp()}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.18 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base shadow-xl transition-all cursor-pointer"
              style={{ backgroundColor: "#cccc99", color: "#003300" }}
            >
              <MessageCircle className="w-5 h-5 flex-shrink-0" />
              <span className={isRTL ? "font-arabic" : ""}>{t("map.enrollCta")}</span>
              <ArrowFwd className="w-4 h-4 flex-shrink-0" />
            </motion.button>
          </div>
        </section>

      </main>

      <Footer />

      {/* Lightbox */}
      {lightbox && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <motion.img
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            src={lightbox}
            alt=""
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </motion.div>
      )}

      <ConsultationModal isOpen={isConsultOpen} onClose={() => setConsultOpen(false)} />
    </div>
  );
}
