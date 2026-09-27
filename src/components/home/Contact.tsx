import { useState, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { Send, MessageCircle, Phone, MapPin, Mail, ChevronDown, AlertCircle } from "lucide-react";
import { useToast } from "../ui";
import { useLazyLoad } from "../../hooks/common/useLazyLoad";
import { submitContact } from "../../services/contact.service";

export const Contact = memo(() => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapRef, shouldLoadMap] = useLazyLoad();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    subject: t('contact.form.subjectOptions.inquiry'),
    customSubject: "",
    message: ""
  });

  const [errors, setErrors] = useState({
    name: "",
    phone: ""
  });

  const validateField = useCallback((field: "name" | "phone", value: string) => {
    let error = "";
    
    if (field === "name") {
      if (!value.trim()) {
        error = t('contact.validation.nameRequired');
      } else if (value.trim().length < 2) {
        error = t('contact.validation.nameMinLength');
      }
    }

    if (field === "phone") {
      const phoneRegex = /^[0-9+\-\s()]{8,}$/;
      if (!value.trim()) {
         error = t('contact.validation.phoneRequired');
      } else if (!phoneRegex.test(value.trim())) {
         error = t('contact.validation.phoneInvalid');
      }
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const validateForm = () => {
    const isNameValid = validateField("name", formData.name);
    const isPhoneValid = validateField("phone", formData.phone);
    return isNameValid && isPhoneValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(t('contact.validation.formError'), "");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const finalSubject = formData.subject === t('contact.form.subjectOptions.other') 
        ? formData.customSubject.trim() 
        : formData.subject;
      
      await submitContact({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        subject: finalSubject,
        message: formData.message.trim() || undefined
      });
      
      toast.success(t('contact.validation.success'), t('contact.validation.successMessage'));
      setFormData({ 
        name: "", 
        phone: "", 
        subject: t('contact.form.subjectOptions.inquiry'), 
        customSubject: "",
        message: "" 
      });
      setErrors({ name: "", phone: "" });
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      toast.error(
        error.response?.data?.message || t('contact.validation.formError'),
        error.response?.data?.error || ""
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative overflow-hidden -mt-[30px] sm:-mt-[35px] md:-mt-[40px] lg:-mt-[50px] pt-[calc(2.5rem+30px)] sm:pt-[calc(3rem+35px)] md:pt-[calc(5rem+40px)] lg:pt-[calc(6rem+50px)] pb-10 sm:pb-12 md:pb-20 lg:pb-24" style={{ backgroundColor: 'white', zIndex: 1, position: 'relative' }}>
      {/* Background overlay to cover wave */}
      <div className="absolute top-0 left-0 right-0 h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px]" style={{ backgroundColor: 'white', zIndex: 1 }}></div>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 -skew-x-12 translate-x-1/2" style={{ zIndex: 1 }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10">
        <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-3 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`}>
            {t('contact.title')} <span className="text-primary">{t('contact.titleHighlight')}</span>
          </h2>
          <p className={`text-sm sm:text-base md:text-lg text-text-secondary max-w-2xl mx-auto px-2 ${isRTL ? 'font-arabic' : ''}`}>
            {t('contact.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8 lg:gap-12">
          
          {/* Contact Info & Map - Spans 2 cols on lg, full width on md */}
          <div className="md:col-span-1 lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Info Cards */}
            <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-border space-y-4 sm:space-y-5 md:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-bold text-sm sm:text-base text-text-primary mb-1 ${isRTL ? 'font-arabic' : ''}`}>{t('contact.callTitle')}</h3>
                  <a href="tel:+963942060440" className="text-sm sm:text-base md:text-lg font-bold text-primary hover:underline break-all">
                    +963-942-060-440
                  </a>
                </div>
              </div>

              <div className="w-full h-px bg-border/50" />

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-green-600 shrink-0">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-bold text-sm sm:text-base text-text-primary mb-1 ${isRTL ? 'font-arabic' : ''}`}>{t('contact.visitTitle')}</h3>
                  <p className={`text-text-secondary text-xs sm:text-sm ${isRTL ? 'font-arabic' : ''}`} dangerouslySetInnerHTML={{ __html: t('contact.visitLocation') }} />
                </div>
              </div>

              <div className="w-full h-px bg-border/50" />

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-bold text-sm sm:text-base text-text-primary mb-1 ${isRTL ? 'font-arabic' : ''}`}>{t('contact.emailTitle')}</h3>
                  <a href="mailto:robotrick.co@gmail.com" className="text-xs sm:text-sm md:text-base text-primary font-medium hover:underline break-all">
                    robotrick.co@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Map - Robotrick Location: 36°12'49.3"N 37°09'07.2"E */}
            <div ref={mapRef as React.RefObject<HTMLDivElement>} className="h-72 sm:h-80 md:h-64 lg:h-72 bg-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden border border-border relative group">
              {shouldLoadMap ? (
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d804.764622064902!2d37.151768499999996!3d36.2137733!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x152ff900245dc429%3A0xa8b6e4274185bcb6!2z2LTYsdmD2Kkg2LHZiNix2YjYqtix2YrZgyDYp9mE2KrZgtmH2YrYqQ!5e0!3m2!1sar!2sro!4v1773711545307!5m2!1sar!2sro"
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <p className={`text-text-secondary text-sm ${isRTL ? 'font-arabic' : ''}`}>{t('contact.mapLoading')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Form - Spans 3 cols on lg, full width on md */}
          <div className="md:col-span-1 lg:col-span-3">
            <div className="bg-white p-5 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] shadow-xl shadow-primary/5 border border-border relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary" />
              
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                    <div className="space-y-2">
                      <label className={`text-xs sm:text-sm font-bold text-text-primary ml-1 ${isRTL ? 'font-arabic' : ''}`}>{t('contact.form.nameLabel')}</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({...formData, name: e.target.value});
                          if (errors.name) setErrors({...errors, name: ""});
                        }}
                        onBlur={(e) => validateField("name", e.target.value)}
                        className={`w-full px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl bg-white border focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-sm sm:text-base min-h-[44px] ${
                          errors.name 
                            ? "border-red-500 focus:border-red-500" 
                            : "border-border focus:border-primary"
                        } ${isRTL ? 'font-arabic' : ''}`}
                        placeholder={t('contact.form.namePlaceholder')}
                      />
                      {errors.name && (
                        <span className="text-xs text-red-500 font-medium flex items-center gap-1 ml-1">
                          <AlertCircle className="w-3 h-3" /> {errors.name}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={`text-xs sm:text-sm font-bold text-text-primary ml-1 ${isRTL ? 'font-arabic' : ''}`}>{t('contact.form.phoneLabel')}</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({...formData, phone: e.target.value});
                          if (errors.phone) setErrors({...errors, phone: ""});
                        }}
                        onBlur={(e) => validateField("phone", e.target.value)}
                        className={`w-full px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl bg-white border focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-sm sm:text-base min-h-[44px] ${
                          errors.phone 
                            ? "border-red-500 focus:border-red-500" 
                            : "border-border focus:border-primary"
                        } ${isRTL ? 'font-arabic' : ''}`}
                        placeholder={t('contact.form.phonePlaceholder')}
                      />
                      {errors.phone && (
                        <span className="text-xs text-red-500 font-medium flex items-center gap-1 ml-1">
                          <AlertCircle className="w-3 h-3" /> {errors.phone}
                        </span>
                      )}
                    </div>
                </div>

                <div className="space-y-2">
                  <label className={`text-xs sm:text-sm font-bold text-text-primary ml-1 ${isRTL ? 'font-arabic' : ''}`}>{t('contact.form.subjectLabel')}</label>
                  <div className="relative">
                    <select 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value, customSubject: e.target.value === t('contact.form.subjectOptions.other') ? formData.customSubject : ""})}
                      className={`w-full px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl bg-white border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium appearance-none text-sm sm:text-base min-h-[44px] ${isRTL ? 'font-arabic' : ''}`}
                    >
                      <option>{t('contact.form.subjectOptions.inquiry')}</option>
                      <option>{t('contact.form.subjectOptions.partnership')}</option>
                      <option>{t('contact.form.subjectOptions.general')}</option>
                      <option>{t('contact.form.subjectOptions.consultation')}</option>
                      <option>{t('contact.form.subjectOptions.other')}</option>
                    </select>
                    <div className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                  {formData.subject === t('contact.form.subjectOptions.other') && (
                    <input
                      type="text"
                      value={formData.customSubject}
                      onChange={(e) => setFormData({...formData, customSubject: e.target.value})}
                      className={`w-full px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl bg-white border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-sm sm:text-base min-h-[44px] ${isRTL ? 'font-arabic' : ''}`}
                      placeholder={t('contact.form.customSubjectPlaceholder')}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className={`text-xs sm:text-sm font-bold text-text-primary ml-1 ${isRTL ? 'font-arabic' : ''}`}>{t('contact.form.messageLabel')}</label>
                  <textarea 
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className={`w-full px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl bg-white border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium resize-none text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`}
                    placeholder={t('contact.form.messagePlaceholder')}
                  />
                </div>

                <div className="pt-2 sm:pt-4">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 sm:py-5 bg-primary text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-70 disabled:transform-none min-h-[48px] sm:min-h-[56px]"
                  >
                    {isSubmitting ? t('contact.form.submitting') : (
                      <>
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        {t('contact.form.submit')}
                      </>
                    )}
                  </button>
                </div>

                <div className="relative text-center">
                  <span className={`bg-white px-4 text-xs sm:text-sm text-text-secondary relative z-10 ${isRTL ? 'font-arabic' : ''}`}>{t('contact.form.orConnect')}</span>
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                </div>

                <a 
                  href="https://wa.me/+963942060440" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base md:text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 sm:gap-3 min-h-[44px] sm:min-h-[52px]"
                  style={{ backgroundColor: '#cccc99', color: '#003300', borderColor: '#cccc99' }}
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  {t('contact.form.whatsapp')}
                </a>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
});
