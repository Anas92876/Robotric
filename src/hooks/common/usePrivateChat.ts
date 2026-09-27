/**
 * usePrivateChat Hook
 * 
 * Manages private chat state and real-time updates
 * Reusable pattern similar to useGroupChat
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../providers/SocketContext';
import axios from 'axios';
import { getApiUrl, joinUrl } from '../../utils/apiUrl';

const API_URL = getApiUrl();

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface TypingUser {
  userId: string;
  userName: string;
}

interface OtherParticipant {
  userId: string;
  name: string;
  role: string;
}

export const usePrivateChat = (chatId: string | null) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<OtherParticipant | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Join chat room
  useEffect(() => {
    if (!socket || !isConnected || !chatId) return;
    
    console.log(`Joining private chat room: ${chatId}`);
    socket.emit('private:join', { chatId });
    
    // Load message history
    loadMessages();
    
    return () => {
      console.log(`Leaving private chat room: ${chatId}`);
      socket.emit('private:leave', { chatId });
    };
  }, [socket, isConnected, chatId]);
  
  // Listen for events
  useEffect(() => {
    if (!socket || !chatId) return;
    
    // New message
    const handleNewMessage = ({ chatId: msgChatId, message }: any) => {
      if (msgChatId === chatId) {
        setMessages(prev => [...prev, message]);
        // Mark as read when new message arrives
        socket.emit('private:read', { chatId });
      }
    };
    
    // Typing indicator
    const handleTyping = ({ chatId: typingChatId, userId, userName }: any) => {
      if (typingChatId === chatId) {
        setTypingUsers(prev => {
          if (prev.some(u => u.userId === userId)) return prev;
          return [...prev, { userId, userName }];
        });
        
        // Remove after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        }, 3000);
      }
    };
    
    // Message deleted
    const handleMessageDeleted = ({ chatId: deletedChatId, messageId }: any) => {
      if (deletedChatId === chatId) {
        console.log('🗑️ Private message deleted:', messageId);
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    };
    
    // Error
    const handleError = ({ code, message }: any) => {
      console.error('Private chat error:', code, message);
      setError(message);
    };
    
    socket.on('private:message', handleNewMessage);
    socket.on('private:typing', handleTyping);
    socket.on('private:message:deleted', handleMessageDeleted);
    socket.on('private:error', handleError);
    
    return () => {
      socket.off('private:message', handleNewMessage);
      socket.off('private:typing', handleTyping);
      socket.off('private:message:deleted', handleMessageDeleted);
      socket.off('private:error', handleError);
    };
  }, [socket, chatId]);
  
  // Load message history and chat info
  const loadMessages = async () => {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch messages
      const messagesRes = await axios.get(
        joinUrl(API_URL, '/api/chats/private', chatId, 'messages'),
        {
          headers,
          withCredentials: true,
        }
      );

      setMessages(messagesRes.data.data.messages);

      // Fetch chat info to get other participant
      // Note: This might need a separate endpoint or be included in messages response
      // For now, we'll get it from the chat list or create a separate call
      
    } catch (err: any) {
      console.error('Failed to load private chat messages:', err);
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send message
  const sendMessage = useCallback((text: string) => {
    if (!socket || !chatId || !text.trim()) return;
    
    socket.emit('private:send', {
      chatId,
      message: text.trim()
    });
  }, [socket, chatId]);
  
  // Emit typing indicator
  const emitTyping = useCallback(() => {
    if (!socket || !chatId) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    socket.emit('private:typing', { chatId });
    
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1000);
  }, [socket, chatId]);
  
  // Mark as read
  const markAsRead = useCallback(() => {
    if (!socket || !chatId) return;
    socket.emit('private:read', { chatId });
  }, [socket, chatId]);
  
  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    if (!socket || !chatId || !messageId) return;
    
    console.log('🗑️ Deleting private message:', messageId);
    socket.emit('private:delete', {
      chatId,
      messageId
    });
  }, [socket, chatId]);

  // Set other participant (called from parent component)
  const setOtherParticipantInfo = useCallback((participant: OtherParticipant | null) => {
    setOtherParticipant(participant);
  }, []);
  
  return {
    messages,
    typingUsers,
    isLoading,
    error,
    sendMessage,
    emitTyping,
    markAsRead,
    deleteMessage,
    isConnected,
    otherParticipant,
    setOtherParticipantInfo
  };
};
