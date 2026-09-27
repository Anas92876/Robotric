/**
 * ChatModal Component
 *
 * Modern full-screen modal with chat list (left) and chat window (right)
 * Features responsive design and smooth animations
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MessageCircle, Users, Search } from 'lucide-react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';

interface ChatModalProps {
  onClose: () => void;
}

type ChatSelection = 
  | { type: 'group'; id: string }
  | { type: 'private'; id: string }
  | null;

export const ChatModal: React.FC<ChatModalProps> = ({ onClose }) => {
  const [selectedChat, setSelectedChat] = useState<ChatSelection>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white lg:rounded-2xl shadow-2xl w-full h-full lg:h-[80vh] lg:max-w-5xl flex flex-col overflow-hidden border border-[#003300]/10"
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Hidden on mobile when chat is open */}
        <div className={`bg-gradient-to-r from-primary to-emerald-600 text-white px-6 py-4 flex items-center justify-between shrink-0 ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageCircle size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Messages</h2>
              <p className="text-white/70 text-sm">Group chats and private messages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-xl transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat List (Left) */}
          <div className={`${selectedChat ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 border-r border-[#003300]/10 flex-col bg-[#003300]/[0.02]`}>
            {/* Search */}
            <div className="p-4 border-b border-[#003300]/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#003300]/10 bg-white text-[#003300] placeholder-[#003300]/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              <ChatList
                selectedChat={selectedChat}
                onSelectChat={setSelectedChat}
                searchQuery={searchQuery}
              />
            </div>
          </div>

          {/* Chat Window (Right) */}
          <div className={`${selectedChat ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-white`}>
            {selectedChat ? (
              <ChatWindow 
                chatType={selectedChat.type} 
                chatId={selectedChat.id} 
                onBack={() => setSelectedChat(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-500/10 flex items-center justify-center">
                    <Users className="w-10 h-10 text-primary/40" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#003300] mb-2">Select a conversation</h3>
                  <p className="text-[#003300]/50 text-sm max-w-xs">
                    Choose a chat from the list to start messaging
                  </p>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
