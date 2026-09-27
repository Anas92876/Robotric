/**
 * MessageList Component
 *
 * Renders list of chat messages with date separators
 */

import React from 'react';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '../../providers/AuthProvider';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
  onDeleteMessage?: (messageId: string) => void;
}

const DateSeparator: React.FC<{ date: Date }> = ({ date }) => {
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-3 py-1 bg-[#003300]/5 rounded-full">
        <span className="text-xs font-medium text-[#003300]/50">
          {getDateLabel(date)}
        </span>
      </div>
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({ messages, onDeleteMessage }) => {
  const { user } = useAuth();

  if (messages.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full py-12"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-500/10 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-primary/40" />
        </div>
        <p className="text-[#003300]/70 font-medium mb-1">No messages yet</p>
        <p className="text-sm text-[#003300]/50">Start the conversation!</p>
      </motion.div>
    );
  }

  // Group messages by date and add date separators
  const messagesWithSeparators: React.ReactNode[] = [];
  let lastMessageDate: Date | null = null;

  messages.forEach((message) => {
    const messageDate = new Date(message.createdAt);

    // Add date separator if this is a new day
    if (!lastMessageDate || !isSameDay(lastMessageDate, messageDate)) {
      messagesWithSeparators.push(
        <DateSeparator key={`date-${message._id}`} date={messageDate} />
      );
    }

    messagesWithSeparators.push(
      <div key={message._id} className="mb-3">
        <MessageBubble
          message={message}
          isOwn={message.senderId === user?.id}
          onDelete={onDeleteMessage}
        />
      </div>
    );

    lastMessageDate = messageDate;
  });

  return <div className="space-y-1">{messagesWithSeparators}</div>;
};
