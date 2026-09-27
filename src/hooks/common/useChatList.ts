/**
 * useChatList Hook
 * 
 * Fetches and manages list of all user's chats (both group and private)
 * Reusable pattern for extensible chat types
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl, joinUrl } from '../../utils/apiUrl';
import { redirectToLogin } from '../../lib/publicSite';

const API_URL = getApiUrl();

export interface GroupChatItem {
  type: 'group';
  groupId: string;
  groupName: string;
  courseName: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface PrivateChatItem {
  type: 'private';
  chatId: string;
  chatType: string;
  otherParticipant: {
    userId: string;
    name: string;
    role: string;
  };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

// Export type - using union type syntax
export type ChatItem = GroupChatItem | PrivateChatItem;

export const useChatList = () => {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadChats = async () => {
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
      
      // Fetch both group chats and private chats in parallel
      const [groupChatsRes, privateChatsRes] = await Promise.all([
        axios.get(joinUrl(API_URL, '/api/chats/my-chats'), {
          headers,
          withCredentials: true,
        }),
        axios.get(joinUrl(API_URL, '/api/chats/private/my-chats'), {
          headers,
          withCredentials: true,
        }).catch(() => ({ data: { data: { chats: [] } } })) // Gracefully handle if endpoint doesn't exist yet
      ]);
      
      // Format group chats
      const groupChats: GroupChatItem[] = groupChatsRes.data.data.chats.map((chat: any) => ({
        type: 'group' as const,
        groupId: chat.groupId,
        groupName: chat.groupName,
        courseName: chat.courseName,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: chat.unreadCount
      }));
      
      // Format private chats
      const privateChats: PrivateChatItem[] = (privateChatsRes.data.data.chats || []).map((chat: any) => ({
        type: 'private' as const,
        chatId: chat.chatId,
        chatType: chat.chatType,
        otherParticipant: chat.otherParticipant,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: chat.unreadCount
      }));
      
      // Combine and sort by last message time
      const allChats: ChatItem[] = [...groupChats, ...privateChats].sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA; // Most recent first
      });
      
      setChats(allChats);
    } catch (err: any) {
      console.error('Failed to load chats:', err);
      
      // Handle 401 Unauthorized - token missing or expired
      if (err.response?.status === 401) {
        const errorMsg = err.response?.data?.message || 'Unauthorized';
        if (errorMsg === 'Unauthorized' || errorMsg === 'Invalid token') {
          setError('Your session has expired. Please log in again.');
          // Optionally redirect to login
          setTimeout(redirectToLogin, 2000);
        } else {
          setError(errorMsg);
        }
      } else {
        setError(err.response?.data?.message || 'Failed to load chats');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadChats();
  }, []);
  
  // Calculate total unread count
  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
  
  return {
    chats,
    totalUnread,
    isLoading,
    error,
    reload: loadChats
  };
};
