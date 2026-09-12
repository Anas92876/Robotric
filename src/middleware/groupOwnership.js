/**
 * Group Ownership Middleware
 * 
 * Verifies that a trainer owns a group or that a user is a member of a group
 */

const Group = require('../models/Group');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verify that the authenticated trainer owns the specified group
 */
const requireGroupOwnership = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const groupId = req.params.groupId || req.body.groupId || req.query.groupId;

  if (!groupId) {
    throw new ForbiddenError('Group ID is required', 'GROUP_ID_REQUIRED');
  }

  // Only trainers can own groups
  if (userRole !== 'trainer' && userRole !== 'admin' && userRole !== 'superadmin') {
    throw new ForbiddenError('Only trainers can own groups', 'NOT_TRAINER');
  }

  const group = await Group.findById(groupId);
  
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  // Check if user is the trainer of this group
  if (group.trainerId.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  req.group = group;
  next();
});

/**
 * Verify that the authenticated user is a member of the specified group
 */
const requireGroupMembership = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  const groupId = req.params.groupId || req.body.groupId || req.query.groupId;

  if (!groupId) {
    throw new ForbiddenError('Group ID is required', 'GROUP_ID_REQUIRED');
  }

  const group = await Group.findById(groupId);
  
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  // Check if user is the trainer
  if (group.trainerId.toString() === userId.toString()) {
    req.group = group;
    return next();
  }

  // Check if user is a student in the group
  const isStudent = group.students.some(
    studentId => studentId.toString() === userId.toString()
  );

  if (!isStudent) {
    throw new ForbiddenError('You are not a member of this group', 'GROUP_MEMBERSHIP_REQUIRED');
  }

  req.group = group;
  next();
});

module.exports = {
  requireGroupOwnership,
  requireGroupMembership
};
