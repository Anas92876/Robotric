import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../providers";
import { redirectToLogin } from "../lib/publicSite";
import { StudentMobileNav } from "../components/navigation/StudentMobileNav";
import { UserRole } from "../types/auth.types";
import { useWroAccess } from "../hooks/student/useWroAccess";
import { navigationFor } from "../app/navigation";
import { AppSidebar } from "../app/shell/AppSidebar";
import { AppTopbar } from "../app/shell/AppTopbar";

interface MainLayoutProps {
  children?: ReactNode;
}

/**
 * The frame of every signed-in page: menu (per role, from app/navigation.ts),
 * top bar, and the page itself on the cream canvas.
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const isStudent = user?.role === UserRole.STUDENT;
  const { wroAccess } = useWroAccess(isAuthenticated && isStudent);
  const sections = useMemo(() => navigationFor(user?.role, { wroAccess }), [user?.role, wroAccess]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) redirectToLogin();
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="grid h-screen w-full place-items-center bg-canvas">
        <div className="size-10 animate-spin rounded-full border-[3px] border-ink border-t-transparent" aria-label="Loading" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const homePath = sections[0]?.items[0]?.path ?? "/dashboard";

  return (
    <>
      {/* Keep <html dir/lang> in sync for all dashboard pages */}
      <Helmet>
        <html lang={isRTL ? "ar" : "en"} dir={isRTL ? "rtl" : "ltr"} />
      </Helmet>
      <div className="rt-app min-h-screen bg-canvas text-ink" dir={isRTL ? "rtl" : "ltr"}>
        <AppSidebar sections={sections} user={{ name: user.name, role: user.role }} homePath={homePath} onSignOut={logout} open={menuOpen} onClose={closeMenu} />
        <div className="flex min-h-screen flex-col lg:ps-64">
          <AppTopbar onMenu={() => setMenuOpen(true)} />
          <main className={`flex-1 px-4 py-6 sm:px-6 lg:px-8 ${isStudent ? "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-8" : ""}`}>
            <div className="mx-auto max-w-7xl">{children || <Outlet />}</div>
          </main>
          {isStudent && <StudentMobileNav />}
        </div>
      </div>
    </>
  );
};

export default MainLayout;
