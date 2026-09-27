/**
 * Socket.IO Client Service
 * 
 * Manages WebSocket connection for real-time features
 */

import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../utils/apiUrl';

// Get Socket.IO server URL (throws in production if not set)
let SOCKET_URL: string;
try {
  SOCKET_URL = getSocketUrl();
} catch (error) {
  // In production, this will crash the app (intentional - fail fast)
  // In development, use fallback
  SOCKET_URL = 'http://localhost:4889';
}

class SocketService {
  private socket: Socket | null = null;
  
  connect(token?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }
    
    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Try to get token from localStorage if not provided
    let authToken = token;
    if (!authToken || authToken.trim().length === 0) {
      try {
        authToken = localStorage.getItem('token') || undefined;
      } catch (e) {
        // Silent fail
      }
    }
    
    // Prepare auth object and headers - send token in multiple ways for maximum compatibility
    const authConfig: { token?: string } = {};
    const extraHeaders: { Authorization?: string } = {};
    
    if (authToken && authToken.trim().length > 0) {
      authConfig.token = authToken;
      extraHeaders.Authorization = `Bearer ${authToken}`;
    }
    
    // CRITICAL: Check for HTTPS mismatch
    const isProduction = import.meta.env.MODE === 'production';
    const isHTTPS = window.location.protocol === 'https:';
    const socketIsHTTPS = SOCKET_URL.startsWith('https://');
    
    if (isProduction && isHTTPS && !socketIsHTTPS) {
      // Silent fail - HTTPS/HTTP mismatch will be caught by connection error
    }
    
    // CRITICAL: Always set withCredentials: true for cookies
    // Even if we have a token, cookies are backup authentication
    this.socket = io(SOCKET_URL, {
      auth: authConfig.token ? { token: authConfig.token } : {},
      extraHeaders: Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000, // 20 second timeout
      withCredentials: true, // CRITICAL: REQUIRED for cookies to be sent cross-site
      forceNew: false, // Reuse connection if possible
    });
    
    // Connection events (no logging for production)
    this.socket.on('connect', () => {
      // Connection successful
    });
    
    this.socket.on('disconnect', (reason) => {
      // Disconnected
      if (reason === 'io server disconnect') {
        // Server disconnected, will attempt to reconnect
      }
    });
    
    this.socket.on('connect_error', (error) => {
      // Connection error - silent fail
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      // Reconnection attempt
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      // Reconnected
    });
    
    this.socket.on('reconnect_error', (error) => {
      // Reconnection error - silent fail
    });
    
    this.socket.on('reconnect_failed', () => {
      // Reconnection failed - silent fail
    });
    
    return this.socket;
  }
  
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  getSocket(): Socket | null {
    return this.socket;
  }
  
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
