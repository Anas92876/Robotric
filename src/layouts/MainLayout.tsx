import React, { useEffect } from "react";
import type { ReactNode } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../providers";
import { ROUTES } from "../constants/routes.constants";
import { Sidebar } from "../components/navigation/Sidebar";
import { TopNav } from "../components/navigation/TopNav";
import { StudentMobileNav } from "../components/navigation/StudentMobileNav";
import { LoadingState } from "../components/ui";
import { UserRole } from "../types/auth.types";

interface MainLayoutProps {
  children?: ReactNode;
}

/**
 * Main application layout component that includes the sidebar, top navigation,
 * and main content area. This layout is used for all authenticated routes.
 * Updated to use consistent light theme styling matching the Home page design.
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { t, i18n } = useTranslation('dashboardCommon');
  const isRTL = i18n.language === 'ar';
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Only redirect if we're not already on the login page
      if (location.pathname !== ROUTES.LOGIN) {
        navigate(ROUTES.LOGIN, {
          replace: true,
          state: { from: location },
        });
      }
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Show loading state while checking authentication - using light theme
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: '#cccc99' }}>
        <LoadingState type="spinner" text={t('loading')} />
      </div>
    );
  }

  // Show nothing if not authenticated (will be redirected by the effect above)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
    {/* Keep <html dir> in sync for all dashboard pages (no SEO component here) */}
    <Helmet>
      <html lang={isRTL ? 'ar' : 'en'} dir={isRTL ? 'rtl' : 'ltr'} />
    </Helmet>
    <div
      className={`relative min-h-screen ${isRTL ? 'font-arabic' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ backgroundColor: '#cccc99' }}
    >
      {/* Sidebar - self-positioned fixed element; pointer-events managed inside Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area: margin for sidebar, vertical stack */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 w-full lg:w-[calc(100%-16rem)] ${isRTL ? 'mr-0 lg:mr-64' : 'ml-0 lg:ml-64'}`}>
        {/* Top Navigation - sticky at top */}
        <div className="flex-shrink-0 sticky top-0 z-20">
          <TopNav onMenuClick={() => setSidebarOpen(true)} />
        </div>

        {/* Content - scrollable, takes all available space, padding for spacing */}
        <main className={`flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 lg:p-6 ${
          user?.role === UserRole.STUDENT
            ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-6'
            : ''
        }`} style={{ backgroundColor: '#cccc99' }}>
          <div className="mx-auto max-w-7xl">{children || <Outlet />}</div>
        </main>

        {/* Student Mobile Bottom Navigation */}
        {user?.role === UserRole.STUDENT && <StudentMobileNav />}
      </div>
    </div>
    </>
  );
};

// Ensure proper default export
export default MainLayout;
