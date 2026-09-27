import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, type ApiRequestConfig } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Snowflake, CalendarDays, Trophy,
  ArrowRight, ArrowLeft,
  GraduationCap, Users, Award, TrendingUp,
  MessageCircle, Clock, CheckCircle2, Lock,
  Bot, Plane, Brain, Printer, Glasses, PencilRuler, Globe, Cpu,
} from "lucide-react";
import { SEO } from "../../components/seo/SEO";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { Breadcrumb } from "../../components/ui";
import { ConsultationModal } from "../../components/home/ConsultationModal";

/* ─── constants ──────────────────────────────────────────────── */

// Brand palette only: #003300 dark green, #cccc99 cream gold
// Tracks share the same colors — icons + labels differentiate them
const TRACK_META = {
  summer:       { Icon: Sun,          bg: "#f7f5ec", border: "#cccc99" },
  winter:       { Icon: Snowflake,    bg: "#f2f5ee", border: "#b8c9b8" },
  yearRound:    { Icon: CalendarDays, bg: "#eef2e8", border: "#8aab8a" },
  competitions: { Icon: Trophy,       bg: "#ebe8d8", border: "#cccc99" },
} as const;

type TrackId = keyof typeof TRACK_META;
const TRACK_IDS: TrackId[] = ["summer", "winter", "yearRound", "competitions"];

const DEPT_ICONS: React.ElementType[] = [Bot, Plane, Brain, Printer, Glasses, PencilRuler, Globe, Cpu];

const STATS_KEYS = ["studentsTrained", "programTracks", "yearsExperience", "handsOnLearning"] as const;
const STATS_ICONS = [Users, Award, TrendingUp, GraduationCap];
const STATS_DEFAULTS = ["2200+", "25+", "6", "100%"];

/* ─── page ───────────────────────────────────────────────────── */

export default function TrainingPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("training");
  const isRTL = i18n.language === "ar";
  const lang = isRTL ? "ar" : "en";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [activeTrack, setActiveTrack] = useState<TrackId>("summer");
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [cmsData, setCmsData] = useState<Record<"ar" | "en", any> | null>(null);

  useEffect(() => {
    api.get("/public/training-content", { skipAuth: true } as ApiRequestConfig)
      .then(r => { if (r.data?.data) setCmsData(r.data.data); })
      .catch(() => {});
  }, []);

  // cms(key) returns the CMS value for the current language, or falls back to t(key)
  const cms = (key: string): string => {
    const doc = cmsData?.[lang];
    if (!doc) return t(key);
    const parts = key.split(".");
    let cur: any = doc;
    for (const p of parts) { if (cur == null) return t(key); cur = cur[p]; }
    return (cur && typeof cur === "string") ? cur : t(key);
  };

  const openWhatsApp = (programTitle: string) => {
    const msg = `${cms("map.whatsappPrefix")} "${programTitle}" ${cms("map.whatsappSuffix")}`;
    window.open(`https://wa.me/+963942060440?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const { bg, border } = TRACK_META[activeTrack];
  const ACCENT = "#003300";
  const ACCENT_TINT = "rgba(0,51,0,0.10)";

  return (
    <div className="bg-background min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      <SEO title={t("seo.title")} description={t("seo.description")} path="/services/training" />
      <LandingHeader onOpenConsultation={() => setIsConsultationModalOpen(true)} />

      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative pt-40 md:pt-48 pb-16 md:pb-24 px-6 sm:px-8 lg:px-12 overflow-hidden bg-gradient-to-br from-primary/5 via-white to-accent/5">
          <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* Left: text + stats */}
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="-mt-4">
                <Breadcrumb items={[
                  { label: t("breadcrumb.services"), path: "/services" },
                  { label: t("breadcrumb.training") },
                ]} />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className={`text-4xl md:text-5xl lg:text-6xl font-black text-text-primary leading-tight ${isRTL ? "font-arabic" : ""}`}
              >
                {t("hero.headline")}
                {t("hero.headlineHighlight") && (
                  <><br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-700">{t("hero.headlineHighlight")}</span></>
                )}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className={`text-lg md:text-xl text-text-secondary leading-relaxed ${isRTL ? "font-arabic" : ""}`}
              >
                {t("hero.description")}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <motion.button
                  type="button"
                  onClick={() => setIsConsultationModalOpen(true)}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-primary/30 transition-all cursor-pointer ${isRTL ? "font-arabic flex-row-reverse" : ""}`}
                  style={{ backgroundColor: "#003300", color: "#ffffcc" }}
                >
                  {t("cta.button")}
                  <ArrowIcon className="w-5 h-5" />
                </motion.button>
              </motion.div>

              {/* Stats strip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2"
              >
                {STATS_KEYS.map((key, i) => {
                  const Icon = STATS_ICONS[i];
                  const value = cmsData?.[lang]?.statsValues?.[key] ?? STATS_DEFAULTS[i];
                  return (
                    <div key={key} className="flex flex-col items-center text-center gap-1.5 bg-white rounded-2xl px-3 py-4 shadow-sm border border-border">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#003300" }}>
                        <Icon className="w-4 h-4" style={{ color: "#cccc99" }} />
                      </div>
                      <span className="text-xl font-black text-text-primary">{value}</span>
                      <span className={`text-xs font-medium text-text-secondary leading-tight ${isRTL ? "font-arabic" : ""}`}>{t(`stats.${key}`)}</span>
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* Right: image mosaic */}
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-md" style={{ height: "420px" }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, rotate: isRTL ? -6 : 6 }}
                  transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
                  className="absolute rounded-3xl overflow-hidden shadow-xl border-4 border-white"
                  style={{ width: "72%", height: "58%", bottom: 0, right: isRTL ? "auto" : 0, left: isRTL ? 0 : "auto", zIndex: 1 }}
                >
                  <img src="/images/training/image-drone.jpeg" alt="" loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-primary/20" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, rotate: isRTL ? 5 : -5 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                  className="absolute rounded-3xl overflow-hidden shadow-xl border-4 border-white"
                  style={{ width: "65%", height: "52%", top: 0, left: isRTL ? "auto" : 0, right: isRTL ? 0 : "auto", zIndex: 2 }}
                >
                  <img src="/images/training/image-vr.jpeg" alt="" loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-primary/15" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1, rotate: isRTL ? 3 : -3 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                  className="absolute rounded-3xl overflow-hidden shadow-2xl border-4 border-white"
                  style={{ width: "70%", height: "56%", top: "18%", left: isRTL ? "auto" : "15%", right: isRTL ? "15%" : "auto", zIndex: 3 }}
                >
                  <img src="/images/training/image-eng.jpeg" alt="" loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-primary/10" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.6, ease: "easeOut" }}
                  whileHover={{ scale: 1.03, y: -6 }}
                  className="absolute group rounded-3xl overflow-hidden border-4 border-white cursor-pointer"
                  style={{ width: "68%", height: "55%", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 4, boxShadow: "0 25px 60px rgba(0,51,0,0.35)" }}
                >
                  <img src="/images/training/image-kids.jpeg" alt={t("hero.headline")} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 rounded-3xl ring-2 ring-inset ring-accent/0 group-hover:ring-accent/60 transition-all duration-300" />
                </motion.div>

                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute z-10 w-5 h-5 rounded-full border-2 border-white shadow-md"
                  style={{ background: "#cccc99", top: "2%", right: isRTL ? "auto" : "8%", left: isRTL ? "8%" : "auto" }}
                />
              </div>
            </div>
          </div>

          <div className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* ── Program Map ──────────────────────────────────────── */}
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-6xl mx-auto">

            {/* Heading */}
            <div className="text-center mb-10">
              <motion.h2
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className={`text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-4 ${isRTL ? "font-arabic" : ""}`}
              >
                {t("map.title")} <span className="text-primary">{t("map.titleHighlight")}</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className={`text-base md:text-lg text-text-secondary max-w-2xl mx-auto ${isRTL ? "font-arabic" : ""}`}
              >
                {t("map.subtitle")}
              </motion.p>
            </div>

            {/* ── Tab Row ───────────────────────────────────────── */}
            <div
              ref={tabsRef}
              dir={isRTL ? "rtl" : "ltr"}
              className="flex gap-3 overflow-x-auto pb-2 mb-8"
              style={{ scrollbarWidth: "none" }}
            >
              {TRACK_IDS.map((id) => {
                const { Icon } = TRACK_META[id];
                const i18nTrack = t(`map.tracks.${id}`, { returnObjects: true }) as any;
                const cmsTrack = cmsData?.[lang]?.tracks?.[id];
                const title = cmsTrack?.title || i18nTrack.title;
                const isActive = activeTrack === id;
                return (
                  <motion.button
                    key={id}
                    type="button"
                    onClick={() => setActiveTrack(id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex-shrink-0 inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer border-2 ${isRTL ? "font-arabic" : ""}`}
                    style={isActive
                      ? { backgroundColor: "#003300", borderColor: "#003300", color: "#cccc99", boxShadow: "0 4px 20px rgba(0,51,0,0.3)" }
                      : { backgroundColor: "#cccc99", borderColor: "#cccc99", color: "#003300" }
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{title}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* ── Content Panel ─────────────────────────────────── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTrack}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                className="rounded-3xl border-2 overflow-hidden"
                style={{ borderColor: border }}
              >
                {/* Panel header strip */}
                <div
                  dir={isRTL ? "rtl" : "ltr"}
                  className="px-6 py-5 flex items-start justify-between gap-4"
                  style={{ backgroundColor: bg }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                      {(() => { const { Icon } = TRACK_META[activeTrack]; return <Icon className="w-5 h-5" style={{ color: "#cccc99" }} />; })()}
                    </div>
                    <div dir={isRTL ? "rtl" : "ltr"}>
                      {(() => {
                        const i18nTrack = t(`map.tracks.${activeTrack}`, { returnObjects: true }) as any;
                        const cmsTrack = cmsData?.[lang]?.tracks?.[activeTrack];
                        return (
                          <>
                            <h3 className={`text-lg font-black text-text-primary ${isRTL ? "font-arabic" : ""}`}>
                              {cmsTrack?.title || i18nTrack.title}
                            </h3>
                            <p className={`text-sm text-text-secondary mt-0.5 ${isRTL ? "font-arabic" : ""}`}>
                              {cmsTrack?.description || i18nTrack.description}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const i18nTrack = t(`map.tracks.${activeTrack}`, { returnObjects: true }) as any;
                      const cmsTrack = cmsData?.[lang]?.tracks?.[activeTrack];
                      openWhatsApp(cmsTrack?.title || i18nTrack.title);
                    }}
                    className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all hover:opacity-90 cursor-pointer whitespace-nowrap ${isRTL ? "font-arabic flex-row-reverse" : ""}`}
                    style={{ backgroundColor: ACCENT, color: "#cccc99" }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("map.enrollCta")}</span>
                  </button>
                </div>

                {/* Panel body */}
                <div className="p-5 md:p-6 bg-white">
                  <TrackContent
                    trackId={activeTrack}
                    t={t}
                    isRTL={isRTL}
                    accent={ACCENT}
                    accentTint={ACCENT_TINT}
                    bg={bg}
                    cmsTrack={cmsData?.[lang]?.tracks?.[activeTrack] ?? null}
                    comingSoon={t("map.comingSoon")}
                    enrollCta={t("map.enrollCta")}
                    onEnroll={openWhatsApp}
                    onDeptClick={(di) => navigate(`/services/training/yearround/${di}`)}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>

      <Footer />
      <ConsultationModal isOpen={isConsultationModalOpen} onClose={() => setIsConsultationModalOpen(false)} />
    </div>
  );
}

/* ─── track content switcher ─────────────────────────────────── */

interface TrackContentProps {
  trackId: TrackId;
  t: (key: string, opts?: any) => any;
  isRTL: boolean;
  accent: string;
  accentTint: string;
  bg: string;
  cmsTrack: any;
  comingSoon: string;
  enrollCta: string;
  onEnroll: (title: string) => void;
  onDeptClick: (deptIndex: number) => void;
}

function TrackContent({ trackId, t, isRTL, accent, accentTint, bg, cmsTrack, comingSoon, enrollCta, onEnroll, onDeptClick }: TrackContentProps) {
  const i18nTrack = t(`map.tracks.${trackId}`, { returnObjects: true }) as any;

  if (trackId === "yearRound") {
    const departments = (cmsTrack?.departments?.length ? cmsTrack.departments : null) ?? i18nTrack.departments;
    return <YearRoundContent departments={departments} isRTL={isRTL} accent={accent} accentTint={accentTint} bg={bg} onEnroll={onEnroll} onDeptClick={onDeptClick} />;
  }

  const programs = (cmsTrack?.programs?.length ? cmsTrack.programs : null) ?? i18nTrack.programs;

  // summer / winter / competitions — grid of program cards
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
      {(programs as any[]).map((prog: any, i: number) => (
        <ProgramCard
          key={i}
          prog={prog}
          trackId={trackId}
          programIndex={i}
          accent={accent}
          accentTint={accentTint}
          isRTL={isRTL}
          comingSoon={comingSoon}
          enrollCta={enrollCta}
          onEnroll={() => onEnroll(prog.title)}
        />
      ))}
    </div>
  );
}

/* ─── year-round: 2-col department grid ─────────────────────── */

function YearRoundContent({ departments, isRTL, accent, accentTint, bg, onEnroll, onDeptClick }: {
  departments: any[];
  isRTL: boolean;
  accent: string;
  accentTint: string;
  bg: string;
  onEnroll: (title: string) => void;
  onDeptClick: (deptIndex: number) => void;
}) {
  const ArrowFwd = isRTL ? ArrowLeft : ArrowRight;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {departments.map((dept: any, di: number) => {
        const DeptIcon = DEPT_ICONS[di] ?? Bot;
        return (
          <div
            key={di}
            className="rounded-2xl border border-border bg-white overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col"
          >
            {/* Dept header */}
            <div
              dir={isRTL ? "rtl" : "ltr"}
              className="flex items-center gap-2.5 px-4 py-3"
              style={{ backgroundColor: bg }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent }}>
                <DeptIcon className="w-4 h-4" style={{ color: "#cccc99" }} />
              </div>
              <h4 className={`text-xs font-black text-text-primary leading-tight ${isRTL ? "font-arabic" : ""}`}>
                {dept.name}
              </h4>
            </div>

            {/* Program list */}
            <ul className="divide-y divide-border flex-1">
              {(dept.programs as any[]).map((p: any, pi: number) => (
                <li
                  key={pi}
                  dir={isRTL ? "rtl" : "ltr"}
                  onClick={() => onEnroll(p.title)}
                  className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2
                      className="w-3.5 h-3.5 flex-shrink-0 transition-colors group-hover:opacity-100 opacity-30"
                      style={{ color: accent }}
                    />
                    <span className={`text-xs font-semibold text-text-primary leading-tight ${isRTL ? "font-arabic" : ""}`}>
                      {p.title}
                    </span>
                  </div>
                  <span
                    className="text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: accentTint, color: accent }}
                  >
                    {p.age}
                  </span>
                </li>
              ))}
            </ul>

            {/* View Department link */}
            <button
              type="button"
              dir={isRTL ? "rtl" : "ltr"}
              onClick={() => onDeptClick(di)}
              className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border cursor-pointer group transition-colors hover:bg-gray-50"
            >
              <span
                className={`text-xs font-bold ${isRTL ? "font-arabic" : ""}`}
                style={{ color: accent }}
              >
                {isRTL ? "تفاصيل القسم" : "View Department"}
              </span>
              <ArrowFwd className="w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: accent }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── program card ───────────────────────────────────────────── */

interface ProgramCardProps {
  prog: { title: string; age: string; description: string; hours?: string; available?: boolean };
  trackId: string;
  programIndex: number;
  accent: string;
  accentTint: string;
  isRTL: boolean;
  comingSoon: string;
  enrollCta: string;
  onEnroll: () => void;
}

function ProgramCard({ prog, trackId, programIndex, accent, accentTint, isRTL, comingSoon, enrollCta, onEnroll }: ProgramCardProps) {
  const navigate = useNavigate();
  const available = prog.available !== false;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-200 ${available ? "hover:-translate-y-1 hover:shadow-lg" : "opacity-60"}`}
      style={{ borderColor: available ? accentTint : "#e5e7eb" }}
    >
      {/* Color top bar */}
      <div className="h-1.5" style={{ backgroundColor: available ? accent : "#e5e7eb" }} />

      <div className="flex flex-col gap-3 p-5 flex-1 bg-white">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-sm font-black text-text-primary leading-snug flex-1 ${isRTL ? "font-arabic" : ""}`}>
            {prog.title}
          </h4>
          {!available && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              <Lock className="w-3 h-3" />
              {comingSoon}
            </span>
          )}
        </div>

        {/* Badges — dir on wrapper handles RTL alignment automatically */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isRTL ? "font-arabic" : ""}`}
            style={{ backgroundColor: accentTint, color: accent }}
          >
            <Users className="w-3 h-3 flex-shrink-0" />
            {prog.age}
          </span>
          {prog.hours && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isRTL ? "font-arabic" : ""}`}
              style={{ backgroundColor: accentTint, color: accent }}
            >
              <Clock className="w-3 h-3 flex-shrink-0" />
              {prog.hours}
            </span>
          )}
        </div>

        {/* Description */}
        <p className={`text-xs text-text-secondary leading-relaxed flex-1 ${isRTL ? "font-arabic" : ""}`}>
          {prog.description}
        </p>

        {/* CTA row — dir on card wrapper handles RTL automatically */}
        <div className="mt-auto flex items-center gap-2 flex-wrap">
          {available && (
            <button
              type="button"
              onClick={onEnroll}
              className={`inline-flex items-center gap-1.5 text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer hover:opacity-90 ${isRTL ? "font-arabic" : ""}`}
              style={{ backgroundColor: accentTint, color: accent }}
            >
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {enrollCta}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/services/training/${trackId}/${programIndex}`)}
            className={`inline-flex items-center gap-1.5 text-xs font-bold py-2 px-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-sm ${isRTL ? "font-arabic" : ""}`}
            style={{ borderColor: accentTint, color: accent, backgroundColor: "transparent" }}
          >
            {isRTL ? "تفاصيل البرنامج" : "Learn More"}
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
