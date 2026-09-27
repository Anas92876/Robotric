import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Home,
  MapPin,
  MessageCircle,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { SEO } from "../../components/seo/SEO";
import { ROUTES } from "../../constants/routes.constants";
import {
  JOB_APPLICATION_WHATSAPP,
  JOB_POSITIONS,
  getJobPositionBySlug,
  type JobDetail,
} from "../../data/jobPositions";
import {
  submitJobApplication,
  type JobApplicationFormData,
} from "../../services/job.application.service";
import NotFound from "../common/NotFound";

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  age: string;
  location: string;
  gender: string;
  experienceLevel: string;
  experienceDetails: string;
  skillInput: string;
  skills: string[];
  portfolioLink: string;
  availability: string;
  whyUs: string;
  additionalInfo: string;
  cvFile: File | null;
}

const EMPTY_FORM: FormState = {
  fullName: "",
  phone: "",
  email: "",
  age: "",
  location: "",
  gender: "",
  experienceLevel: "",
  experienceDetails: "",
  skillInput: "",
  skills: [],
  portfolioLink: "",
  availability: "",
  whyUs: "",
  additionalInfo: "",
  cvFile: null,
};

function ApplicationModal({
  position,
  isOpen,
  onClose,
  isRTL,
}: {
  position: JobDetail;
  isOpen: boolean;
  onClose: () => void;
  isRTL: boolean;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setErrors({});
      setSubmitted(false);
    }
  }, [isOpen, position.id]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  };

  const addSkill = () => {
    const value = form.skillInput.trim();
    if (value && !form.skills.includes(value)) {
      setForm((previous) => ({
        ...previous,
        skills: [...previous.skills, value],
        skillInput: "",
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setForm((previous) => ({
      ...previous,
      skills: previous.skills.filter((entry) => entry !== skill),
    }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = isRTL ? "الاسم مطلوب" : "Name is required";
    }

    if (!form.phone.trim() || !/^[0-9+\-\s()]{7,}$/.test(form.phone.trim())) {
      nextErrors.phone = isRTL ? "رقم هاتف غير صحيح" : "Invalid phone number";
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = isRTL
        ? "بريد إلكتروني غير صحيح"
        : "Invalid email";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: JobApplicationFormData = {
        position: position.titleEn,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        age: form.age ? parseInt(form.age, 10) : undefined,
        location: form.location.trim() || undefined,
        gender: form.gender || undefined,
        experienceLevel: form.experienceLevel || undefined,
        experienceDetails: form.experienceDetails.trim() || undefined,
        skills: form.skills.length ? form.skills : undefined,
        portfolioLink: form.portfolioLink.trim() || undefined,
        availability: form.availability || undefined,
        whyUs: form.whyUs.trim() || undefined,
        additionalInfo: form.additionalInfo.trim() || undefined,
        cvFile: form.cvFile || undefined,
      };

      await submitJobApplication(payload);
      setSubmitted(true);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data
              .message
          : isRTL
            ? "حدث خطأ، حاول مجددًا"
            : "Something went wrong";

      setErrors({ fullName: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const inputClass = (field: keyof FormState) =>
    `w-full rounded-xl border px-4 py-3 text-sm text-[#003300] placeholder-[#003300]/30 transition-all focus:outline-none focus:ring-2 ${
      errors[field]
        ? "border-red-400 focus:ring-red-200"
        : "border-[#003300]/15 focus:border-[#003300]/40 focus:ring-[#003300]/20"
    }`;
  const labelClass =
    "mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#003300]/50";

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center p-0 sm:items-center sm:p-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 48 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="relative flex max-h-[95dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-[#003300]/10 sm:hidden" />

        <div className="flex items-center justify-between gap-4 border-b border-[#003300]/8 px-6 py-5">
          <div>
            <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-[#003300]/40">
              {isRTL ? "تقديم طلب" : "Application"}
            </p>
            <h2 className="text-lg font-black text-[#003300]">
              {isRTL ? position.titleAr : position.titleEn}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#003300]/6 transition-colors hover:bg-[#003300]/12"
          >
            <X className="h-4 w-4 text-[#003300]/50" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {submitted ? (
            <div className="flex flex-col items-center justify-center gap-5 px-6 py-20 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-200 bg-green-50"
              >
                <CheckCircle className="h-10 w-10 text-green-500" />
              </motion.div>

              <div>
                <h3 className="mb-2 text-xl font-black text-[#003300]">
                  {isRTL ? "تم إرسال طلبك بنجاح" : "Application Submitted"}
                </h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-[#003300]/50">
                  {isRTL
                    ? "شكرًا لاهتمامك. سنتواصل معك قريبًا."
                    : "Thank you for your interest. We will be in touch soon."}
                </p>
              </div>

              <button
                onClick={onClose}
                className="mt-2 rounded-xl px-8 py-3 text-sm font-bold"
                style={{ backgroundColor: "#003300", color: "#cccc99" }}
              >
                {isRTL ? "إغلاق" : "Close"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7 px-6 py-6">
              <fieldset>
                <legend className="mb-4 w-full border-b border-[#003300]/8 pb-2 text-xs font-black uppercase tracking-widest text-[#003300]/40">
                  {isRTL ? "المعلومات الشخصية" : "Personal Information"}
                </legend>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      {isRTL ? "الاسم الكامل *" : "Full Name *"}
                    </label>
                    <input
                      className={inputClass("fullName")}
                      value={form.fullName}
                      onChange={(event) =>
                        setField("fullName", event.target.value)
                      }
                      placeholder={
                        isRTL ? "أدخل اسمك الكامل" : "Enter your full name"
                      }
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>
                      {isRTL ? "رقم الهاتف *" : "Phone *"}
                    </label>
                    <input
                      className={inputClass("phone")}
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        setField("phone", event.target.value)
                      }
                      placeholder="e.g. 0912345678"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>
                      {isRTL ? "البريد الإلكتروني" : "Email"}
                    </label>
                    <input
                      className={inputClass("email")}
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setField("email", event.target.value)
                      }
                      placeholder={isRTL ? "اختياري" : "Optional"}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>{isRTL ? "العمر" : "Age"}</label>
                    <input
                      className={inputClass("age")}
                      type="number"
                      min={14}
                      max={70}
                      value={form.age}
                      onChange={(event) => setField("age", event.target.value)}
                      placeholder={isRTL ? "اختياري" : "Optional"}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      {isRTL ? "الجنس" : "Gender"}
                    </label>
                    <select
                      className={inputClass("gender")}
                      value={form.gender}
                      onChange={(event) =>
                        setField("gender", event.target.value)
                      }
                    >
                      <option value="">{isRTL ? "اختياري" : "Optional"}</option>
                      <option value="male">{isRTL ? "ذكر" : "Male"}</option>
                      <option value="female">{isRTL ? "أنثى" : "Female"}</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      {isRTL ? "منطقة السكن" : "Location"}
                    </label>
                    <input
                      className={inputClass("location")}
                      value={form.location}
                      onChange={(event) =>
                        setField("location", event.target.value)
                      }
                      placeholder={isRTL ? "مثال: حلب" : "e.g. Aleppo"}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-4 w-full border-b border-[#003300]/8 pb-2 text-xs font-black uppercase tracking-widest text-[#003300]/40">
                  {isRTL ? "الخبرة والمهارات" : "Experience & Skills"}
                </legend>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      {isRTL ? "مستوى الخبرة" : "Experience Level"}
                    </label>
                    <select
                      className={inputClass("experienceLevel")}
                      value={form.experienceLevel}
                      onChange={(event) =>
                        setField("experienceLevel", event.target.value)
                      }
                    >
                      <option value="">{isRTL ? "اختر" : "Select"}</option>
                      <option value="none">
                        {isRTL ? "لا يوجد" : "No Experience"}
                      </option>
                      <option value="beginner">
                        {isRTL ? "مبتدئ" : "Beginner"}
                      </option>
                      <option value="intermediate">
                        {isRTL ? "متوسط" : "Intermediate"}
                      </option>
                      <option value="professional">
                        {isRTL ? "محترف" : "Professional"}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      {isRTL ? "صف خبرتك" : "Describe your experience"}
                    </label>
                    <textarea
                      className={`${inputClass("experienceDetails")} resize-none`}
                      rows={3}
                      value={form.experienceDetails}
                      onChange={(event) =>
                        setField("experienceDetails", event.target.value)
                      }
                      placeholder={
                        isRTL
                          ? "اذكر خبراتك السابقة..."
                          : "Describe your previous work..."
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      {isRTL ? "المهارات" : "Skills"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        className={`${inputClass("skillInput")} flex-1`}
                        value={form.skillInput}
                        onChange={(event) =>
                          setField("skillInput", event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addSkill();
                          }
                        }}
                        placeholder={
                          isRTL
                            ? "مثال: C++ بايثون..."
                            : "e.g. C++, Python..."
                        }
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="rounded-xl bg-[#003300]/8 px-4 py-2 text-sm font-bold text-[#003300] transition-colors hover:bg-[#003300]/15"
                      >
                        +
                      </button>
                    </div>

                    {form.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {form.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#003300]/8 px-3 py-1 text-xs font-semibold text-[#003300]"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="transition-colors hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-4 w-full border-b border-[#003300]/8 pb-2 text-xs font-black uppercase tracking-widest text-[#003300]/40">
                  {isRTL ? "تفاصيل العمل" : "Work Details"}
                </legend>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      {isRTL ? "التوفر" : "Availability"}
                    </label>
                    <select
                      className={inputClass("availability")}
                      value={form.availability}
                      onChange={(event) =>
                        setField("availability", event.target.value)
                      }
                    >
                      <option value="">{isRTL ? "اختر" : "Select"}</option>
                      <option value="full_time">
                        {isRTL ? "دوام كامل" : "Full Time"}
                      </option>
                      <option value="part_time">
                        {isRTL ? "دوام جزئي" : "Part Time"}
                      </option>
                      <option value="flexible">
                        {isRTL ? "مرن" : "Flexible"}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      {isRTL ? "ان وجد رابط أعمالك" : "Portfolio Link"}
                    </label>
                    <input
                      className={inputClass("portfolioLink")}
                      value={form.portfolioLink}
                      onChange={(event) =>
                        setField("portfolioLink", event.target.value)
                      }
                      placeholder="Instagram, YouTube, Drive..."
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-4 w-full border-b border-[#003300]/8 pb-2 text-xs font-black uppercase tracking-widest text-[#003300]/40">
                  {isRTL ? "السيرة الذاتية" : "CV / Resume"}
                </legend>

                {form.cvFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[#003300]/15 bg-[#003300]/3 px-4 py-3">
                    <FileText className="h-4 w-4 shrink-0 text-[#003300]/50" />
                    <span className="flex-1 truncate text-sm font-medium text-[#003300]">
                      {form.cvFile.name}
                    </span>
                    <span className="shrink-0 text-xs text-[#003300]/40">
                      {(form.cvFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((previous) => ({ ...previous, cvFile: null }))
                      }
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-400 transition-colors hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-[#003300]/12 px-4 py-4 transition-colors hover:border-[#003300]/25 hover:bg-[#003300]/2">
                    <Paperclip className="h-5 w-5 shrink-0 text-[#003300]/25" />
                    <div>
                      <p className="text-sm font-semibold text-[#003300]/50">
                        {isRTL
                          ? "رفع ملف PDF (اختياري)"
                          : "Upload PDF (optional)"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#003300]/30">
                        {isRTL ? "بحجم أقصى 10 ميغابايت" : "Max 10 MB"}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;

                        if (file && file.size > 10 * 1024 * 1024) {
                          setErrors((previous) => ({
                            ...previous,
                            cvFile: isRTL
                              ? "الملف أكبر من 10 ميغابايت"
                              : "File exceeds 10 MB",
                          }));
                          return;
                        }

                        setErrors((previous) => ({
                          ...previous,
                          cvFile: undefined,
                        }));
                        setForm((previous) => ({ ...previous, cvFile: file }));
                        event.target.value = "";
                      }}
                    />
                  </label>
                )}

                {errors.cvFile && (
                  <p className="mt-1 text-xs text-red-500">{errors.cvFile}</p>
                )}
              </fieldset>

              <fieldset>
                <legend className="mb-4 w-full border-b border-[#003300]/8 pb-2 text-xs font-black uppercase tracking-widest text-[#003300]/40">
                  {isRTL ? "أخبرنا عنك" : "About You"}
                </legend>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      {isRTL
                        ? "لماذا تريد الانضمام إلينا؟"
                        : "Why do you want to join us?"}
                    </label>
                    <textarea
                      className={`${inputClass("whyUs")} resize-none`}
                      rows={3}
                      value={form.whyUs}
                      onChange={(event) =>
                        setField("whyUs", event.target.value)
                      }
                      placeholder={
                        isRTL ? "شاركنا دوافعك..." : "Share your motivation..."
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      {isRTL
                        ? "أي شيء تريد إضافته؟"
                        : "Anything else to add?"}
                    </label>
                    <textarea
                      className={`${inputClass("additionalInfo")} resize-none`}
                      rows={2}
                      value={form.additionalInfo}
                      onChange={(event) =>
                        setField("additionalInfo", event.target.value)
                      }
                      placeholder={isRTL ? "اختياري" : "Optional"}
                    />
                  </div>
                </div>
              </fieldset>

              <div className="pb-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold transition-all disabled:opacity-60"
                  style={{ backgroundColor: "#003300", color: "#cccc99" }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 0 1 8-8v8z"
                        />
                      </svg>
                      {isRTL ? "جاري الإرسال..." : "Sending..."}
                    </span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {isRTL ? "إرسال الطلب" : "Submit Application"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const JobPositionPage: React.FC = () => {
  const { i18n } = useTranslation("home");
  const { slug } = useParams();
  const job = getJobPositionBySlug(slug);

  const [isApplyOpen, setIsApplyOpen] = useState(false);

  const isRTL = i18n.language === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", isRTL ? "ar" : "en");
  }, [dir, isRTL]);

  if (!job) {
    return <NotFound />;
  }

  const relatedJobs = JOB_POSITIONS.filter((item) => item.slug !== job.slug).slice(
    0,
    3,
  );
  const pagePath = `${ROUTES.JOIN_US}/${job.slug}`;
  const shareMessage = encodeURIComponent(
    isRTL
      ? `مرحباً، أود التقدم لوظيفة: ${job.titleAr}`
      : `Hello, I would like to apply for: ${job.titleEn}`,
  );

  return (
    <div
      className={`min-h-screen overflow-x-hidden bg-background ${
        isRTL ? "font-arabic" : ""
      }`}
      dir={dir}
    >
      <SEO
        title={`${job.titleEn} | ${job.subtitleEn}`}
        titleAr={`${job.titleAr} | ${job.subtitleAr}`}
        description={job.descriptionEn}
        descriptionAr={job.descriptionAr}
        image={job.imageSrc}
        path={pagePath}
        keywords={`career, job opening, ${job.titleEn}, Robotrick`}
        keywordsAr={`وظائف, فرص عمل, ${job.titleAr}, روبوتريك`}
      />

      <LandingHeader />

      <main className="pt-16 sm:pt-20">
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-16 lg:px-16">
          <nav className="mb-8">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#003300]/6 bg-white/80 px-4 py-2 shadow-sm">
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
              <Link
                to={ROUTES.JOIN_US}
                className="text-sm text-primary/50 transition-colors hover:text-primary"
              >
                {isRTL ? "انضم إلينا" : "Join Us"}
              </Link>
              {isRTL ? (
                <ChevronLeft className="h-3.5 w-3.5 text-primary/25" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-primary/25" />
              )}
              <span className="text-sm font-bold text-primary">
                {isRTL ? job.titleAr : job.titleEn}
              </span>
            </div>
          </nav>

          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <p className="mb-4 text-xs font-black uppercase tracking-widest text-[#003300]/40">
                {isRTL ? "صفحة وظيفة" : "Position Page"}
              </p>
              <h1 className="mb-4 text-3xl font-black leading-tight text-primary sm:text-4xl lg:text-5xl">
                {isRTL ? job.titleAr : job.titleEn}
              </h1>
              <p className="mb-6 text-lg font-semibold text-[#003300]/55">
                {isRTL ? job.subtitleAr : job.subtitleEn}
              </p>
              <p className="max-w-2xl text-base leading-relaxed text-primary/65 sm:text-lg">
                {isRTL ? job.descriptionAr : job.descriptionEn}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {job.workDetails.map((detail, index) => (
                  <div
                    key={`${detail.labelEn}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#003300]/8 bg-white px-4 py-2 text-sm text-[#003300]/70 shadow-sm"
                  >
                    <span className="text-[#003300]/40">{detail.icon}</span>
                    <span className="font-semibold">
                      {isRTL ? detail.valueAr : detail.valueEn}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                {job.whatsapp ? (
                  <a
                    href={`${JOB_APPLICATION_WHATSAPP}?text=${shareMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-black transition-all hover:opacity-90 ${
                      isRTL ? "flex-row-reverse" : ""
                    }`}
                    style={{ backgroundColor: "#003300", color: "#cccc99" }}
                  >
                    <MessageCircle className="h-5 w-5" />
                    {isRTL ? "تواصل عبر واتساب" : "Apply via WhatsApp"}
                    <ArrowIcon className="h-4 w-4" />
                  </a>
                ) : (
                  <button
                    onClick={() => setIsApplyOpen(true)}
                    className={`inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-black transition-all hover:opacity-90 ${
                      isRTL ? "flex-row-reverse" : ""
                    }`}
                    style={{ backgroundColor: "#003300", color: "#cccc99" }}
                  >
                    <Send className="h-5 w-5" />
                    {isRTL ? "قدّم الآن" : "Apply Now"}
                    <ArrowIcon className="h-4 w-4" />
                  </button>
                )}

                <Link
                  to={ROUTES.JOIN_US}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-[#003300]/12 bg-white px-6 py-4 text-sm font-bold text-[#003300] transition-colors hover:bg-[#003300]/3 ${
                    isRTL ? "flex-row-reverse" : ""
                  }`}
                >
                  {isRTL ? "جميع الوظائف" : "All Positions"}
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="overflow-hidden rounded-[2rem] border border-[#003300]/6 bg-white shadow-2xl"
            >
              <div className="relative h-72 sm:h-80 lg:h-[520px]">
                <img
                  src={job.imageSrc}
                  alt={isRTL ? job.titleAr : job.titleEn}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001a00]/85 via-[#003300]/15 to-transparent" />
                <div className="absolute bottom-6 start-6 end-6">
                  {job.badge && (
                    <span
                      className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-black tracking-wide"
                      style={{ backgroundColor: "#cccc99", color: "#003300" }}
                    >
                      {isRTL ? "جديد" : "NEW"}
                    </span>
                  )}
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
                    {isRTL ? job.subtitleAr : job.subtitleEn}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                    {isRTL ? job.titleAr : job.titleEn}
                  </h2>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-4 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-16">
          <div className="space-y-6">
            <section className="rounded-3xl border border-[#003300]/6 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "#003300", color: "#cccc99" }}
                >
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#003300]/35">
                    {isRTL ? "المهام" : "Responsibilities"}
                  </p>
                  <h3 className="text-xl font-black text-[#003300]">
                    {isRTL ? "المهام والمسؤوليات" : "Duties & Responsibilities"}
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {job.duties.map((duty, index) => (
                  <div
                    key={`${duty.titleEn}-${index}`}
                    className="flex items-start gap-4 rounded-2xl bg-[#003300]/3 p-4"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "#003300", color: "#cccc99" }}
                    >
                      {duty.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#003300]">
                        {isRTL ? duty.titleAr : duty.titleEn}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[#003300]/60">
                        {isRTL ? duty.textAr : duty.textEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#003300]/6 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="mb-5 text-xl font-black text-[#003300]">
                {isRTL ? "المتطلبات" : "Requirements"}
              </h3>

              <ul className="space-y-3">
                {job.requirements.map((requirement, index) => (
                  <li
                    key={`${requirement.textEn}-${index}`}
                    className="flex items-start gap-3 rounded-2xl bg-[#003300]/3 px-4 py-3 text-sm leading-relaxed text-[#003300]/65"
                  >
                    <span className="mt-0.5 shrink-0 text-[#003300]">
                      {requirement.icon}
                    </span>
                    {isRTL ? requirement.textAr : requirement.textEn}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-[#003300]/6 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="mb-5 text-xl font-black text-[#003300]">
                {isRTL ? "تفاصيل العمل" : "Work Details"}
              </h3>

              <div className="space-y-3">
                {job.workDetails.map((detail, index) => (
                  <div
                    key={`${detail.labelEn}-${index}`}
                    className="flex items-center gap-3 rounded-2xl bg-[#003300]/3 px-4 py-3"
                  >
                    <span className="shrink-0 text-[#003300]/40">
                      {detail.icon}
                    </span>
                    <span className="w-24 shrink-0 text-xs font-bold uppercase tracking-wide text-[#003300]/40">
                      {isRTL ? detail.labelAr : detail.labelEn}
                    </span>
                    <span className="text-sm font-semibold text-[#003300]">
                      {isRTL ? detail.valueAr : detail.valueEn}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#003300]/6 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <Clock className="h-5 w-5 text-[#003300]/45" />
                <h3 className="text-xl font-black text-[#003300]">
                  {isRTL ? "المميزات" : "Perks & Benefits"}
                </h3>
              </div>

              <ul className="space-y-3">
                {job.perks.map((perk, index) => (
                  <li
                    key={`${perk.textEn}-${index}`}
                    className="flex items-start gap-3 rounded-2xl bg-[#003300]/3 px-4 py-3 text-sm leading-relaxed text-[#003300]/65"
                  >
                    <span className="mt-0.5 shrink-0 text-[#003300]/50">
                      {perk.icon}
                    </span>
                    {isRTL ? perk.textAr : perk.textEn}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16 lg:px-16">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#003300]/35">
                {isRTL ? "وظائف أخرى" : "More Roles"}
              </p>
              <h3 className="text-2xl font-black text-[#003300]">
                {isRTL ? "قد تهمك أيضًا" : "You May Also Like"}
              </h3>
            </div>
            <Link
              to={ROUTES.JOIN_US}
              className="text-sm font-bold text-[#003300]/60 transition-colors hover:text-[#003300]"
            >
              {isRTL ? "عرض الكل" : "View all"}
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {relatedJobs.map((relatedJob) => (
              <Link
                key={relatedJob.id}
                to={`${ROUTES.JOIN_US}/${relatedJob.slug}`}
                className="group overflow-hidden rounded-3xl border border-[#003300]/6 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={relatedJob.imageSrc}
                    alt={isRTL ? relatedJob.titleAr : relatedJob.titleEn}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#001a00]/75 via-transparent to-transparent" />
                  <div className="absolute bottom-4 start-4 end-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                      {isRTL ? relatedJob.subtitleAr : relatedJob.subtitleEn}
                    </p>
                    <h4 className="mt-1 text-xl font-black text-white">
                      {isRTL ? relatedJob.titleAr : relatedJob.titleEn}
                    </h4>
                  </div>
                </div>

                <div className="p-6">
                  <p className="line-clamp-2 text-sm leading-relaxed text-[#003300]/55">
                    {isRTL
                      ? relatedJob.descriptionAr
                      : relatedJob.descriptionEn}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-[#003300]/6 pt-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#003300]/35">
                      <MapPin className="h-3.5 w-3.5" />
                      {isRTL
                        ? relatedJob.workDetails[relatedJob.workDetails.length - 1]
                            ?.valueAr
                        : relatedJob.workDetails[relatedJob.workDetails.length - 1]
                            ?.valueEn}
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
            ))}
          </div>
        </section>
      </main>

      <Footer />

      <AnimatePresence>
        {!job.whatsapp && (
          <ApplicationModal
            position={job}
            isOpen={isApplyOpen}
            onClose={() => setIsApplyOpen(false)}
            isRTL={isRTL}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobPositionPage;
