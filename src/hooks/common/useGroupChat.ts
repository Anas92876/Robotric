/**
 * useGroupChat Hook
 * 
 * Manages group chat state and real-time updates
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
  senderRole: 'trainer' | 'student';
  message: string;
  createdAt: string;
}

interface TypingUser {
  userId: string;
  userName: string;
}

interface GroupInfo {
  name: string;
  memberCount: number;
}

export const useGroupChat = (groupId: string | null) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Join chat room
  useEffect(() => {
    if (!socket || !isConnected || !groupId) return;

    console.log(`Joining chat room: ${groupId}`);
    socket.emit('chat:join', { groupId });
    
    // Load message history
    loadMessages();
    
    return () => {
      console.log(`Leaving chat room: ${groupId}`);
      socket.emit('chat:leave', { groupId });
    };
  }, [socket, isConnected, groupId]);
  
  // Listen for events
  useEffect(() => {
    if (!socket || !groupId) return;
    
    // New message
    const handleNewMessage = ({ groupId: msgGroupId, message }: any) => {
      if (msgGroupId === groupId) {
        setMessages(prev => [...prev, message]);
        // Mark as read when new message arrives
        socket.emit('chat:read', { groupId });
      }
    };
    
    // Typing indicator
    const handleTyping = ({ groupId: typingGroupId, userId, userName }: any) => {
      if (typingGroupId === groupId) {
        setTypingUsers(prev => {
          // Don't show same user twice
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
    const handleMessageDeleted = ({ groupId: deletedGroupId, messageId }: any) => {
      if (deletedGroupId === groupId) {
        console.log('🗑️ Message deleted:', messageId);
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    };
    
    // Error
    const handleError = ({ code, message }: any) => {
      console.error('Chat error:', code, message);
      setError(message);
    };
    
    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:message:deleted', handleMessageDeleted);
    socket.on('chat:error', handleError);
    
    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:message:deleted', handleMessageDeleted);
      socket.off('chat:error', handleError);
    };
  }, [socket, groupId]);
  
  // Load message history and group info
  const loadMessages = async () => {
    if (!groupId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get token from localStorage (fallback to cookies via withCredentials)
      const token = localStorage.getItem('token');
      
      // Prepare headers - only add Authorization if token exists
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch messages and group info in parallel
      const [messagesRes, groupRes] = await Promise.all([
        axios.get(joinUrl(API_URL, '/api/chats/groups', groupId, 'messages'), {
          headers,
          withCredentials: true, // Send cookies (backend checks cookies first)
        }),
        axios.get(joinUrl(API_URL, '/api/chats/groups', groupId), {
          headers,
          withCredentials: true, // Send cookies (backend checks cookies first)
        })
      ]);

      setMessages(messagesRes.data.data.messages);

      // Set group info
      if (groupRes.data.data) {
        setGroupInfo({
          name: groupRes.data.data.name,
          memberCount: groupRes.data.data.participants?.length || 0
        });
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send message
  const sendMessage = useCallback((text: string) => {
    if (!socket || !groupId || !text.trim()) return;
    
    socket.emit('chat:send', {
      groupId,
      message: text.trim()
    });
  }, [socket, groupId]);
  
  // Emit typing indicator
  const emitTyping = useCallback(() => {
    if (!socket || !groupId) return;
    
    // Throttle typing events
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    socket.emit('chat:typing', { groupId });
    
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1000);
  }, [socket, groupId]);
  
  // Mark as read
  const markAsRead = useCallback(() => {
    if (!socket || !groupId) return;
    socket.emit('chat:read', { groupId });
  }, [socket, groupId]);
  
  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    if (!socket || !groupId || !messageId) return;
    
    console.log('🗑️ Deleting message:', messageId);
    socket.emit('chat:delete', {
      groupId,
      messageId
    });
  }, [socket, groupId]);
  
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
    groupInfo
  };
};
