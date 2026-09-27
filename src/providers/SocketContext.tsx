/**
 * Socket Context Provider
 * 
 * Provides Socket.IO connection to all components
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket.service';
import { useAuth } from '../providers/AuthProvider';
import Cookies from 'js-cookie';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isConnectingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Handle user logout - disconnect socket if user is no longer authenticated
    if (!isAuthenticated && socket) {
      socketService.disconnect();
      setSocket(null);
      setIsConnected(false);
      isConnectingRef.current = false;
      userIdRef.current = null;
      return;
    }

    // Don't connect socket until user is authenticated
    if (!user || !isAuthenticated) {
      setIsConnected(false);
      return;
    }

    // Prevent reconnection if already connected for this user
    const currentUserId = user._id || user.id;
    if (socket?.connected && userIdRef.current === currentUserId) {
      // Already connected for this user, skip
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      return;
    }

    // User is authenticated - get token and connect socket
    isConnectingRef.current = true;
    userIdRef.current = currentUserId;
    
    // Get token from multiple sources (localStorage first, then cookies)
    let token: string | undefined = undefined;
    
    try {
      // Try localStorage first
      token = localStorage.getItem('token') || undefined;
    } catch (e) {
      // Silent fail
    }
    
    // Fallback to cookies if localStorage doesn't have token
    if (!token) {
      try {
        token = Cookies.get('token') || Cookies.get('authToken') || undefined;
        if (token) {
          // Save to localStorage for future use (if possible)
          try {
            localStorage.setItem('token', token);
          } catch (e) {
            // Silent fail
          }
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    // Connect socket - token will be sent if available, otherwise cookies via withCredentials
    const socketInstance = socketService.connect(token);
    
    // Set up event listeners
    const onConnect = () => {
      setIsConnected(true);
      isConnectingRef.current = false;
    };
    
    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      isConnectingRef.current = false;
    };
    
    const onConnectError = (error: Error) => {
      setIsConnected(false);
      isConnectingRef.current = false;
    };
    
    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onConnectError);
    
    // Check initial connection state
    if (socketInstance.connected) {
      setIsConnected(true);
      isConnectingRef.current = false;
    }
    
    setSocket(socketInstance);
    
    return () => {
      // Only cleanup if user changed or component unmounts
      if (socketInstance) {
        socketInstance.off('connect', onConnect);
        socketInstance.off('disconnect', onDisconnect);
        socketInstance.off('connect_error', onConnectError);
      }
      isConnectingRef.current = false;
    };
  }, [user, isAuthenticated]); // Removed 'socket' from dependencies to prevent loop
  
  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

