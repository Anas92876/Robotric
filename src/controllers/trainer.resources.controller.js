const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const Resource = require('../models/Resource');
const ResourceAssignment = require('../models/ResourceAssignment');
const Group = require('../models/Group');
const mongoose = require('mongoose');

/**
 * @desc  Get all resources assigned to the trainer's groups
 * @route GET /api/trainer/resources
 * @access Private (Trainer, Teacher)
 */
exports.getTrainerResources = asyncHandler(async (req, res) => {
  const trainerId = req.user._id;
  const { groupId, search } = req.query;

  // Get all groups belonging to this trainer
  const groupQuery = { trainerId, status: 'active' };
  if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
    groupQuery._id = groupId;
  }

  const trainerGroups = await Group.find(groupQuery)
    .populate('courseId', 'title category')
    .lean();

  if (trainerGroups.length === 0) {
    return res.json({ success: true, count: 0, data: [] });
  }

  const groupIds = trainerGroups.map(g => g._id);

  // Find all assignments for these groups
  const assignments = await ResourceAssignment.find({
    groupId: { $in: groupIds },
    isVisible: true
  })
    .populate('sessionId', 'sessionNumber title scheduledDate startTime endTime')
    .lean();

  if (assignments.length === 0) {
    return res.json({ success: true, count: 0, data: [] });
  }

  // Get unique resource IDs from assignments
  const resourceIds = [...new Set(assignments.map(a => a.resourceId.toString()))];

  // Fetch resources
  const resourceQuery = {
    _id: { $in: resourceIds },
    status: 'active'
  };
  if (search) {
    resourceQuery.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const resources = await Resource.find(resourceQuery)
    .populate('courseId', 'title category')
    .populate('uploadedBy', 'name')
    .lean();

  // Build group lookup map
  const groupMap = {};
  trainerGroups.forEach(g => { groupMap[g._id.toString()] = g; });

  // Attach assignment details (which groups/sessions) to each resource
  const resourcesWithDetails = resources.map(resource => {
    const resourceAssignments = assignments.filter(
      a => a.resourceId.toString() === resource._id.toString()
    );

    const byGroup = {};
    resourceAssignments.forEach(a => {
      const gId = a.groupId.toString();
      if (!byGroup[gId]) {
        const group = groupMap[gId];
        byGroup[gId] = {
          groupId: gId,
          groupName: group?.name || 'Unknown',
          courseName: group?.courseId?.title || '',
          sessions: []
        };
      }
      if (a.sessionId) {
        byGroup[gId].sessions.push({
          sessionId: a.sessionId._id,
          sessionNumber: a.sessionId.sessionNumber,
          title: a.sessionId.title,
          scheduledDate: a.sessionId.scheduledDate,
          startTime: a.sessionId.startTime,
          endTime: a.sessionId.endTime
        });
      }
    });

    return {
      ...resource,
      assignedTo: Object.values(byGroup)
    };
  });

  res.json({
    success: true,
    count: resourcesWithDetails.length,
    data: resourcesWithDetails
  });
});

/**
 * @desc  Get trainer's groups (for the filter dropdown)
 * @route GET /api/trainer/resources/groups
 * @access Private (Trainer)
 */
exports.getTrainerGroupsForResources = asyncHandler(async (req, res) => {
  const trainerId = req.user._id;

  const groups = await Group.find({ trainerId, status: 'active' })
    .populate('courseId', 'title category')
    .select('_id name courseId')
    .lean();

  res.json({ success: true, data: groups });
});
