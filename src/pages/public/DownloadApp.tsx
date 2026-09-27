/**
 * DownloadApp Page
 *
 * Shows a download landing page and auto-triggers the APK download.
 * Does NOT redirect away — stays visible so the user can re-click if needed.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/seo/SEO';
import { useTranslation } from 'react-i18next';

const APK_URL = '/beta-app.apk';
const APK_FILENAME = 'Robotrick-beta.apk';

export default function DownloadApp() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    // Small delay so the page paints first — user sees the UI before download dialog
    const timer = setTimeout(() => {
      const link = document.createElement('a');
      link.href = APK_URL;
      link.download = APK_FILENAME;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadStarted(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-4 ${isRTL ? 'font-arabic' : ''}`}
      style={{ backgroundColor: '#cccc99' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <SEO
        title="Download App"
        titleAr="تحميل التطبيق"
        description="Download the Robotrick mobile app."
        descriptionAr="حمّل تطبيق روبوتريك للجوال."
        noindex={true}
      />

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header strip */}
        <div className="px-6 py-6 text-center" style={{ backgroundColor: '#003300' }}>
          <img
            src="/images/icon.png"
            alt="Robotrick"
            className="w-20 h-20 mx-auto rounded-2xl shadow-lg mb-3"
          />
          <h1 className="text-xl font-bold" style={{ color: '#cccc99' }}>
            {isRTL ? 'تطبيق روبوتريك' : 'Robotrick App'}
          </h1>
          <p className="text-sm mt-1 opacity-70" style={{ color: '#cccc99' }}>
            {isRTL ? 'نسخة تجريبية' : 'Beta version'}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col items-center gap-4">

          {/* Status message */}
          <p className="text-center text-sm" style={{ color: '#003300' }}>
            {downloadStarted
              ? (isRTL ? 'بدأ التحميل. إذا لم يبدأ، اضغط الزر أدناه.' : 'Download started. If it didn\'t begin, tap the button below.')
              : (isRTL ? 'جاري تحضير التحميل...' : 'Preparing download...')}
          </p>

          {/* Primary download button — always visible */}
          <a
            href={APK_URL}
            download={APK_FILENAME}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#003300', color: '#cccc99' }}
            onClick={() => setDownloadStarted(true)}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isRTL ? 'تحميل التطبيق' : 'Download APK'}
          </a>

          {/* Android note */}
          <p className="text-xs text-center opacity-60" style={{ color: '#003300' }}>
            {isRTL
              ? 'يتطلب نظام أندرويد. قد تحتاج لتفعيل "تثبيت من مصادر غير معروفة".'
              : 'Android only. You may need to enable "Install from unknown sources".'}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-center">
          <Link
            to="/"
            className="text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: '#003300', opacity: 0.6 }}
          >
            {isRTL ? 'العودة للرئيسية' : 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
