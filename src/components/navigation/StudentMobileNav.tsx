import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  BookOpen,
  ListTodo,
  Star,
  DollarSign
} from 'lucide-react';
import { ROUTES } from '../../constants/routes.constants';
import { useTranslation } from 'react-i18next';

/**
 * Mobile Bottom Navigation for Students
 * Visible only on mobile/tablet breakpoints
 */
export const StudentMobileNav: React.FC = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation('dashboardCommon');
  const isRTL = i18n.language === 'ar';

  // Navigation items for student mobile view
  // Selected high-priority items for bottom nav
  const navItems = [
    {
      id: 'dashboard',
      labelKey: 'home',
      path: ROUTES.STUDENT_DASHBOARD,
      icon: Home
    },
    {
      id: 'courses',
      labelKey: 'courses',
      path: ROUTES.STUDENT_COURSES,
      icon: BookOpen
    },
    {
      id: 'tasks',
      labelKey: 'tasks',
      path: '/student/tasks',
      icon: ListTodo
    },
    {
      id: 'payments',
      labelKey: 'payments',
      path: ROUTES.STUDENT_PAYMENTS,
      icon: DollarSign
    },
    {
      id: 'evaluations',
      labelKey: 'evaluations',
      path: '/student/evaluations',
      icon: Star
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-[env(safe-area-inset-bottom)]">
      {/* Dark Green Background matching Sidebar */}
      <div
        className="absolute inset-0 backdrop-blur-md border-t shadow-[0_-4px_20px_-4px_rgba(0,51,0,0.3)]"
        style={{
          backgroundColor: '#003300',
          borderColor: '#cccc99' + '30'
        }}
      />

      <nav className="relative flex justify-around items-center h-16 px-1 sm:px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
                          (item.path !== ROUTES.STUDENT_DASHBOARD && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-full h-full min-w-0"
            >
              <div className="relative flex flex-col items-center gap-0.5 sm:gap-1">
                {/* Active Indicator Background */}
                {isActive && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute -inset-x-2 sm:-inset-x-3 -inset-y-1 rounded-xl"
                    style={{ backgroundColor: '#cccc99' + '20' }}
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <Icon
                  className="w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-300"
                  style={{
                    color: isActive ? '#cccc99' : '#cccc99' + 'CC',
                    strokeWidth: isActive ? 2.5 : 2
                  }}
                />

                {/* Label */}
                <span
                  className="text-[9px] sm:text-[10px] font-medium transition-colors duration-300 leading-tight"
                  style={{
                    color: isActive ? '#cccc99' : '#cccc99' + 'CC'
                  }}
                >
                  {t(item.labelKey)}
                </span>

                {/* Active Dot */}
                {isActive && (
                  <motion.div
                    layoutId="mobileNavDot"
                    className="absolute -bottom-2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: '#cccc99' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default StudentMobileNav;
