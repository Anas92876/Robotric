/**
 * Notifications Controller
 * 
 * REST API endpoints for push notification token management
 * Handles token registration and unregistration
 */

const PushToken = require('../models/PushToken');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');
const Joi = require('joi');
const { Expo } = require('expo-server-sdk');
const mongoose = require('mongoose');
const {
  sendNotificationToUsers,
  sendNotificationToUser,
  getAllUserIds,
  getUserIdsByCourse,
  getUserIdsByGroup,
  getUserIdsByIds
} = require('../services/notification.service');

// Validation schemas
const registerTokenSchema = Joi.object({
  token: Joi.string()
    .required()
    .trim()
    .messages({
      'string.empty': 'Token is required',
      'any.required': 'Token is required'
    }),
  platform: Joi.string()
    .valid('android', 'ios')
    .required()
    .messages({
      'any.only': 'Platform must be either android or ios',
      'any.required': 'Platform is required'
    }),
  deviceId: Joi.string()
    .trim()
    .allow(null, '')
    .optional(),
  tokenType: Joi.string()
    .valid('expo', 'fcm')
    .optional()
    .default('expo')
    .messages({
      'any.only': 'tokenType must be either expo or fcm'
    })
});

const unregisterTokenSchema = Joi.object({
  token: Joi.string()
    .required()
    .trim()
    .messages({
      'string.empty': 'Token is required',
      'any.required': 'Token is required'
    })
});

// Validation schema for custom notification
const sendCustomNotificationSchema = Joi.object({
  title: Joi.string()
    .required()
    .trim()
    .max(100)
    .messages({
      'string.empty': 'Title is required',
      'any.required': 'Title is required',
      'string.max': 'Title cannot exceed 100 characters'
    }),
  body: Joi.string()
    .required()
    .trim()
    .max(500)
    .messages({
      'string.empty': 'Body is required',
      'any.required': 'Body is required',
      'string.max': 'Body cannot exceed 500 characters'
    }),
  targetType: Joi.string()
    .valid('all', 'course', 'group', 'students')
    .required()
    .messages({
      'any.only': 'Target type must be one of: all, course, group, students',
      'any.required': 'Target type is required'
    }),
  targetIds: Joi.alternatives().conditional('targetType', {
    switch: [
      {
        is: 'all',
        then: Joi.any().optional()
      },
      {
        is: 'course',
        then: Joi.string()
          .required()
          .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
              return helpers.error('any.invalid');
            }
            return value;
          })
          .messages({
            'any.required': 'Course ID is required when target type is course',
            'any.invalid': 'Invalid course ID format'
          })
      },
      {
        is: 'group',
        then: Joi.string()
          .required()
          .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
              return helpers.error('any.invalid');
            }
            return value;
          })
          .messages({
            'any.required': 'Group ID is required when target type is group',
            'any.invalid': 'Invalid group ID format'
          })
      },
      {
        is: 'students',
        then: Joi.array()
          .items(
            Joi.string().custom((value, helpers) => {
              if (!mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error('any.invalid');
              }
              return value;
            })
          )
          .min(1)
          .required()
          .messages({
            'array.min': 'At least one student ID is required',
            'any.required': 'Student IDs are required when target type is students',
            'any.invalid': 'Invalid student ID format'
          })
      }
    ]
  }),
  data: Joi.object().optional()
});

/**
 * Register push token
 * POST /api/notifications/register
 */
exports.registerToken = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  
  // Validate request body
  const { error, value } = registerTokenSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { token, platform, deviceId, tokenType } = value;

  // Validate token format based on type:
  // - expo tokens must match the ExponentPushToken[...] format
  // - fcm tokens are plain opaque strings (no specific format to validate)
  if (tokenType === 'expo' && !Expo.isExpoPushToken(token)) {
    throw new ValidationError('Invalid Expo push token format');
  }

  // Log database operation
  logger.logDB('register', 'PushToken', { userId, token, platform });

  // Deactivate all OTHER tokens for this user+platform so only the latest one is active.
  // This prevents stale tokens (from old installs / reinstalls) from accumulating.
  await PushToken.updateMany(
    { userId, platform, token: { $ne: token }, isActive: true },
    { isActive: false, deactivatedAt: new Date() }
  );

  // Upsert the current token (create if new, reactivate if it was deactivated)
  // Clear deactivatedAt to prevent TTL from deleting an active token
  const pushToken = await PushToken.findOneAndUpdate(
    { token },
    {
      userId,
      token,
      platform,
      deviceId: deviceId || null,
      tokenType: tokenType || 'expo',
      isActive: true,
      deactivatedAt: null,
      updatedAt: new Date()
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  logger.info(`Push token registered for user ${userId} (${platform})`);

  res.status(201).json({
    success: true,
    message: 'Token registered successfully',
    data: {
      tokenId: pushToken._id,
      platform: pushToken.platform
    }
  });
});

/**
 * Unregister push token
 * POST /api/notifications/unregister
 */
exports.unregisterToken = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  
  // Validate request body
  const { error, value } = unregisterTokenSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { token } = value;

  // Log database operation
  logger.logDB('unregister', 'PushToken', { userId, token });

  // Deactivate token for this user (TTL will auto-delete after 30 days)
  const result = await PushToken.findOneAndUpdate(
    { userId, token, isActive: true },
    { isActive: false, deactivatedAt: new Date() }
  );

  if (!result) {
    logger.warn(`Active token not found for user ${userId}: ${token}`);
    // Still return success to avoid errors if token was already deactivated
    return res.json({
      success: true,
      message: 'Token unregistered successfully (token was not found or already inactive)'
    });
  }

  logger.info(`Push token unregistered for user ${userId}`);

  res.json({
    success: true,
    message: 'Token unregistered successfully'
  });
});

/**
 * Send custom notification (Reception only)
 * POST /api/reception/notifications/send
 */
exports.sendCustomNotification = asyncHandler(async (req, res) => {
  const senderId = req.user._id || req.user.id;
  const senderName = req.user.name || 'Reception Staff';
  
  // Validate request body
  const { error, value } = sendCustomNotificationSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { title, body, targetType, targetIds, data = {} } = value;

  // Log operation
  logger.logDB('send_custom_notification', 'Notification', {
    senderId,
    targetType,
    targetIds
  });

  let userIds = [];
  let resolvedTargetIds = targetIds;

  try {
    // Resolve user IDs based on target type
    switch (targetType) {
      case 'all':
        userIds = await getAllUserIds();
        resolvedTargetIds = null;
        logger.info(`Sending notification to all users (${userIds.length} users)`);
        break;

      case 'course':
        try {
          userIds = await getUserIdsByCourse(targetIds);
          logger.info(`Sending notification to course ${targetIds} (${userIds.length} students)`);
        } catch (err) {
          if (err.message === 'Course not found') {
            throw new NotFoundError('Course not found');
          }
          throw err;
        }
        break;

      case 'group':
        try {
          userIds = await getUserIdsByGroup(targetIds);
          logger.info(`Sending notification to group ${targetIds} (${userIds.length} students)`);
        } catch (err) {
          if (err.message === 'Group not found') {
            throw new NotFoundError('Group not found');
          }
          throw err;
        }
        break;

      case 'students':
        try {
          userIds = await getUserIdsByIds(targetIds);
          logger.info(`Sending notification to ${userIds.length} selected students`);
        } catch (err) {
          throw new ValidationError(err.message);
        }
        break;

      default:
        throw new ValidationError('Invalid target type');
    }

    // If no users found, return success with 0 count
    if (userIds.length === 0) {
      logger.warn(`No users found for target type: ${targetType}, targetIds: ${targetIds}`);
      return res.json({
        success: true,
        message: 'No users found for the specified target',
        data: {
          usersNotified: 0,
          targetType,
          targetIds: resolvedTargetIds,
          error: 'NO_USERS_FOR_TARGET'
        }
      });
    }

    // Prepare notification data payload
    // Ensure there is always a reasonable default screen for navigation on mobile
    const baseData = {
      ...data
    };

    if (!baseData.screen) {
      baseData.screen = 'home';
    }

    const notificationData = {
      type: 'custom',
      targetType,
      targetIds: resolvedTargetIds,
      senderId,
      senderName,
      ...baseData
    };

    // Send notifications
    const result = await sendNotificationToUsers(userIds, title, body, notificationData);

    if (!result.success) {
      logger.error(`Failed to send notifications: ${result.error}`);
      // Still return success but with detailed delivery info
      return res.json({
        success: true,
        message: 'Notification request processed, but some notifications may have failed',
        data: {
          usersNotified: userIds.length,
          targetType,
          targetIds: resolvedTargetIds,
          error: result.error,
          deliveryStats: result.stats || null
        }
      });
    }

    logger.info(`Custom notification sent by ${senderName} (${senderId}) to ${userIds.length} user(s)`, {
      deliveryStats: result.stats || null
    });

    res.json({
      success: true,
      message: 'Notifications sent successfully',
      data: {
        usersNotified: userIds.length,
        targetType,
        targetIds: resolvedTargetIds,
        deliveryStats: result.stats || null
      }
    });
  } catch (err) {
    // Re-throw known errors
    if (err instanceof ValidationError || err instanceof NotFoundError) {
      throw err;
    }
    // Log unexpected errors
    logger.error('Error sending custom notification:', err);
    throw err;
  }
});

/**
 * Cleanup stale/duplicate push tokens
 * POST /api/notifications/cleanup
 * @access Private (admin/reception only)
 *
 * For each user+platform, keeps only the most recently updated active token
 * and deactivates all others.
 */
exports.cleanupTokens = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  logger.info(`Token cleanup requested by user ${userId}`);

  // Find all active tokens grouped by userId+platform
  const activeTokens = await PushToken.find({ isActive: true })
    .sort({ updatedAt: -1 })
    .lean();

  const seen = new Map(); // key: `${userId}-${platform}`, value: token._id (the latest one)
  const toDeactivate = [];

  for (const token of activeTokens) {
    const key = `${token.userId}-${token.platform}`;
    if (!seen.has(key)) {
      seen.set(key, token._id);
    } else {
      toDeactivate.push(token._id);
    }
  }

  let deactivatedCount = 0;
  if (toDeactivate.length > 0) {
    const result = await PushToken.updateMany(
      { _id: { $in: toDeactivate } },
      { isActive: false, deactivatedAt: new Date() }
    );
    deactivatedCount = result.modifiedCount;
  }

  // Also validate remaining active tokens — only check Expo format for expo-type tokens
  const remainingActive = await PushToken.find({ isActive: true }).lean();
  const invalidTokenIds = [];
  for (const token of remainingActive) {
    const isExpoType = !token.tokenType || token.tokenType === 'expo';
    if (isExpoType && !Expo.isExpoPushToken(token.token)) {
      invalidTokenIds.push(token._id);
    }
  }

  let invalidCount = 0;
  if (invalidTokenIds.length > 0) {
    const result = await PushToken.updateMany(
      { _id: { $in: invalidTokenIds } },
      { isActive: false, deactivatedAt: new Date() }
    );
    invalidCount = result.modifiedCount;
  }

  // Count actual remaining active tokens after both cleanup passes
  const finalActiveCount = await PushToken.countDocuments({ isActive: true });

  const stats = {
    totalActiveTokensBefore: activeTokens.length,
    uniqueUserDevices: seen.size,
    duplicatesDeactivated: deactivatedCount,
    invalidTokensDeactivated: invalidCount,
    remainingActive: finalActiveCount
  };

  logger.info('Token cleanup completed', stats);

  res.json({
    success: true,
    message: 'Token cleanup completed',
    data: stats
  });
});

/**
 * Get token debug info for current user
 * GET /api/notifications/debug
 * @access Private
 */
exports.debugTokens = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  const tokens = await PushToken.find({ userId }).lean();

  res.json({
    success: true,
    data: {
      userId,
      totalTokens: tokens.length,
      activeTokens: tokens.filter(t => t.isActive).length,
      inactiveTokens: tokens.filter(t => !t.isActive).length,
      tokens: tokens.map(t => ({
        id: t._id,
        platform: t.platform,
        tokenType: t.tokenType || 'expo',
        deviceId: t.deviceId,
        isActive: t.isActive,
        tokenPrefix: t.token.substring(0, 25) + '...',
        isValidExpo: t.tokenType === 'fcm' ? 'N/A (FCM token)' : Expo.isExpoPushToken(t.token),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        deactivatedAt: t.deactivatedAt
      }))
    }
  });
});

/**
 * Test notification endpoint
 * POST /api/notifications/test
 * @access Private
 */
exports.testNotification = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { title, body, data } = req.body;

  // Use provided values or defaults
  const notificationTitle = title || 'Test Notification';
  const notificationBody = body || 'This is a test notification from the server. If you received this, your push notifications are working correctly!';
  const notificationData = data || { type: 'test', timestamp: new Date().toISOString() };

  logger.info('Test notification requested', {
    userId,
    title: notificationTitle,
    bodyLength: notificationBody.length
  });

  try {
    const result = await sendNotificationToUser(
      userId,
      notificationTitle,
      notificationBody,
      notificationData
    );

    if (result.success) {
      logger.info('Test notification sent successfully', {
        userId,
        ticketCount: result.tickets?.length || 0
      });

      res.json({
        success: true,
        message: 'Test notification sent. Check your device.',
        data: {
          userId,
          title: notificationTitle,
          body: notificationBody,
          tickets: result.tickets,
          receipts: result.receipts,
          stats: result.stats
        }
      });
    } else {
      logger.warn('Test notification failed', {
        userId,
        error: result.error
      });

      res.status(400).json({
        success: false,
        message: `Failed to send test notification: ${result.error}`,
        data: {
          userId,
          error: result.error
        }
      });
    }
  } catch (error) {
    logger.error('Error sending test notification:', {
      userId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Error sending test notification',
      error: error.message
    });
  }
});
