/**
 * ChatList Component
 *
 * Modern list of all user's group chats with search filtering
 */

import React from 'react';
import { Loader, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatList, type ChatItem } from '../../hooks/common/useChatList';
import { ChatListItem } from './ChatListItem';

type ChatSelection = 
  | { type: 'group'; id: string }
  | { type: 'private'; id: string }
  | null;

interface ChatListProps {
  selectedChat: ChatSelection;
  onSelectChat: (chat: ChatSelection) => void;
  searchQuery?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ selectedChat, onSelectChat, searchQuery = '' }) => {
  const { chats, isLoading, error, reload } = useChatList();

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => {
    const query = searchQuery.toLowerCase();
    if (chat.type === 'group') {
      return (
        chat.groupName.toLowerCase().includes(query) ||
        chat.courseName?.toLowerCase().includes(query)
      );
    } else {
      return (
        chat.otherParticipant.name.toLowerCase().includes(query) ||
        chat.chatType.toLowerCase().includes(query)
      );
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-[#003300]/50">Loading chats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <p className="text-red-600 font-medium mb-1">Failed to load</p>
        <p className="text-sm text-[#003300]/50 mb-4">{error}</p>
        <button
          onClick={reload}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#003300]/5 flex items-center justify-center mb-3">
          <MessageSquare className="w-7 h-7 text-[#003300]/30" />
        </div>
        <p className="text-[#003300]/70 font-medium mb-1">No chats yet</p>
        <p className="text-sm text-[#003300]/50">
          Join a group to start chatting
        </p>
      </div>
    );
  }

  if (filteredChats.length === 0 && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#003300]/5 flex items-center justify-center mb-3">
          <MessageSquare className="w-7 h-7 text-[#003300]/30" />
        </div>
        <p className="text-[#003300]/70 font-medium mb-1">No results found</p>
        <p className="text-sm text-[#003300]/50">
          Try a different search term
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {filteredChats.map((chat, index) => {
        const chatKey = chat.type === 'group' ? chat.groupId : chat.chatId;
        const isSelected = selectedChat?.type === chat.type && selectedChat?.id === chatKey;
        
        return (
          <motion.div
            key={chatKey}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <ChatListItem
              chat={chat}
              isSelected={isSelected}
              onClick={() => onSelectChat({
                type: chat.type,
                id: chatKey
              })}
            />
          </motion.div>
        );
      })}
    </div>
  );
};
