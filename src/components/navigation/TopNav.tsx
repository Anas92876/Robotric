import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Menu, LogOut,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../providers';
import { ROUTES } from '../../constants/routes.constants';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

interface TopNavProps {
  onMenuClick: () => void;
}

/**
 * Premium TopNav with Light Mode - Professional Design
 * Redesigned to match Home page aesthetics with RTL support
 */
export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('dashboardCommon');
  const isRTL = i18n.language === 'ar';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't show on auth or public pages
  if ([ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.HOME, '/forgot-password'].includes(location.pathname)) {
    return null;
  }

  return (
    <motion.header
      initial={false}
      animate={{
        backgroundColor: '#003300',
        boxShadow: scrolled
          ? '0 0 20px rgba(0, 0, 0, 0.15)'
          : '0 0 10px rgba(0, 0, 0, 0.1)',
      }}
      transition={{ duration: 0.3 }}
      className={`sticky top-0 z-20 bg-[#003300] ${isRTL ? 'font-arabic' : ''}`}
      style={{ backgroundColor: '#003300' }}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className={`flex h-16 items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Mobile menu button */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile Menu Button with Animation */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="rounded-xl p-2.5 lg:hidden transition-all duration-300"
              style={{ color: '#cccc99' }}
              onClick={onMenuClick}
              aria-label="Open sidebar"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#cccc99' + '20';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Menu className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Right section: Language switcher, Notifications and User Menu */}
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Language Switcher */}
            <LanguageSwitcher variant="desktop" />

            {/* Notifications Center */}
            <NotificationCenter maxNotifications={10} />

            {/* User Menu */}
            <div className="relative" data-user-menu>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="flex items-center gap-2 rounded-xl pl-2 pr-3 py-1.5
                           border transition-all duration-300
                           focus:outline-none focus:ring-2 focus:ring-[#cccc99]/50"
                style={{
                  backgroundColor: '#cccc99' + '20',
                  borderColor: '#cccc99' + '40',
                  color: '#cccc99'
                }}
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                }}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cccc99' + '30';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#cccc99' + '20';
                }}
              >
                {/* Avatar with Gradient */}
                <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-md flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #cccc99 0%, #ffffcc 100%)' }}>
                  <span className="text-sm font-bold" style={{ color: '#003300' }}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>

                {/* User Name (Hidden on mobile) */}
                <span className="hidden md:block text-sm font-medium truncate max-w-[120px]" style={{ color: '#cccc99' }}>
                  {user?.name || 'User'}
                </span>

                {/* Dropdown Icon */}
                <motion.div
                  animate={{ rotate: isUserMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4" style={{ color: '#cccc99' + 'CC' }} />
                </motion.div>
              </motion.button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 400 }}
                    className={`absolute ${isRTL ? 'left-0' : 'right-0'} sm:right-0 mt-3 w-[calc(100vw-2rem)] sm:w-56 max-w-[280px] origin-top-right rounded-2xl border shadow-xl overflow-hidden`}
                    style={{ backgroundColor: '#ffffcc', borderColor: '#003300' + '30' }}
                  >
                    {/* User Info Header */}
                    <div className={`px-4 py-3 border-b ${isRTL ? 'text-right' : 'text-left'}`} style={{ borderColor: '#003300' + '20', backgroundColor: '#003300' + '10' }}>
                      <p className="text-sm font-bold truncate" style={{ color: '#003300' }}>{user?.name || 'User'}</p>
                      <p className={`text-xs capitalize flex items-center gap-1.5 mt-0.5 ${isRTL ? 'flex-row-reverse justify-end' : ''}`} style={{ color: '#003300' + 'CC' }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#003300' }}></span>
                        {user?.role || 'member'}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      {/* Profile & Settings - Coming Soon */}
                    </div>

                    {/* Logout Button */}
                    <div className="border-t border-primary/10">
                      <MenuItem
                        icon={<LogOut className="w-4 h-4" />}
                        label={t('signOut')}
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        variant="danger"
                        isRTL={isRTL}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

/**
 * Premium Menu Item Component with RTL support
 */
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  isRTL: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, variant = 'default', isRTL }) => {
  return (
    <motion.button
      whileHover={{ x: isRTL ? -4 : 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
      style={{
        backgroundColor: 'transparent',
        color: variant === 'danger' ? '#ef4444' : '#003300'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = variant === 'danger' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0, 51, 0, 0.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ color: variant === 'danger' ? '#ef4444' : '#003300' + 'CC' }}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </motion.button>
  );
};

export default TopNav;
