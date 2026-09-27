import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Send, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "../ui";
import { submitContact } from "../../services/contact.service";

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WhoType = "student" | "parent" | "business-owner" | "other";

export const ConsultationModal = ({ isOpen, onClose }: ConsultationModalProps) => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    location: "",
    who: "" as WhoType | "",
    otherType: "",
    email: "",
    message: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        fullName: "",
        phoneNumber: "",
        location: "",
        who: "",
        otherType: "",
        email: "",
        message: ""
      });
      setErrors({});
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const validateField = (field: string, value: string) => {
    let error = "";
    
    switch (field) {
      case "fullName":
        if (!value.trim()) {
          error = isRTL ? "الاسم الكامل مطلوب" : "Full name is required";
        } else if (value.trim().length < 2) {
          error = isRTL ? "الاسم يجب أن يكون على الأقل حرفين" : "Name must be at least 2 characters";
        }
        break;
      case "phoneNumber":
        const phoneRegex = /^[0-9+\-\s()]{8,}$/;
        if (!value.trim()) {
          error = isRTL ? "رقم الجوال مطلوب" : "Phone number is required";
        } else if (!phoneRegex.test(value.trim())) {
          error = isRTL ? "رقم الجوال غير صحيح" : "Invalid phone number";
        }
        break;
      case "location":
        if (!value.trim()) {
          error = isRTL ? "مكان الإقامة مطلوب" : "Place of residence is required";
        }
        break;
      case "who":
        if (!value) {
          error = isRTL ? "يرجى اختيار نوع المستخدم" : "Please select who you are";
        }
        break;
      case "otherType":
        if (formData.who === "other" && !value.trim()) {
          error = isRTL ? "يرجى تحديد النوع" : "Please specify the type";
        }
        break;
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value.trim() && !emailRegex.test(value.trim())) {
          error = isRTL ? "البريد الإلكتروني غير صحيح" : "Invalid email address";
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateForm = () => {
    const fields = [
      { key: "fullName", value: formData.fullName },
      { key: "phoneNumber", value: formData.phoneNumber },
      { key: "location", value: formData.location },
      { key: "who", value: formData.who }
    ];

    if (formData.who === "other") {
      fields.push({ key: "otherType", value: formData.otherType });
    }

    // Validate email only if provided
    if (formData.email.trim()) {
      fields.push({ key: "email", value: formData.email });
    }

    return fields.every(field => validateField(field.key, field.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(
        isRTL ? "يرجى تصحيح الأخطاء في النموذج" : "Please correct the errors in the form",
        ""
      );
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Format the subject to include who type
      const whoLabel = formData.who === "other" 
        ? formData.otherType 
        : formData.who === "student" 
          ? (isRTL ? "طالب" : "Student")
          : formData.who === "parent"
            ? (isRTL ? "والد" : "Parent")
            : (isRTL ? "صاحب عمل" : "Business Owner");

      const subject = `${isRTL ? "استشارة من" : "Consultation from"}: ${whoLabel}${formData.location ? ` - ${formData.location}` : ""}`;
      
      // Submit with all fields - backend will handle them
      await submitContact({
        name: formData.fullName.trim(),
        phone: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        location: formData.location.trim(),
        who: formData.who as 'student' | 'parent' | 'business-owner' | 'other' | undefined,
        otherType: formData.who === "other" ? formData.otherType.trim() : undefined,
        subject: subject,
        message: formData.message.trim() || undefined
      });
      
      toast.success(
        isRTL ? "تم إرسال النموذج بنجاح" : "Form submitted successfully",
        isRTL ? "شكراً لتواصلك معنا، سنرد عليك قريباً" : "Thank you for contacting us, we'll get back to you soon"
      );
      
      onClose();
    } catch (error: any) {
      console.error('Error submitting consultation form:', error);
      toast.error(
        error.response?.data?.message || (isRTL ? "حدث خطأ أثناء إرسال النموذج" : "Error submitting form"),
        error.response?.data?.error || ""
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1050] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Window */}
      <div 
        className={`relative w-full max-w-5xl h-[90vh] max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col ${
          isRTL ? 'font-arabic' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Fixed Position */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 w-10 h-10 rounded-full bg-surface hover:bg-gray-200 flex items-center justify-center transition-colors shadow-lg cursor-pointer`}
          aria-label={isRTL ? "إغلاق" : "Close"}
          type="button"
        >
          <X className="w-5 h-5 text-text-primary" />
        </button>

        <div className="grid lg:grid-cols-2 h-full flex-1 min-h-0 overflow-hidden">
          {/* Form Section */}
          <div className="overflow-y-auto overflow-x-hidden p-6 sm:p-8 lg:p-10" style={{ maxHeight: '90vh' }}>

            {/* Form Header */}
            <div className="mb-8">
              <h2 className={`text-3xl sm:text-4xl font-black text-text-primary mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {isRTL ? "طلب استشارة" : "Request Consultation"}
              </h2>
              <p className={`text-text-secondary ${isRTL ? 'font-arabic' : ''}`}>
                {isRTL ? "املأ النموذج أدناه وسنتواصل معك قريباً" : "Fill out the form below and we'll get back to you soon"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 pb-4">
              {/* Full Name */}
              <div className="space-y-2">
                <label className={`text-sm font-bold text-text-primary ${isRTL ? 'font-arabic' : ''}`}>
                  {isRTL ? "الاسم الكامل" : "Full Name"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({...formData, fullName: e.target.value});
                    if (errors.fullName) setErrors({...errors, fullName: ""});
                  }}
                  onBlur={(e) => validateField("fullName", e.target.value)}
                  className={`w-full px-5 py-4 rounded-2xl bg-surface border focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium ${
                    errors.fullName 
                      ? "border-red-500 focus:border-red-500" 
                      : "border-border focus:border-primary"
                  } ${isRTL ? 'font-arabic' : ''}`}
                  placeholder={isRTL ? "الإسم الكامل" : "Full Name"}
                />
                {errors.fullName && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.fullName}
                  </span>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className={`text-sm font-bold text-text-primary ${isRTL ? 'font-arabic' : ''}`}>
                  {isRTL ? "رقم الجوال" : "Phone Number"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    setFormData({...formData, phoneNumber: e.target.value});
                    if (errors.phoneNumber) setErrors({...errors, phoneNumber: ""});
                  }}
                  onBlur={(e) => validateField("phoneNumber", e.target.value)}
                  className={`w-full px-5 py-4 rounded-2xl bg-surface border focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium ${
                    errors.phoneNumber 
                      ? "border-red-500 focus:border-red-500" 
                      : "border-border focus:border-primary"
                  } ${isRTL ? 'font-arabic' : ''}`}
                  placeholder={isRTL ? "رقم الجوال" : "Phone Number"}
                />
                {errors.phoneNumber && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.phoneNumber}
                  </span>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className={`text-sm font-bold text-text-primary ${isRTL ? 'font-arabic' : ''}`}>
                  {isRTL ? "مكان الإقامة" : "Place of residence"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({...formData, location: e.target.value});
                    if (errors.location) setErrors({...errors, location: ""});
                  }}
                  onBlur={(e) => validateField("location", e.target.value)}
                  className={`w-full px-5 py-4 rounded-2xl bg-surface border focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium ${
                    errors.location 
                      ? "border-red-500 focus:border-red-500" 
                      : "border-border focus:border-primary"
                  } ${isRTL ? 'font-arabic' : ''}`}
                  placeholder={isRTL ? "مكان الإقامة" : "Place of residence"}
                />
                {errors.location && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.location}
                  </span>
                )}
              </div>

              {/* Who */}
              <div className="space-y-2">
                <label className={`text-sm font-bold text-text-primary ${isRTL ? 'font-arabic' : ''}`}>
                  {isRTL ? "الصفة" : "Adjective"} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.who}
                  onChange={(e) => {
                    setFormData({...formData, who: e.target.value as WhoType, otherType: ""});
                    if (errors.who) setErrors({...errors, who: "", otherType: ""});
                  }}
                  className={`w-full px-5 py-4 rounded-2xl bg-surface border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium appearance-none ${
                    errors.who ? "border-red-500 focus:border-red-500" : ""
                  } ${isRTL ? 'font-arabic' : ''}`}
                >
                  <option value="">{isRTL ? "اختر..." : "Select..."}</option>
                  <option value="student">{isRTL ? "طالب" : "Student"}</option>
                  <option value="parent">{isRTL ? "والد" : "Parent"}</option>
                  <option value="business-owner">{isRTL ? "صاحب عمل" : "Business Owner"}</option>
                  <option value="other">{isRTL ? "أخرى" : "Other"}</option>
                </select>
                {errors.who && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.who}
                  </span>
                )}

                {/* Other Type Input */}
                {formData.who === "other" && (
                  <div className="mt-3 space-y-2">
                    <label className={`text-sm font-bold text-text-primary ${isRTL ? 'font-arabic' : ''}`}>
                      {isRTL ? "يرجى تحديد النوع" : "Please specify"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.otherType}
                      onChange={(e) => {
                        setFormData({...formData, otherType: e.target.value});
                        if (errors.otherType) setErrors({...errors, otherType: ""});
                      }}
                      onBlur={(e) => validateField("otherType", e.target.value)}
                      className={`w-full px-5 py-4 rounded-2xl bg-surface border focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium ${
                        errors.otherType 
                          ? "border-red-500 focus:border-red-500" 
                          : "border-border focus:border-primary"
                      } ${isRTL ? 'font-arabic' : ''}`}
                      placeholder={isRTL ? "النوع" : "Type"}
                    />
                    {errors.otherType && (
                      <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.otherType}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className={`text-sm font-bold text-text-primary ${isRTL ? 'font-arabic' : ''}`}>
                  {isRTL ? "البريد الإلكتروني (اختياري)" : "Email Address (optional)"}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({...formData, email: e.target.value});
                    if (errors.email) setErrors({...errors, email: ""});
                  }}
                  onBlur={(e) => validateField("email", e.target.value)}
                  className={`w-full px-5 py-4 rounded-2xl bg-surface border focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium ${
                    errors.email 
                      ? "border-red-500 focus:border-red-500" 
                      : "border-border focus:border-primary"
                  } ${isRTL ? 'font-arabic' : ''}`}
                  placeholder={isRTL ? "البريد الإلكتروني" : "Email Address"}
                />
                {errors.email && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.email}
                  </span>
                )}
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className={`text-sm font-bold text-text-primary ${isRTL ? 'font-arabic' : ''}`}>
                  {isRTL ? "الموضوع(الوصف)" : "Subject(Description)"}
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className={`w-full px-5 py-4 rounded-2xl bg-surface border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium resize-none ${isRTL ? 'font-arabic' : ''}`}
                  placeholder={isRTL ? "اكتب الموضوع هنا..." : "Write your subject here..."}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-70 disabled:transform-none disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isRTL ? "جاري الإرسال..." : "Submitting..."}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {isRTL ? "إرسال" : "Submit"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Image Section */}
          <div className="hidden lg:block relative bg-gradient-to-br from-primary via-green-600 to-accent overflow-hidden h-full">
            {/* Decorative Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
            
            {/* Logo - Centered */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <img 
                src="/logo.png" 
                alt="Robotrick Logo" 
                className="w-48 sm:w-56 md:w-64 h-auto opacity-90"
              />
            </div>

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '40px 40px'
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
