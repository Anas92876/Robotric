/**
 * ChatWindow Component
 *
 * Main chat interface with messages, header, and input
 * Modern design with smooth scrolling and status indicators
 */

import React, { useEffect, useRef } from 'react';
import { useGroupChat } from '../../hooks/common/useGroupChat';
import { usePrivateChat } from '../../hooks/common/usePrivateChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { AlertCircle, Wifi, WifiOff, Users, User, ChevronLeft } from 'lucide-react';

interface ChatWindowProps {
  chatType: 'group' | 'private';
  chatId: string;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatType, chatId, onBack }) => {
  // Use appropriate hook based on chat type
  const groupChat = useGroupChat(chatType === 'group' ? chatId : null);
  const privateChat = usePrivateChat(chatType === 'private' ? chatId : null);

  // Select the active chat data
  const chat = chatType === 'group' ? groupChat : privateChat;
  
  const {
    messages,
    typingUsers,
    isLoading,
    error,
    sendMessage,
    emitTyping,
    markAsRead,
    deleteMessage,
    isConnected
  } = chat;

  // Get chat info based on type
  const chatInfo = chatType === 'group' 
    ? { name: groupChat.groupInfo?.name || 'Group Chat', memberCount: groupChat.groupInfo?.memberCount || 0 }
    : { name: privateChat.otherParticipant?.name || 'Private Chat', memberCount: 1 };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when window opens
  useEffect(() => {
    markAsRead();
  }, [chatId, markAsRead]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-[#003300]/50">Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-600 font-semibold mb-2">Unable to load chat</p>
        <p className="text-sm text-[#003300]/50 max-w-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-[#003300]/10 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="lg:hidden mr-1 p-1 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Back to chats"
              >
                <ChevronLeft size={24} className="text-[#003300]" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center">
              {chatType === 'group' ? (
                <Users className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-[#003300]">
                {chatInfo.name}
              </h3>
              <p className="text-xs text-[#003300]/50">
                {chatType === 'group' 
                  ? `${chatInfo.memberCount} members`
                  : 'Private chat'
                }
              </p>
            </div>
          </div>

          {/* Connection status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            isConnected
              ? 'bg-green-50 text-green-600'
              : 'bg-yellow-50 text-yellow-600'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Connecting...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-b from-[#003300]/[0.02] to-white">
        <MessageList messages={messages} onDeleteMessage={deleteMessage} />
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        onTyping={emitTyping}
        disabled={!isConnected}
      />
    </div>
  );
};
