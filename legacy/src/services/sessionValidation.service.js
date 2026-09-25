/**
 * Session Validation Service
 * 
 * Handles time window validation and overlap checking
 */

const SessionRequest = require('../models/SessionRequest');
const { BadRequestError } = require('../utils/errors');

/**
 * Validate time window (11:00 - 19:00)
 * @param {string} startTime - Time in HH:mm format (e.g., "14:30")
 * @param {number} durationHours - Duration in hours
 * @throws {BadRequestError} if time window is invalid
 */
function validateTimeWindow(startTime, durationHours) {
  // Parse start time
  const [hours, minutes] = startTime.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new BadRequestError('Invalid time format. Use HH:mm format (e.g., 14:30)', 'INVALID_TIME_FORMAT');
  }

  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + (durationHours * 60);

  // Check start time is between 11:00 (660 minutes) and 19:00 (1140 minutes)
  if (startMinutes < 660 || startMinutes >= 1140) {
    throw new BadRequestError(
      'Start time must be between 11:00 and 19:00',
      'TIME_WINDOW_VIOLATION'
    );
  }

  // Check end time does not exceed 19:00 (1140 minutes)
  if (endMinutes > 1140) {
    throw new BadRequestError(
      'Session end time cannot exceed 19:00. Please reduce duration or choose an earlier start time.',
      'TIME_WINDOW_VIOLATION'
    );
  }
}

/**
 * Check for overlapping sessions
 * @param {string} userId - User ID
 * @param {Date} date - Session date
 * @param {string} startTime - Start time in HH:mm format
 * @param {number} durationHours - Duration in hours
 * @param {string} excludeRequestId - Request ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if overlap exists
 */
async function checkOverlap(userId, date, startTime, durationHours, excludeRequestId = null) {
  // Parse start and end times
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = startTotalMinutes + (durationHours * 60);

  // Find all pending or approved sessions for this user on this date
  const query = {
    userId,
    date: new Date(date),
    status: { $in: ['pending', 'approved'] }
  };

  if (excludeRequestId) {
    query._id = { $ne: excludeRequestId };
  }

  const existingRequests = await SessionRequest.find(query);

  // Check for overlaps
  for (const request of existingRequests) {
    const [reqStartHours, reqStartMinutes] = request.startTime.split(':').map(Number);
    const reqStartTotalMinutes = reqStartHours * 60 + reqStartMinutes;
    const reqEndTotalMinutes = reqStartTotalMinutes + (request.durationHours * 60);

    // Check if time ranges overlap
    // Overlap occurs if: start < other.end AND end > other.start
    if (startTotalMinutes < reqEndTotalMinutes && endTotalMinutes > reqStartTotalMinutes) {
      return true; // Overlap found
    }
  }

  return false; // No overlap
}

/**
 * Validate and check for overlaps
 * @param {string} userId - User ID
 * @param {Date} date - Session date
 * @param {string} startTime - Start time in HH:mm format
 * @param {number} durationHours - Duration in hours
 * @param {string} excludeRequestId - Request ID to exclude (optional)
 * @throws {BadRequestError} if validation fails or overlap exists
 */
async function validateSessionTime(userId, date, startTime, durationHours, excludeRequestId = null) {
  // Validate time window
  validateTimeWindow(startTime, durationHours);

  // Check for overlaps
  const hasOverlap = await checkOverlap(userId, date, startTime, durationHours, excludeRequestId);
  
  if (hasOverlap) {
    throw new BadRequestError(
      'You already have a session scheduled at this time. Please choose a different time.',
      'SESSION_OVERLAP'
    );
  }
}

module.exports = {
  validateTimeWindow,
  checkOverlap,
  validateSessionTime
};
