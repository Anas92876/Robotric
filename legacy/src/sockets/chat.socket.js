/**
 * Chat Socket Handlers
 * 
 * Real-time chat functionality using Socket.IO
 * Handles both group chat and private chat messaging (text-only MVP)
 * Designed to be extensible for future chat types
 */

const GroupChat = require('../models/GroupChat');
const PrivateChat = require('../models/PrivateChat');
const Group = require('../models/Group');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validateMessage, hasChatAccess, formatMessageForSocket } = require('../utils/chatUtils');
const { wrapSocketHandler } = require('../utils/socketErrorHandler');

module.exports = (io) => {
  console.log('\n💬 [CHAT SOCKET] Chat socket handlers loaded');
  
  io.on('connection', (socket) => {
    console.log('\n✅ [CHAT SOCKET] New socket connection established');
    console.log('👤 User ID:', socket.userId);
    console.log('👤 User Email:', socket.userEmail);
    console.log('👤 User Role:', socket.userRole);
    console.log('🆔 Socket ID:', socket.id);
    console.log('🌐 Origin:', socket.handshake.headers.origin);
    
    // Connection error handler
    socket.on('error', (error) => {
      console.error('❌ [CHAT SOCKET] Socket error:', error);
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // JOIN CHAT ROOM
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('chat:join', wrapSocketHandler(async ({ groupId }, socketInstance) => {
      console.log('\n📥 [CHAT:JOIN] Received join request');
      console.log('👤 User:', socketInstance.userId, `(${socketInstance.userEmail})`);
      console.log('👥 Group ID:', groupId);
      
      // Verify group exists
      console.log('🔍 [CHAT:JOIN] Looking up group:', groupId);
      const group = await Group.findById(groupId);
      if (!group) {
        console.error('❌ [CHAT:JOIN] Group not found:', groupId);
        const error = new Error('Group not found');
        error.code = 'GROUP_NOT_FOUND';
        throw error;
      }
      console.log('✅ [CHAT:JOIN] Group found:', group.name);
      
      // Find or create group chat
      console.log('🔍 [CHAT:JOIN] Looking up group chat...');
      let chat = await GroupChat.findOne({ groupId });
      
      if (!chat) {
        console.log('📝 [CHAT:JOIN] Creating new group chat...');
        // Create chat if doesn't exist
        chat = await GroupChat.create({
          groupId,
          name: `${group.name} Chat`,
          participants: []
        });
        console.log('✅ [CHAT:JOIN] Group chat created');
      } else {
        console.log('✅ [CHAT:JOIN] Group chat found');
      }
      
      // Verify user has access (is group member OR CLO/Admin)
      console.log('🔐 [CHAT:JOIN] Checking user access...');
      const isGroupMember = group.students.some(
        s => s.toString() === socketInstance.userId
      );
      const isTrainer = group.trainerId?.toString() === socketInstance.userId;
      const isCLOorAdmin = ['clo', 'admin', 'superadmin'].includes(socketInstance.userRole);
      
      console.log('📋 [CHAT:JOIN] Access check:');
      console.log('   - Is group member:', isGroupMember);
      console.log('   - Is trainer:', isTrainer);
      console.log('   - Is CLO/Admin:', isCLOorAdmin);
      
      if (!isGroupMember && !isTrainer && !isCLOorAdmin) {
        console.error('❌ [CHAT:JOIN] Access denied - user not authorized');
        const error = new Error('Not authorized to access this chat');
        error.code = 'FORBIDDEN';
        throw error;
      }
      console.log('✅ [CHAT:JOIN] Access granted');
      
      // Add user to participants if not already there
      const isParticipant = chat.participants.some(
        p => p.userId.toString() === socketInstance.userId
      );
      
      if (!isParticipant) {
        // Determine role
        let role = 'student';
        if (isTrainer) role = 'trainer';
        if (isCLOorAdmin) role = 'trainer'; // CLO viewed as trainer in chat
        
        chat.participants.push({
          userId: socketInstance.userId,
          role,
          joinedAt: new Date(),
          lastReadAt: new Date()
        });
        
        await chat.save();
      }
      
      // Join socket room
      console.log('🚪 [CHAT:JOIN] Joining socket room: group:' + groupId);
      socketInstance.join(`group:${groupId}`);
      console.log('✅ [CHAT:JOIN] Joined socket room');
      
      // Get participant list
      await chat.populate('participants.userId', 'name role');
      
      console.log('📤 [CHAT:JOIN] Sending chat:joined event');
      socketInstance.emit('chat:joined', {
        groupId,
        participants: chat.participants
          .filter(p => p.userId)
          .map(p => ({
            userId: p.userId._id,
            name: p.userId.name,
            role: p.role
          }))
      });
      
      console.log('✅ [CHAT:JOIN] Successfully joined chat');
      logger.info(`User ${socketInstance.userId} joined chat for group ${groupId}`);
    }, 'chat:join'));
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // LEAVE CHAT ROOM
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('chat:leave', ({ groupId }) => {
      socket.leave(`group:${groupId}`);
      logger.info(`User ${socket.userId} left chat for group ${groupId}`);
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SEND MESSAGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('chat:send', wrapSocketHandler(async ({ groupId, message }, socketInstance) => {
      // Validate message
      if (!message || typeof message !== 'string') {
        const error = new Error('Message is required');
        error.code = 'INVALID_MESSAGE';
        throw error;
      }
      
      // Trim and check length
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        const error = new Error('Message cannot be empty');
        error.code = 'EMPTY_MESSAGE';
        throw error;
      }
      
      if (trimmedMessage.length > 5000) {
        const error = new Error('Message exceeds 5000 characters');
        error.code = 'MESSAGE_TOO_LONG';
        throw error;
      }
      
      // Get chat
      const chat = await GroupChat.findOne({ groupId });
      if (!chat) {
        const error = new Error('Chat not found');
        error.code = 'CHAT_NOT_FOUND';
        throw error;
      }
      
      // Get user info
      const user = await User.findById(socketInstance.userId);
      if (!user) {
        const error = new Error('User not found');
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      
      // Create message object
      const newMessage = {
        senderId: socketInstance.userId,
        senderName: user.name,
        senderRole: user.role === 'trainer' || user.role === 'clo' ? 'trainer' : 'student',
        message: trimmedMessage,
        type: 'text',
        createdAt: new Date()
      };
      
      // Add to chat
      chat.messages.push(newMessage);
      chat.stats.totalMessages += 1;
      await chat.save();
      
      // Get the saved message with _id
      const savedMessage = chat.messages[chat.messages.length - 1];
      
      // Broadcast to all users in the room (including sender)
      io.to(`group:${groupId}`).emit('chat:message', {
        groupId,
        message: {
          _id: savedMessage._id,
          senderId: savedMessage.senderId,
          senderName: savedMessage.senderName,
          senderRole: savedMessage.senderRole,
          message: savedMessage.message,
          createdAt: savedMessage.createdAt
        }
      });
      
      logger.info(`Message sent in group ${groupId} by user ${socketInstance.userId}`);
    }, 'chat:send'));
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TYPING INDICATOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('chat:typing', async ({ groupId }) => {
      try {
        const user = await User.findById(socket.userId);
        
        // Broadcast to others in room (not sender)
        socket.to(`group:${groupId}`).emit('chat:typing', {
          groupId,
          userId: socket.userId,
          userName: user.name
        });
      } catch (error) {
        // Silent fail for typing indicator
        logger.logError(error, { context: 'chat:typing' });
      }
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK AS READ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('chat:read', async ({ groupId }) => {
      try {
        const chat = await GroupChat.findOne({ groupId });
        if (!chat) return;
        
        // Update lastReadAt for this user
        const participant = chat.participants.find(
          p => p.userId.toString() === socket.userId
        );
        
        if (participant) {
          participant.lastReadAt = new Date();
          await chat.save();
        }
        
      } catch (error) {
        logger.logError(error, { context: 'chat:read' });
      }
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DELETE MESSAGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('chat:delete', async ({ groupId, messageId }) => {
      console.log('\n🗑️ [CHAT:DELETE] Received delete request');
      console.log('👤 User:', socket.userId, `(${socket.userEmail})`);
      console.log('👥 Group ID:', groupId);
      console.log('💬 Message ID:', messageId);
      
      try {
        // Validate inputs
        if (!groupId || !messageId) {
          console.error('❌ [CHAT:DELETE] Missing groupId or messageId');
          return socket.emit('chat:error', {
            code: 'INVALID_REQUEST',
            message: 'Group ID and Message ID are required'
          });
        }
        
        // Get chat
        console.log('🔍 [CHAT:DELETE] Looking up chat...');
        const chat = await GroupChat.findOne({ groupId });
        if (!chat) {
          console.error('❌ [CHAT:DELETE] Chat not found');
          return socket.emit('chat:error', {
            code: 'CHAT_NOT_FOUND',
            message: 'Chat not found'
          });
        }
        console.log('✅ [CHAT:DELETE] Chat found');
        
        // Find message
        const message = chat.messages.id(messageId);
        if (!message) {
          console.error('❌ [CHAT:DELETE] Message not found');
          return socket.emit('chat:error', {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found'
          });
        }
        
        // Check if already deleted
        if (message.isDeleted) {
          console.log('⚠️ [CHAT:DELETE] Message already deleted');
          return socket.emit('chat:error', {
            code: 'ALREADY_DELETED',
            message: 'Message already deleted'
          });
        }
        
        // Authorization: Only message sender, trainer, or CLO/Admin can delete
        const isMessageSender = message.senderId.toString() === socket.userId;
        const isTrainer = chat.groupId && (await Group.findById(chat.groupId))?.trainerId?.toString() === socket.userId;
        const isCLOorAdmin = ['clo', 'admin', 'superadmin'].includes(socket.userRole);
        
        console.log('🔐 [CHAT:DELETE] Authorization check:');
        console.log('   - Is message sender:', isMessageSender);
        console.log('   - Is trainer:', isTrainer);
        console.log('   - Is CLO/Admin:', isCLOorAdmin);
        
        if (!isMessageSender && !isTrainer && !isCLOorAdmin) {
          console.error('❌ [CHAT:DELETE] Access denied - user not authorized');
          return socket.emit('chat:error', {
            code: 'FORBIDDEN',
            message: 'You can only delete your own messages'
          });
        }
        console.log('✅ [CHAT:DELETE] Authorization granted');
        
        // Delete message (soft delete)
        console.log('🗑️ [CHAT:DELETE] Deleting message...');
        await chat.deleteMessage(messageId, socket.userId);
        console.log('✅ [CHAT:DELETE] Message deleted successfully');
        
        // Broadcast deletion to all users in the room
        console.log('📤 [CHAT:DELETE] Broadcasting deletion to room');
        io.to(`group:${groupId}`).emit('chat:message:deleted', {
          groupId,
          messageId
        });
        
        logger.info(`Message ${messageId} deleted in group ${groupId} by user ${socket.userId}`);
        
      } catch (error) {
        console.error('❌ [CHAT:DELETE] Error deleting message:');
        console.error('📋 Error:', error);
        console.error('📋 Stack:', error.stack);
        logger.logError(error, { context: 'chat:delete' });
        socket.emit('chat:error', {
          code: 'SERVER_ERROR',
          message: 'Failed to delete message'
        });
      }
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRIVATE CHAT: JOIN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('private:join', async ({ chatId }) => {
      console.log('\n📥 [PRIVATE:JOIN] Received join request');
      console.log('👤 User:', socket.userId, `(${socket.userEmail})`);
      console.log('💬 Chat ID:', chatId);
      
      try {
        const chat = await PrivateChat.findById(chatId)
          .populate('participants.userId', 'name email role');
        
        if (!chat) {
          console.error('❌ [PRIVATE:JOIN] Chat not found:', chatId);
          return socket.emit('private:error', {
            code: 'CHAT_NOT_FOUND',
            message: 'Chat not found'
          });
        }
        
        // Check access
        console.log('🔍 [PRIVATE:JOIN] Checking access...');
        console.log('   Socket userId:', socket.userId);
        console.log('   Socket userRole:', socket.userRole);
        console.log('   Chat participants:', chat.participants.map(p => ({
          userId: p.userId?._id || p.userId,
          role: p.role
        })));
        
        const isCLOorAdmin = ['clo', 'admin', 'superadmin'].includes(socket.userRole);
        if (!isCLOorAdmin && !hasChatAccess(chat, socket.userId, socket.userRole)) {
          console.error('❌ [PRIVATE:JOIN] Access denied');
          console.error('   User ID:', socket.userId);
          console.error('   Chat participants:', chat.participants.map(p =>
            p.userId?._id?.toString() || p.userId?.toString()
          ));
          return socket.emit('private:error', {
            code: 'FORBIDDEN',
            message: 'Not authorized to access this chat'
          });
        }
        
        console.log('✅ [PRIVATE:JOIN] Access granted');
        
        // Join socket room
        const roomName = `private:${chatId}`;
        socket.join(roomName);
        console.log('✅ [PRIVATE:JOIN] Joined socket room:', roomName);
        
        socket.emit('private:joined', {
          chatId,
          participants: chat.participants
            .filter(p => p.userId)
            .map(p => ({
              userId: p.userId._id,
              name: p.userId.name,
              role: p.role
            }))
        });
        
        logger.info(`User ${socket.userId} joined private chat ${chatId}`);
        
      } catch (error) {
        console.error('❌ [PRIVATE:JOIN] Error:', error);
        logger.logError(error, { context: 'private:join' });
        socket.emit('private:error', {
          code: 'SERVER_ERROR',
          message: 'Failed to join chat'
        });
      }
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRIVATE CHAT: LEAVE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('private:leave', ({ chatId }) => {
      socket.leave(`private:${chatId}`);
      logger.info(`User ${socket.userId} left private chat ${chatId}`);
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRIVATE CHAT: SEND MESSAGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('private:send', async ({ chatId, message }) => {
      try {
        // Validate message using reusable utility
        const validation = validateMessage(message);
        if (!validation.valid) {
          return socket.emit('private:error', {
            code: 'INVALID_MESSAGE',
            message: validation.error
          });
        }
        
        const trimmedMessage = message.trim();
        
        // Get chat
        const chat = await PrivateChat.findById(chatId);
        if (!chat) {
          return socket.emit('private:error', {
            code: 'CHAT_NOT_FOUND',
            message: 'Chat not found'
          });
        }
        
        // Check access
        const isCLOorAdminSend = ['clo', 'admin', 'superadmin'].includes(socket.userRole);
        if (!isCLOorAdminSend && !hasChatAccess(chat, socket.userId, socket.userRole)) {
          return socket.emit('private:error', {
            code: 'FORBIDDEN',
            message: 'Not authorized to send messages in this chat'
          });
        }
        
        // Get user info
        const user = await User.findById(socket.userId);
        
        // Send message using model method
        await chat.sendMessage(
          socket.userId,
          user.name,
          user.role,
          trimmedMessage,
          'text',
          []
        );
        
        // Get the saved message
        const savedMessage = chat.messages[chat.messages.length - 1];
        
        // Broadcast to both participants in the room
        const roomName = `private:${chatId}`;
        io.to(roomName).emit('private:message', {
          chatId,
          message: formatMessageForSocket(savedMessage)
        });
        
        logger.info(`Message sent in private chat ${chatId} by user ${socket.userId}`);
        
      } catch (error) {
        logger.logError(error, { context: 'private:send' });
        socket.emit('private:error', {
          code: 'SERVER_ERROR',
          message: 'Failed to send message'
        });
      }
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRIVATE CHAT: TYPING INDICATOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('private:typing', async ({ chatId }) => {
      try {
        const user = await User.findById(socket.userId);
        const roomName = `private:${chatId}`;
        
        // Broadcast to other participant (not sender)
        socket.to(roomName).emit('private:typing', {
          chatId,
          userId: socket.userId,
          userName: user.name
        });
      } catch (error) {
        logger.logError(error, { context: 'private:typing' });
      }
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRIVATE CHAT: MARK AS READ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('private:read', async ({ chatId }) => {
      try {
        const chat = await PrivateChat.findById(chatId);
        if (!chat) return;
        
        await chat.markAsRead(socket.userId);
      } catch (error) {
        logger.logError(error, { context: 'private:read' });
      }
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRIVATE CHAT: DELETE MESSAGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('private:delete', async ({ chatId, messageId }) => {
      try {
        const chat = await PrivateChat.findById(chatId);
        if (!chat) {
          return socket.emit('private:error', {
            code: 'CHAT_NOT_FOUND',
            message: 'Chat not found'
          });
        }
        
        // Check access
        if (!hasChatAccess(chat, socket.userId, socket.userRole)) {
          return socket.emit('private:error', {
            code: 'FORBIDDEN',
            message: 'Not authorized'
          });
        }
        
        const message = chat.messages.id(messageId);
        if (!message || message.isDeleted) {
          return socket.emit('private:error', {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found'
          });
        }
        
        // Only sender can delete in private chats
        if (message.senderId.toString() !== socket.userId.toString()) {
          return socket.emit('private:error', {
            code: 'FORBIDDEN',
            message: 'You can only delete your own messages'
          });
        }
        
        await chat.deleteMessage(messageId, socket.userId);
        
        // Broadcast deletion
        io.to(`private:${chatId}`).emit('private:message:deleted', {
          chatId,
          messageId
        });
        
        logger.info(`Message ${messageId} deleted in private chat ${chatId} by user ${socket.userId}`);
        
      } catch (error) {
        logger.logError(error, { context: 'private:delete' });
        socket.emit('private:error', {
          code: 'SERVER_ERROR',
          message: 'Failed to delete message'
        });
      }
    });
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DISCONNECT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    socket.on('disconnect', (reason) => {
      console.log('\n❌ [CHAT SOCKET] Socket disconnected');
      console.log('👤 User:', socket.userId);
      console.log('🆔 Socket ID:', socket.id);
      console.log('📋 Reason:', reason);
    });
  });
};
