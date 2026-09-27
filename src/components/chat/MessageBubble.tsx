/**
 * MessageBubble Component
 *
 * Individual message bubble with modern styling
 * Different styles for own messages vs others
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Check, CheckCheck, Trash2 } from 'lucide-react';

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onDelete?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  // Generate avatar color based on name
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

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this message?')) {
      onDelete(message._id);
      setShowMenu(false);
    }
  };

  return (
    <motion.div
      className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      onMouseEnter={() => isOwn && setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Avatar (only for others) */}
      {!isOwn && (
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(message.senderName)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm`}>
          {getInitials(message.senderName)}
        </div>
      )}

      <div className={`max-w-[70%] relative ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name and role (only for others) */}
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-[#003300]/70">
              {message.senderName}
            </span>
            {message.senderRole === 'trainer' && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                Trainer
              </span>
            )}
          </div>
        )}

        {/* Message bubble with delete menu */}
        <div className="relative">
          <div
            className={`px-4 py-2.5 ${
              isOwn
                ? 'bg-gradient-to-br from-primary to-emerald-600 text-white rounded-2xl rounded-br-md shadow-sm shadow-primary/20'
                : 'bg-white text-[#003300] rounded-2xl rounded-bl-md shadow-sm border border-[#003300]/5'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.message}
            </p>
          </div>
          
          {/* Delete button (only for own messages) */}
          {isOwn && onDelete && showMenu && (
            <motion.div
              className="absolute top-0 right-0 -mr-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg bg-white shadow-md hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors border border-red-100"
                title="Delete message"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>

        {/* Timestamp and status */}
        <div className={`flex items-center gap-1.5 px-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[11px] text-[#003300]/40">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {isOwn && message.status && (
            <span className="text-primary/60">
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
