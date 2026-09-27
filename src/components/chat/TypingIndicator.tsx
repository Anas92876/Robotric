/**
 * TypingIndicator Component
 *
 * Shows animated indicator when other users are typing
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingUser {
  userId: string;
  userName: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const text = users.length === 1
    ? `${users[0].userName} is typing`
    : users.length === 2
      ? `${users[0].userName} and ${users[1].userName} are typing`
      : `${users.length} people are typing`;

  return (
    <AnimatePresence>
      <motion.div
        className="px-6 py-2 border-t border-[#003300]/5 bg-[#003300]/[0.02]"
        initial={{ opacity: 0, y: 10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: 10, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-2">
          {/* Animated dots */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary/60"
                animate={{
                  y: [0, -4, 0],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Text */}
          <span className="text-xs text-[#003300]/50 font-medium">
            {text}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
