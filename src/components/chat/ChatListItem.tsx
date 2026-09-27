/**
 * ChatListItem Component
 *
 * Individual chat item in the chat list with modern styling
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { ChatItem } from '../../hooks/common/useChatList';
import { formatDistanceToNow } from 'date-fns';
import { Users, User } from 'lucide-react';

interface ChatListItemProps {
  chat: ChatItem;
  isSelected: boolean;
  onClick: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat, isSelected, onClick }) => {
  // Generate a consistent color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-emerald-400 to-green-500',
      'from-blue-400 to-indigo-500',
      'from-purple-400 to-violet-500',
      'from-orange-400 to-red-500',
      'from-cyan-400 to-teal-500',
      'from-pink-400 to-rose-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get display name and subtitle based on chat type
  const displayName = chat.type === 'group' 
    ? chat.groupName 
    : chat.otherParticipant.name;
  
  const subtitle = chat.type === 'group'
    ? chat.courseName
    : chat.chatType === 'student-clo' 
      ? 'Student-CLO Chat'
      : 'Private Chat';

  return (
    <motion.button
      className={`w-full px-4 py-3 flex items-start gap-3 transition-all text-left ${
        isSelected
          ? 'bg-primary/10 border-l-3 border-l-primary'
          : 'hover:bg-[#003300]/5 border-l-3 border-l-transparent'
      }`}
      onClick={onClick}
      whileHover={{ x: isSelected ? 0 : 4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar */}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(displayName)} flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0`}>
        {chat.type === 'group' ? (
          <Users className="w-6 h-6" />
        ) : (
          <User className="w-6 h-6" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : 'text-[#003300]'}`}>
            {displayName}
          </h3>
          {chat.lastMessageAt && (
            <span className="text-xs text-[#003300]/40 whitespace-nowrap flex-shrink-0">
              {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: false })}
            </span>
          )}
        </div>

        {subtitle && (
          <div className="flex items-center gap-1 mb-1">
            {chat.type === 'group' ? (
              <Users className="w-3 h-3 text-[#003300]/40" />
            ) : (
              <User className="w-3 h-3 text-[#003300]/40" />
            )}
            <p className="text-xs text-[#003300]/50 truncate">{subtitle}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-[#003300]/60 truncate flex-1">
            {chat.lastMessage || 'No messages yet'}
          </p>

          {/* Unread badge */}
          {chat.unreadCount > 0 && (
            <motion.span
              className="bg-primary text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </motion.span>
          )}
        </div>
      </div>
    </motion.button>
  );
};
