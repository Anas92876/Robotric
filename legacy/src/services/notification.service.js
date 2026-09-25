/**
 * Notification Service
 *
 * Routes push notifications to either Expo Push API (iOS) or direct FCM v1 (Android).
 * Direct FCM v1 is used for Android because it sends a proper `notification` payload,
 * which guarantees system banners in foreground, background, and killed states.
 * The Expo Push API is retained for iOS tokens.
 */

const { Expo } = require('expo-server-sdk');
const admin = require('firebase-admin');
const path = require('path');
const PushToken = require('../models/PushToken');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Group = require('../models/Group');
const Course = require('../models/Course');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Expo SDK client
// ---------------------------------------------------------------------------
const expo = new Expo();

// ---------------------------------------------------------------------------
// Firebase Admin SDK — initialised once at module load.
// Credentials come from an env var pointing to the service-account JSON file,
// or from the FIREBASE_SERVICE_ACCOUNT_JSON env var containing the raw JSON,
// or from a file called firebase-service-account.json next to the backend root.
// ---------------------------------------------------------------------------
let firebaseInitialised = false;

(function initFirebase() {
  try {
    // Already initialised (hot-reload guard)
    if (admin.apps.length > 0) {
      firebaseInitialised = true;
      return;
    }

    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Raw JSON string stored in an environment variable (recommended for production)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(serviceAccount);
    } else {
      // Path to a local file (dev / staging)
      // Resolve relative paths from the project root (two levels up from src/services/)
      const rawPath =
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.join(__dirname, '../../firebase-service-account.json');
      const serviceAccountPath = path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(__dirname, '../../', rawPath);
      // eslint-disable-next-line import/no-dynamic-require
      credential = admin.credential.cert(require(serviceAccountPath));
    }

    admin.initializeApp({ credential });
    firebaseInitialised = true;
    logger.info('Firebase Admin SDK initialised successfully');
  } catch (e) {
    logger.warn(
      'Firebase Admin SDK init failed — FCM direct send unavailable. ' +
        'Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.',
      { error: e.message }
    );
  }
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate notification message fields.
 */
function validateNotificationMessage(title, body, data = {}) {
  const errors = [];

  if (!title || typeof title !== 'string') {
    errors.push('Title is required and must be a string');
  } else if (title.length > 100) {
    errors.push('Title cannot exceed 100 characters');
  }

  if (body === undefined || body === null || typeof body !== 'string') {
    errors.push('Body is required and must be a string');
  } else if (body.length > 500) {
    errors.push('Body cannot exceed 500 characters');
  }

  try {
    const dataSizeKB = Buffer.byteLength(JSON.stringify(data), 'utf8') / 1024;
    if (dataSizeKB > 4) {
      errors.push(`Data payload size (${dataSizeKB.toFixed(2)}KB) exceeds 4KB limit`);
    }
  } catch {
    errors.push('Data payload cannot be serialised to JSON');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Deactivate a token that is no longer valid.
 */
async function removeInvalidToken(token) {
  try {
    await PushToken.findOneAndUpdate(
      { token },
      { isActive: false, deactivatedAt: new Date() }
    );
    logger.info(`Deactivated invalid push token: ${token}`);
  } catch (error) {
    logger.error('Error deactivating invalid token:', error);
  }
}

// ---------------------------------------------------------------------------
// Expo receipt checker (used internally by sendExpoNotifications)
// ---------------------------------------------------------------------------
async function checkReceipts(receiptIds, tokens = []) {
  if (!receiptIds || receiptIds.length === 0) {
    return { checked: 0, errors: 0, successes: 0 };
  }

  try {
    const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);
    let errorCount = 0;
    let successCount = 0;

    for (const receiptId of Object.keys(receipts)) {
      const receipt = receipts[receiptId];

      if (receipt.status === 'error') {
        errorCount++;
        const errorType = receipt.details?.error || 'Unknown';

        logger.error('Push notification delivery error:', {
          receiptId,
          errorType,
          errorMessage: receipt.message || 'Unknown error',
          details: receipt.details,
        });

        if (errorType === 'DeviceNotRegistered') {
          const idx = receiptIds.indexOf(receiptId);
          if (idx >= 0 && idx < tokens.length) {
            await removeInvalidToken(tokens[idx]);
          }
        }
      } else if (receipt.status === 'ok') {
        successCount++;
      }
    }

    return { checked: receiptIds.length, errors: errorCount, successes: successCount };
  } catch (error) {
    logger.error('Error checking push notification receipts:', {
      error: error.message,
      stack: error.stack,
    });
    return { checked: 0, errors: 0, successes: 0, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// sendExpoNotifications  — unchanged Expo push path (used for iOS tokens)
// ---------------------------------------------------------------------------
async function sendExpoNotifications(tokenStrings, title, body, data = {}) {
  if (!tokenStrings || tokenStrings.length === 0) {
    return { success: false, error: 'No Expo tokens provided' };
  }

  // Filter valid Expo tokens
  const validTokens = [];
  const invalidTokens = [];
  for (const token of tokenStrings) {
    if (!token || typeof token !== 'string') {
      invalidTokens.push({ token: 'null/undefined', reason: 'Not a string' });
      continue;
    }
    if (Expo.isExpoPushToken(token)) {
      validTokens.push(token);
    } else {
      invalidTokens.push({ token: token.substring(0, 20) + '...', reason: 'Invalid Expo token format' });
    }
  }

  if (invalidTokens.length > 0) {
    logger.warn(`Found ${invalidTokens.length} invalid Expo token(s)`, { invalidTokens });
  }

  if (validTokens.length === 0) {
    logger.warn('No valid Expo tokens to send notifications to');
    return { success: false, error: 'No valid Expo tokens' };
  }

  logger.info('Sending Expo push notifications', {
    count: validTokens.length,
    title,
  });

  // Include title/body in data as fallback for any remaining FCM data-only edge cases
  const enrichedData = { ...data, title, body };

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: enrichedData,
    priority: 'high',
    channelId: 'default',
    categoryId: 'default',
  }));

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    const receiptIds = [];
    const tokenToReceiptMap = new Map();

    for (let i = 0; i < chunks.length; i++) {
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunks[i]);
          tickets.push(...ticketChunk);

          chunks[i].forEach((message, msgIndex) => {
            const ticketIndex = tickets.length - ticketChunk.length + msgIndex;
            const ticket = tickets[ticketIndex];
            if (ticket?.status === 'ok' && ticket.id) {
              receiptIds.push(ticket.id);
              tokenToReceiptMap.set(ticket.id, message.to);
            }
          });

          break;
        } catch (error) {
          retries++;
          const isLastRetry = retries >= maxRetries;

          logger.error('Error sending Expo push chunk:', {
            chunkIndex: i + 1,
            attempt: retries,
            error: error.message,
            code: error.code,
          });

          if ((error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') && isLastRetry) {
            return { success: false, error: 'Network error: Unable to reach Expo API after retries' };
          }
          if (error.code === 'ENOTFOUND') {
            return { success: false, error: 'Network error: Expo API host not found' };
          }
          if (isLastRetry) {
            return { success: false, error: `Failed to send Expo notifications: ${error.message}` };
          }

          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }

    // Handle ticket-level errors
    for (let i = 0; i < tickets.length; i++) {
      if (tickets[i].status === 'error') {
        const errorType = tickets[i].details?.error || 'Unknown';
        logger.error('Expo ticket error:', { errorType, message: tickets[i].message });
        if (errorType === 'DeviceNotRegistered' && i < validTokens.length) {
          await removeInvalidToken(validTokens[i]);
        }
      }
    }

    // Deferred receipt checking
    if (receiptIds.length > 0) {
      const tokensForReceipts = receiptIds
        .map(id => tokenToReceiptMap.get(id) || null)
        .filter(Boolean);
      setTimeout(() => {
        checkReceipts(receiptIds, tokensForReceipts)
          .then(results => logger.info('Expo deferred receipt check completed', results))
          .catch(err => logger.error('Expo deferred receipt check failed', { error: err.message }));
      }, 5000);
    }

    const successCount = tickets.filter(t => t.status === 'ok').length;
    const errorCount = tickets.filter(t => t.status === 'error').length;

    logger.info('Expo push notifications sent', { total: tickets.length, successCount, errorCount });

    return {
      success: true,
      tickets,
      stats: { total: tickets.length, success: successCount, errors: errorCount },
    };
  } catch (error) {
    logger.error('Error sending Expo push notifications:', { error: error.message });
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// sendFCMNotifications  — direct FCM v1 path (used for Android tokens)
//
// Sends a message with a top-level `notification` object so Android shows a
// native banner regardless of app state (foreground / background / killed).
// ---------------------------------------------------------------------------
async function sendFCMNotifications(tokenStrings, title, body, data = {}) {
  if (!tokenStrings || tokenStrings.length === 0) {
    return { success: false, error: 'No FCM tokens provided' };
  }

  if (!firebaseInitialised) {
    logger.warn('Firebase Admin not initialised — skipping FCM send');
    return { success: false, error: 'Firebase Admin not initialised' };
  }

  // FCM data values must ALL be strings
  const stringData = {};
  for (const [k, v] of Object.entries(data)) {
    stringData[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  // Include title/body in data so the app can read them from notification.request.content.data
  stringData.title = title;
  stringData.body = body;

  logger.info('Sending FCM direct notifications', { count: tokenStrings.length, title });

  const message = {
    // top-level notification tells Android to display a native banner
    notification: { title, body },
    data: stringData,
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
        priority: 'high',
      },
    },
  };

  const responses = await Promise.allSettled(
    tokenStrings.map(token =>
      admin.messaging().send({ ...message, token })
    )
  );

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < responses.length; i++) {
    const result = responses[i];
    if (result.status === 'fulfilled') {
      successCount++;
      logger.debug('FCM message sent', { messageId: result.value });
    } else {
      errorCount++;
      const err = result.reason;
      const code = err?.errorInfo?.code || err?.code || 'unknown';

      logger.error('FCM send error', {
        token: tokenStrings[i]?.substring(0, 20) + '...',
        code,
        message: err?.message,
      });

      // Remove tokens that are no longer registered on the device
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        await removeInvalidToken(tokenStrings[i]);
      }
    }
  }

  logger.info('FCM direct notifications sent', {
    total: tokenStrings.length,
    successCount,
    errorCount,
  });

  return {
    success: successCount > 0,
    stats: { total: tokenStrings.length, success: successCount, errors: errorCount },
  };
}

// ---------------------------------------------------------------------------
// sendPushNotifications  — unified router (splits by tokenType)
// Accepts an array of { token, tokenType } objects.
// ---------------------------------------------------------------------------
async function sendPushNotifications(tokenObjects, title, body, data = {}) {
  if (!Array.isArray(tokenObjects) || tokenObjects.length === 0) {
    logger.warn('No tokens provided for notification');
    return { success: false, error: 'No tokens provided' };
  }

  // Normalise title/body
  title = typeof title === 'string' && title.trim().length > 0 ? title : 'Notification';
  body = typeof body === 'string' ? body : '';

  const validation = validateNotificationMessage(title, body, data);
  if (!validation.valid) {
    logger.warn('Notification message validation failed', { errors: validation.errors });
    return { success: false, error: validation.errors.join('; ') };
  }

  // Split by token type
  const expoTokenStrings = tokenObjects
    .filter(t => (t.tokenType || 'expo') === 'expo')
    .map(t => t.token);

  const fcmTokenStrings = tokenObjects
    .filter(t => t.tokenType === 'fcm')
    .map(t => t.token);

  logger.info('Routing notifications', {
    expo: expoTokenStrings.length,
    fcm: fcmTokenStrings.length,
    title,
  });

  const [expoResult, fcmResult] = await Promise.all([
    expoTokenStrings.length > 0
      ? sendExpoNotifications(expoTokenStrings, title, body, data)
      : Promise.resolve(null),
    fcmTokenStrings.length > 0
      ? sendFCMNotifications(fcmTokenStrings, title, body, data)
      : Promise.resolve(null),
  ]);

  // Merge results
  const overallSuccess =
    (expoResult === null || expoResult.success) &&
    (fcmResult === null || fcmResult.success);

  const mergedStats = {
    expo: expoResult?.stats || null,
    fcm: fcmResult?.stats || null,
  };

  return {
    success: overallSuccess,
    stats: mergedStats,
    tickets: expoResult?.tickets || [],
  };
}

// ---------------------------------------------------------------------------
// sendPushNotification  — single Expo token (kept for legacy callers)
// ---------------------------------------------------------------------------
async function sendPushNotification(token, title, body, data = {}) {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Invalid token format' };
  }

  title = typeof title === 'string' && title.trim().length > 0 ? title : 'Notification';
  body = typeof body === 'string' ? body : '';

  if (!Expo.isExpoPushToken(token)) {
    logger.warn('sendPushNotification called with non-Expo token; use sendFCMNotifications for FCM tokens');
    return { success: false, error: 'Invalid Expo push token format' };
  }

  return sendExpoNotifications([token], title, body, data);
}

// ---------------------------------------------------------------------------
// sendNotificationToUser  — fetches tokens for one user and routes
// ---------------------------------------------------------------------------
async function sendNotificationToUser(userId, title, body, data = {}) {
  if (!userId) {
    logger.warn('sendNotificationToUser called with invalid userId', { userId });
    return { success: false, error: 'Invalid user ID' };
  }

  logger.info('Preparing notification for user', { userId: userId.toString(), title });

  const tokens = await PushToken.find({ userId, isActive: true }).select('token platform tokenType');

  if (tokens.length === 0) {
    logger.warn('No active tokens found for user', { userId: userId.toString() });
    return { success: false, error: 'No active tokens for user' };
  }

  const tokenObjects = tokens.map(t => ({
    token: t.token,
    tokenType: t.tokenType || 'expo',
  }));

  logger.info('Sending notification to user', {
    userId: userId.toString(),
    deviceCount: tokenObjects.length,
    platforms: [...new Set(tokens.map(t => t.platform))],
    title,
  });

  const result = await sendPushNotifications(tokenObjects, title, body, data);

  logger.info('Notification result for user', {
    userId: userId.toString(),
    success: result.success,
    stats: result.stats,
  });

  return result;
}

// ---------------------------------------------------------------------------
// sendNotificationToUsers  — fetches tokens for multiple users and routes
// ---------------------------------------------------------------------------
async function sendNotificationToUsers(userIds, title, body, data = {}) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    logger.warn('sendNotificationToUsers called with invalid userIds');
    return { success: false, error: 'Invalid user IDs array' };
  }

  logger.info('Preparing notification for multiple users', { userCount: userIds.length, title });

  const tokens = await PushToken.find({
    userId: { $in: userIds },
    isActive: true,
  }).select('token platform tokenType userId');

  if (tokens.length === 0) {
    logger.warn('No active tokens found for users', { userCount: userIds.length });
    return { success: false, error: 'No active tokens found' };
  }

  const tokenObjects = tokens.map(t => ({
    token: t.token,
    tokenType: t.tokenType || 'expo',
  }));

  const uniqueUsers = new Set(tokens.map(t => t.userId.toString())).size;

  logger.info('Sending notification to multiple users', {
    userCount: userIds.length,
    usersWithTokens: uniqueUsers,
    totalDevices: tokenObjects.length,
    platforms: [...new Set(tokens.map(t => t.platform))],
    title,
  });

  const result = await sendPushNotifications(tokenObjects, title, body, data);

  logger.info('Notification result for multiple users', {
    userCount: userIds.length,
    usersWithTokens: uniqueUsers,
    success: result.success,
    stats: result.stats,
  });

  return result;
}

// ---------------------------------------------------------------------------
// Utility helpers (unchanged signatures — consumed by controllers)
// ---------------------------------------------------------------------------

async function getActiveTokensForUser(userId) {
  return PushToken.find({ userId, isActive: true });
}

async function getActiveTokensForUsers(userIds) {
  return PushToken.find({ userId: { $in: userIds }, isActive: true });
}

async function getAllUserIds() {
  const users = await User.find({}, '_id');
  return users.map(u => u._id);
}

async function getUserIdsByCourse(courseId) {
  const course = await Course.findById(courseId);
  if (!course) throw new Error('Course not found');

  const enrollments = await Enrollment.find({ course: courseId, status: 'active' }).select('student');
  return enrollments.map(e => e.student);
}

async function getUserIdsByGroup(groupId) {
  const group = await Group.findById(groupId).select('students');
  if (!group) throw new Error('Group not found');
  return group.students || [];
}

async function getUserIdsByIds(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error('Student IDs must be a non-empty array');
  }

  const users = await User.find({ _id: { $in: studentIds }, role: 'student' }).select('_id');

  if (users.length !== studentIds.length) {
    const foundIds = users.map(u => u._id.toString());
    const invalidIds = studentIds.filter(id => !foundIds.includes(id.toString()));
    throw new Error(`Invalid student IDs: ${invalidIds.join(', ')}`);
  }

  return users.map(u => u._id);
}

async function checkAndSendPaymentReminder(enrollment, installment, paymentType = 'course') {
  if (!installment || installment.status !== 'pending') {
    return { success: false, error: 'Installment not pending' };
  }

  const now = new Date();
  const dueDate = new Date(installment.dueDate);
  const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

  if (daysUntilDue > 3) {
    return { success: false, error: 'Installment not due soon enough' };
  }

  try {
    let title, body;
    const formattedAmount = `${installment.amount.toLocaleString()} S.P.`;
    const courseTitle = enrollment.course?.title || 'your course';
    const formattedDueDate = dueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    if (daysUntilDue < 0) {
      title = 'Payment Overdue';
      body = `Payment of ${formattedAmount} for ${courseTitle} is overdue. Please pay as soon as possible.`;
    } else if (daysUntilDue === 0) {
      title = 'Payment Due Today';
      body = `Payment of ${formattedAmount} for ${courseTitle} is due today.`;
    } else if (daysUntilDue === 1) {
      title = 'Payment Due Tomorrow';
      body = `Payment of ${formattedAmount} for ${courseTitle} is due tomorrow.`;
    } else {
      title = 'Payment Due Soon';
      body = `Payment of ${formattedAmount} for ${courseTitle} is due on ${formattedDueDate}.`;
    }

    const notificationData = {
      type: daysUntilDue < 0 ? 'payment_overdue' : 'payment_due',
      enrollmentId: enrollment._id.toString(),
      courseId: enrollment.course?._id?.toString() || null,
      installmentId: installment._id?.toString() || null,
      dueDate: dueDate.toISOString(),
      amount: installment.amount,
      daysUntilDue,
      paymentType,
      screen: 'payments',
    };

    const result = await sendNotificationToUser(
      enrollment.student._id || enrollment.student,
      title,
      body,
      notificationData
    );

    if (result.success) {
      logger.info(`Payment reminder sent to student ${enrollment.student._id || enrollment.student}`, {
        enrollmentId: enrollment._id,
        installmentId: installment._id,
        daysUntilDue,
        paymentType,
      });
    }

    return result;
  } catch (error) {
    logger.error(`Failed to send payment reminder: ${error.message}`, { enrollmentId: enrollment._id, error });
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendPushNotifications,
  sendNotificationToUser,
  sendNotificationToUsers,
  removeInvalidToken,
  getActiveTokensForUser,
  getActiveTokensForUsers,
  getAllUserIds,
  getUserIdsByCourse,
  getUserIdsByGroup,
  getUserIdsByIds,
  checkAndSendPaymentReminder,
};
