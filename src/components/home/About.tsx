import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Flame, Zap, TrendingUp, Trophy, Sparkles, Home, ChevronLeft, ChevronRight, Eye, Target } from "lucide-react";
import { motion } from "framer-motion";
import { AboutGallerySlider } from "./AboutGallerySlider";

const VALUES = [
  { icon: Flame,      ar: "الشغف",   en: "Passion"     },
  { icon: Zap,        ar: "التمكين", en: "Empowerment" },
  { icon: TrendingUp, ar: "التطور",  en: "Growth"      },
  { icon: Trophy,     ar: "التحدي",  en: "Challenge"   },
  { icon: Sparkles,   ar: "الأثر",   en: "Impact"      },
];

export const About = () => {
  const { i18n } = useTranslation("home");
  const isRTL = i18n.language === "ar";

  return (
    <div
      className={`bg-background min-h-screen ${isRTL ? "font-arabic" : ""}`}
      dir={isRTL ? "rtl" : "ltr"}
    >

      {/* ─── HERO — split layout ──────────────────────────────────── */}
      <section className="px-6 pt-8 pb-10">
        <div className="max-w-6xl mx-auto">

          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="mb-2 mt-6">
            <div className="inline-flex items-center gap-2 bg-white/70 rounded-full px-4 py-2 shadow-sm">
              <Link
                to="/"
                className="flex items-center gap-1.5 text-primary/60 hover:text-primary transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">{isRTL ? "الرئيسية" : "Home"}</span>
              </Link>
              {isRTL
                ? <ChevronLeft className="w-3.5 h-3.5 text-primary/30" />
                : <ChevronRight className="w-3.5 h-3.5 text-primary/30" />}
              <span className="text-sm font-bold text-primary" aria-current="page">
                {isRTL ? "من نحن" : "About Us"}
              </span>
            </div>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* Text side */}
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl md:text-4xl font-black text-primary leading-tight tracking-tight">
                {isRTL ? "متى وكيف بدأنا؟" : "When & How Did We Begin?"}
              </h1>

              <p className="text-primary/70 text-sm md:text-base leading-relaxed">
                {isRTL
                  ? <>
                      انطلقت رحلتنا من حلب عام 2022، من لامكان حرفياً، وبإمكانيات بدأت من الصفر ولكن برؤية لا تعترف بالمستحيل؛ هدفنا كان واحداً: تقديم علوم الروبوتيك لمجتمعنا بشكله العلمي الصحيح بعيداً عن السطحية.
                      <br /><br />
                      واليوم، صقلت التحديات خبرتنا لتصبح أكثر نضجاً ورسوخاً، فتحول ذلك الشغف إلى مؤسسة متكاملة. تفخر "روبوتريك" اليوم بمخبرها المجهز ومعداتها المتطورة التي غدت مساحة حرة تحتضن كل مبتكر، ووجهة لكل مبدع يبحث عن أدوات تحول أفكاره إلى واقع، واضعين نصب أعيننا دائماً أن نكون الشريك الأول في صناعة مبتكري المستقبل.
                    </>
                  : <>
                      Our journey began in Aleppo in 2022 — literally from nothing, with zero resources but a vision that refused the impossible. One goal: deliver robotics science to our community the right way, academically and not superficially.
                      <br /><br />
                      Today, challenges have refined our expertise into maturity. That passion grew into a full institution. Robotrick is proud of its equipped lab and advanced tools — a free space for every innovator, a destination for every creator looking to turn ideas into reality, always aiming to be the first partner in building tomorrow's innovators.
                    </>
                }
              </p>
            </div>

            {/* Image side */}
            <div className="relative h-56 lg:h-80">
              <div className="relative h-full rounded-3xl overflow-hidden shadow-xl">
                <img
                  src="/images/about/image_2026-02-24_04-37-12.png"
                  alt={isRTL ? "مختبر روبوتريك في حلب مجهز بأحدث المعدات والتقنيات" : "Robotrick's equipped lab in Aleppo with advanced tools and technology"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to logo if image doesn't exist
                    const target = e.target as HTMLImageElement;
                    const currentSrc = target.src;
                    if (!currentSrc.includes('logo.png')) {
                      target.src = '/logo.png';
                      target.alt = i18n.language === 'ar' ? "شعار روبوتريك" : "Robotrick Logo";
                    }
                  }}
                />
                {/* Overlay tint */}
                <div className="absolute inset-0 bg-primary/10" />
              </div>
              {/* Decorative border frame */}
              <div
                className={`absolute inset-0 rounded-3xl border-2 border-primary/30 pointer-events-none ${
                  isRTL ? "-translate-x-3 translate-y-3" : "translate-x-3 translate-y-3"
                }`}
                style={{ zIndex: -1 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── VISION & MISSION — premium dark twin cards ───────── */}
      <section
        className="relative px-6 pb-0 pt-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #001a00 0%, #003300 50%, #001f00 100%)' }}
      >
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(#cccc99 1px, transparent 1px), linear-gradient(90deg, #cccc99 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        {/* Glow orbs */}
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #cccc99 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #cccc99 0%, transparent 70%)' }} />

        <div className="max-w-6xl mx-auto relative z-10 pb-16">
          {/* Section label */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="inline-block w-8 h-px rounded-full" style={{ background: 'rgba(204,204,153,0.4)' }} />
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'rgba(204,204,153,0.6)' }}>
              {isRTL ? "رؤيتنا ورسالتنا" : "Vision & Mission"}
            </span>
            <span className="inline-block w-8 h-px rounded-full" style={{ background: 'rgba(204,204,153,0.4)' }} />
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Vision card */}
            {[
              {
                label: isRTL ? "رؤيتنا" : "Our Vision",
                Icon: Eye,
                text: isRTL
                  ? "مجتمعٌ يصنع التكنولوجيا.. لا يكتفي باستهلاكها. نطمح إلى جيل يقود التكنولوجيا بدلاً من أن ينجرف معها."
                  : "A society that creates technology, not just consumes it. We envision a generation that leads technology instead of being led by it.",
                palette: { card: 'rgba(204,204,153,0.07)', border: 'rgba(204,204,153,0.25)', iconBg: 'linear-gradient(135deg,#cccc99,#b3b380)', iconColor: '#003300', numColor: '#cccc99' },
              },
              {
                label: isRTL ? "رسالتنا" : "Our Mission",
                Icon: Target,
                text: isRTL
                  ? "تسخير التكنولوجيا لخدمة العقل البشري عبر تقديم تعليم تطبيقي ونظم إدارة ذكية تمنح كل طالب ومدير الأدوات التي يحتاجها ليتحول من «متفرج» على المستقبل.. إلى «شريك» في صناعته."
                  : "Harnessing technology to serve the human mind through applied education and smart management systems that give every student and manager the tools to move from spectator to creator.",
                palette: { card: 'rgba(0,68,0,0.5)', border: 'rgba(0,136,0,0.35)', iconBg: 'linear-gradient(135deg,#005500,#003300)', iconColor: '#cccc99', numColor: 'rgba(204,204,153,0.5)' },
              },
            ].map(({ label, Icon, text, palette: p }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12, type: "spring", stiffness: 80, damping: 16 }}
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
                  {/* Watermark letter */}
                  <div
                    className="absolute -bottom-6 -end-4 text-[8rem] font-black leading-none select-none pointer-events-none opacity-[0.05] group-hover:opacity-[0.09] transition-opacity duration-500"
                    style={{ color: p.numColor }}
                  >
                    {label[0]}
                  </div>

                  <div className="relative z-10 flex flex-col h-full gap-5">
                    {/* Icon + label row */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black" style={{ color: '#cccc99' }}>
                        {label}
                      </h3>
                      <motion.div
                        whileHover={{ rotate: 8, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0"
                        style={{ background: p.iconBg }}
                      >
                        <Icon className="w-6 h-6" style={{ color: p.iconColor }} />
                      </motion.div>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full" style={{ background: 'rgba(204,204,153,0.15)' }} />

                    {/* Text */}
                    <p className="text-sm md:text-base leading-relaxed" style={{ color: 'rgba(204,204,153,0.75)' }}>
                      {text}
                    </p>
                  </div>

                  {/* Corner accent */}
                  <div className="absolute top-0 end-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-400" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom wave to transition into next section */}
        <div className="absolute -bottom-[1px] left-0 right-0 w-full overflow-hidden leading-none pointer-events-none">
          <svg className="relative block w-full h-[40px] md:h-[50px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 96" preserveAspectRatio="none">
            <path d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,96L1392,96C1344,96,1248,96,1152,96C1056,96,960,96,864,96C768,96,672,96,576,96C480,96,384,96,288,96C192,96,96,96,48,96L0,96Z" fill="var(--color-background, #f5f5dc)" />
          </svg>
        </div>
      </section>

      {/* ─── GALLERY SLIDER ─────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <p className="text-primary font-bold text-sm uppercase tracking-widest opacity-60 mb-8 text-center">
            {isRTL ? "مساحتنا" : "Our Space"}
          </p>
          <AboutGallerySlider isRTL={isRTL} />
        </div>
      </section>

      {/* ─── VALUES — social proof styling with waves ─────────────── */}
      <section className="relative py-10 md:py-14 overflow-visible" style={{ backgroundColor: "#cccc99" }}>
        {/* Wave at the top */}
        <div
          className="absolute -top-[30px] sm:-top-[35px] md:-top-[40px] lg:-top-[50px] left-0 right-0 w-full max-w-full overflow-hidden leading-none pointer-events-none"
          style={{ zIndex: 1, transform: "rotate(180deg)" }}
        >
          <svg
            className="relative block w-full h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 96"
            preserveAspectRatio="none"
          >
            <path
              d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
              fill="#cccc99"
            />
          </svg>
        </div>

        {/* Wave at the bottom */}
        <div
          className="absolute -bottom-[30px] sm:-bottom-[35px] md:-bottom-[40px] lg:-bottom-[50px] left-0 right-0 w-full max-w-full overflow-hidden leading-none pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <svg
            className="relative block w-full h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 96"
            preserveAspectRatio="none"
          >
            <path
              d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
              fill="#cccc99"
            />
          </svg>
        </div>

        {/* Soft animated background similar to SocialProof */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-80 pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0, 51, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 51, 0, 0.08) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
          <p className="text-primary font-black text-lg sm:text-xl md:text-2xl tracking-widest opacity-80 mb-8 text-center">
            {isRTL ? "قيمنا" : "Our Values"}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.ar}
                  className="relative bg-gradient-to-br from-white via-white to-primary/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out group hover:-translate-y-2 hover:scale-[1.02] overflow-hidden flex flex-col items-center justify-center gap-3"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-center">
                    <Icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                    <span className="text-primary font-black text-sm md:text-base">
                      {isRTL ? v.ar : v.en}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
};
