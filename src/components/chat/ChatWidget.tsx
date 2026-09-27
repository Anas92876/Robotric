/**
 * ChatWidget Component
 *
 * Floating chat button (bottom-right) that opens chat modal
 * Modern design with pulse animation for unread messages
 */

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatList } from '../../hooks/common/useChatList';
import { useAuth } from '../../providers/AuthProvider';
import { UserRole } from '../../types/auth.types';
import { ChatModal } from './ChatModal';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { totalUnread } = useChatList();
  const { user } = useAuth();

  const isStudent = user?.role === UserRole.STUDENT;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className={`fixed right-6 z-40 group ${
          isStudent ? 'bottom-24 lg:bottom-6' : 'bottom-6'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
      >
        {/* Pulse animation for unread messages */}
        {totalUnread > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Main button */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-emerald-600 text-white rounded-full p-4 shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:shadow-primary/40 transition-all duration-300">
          <MessageCircle size={24} strokeWidth={2} />
        </div>

        {/* Unread badge */}
        {totalUnread > 0 && (
          <motion.span
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1 shadow-lg border-2 border-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </motion.span>
        )}
      </motion.button>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && <ChatModal onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  );
};
