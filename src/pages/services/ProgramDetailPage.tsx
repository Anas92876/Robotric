import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, MessageCircle, CheckCircle2,
  Users, Clock, ImageIcon, X,
} from "lucide-react";
import { api, type ApiRequestConfig } from "../../lib/api";
import { SEO } from "../../components/seo/SEO";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { ConsultationModal } from "../../components/home/ConsultationModal";

/* ── fallback images per track ───────────────────────────────── */
const TRACK_FALLBACK: Record<string, string[]> = {
  summer:       ["/images/training/image-kids.jpeg",  "/images/training/image-eng.jpeg",   "/images/training/image-drone.jpeg"],
  winter:       ["/images/training/image-eng.jpeg",   "/images/training/image-kids.jpeg",  "/images/training/image-vr.jpeg"],
  competitions: ["/images/training/image-drone.jpeg", "/images/training/image-eng.jpeg",   "/images/training/image-kids.jpeg"],
};

const TRACK_ACCENT: Record<string, string> = {
  summer:       "#f59e0b",
  winter:       "#3b82f6",
  competitions: "#7c3aed",
};

/* ── component ───────────────────────────────────────────────── */

export default function ProgramDetailPage() {
  const { trackId = "", programIndex = "0" } = useParams<{ trackId: string; programIndex: string }>();
  const navigate   = useNavigate();
  const { t, i18n } = useTranslation("training");
  const isRTL      = i18n.language === "ar";
  const lang       = isRTL ? "ar" : "en";
  const ArrowBack  = isRTL ? ArrowRight : ArrowLeft;
  const ArrowFwd   = isRTL ? ArrowLeft  : ArrowRight;

  const [cmsData, setCmsData]           = useState<Record<"ar" | "en", any> | null>(null);
  const [lightbox, setLightbox]         = useState<string | null>(null);
  const [isConsultOpen, setConsultOpen] = useState(false);

  useEffect(() => {
    api.get("/public/training-content", { skipAuth: true } as ApiRequestConfig)
      .then(r => { if (r.data?.data) setCmsData(r.data.data); })
      .catch(() => {});
  }, []);

  /* ── resolve program ──────────────────────────────────────── */
  const idx        = parseInt(programIndex, 10);
  const i18nTrack  = t(`map.tracks.${trackId}`, { returnObjects: true }) as any;
  const cmsTrack   = cmsData?.[lang]?.tracks?.[trackId];
  const programs   = (cmsTrack?.programs?.length ? cmsTrack.programs : null) ?? i18nTrack?.programs ?? [];
  const prog       = programs[idx];

  const otherLang     = lang === "ar" ? "en" : "ar";
  const progOther     = cmsData?.[otherLang]?.tracks?.[trackId]?.programs?.[idx];

  if (!prog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center space-y-4">
          <p className="text-text-secondary">{isRTL ? "البرنامج غير موجود." : "Program not found."}</p>
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

  /* images shared across languages */
  const cloudinaryImages: { url: string; publicId: string }[] =
    prog.images?.length      ? prog.images :
    progOther?.images?.length ? progOther.images : [];

  const fallbacks  = TRACK_FALLBACK[trackId] ?? TRACK_FALLBACK["summer"];
  const heroImage  = cloudinaryImages[0]?.url ?? fallbacks[0];
  const galleryImages = cloudinaryImages.length > 0
    ? cloudinaryImages.map(img => img.url)
    : fallbacks;

  const accentColor  = TRACK_ACCENT[trackId] ?? "#003300";
  const whatYouLearn: string[] = prog.whatYouLearn ?? [];

  const openWhatsApp = () => {
    const msg = `${t("map.whatsappPrefix")} "${prog.title}" ${t("map.whatsappSuffix")}`;
    window.open(`https://wa.me/+963942060440?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const trackLabel = cmsTrack?.title || i18nTrack?.title || trackId;

  return (
    <div className="bg-background min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      <SEO
        title={`${prog.title} — Robotrick`}
        description={prog.description}
        path={`/services/training/${trackId}/${programIndex}`}
      />
      <LandingHeader onOpenConsultation={() => setConsultOpen(true)} />

      <main>

        {/* ══════════════════════════════════════════════════════
            HERO — full-bleed photo with strong dark overlay
            Text is always white on near-black → perfect contrast
        ══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden" style={{ minHeight: "70vh" }}>

          {/* photo layer */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
              alt={prog.title}
              className="w-full h-full object-cover object-center"
            />
            {/* two-layer overlay: full dark base + heavier bottom gradient */}
            <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.10) 100%)",
            }} />
          </div>

          {/* back button + hero content — single dir wrapper handles all RTL */}
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 pt-36 md:pt-44 pb-20 text-white"
          >
            {/* back button */}
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
              className="max-w-2xl space-y-5"
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
                  style={{ backgroundColor: accentColor }}
                />
                <span className={isRTL ? "font-arabic" : ""}>{trackLabel}</span>
              </div>

              {/* title */}
              <h1
                className={`text-3xl sm:text-4xl md:text-5xl font-black leading-tight ${isRTL ? "font-arabic" : ""}`}
                style={{ color: "#cccc99" }}
              >
                {prog.title}
              </h1>

              {/* description */}
              <p
                className={`text-base md:text-lg leading-relaxed ${isRTL ? "font-arabic" : ""}`}
                style={{ color: "rgba(204,204,153,0.82)" }}
              >
                {prog.description}
              </p>

              {/* badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: "rgba(204,204,153,0.15)",
                    color: "#cccc99",
                    border: "1px solid rgba(204,204,153,0.30)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className={isRTL ? "font-arabic" : ""}>{prog.age}</span>
                </span>
                {prog.hours && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: "rgba(204,204,153,0.15)",
                      color: "#cccc99",
                      border: "1px solid rgba(204,204,153,0.30)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className={isRTL ? "font-arabic" : ""}>{prog.hours}</span>
                  </span>
                )}
                {!prog.available && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: "#fbbf24", color: "#451a03" }}
                  >
                    <span className={isRTL ? "font-arabic" : ""}>{t("map.comingSoon")}</span>
                  </span>
                )}
              </div>

              {/* enroll CTA */}
              {prog.available && (
                <motion.button
                  type="button"
                  onClick={openWhatsApp}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm shadow-xl transition-all cursor-pointer"
                  style={{ backgroundColor: "#cccc99", color: "#003300" }}
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  <span className={isRTL ? "font-arabic" : ""}>{t("map.enrollCta")}</span>
                </motion.button>
              )}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            WHAT YOU'LL LEARN — white section, brand accent cards
        ══════════════════════════════════════════════════════ */}
        {whatYouLearn.length > 0 && (
          <section className="py-16 md:py-24 px-6 sm:px-8 lg:px-12 bg-white">
            <div className="max-w-6xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>

              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`text-2xl sm:text-3xl font-black text-text-primary mb-3 ${isRTL ? "font-arabic" : ""}`}
              >
                {isRTL ? (
                  <><span className="text-primary">ماذا</span> ستتعلم؟</>
                ) : (
                  <>What You'll <span className="text-primary">Learn</span></>
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
                  ? "المهارات والمعرفة التي ستكتسبها خلال هذا البرنامج"
                  : "Skills and knowledge you'll gain throughout this program"}
              </motion.p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {whatYouLearn.map((item: string, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${accentColor}18` }}
                    >
                      <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <p className={`text-sm font-semibold text-text-primary leading-snug pt-1 ${isRTL ? "font-arabic" : ""}`}>
                      {item}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            IMAGE GALLERY — cream background, masonry-style grid
        ══════════════════════════════════════════════════════ */}
        <section style={{ backgroundColor: "#f7f5ec" }} className="py-16 md:py-24 px-6 sm:px-8 lg:px-12">
          <div className="max-w-6xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`text-2xl sm:text-3xl font-black text-text-primary mb-3 ${isRTL ? "font-arabic" : ""}`}
            >
              {isRTL ? (
                <>من <span className="text-primary">داخل</span> البرنامج</>
              ) : (
                <>Inside the <span className="text-primary">Program</span></>
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
                ? "لقطات حقيقية من جلساتنا التدريبية"
                : "Real snapshots from our training sessions"}
            </motion.p>

            {/* first image full-width, rest in grid */}
            <div className="space-y-3 md:space-y-4">
              {/* hero gallery image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.005 }}
                onClick={() => setLightbox(galleryImages[0])}
                className="relative overflow-hidden rounded-3xl cursor-pointer group shadow-md"
                style={{ height: "340px" }}
              >
                <img
                  src={galleryImages[0]}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                </div>
              </motion.div>

              {/* remaining images in grid */}
              {galleryImages.length > 1 && (
                <div className={`grid gap-3 md:gap-4 ${galleryImages.length === 2 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3"}`}>
                  {galleryImages.slice(1).map((src, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: (i + 1) * 0.08 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setLightbox(src)}
                      className="relative overflow-hidden rounded-2xl cursor-pointer group shadow-sm"
                      style={{ aspectRatio: "4/3" }}
                    >
                      <img
                        src={src}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                        <ImageIcon className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CTA BANNER — dark premium section (brand dark green)
            Heading: #cccc99   sub-text: white/70   btn: #cccc99 bg
        ══════════════════════════════════════════════════════ */}
        {prog.available && (
          <section
            className="py-16 md:py-24 px-6 sm:px-8 lg:px-12 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #001a00 0%, #003300 50%, #001f00 100%)" }}
          >
            {/* subtle grid texture */}
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

            {/* no dir here — text-center is absolute and doesn't need RTL flipping */}
            <div className="relative max-w-3xl mx-auto text-center space-y-6">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`text-2xl sm:text-3xl font-black leading-tight ${isRTL ? "font-arabic" : ""}`}
                style={{ color: "#cccc99" }}
              >
                {isRTL ? (
                  <>هل أنت مستعد <span style={{ color: "#fff" }}>للانضمام؟</span></>
                ) : (
                  <>Ready to <span style={{ color: "#fff" }}>Join?</span></>
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
                  ? "تواصل معنا الآن عبر واتساب وسنجيب على جميع أسئلتك."
                  : "Reach out via WhatsApp and we'll answer all your questions."}
              </motion.p>

              <motion.button
                type="button"
                onClick={openWhatsApp}
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
        )}

      </main>

      <Footer />

      {/* ── Lightbox ──────────────────────────────────────────── */}
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
