import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ROUTES, NAV_ITEMS } from '../../constants/routes.constants';
import { useAuth } from '../../providers';
import { UserRole } from '../../types/auth.types';
import { useWroAccess } from '../../hooks/student/useWroAccess';
import { LogOut, ChevronRight, ChevronLeft } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Premium Sidebar with Light Mode - Professional Design
 * Redesigned to match Home page aesthetics with RTL support
 */
export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const { t, i18n } = useTranslation(['dashboardNav', 'dashboardCommon']);
  const isRTL = i18n.language === 'ar';

  // Only fetch WRO access status for students (cached in-memory after first call)
  const { wroAccess } = useWroAccess(isAuthenticated && user?.role === UserRole.STUDENT);

  // Filter nav items based on user role
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    if (!isAuthenticated) return false;
    if (!item.roles.includes(user?.role as UserRole)) return false;
    if (item.requiresWro && !wroAccess) return false;
    return true;
  });

  // Close sidebar when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLinkClick = () => {
    onClose();
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Mobile Backdrop with Blur */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Premium Sidebar with Home Page Design */}
      <div
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 max-w-[85vw] overflow-y-auto
                    shadow-lg
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0 pointer-events-auto' : isRTL ? 'translate-x-full pointer-events-none' : '-translate-x-full pointer-events-none'}
                    lg:translate-x-0 lg:pointer-events-auto lg:max-w-none lg:h-screen ${isRTL ? 'font-arabic' : ''}`}
        style={{ backgroundColor: '#003300' }}
      >
        <div className="flex h-full min-h-screen lg:min-h-0 flex-col">
          {/* Logo */}
          <div
            className="flex h-20 items-center justify-center border-b px-4 py-3"
            style={{ borderColor: '#cccc99' + '30' }}
          >
            <Link to={ROUTES.DASHBOARD} className="flex items-center justify-center group w-full">
              <img
                src="/dash-assets/logo.png"
                alt="Robotrick Logo"
                className="h-16 w-auto max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>

          {/* Navigation with Stagger Animation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" style={{ backgroundColor: '#003300' }}>
            {filteredNavItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NavItem
                  to={item.path}
                  label={t(`dashboardNav:${item.id}`, item.title)}
                  icon={item.icon}
                  isActive={location.pathname === item.path}
                  onClick={handleLinkClick}
                  isRTL={isRTL}
                />
              </motion.div>
            ))}
          </nav>

          {/* Premium User Section */}
          <div className="border-t p-4" style={{ borderColor: '#cccc99' + '30', backgroundColor: '#003300' }}>
            {user && (
              <div className="space-y-3">
                {/* User Info Card */}
                <div className="flex items-center p-3 rounded-xl border"
                     style={{ borderColor: '#cccc99' + '30', backgroundColor: '#cccc99' + '10' }}
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 rounded-full
                                    flex items-center justify-center
                                    shadow-md"
                         style={{ background: 'linear-gradient(135deg, #cccc99 0%, #ffffcc 100%)' }}>
                      <span className="font-bold text-sm" style={{ color: '#003300' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-0.5 ${isRTL ? '-left-0.5' : '-right-0.5'} w-3 h-3
                                    rounded-full border-2 shadow-sm`}
                         style={{ backgroundColor: '#cccc99', borderColor: '#003300' }} />
                  </div>

                  <div className={`${isRTL ? 'mr-3' : 'ml-3'} flex-1 min-w-0`}>
                    <p className={`text-sm font-semibold truncate ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#cccc99' }}>
                      {user.name}
                    </p>
                    <p className={`text-xs capitalize flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`} style={{ color: '#cccc99' + 'CC' }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#cccc99' }}></span>
                      {user.role}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl
                             border transition-all duration-300
                             font-medium text-sm group"
                  style={{
                    backgroundColor: '#cccc99' + '20',
                    borderColor: '#cccc99' + '40',
                    color: '#cccc99'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#cccc99' + '30';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#cccc99' + '20';
                  }}
                >
                  <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span>{t('dashboardCommon:signOut')}</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

interface NavItemProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  isRTL: boolean;
}

/**
 * Premium Navigation Item with RTL support
 */
const NavItem: React.FC<NavItemProps> = ({ to, label, icon, isActive, onClick, isRTL }) => {
  const ActiveChevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <Link to={to} onClick={onClick}>
      <motion.div
        whileHover={{ x: isRTL ? -4 : 4 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium
                    transition-all duration-300 relative overflow-hidden group
                    ${isRTL ? 'flex-row-reverse' : ''}
                    ${isActive ? 'shadow-sm' : ''}`}
        style={{
          backgroundColor: isActive ? '#cccc99' + '20' : 'transparent',
          color: isActive ? '#cccc99' : '#cccc99' + 'CC',
          border: isActive ? `1px solid ${'#cccc99' + '40'}` : 'none'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = '#cccc99' + '10';
            e.currentTarget.style.color = '#cccc99';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#cccc99' + 'CC';
          }
        }}
      >
        {/* Hover Background Effect */}
        {!isActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            initial={false}
          />
        )}

        {/* Active Indicator */}
        {isActive && (
          <motion.div
            layoutId="activeNav"
            className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-0 bottom-0 w-1 ${isRTL ? 'rounded-l-full' : 'rounded-r-full'}`}
            style={{ backgroundColor: '#cccc99' }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}

        {/* Icon */}
        {icon && (
          <span className={`${isRTL ? 'ml-3' : 'mr-3'} flex-shrink-0 relative z-10 transition-all duration-300`}
                style={{ color: isActive ? '#cccc99' : '#cccc99' + 'CC' }}>
            {icon}
          </span>
        )}

        {/* Label */}
        <span className="truncate relative z-10">{label}</span>

        {/* Chevron on Active */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={isRTL ? 'mr-auto' : 'ml-auto'}
          >
            <ActiveChevron className="w-4 h-4" style={{ color: '#cccc99' }} />
          </motion.div>
        )}
      </motion.div>
    </Link>
  );
};

export default Sidebar;
