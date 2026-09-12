/**
 * Trainer Groups Controller
 *
 * Handles all group management operations for trainers including:
 * - Creating, reading, updating, deleting groups
 * - Managing student enrollment
 * - Group statistics and analytics
 *
 * @controller TrainerGroupsController
 */

const Group = require('../models/Group');
const Session = require('../models/Session');
const Course = require('../models/Course');
const User = require('../models/User');
const GroupChat = require('../models/GroupChat');

/**
 * Get All Trainer's Groups
 * @route GET /api/trainer/groups
 * @access Private (Trainer only)
 * @returns {Array} List of groups
 */
exports.getAllGroups = async (req, res) => {
  try {
    const trainerId = req.user._id || req.user.id;
    const { status, courseId, search } = req.query;

    // Build query
    const query = { trainerId };

    if (status) {
      query.status = status;
    }

    if (courseId) {
      query.courseId = courseId;
    }

    let groups = await Group.find(query)
      .populate('courseId', 'title category level thumbnail')
      .populate('students', 'name email')
      .sort({ createdAt: -1 });

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      groups = groups.filter(group =>
        group.name.toLowerCase().includes(searchLower) ||
        group.description?.toLowerCase().includes(searchLower) ||
        group.courseId?.title.toLowerCase().includes(searchLower)
      );
    }

    // Enrich each group with live-calculated progress and attendance stats
    const Attendance = require('../models/Attendance');
    const enrichedGroups = await Promise.all(groups.map(async (group) => {
      const [sessions, attendanceRecords] = await Promise.all([
        Session.find({ groupId: group._id }),
        Attendance.find({ groupId: group._id })
      ]);

      const totalSessions = sessions.length;
      const completedSessionsCount = sessions.filter(s => s.getAutoStatus() === 'completed').length;
      const percentageComplete = totalSessions > 0
        ? Math.round((completedSessionsCount / totalSessions) * 100)
        : 0;

      let averageAttendance = 0;
      if (attendanceRecords.length > 0) {
        const totalRate = attendanceRecords.reduce((sum, record) => {
          const total = record.records.length;
          if (total === 0) return sum;
          const attended = record.records.filter(
            r => r.status === 'present' || r.status === 'late'
          ).length;
          return sum + (attended / total) * 100;
        }, 0);
        averageAttendance = Math.round(totalRate / attendanceRecords.length);
      }

      return {
        ...group.toObject(),
        progress: { completedSessions: completedSessionsCount, totalSessions, percentageComplete },
        stats: { ...group.toObject().stats, averageAttendance }
      };
    }));

    res.status(200).json({
      success: true,
      count: enrichedGroups.length,
      data: enrichedGroups
    });

  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch groups',
    });
  }
};

/**
 * Get Single Group Details
 * @route GET /api/trainer/groups/:groupId
 * @access Private (Trainer only)
 * @returns {Object} Group details
 */
exports.getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const trainerId = req.user._id || req.user.id;

    const group = await Group.findOne({ _id: groupId, trainerId })
      .populate('courseId')
      .populate('students', 'name email role profile');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Get all sessions and compute stats using time-based auto-status
    const Attendance = require('../models/Attendance');
    const [sessions, attendanceRecords, nextSession] = await Promise.all([
      Session.find({ groupId }).sort({ sessionNumber: 1 }),
      Attendance.find({ groupId }),
      Session.findOne({
        groupId,
        scheduledDate: { $gte: new Date() }
      }).sort({ scheduledDate: 1, startTime: 1 })
    ]);

    const totalSessions = sessions.length;

    // Use getAutoStatus() so sessions are counted as completed as soon as their end time passes
    const completedSessionsCount = sessions.filter(s => s.getAutoStatus() === 'completed').length;
    const percentageComplete = totalSessions > 0
      ? Math.round((completedSessionsCount / totalSessions) * 100)
      : 0;

    // Calculate average attendance from actual Attendance records
    let averageAttendance = 0;
    if (attendanceRecords.length > 0) {
      const totalRate = attendanceRecords.reduce((sum, record) => {
        const total = record.records.length;
        if (total === 0) return sum;
        const attended = record.records.filter(
          r => r.status === 'present' || r.status === 'late'
        ).length;
        return sum + (attended / total) * 100;
      }, 0);
      averageAttendance = Math.round(totalRate / attendanceRecords.length);
    }

    const groupData = {
      ...group.toObject(),
      // Override stale stored fields with live-calculated values
      progress: {
        completedSessions: completedSessionsCount,
        totalSessions,
        percentageComplete
      },
      stats: {
        ...group.toObject().stats,
        averageAttendance
      },
      sessionStats: {
        total: totalSessions,
        completed: completedSessionsCount,
        upcoming: sessions.filter(s => {
          const st = s.getAutoStatus();
          return st === 'scheduled' || st === 'in_progress';
        }).length
      },
      nextSession: nextSession ? {
        _id: nextSession._id,
        title: nextSession.title,
        scheduledDate: nextSession.scheduledDate,
        startTime: nextSession.startTime,
        endTime: nextSession.endTime
      } : null
    };

    res.status(200).json({
      success: true,
      data: groupData
    });

  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group details',
    });
  }
};

/**
 * Create New Group
 * @route POST /api/trainer/groups
 * @access Private (Trainer only)
 * @body {Object} Group data
 * @returns {Object} Created group
 */
exports.createGroup = async (req, res) => {
  try {
    const trainerId = req.user._id || req.user.id;

    const {
      name,
      description,
      courseId,
      schedule,
      startDate,
      endDate,
      maxStudents,
      thumbnail,
      color
    } = req.body;

    // Validate required fields
    if (!name || !courseId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, courseId, startDate, and endDate are required'
      });
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Create group
    const group = await Group.create({
      name,
      description,
      courseId,
      trainerId,
      schedule: schedule || [],
      startDate,
      endDate,
      maxStudents: maxStudents || 30,
      thumbnail: thumbnail || course.thumbnail,
      color: color || '#30c59b',
      status: 'active'
    });

    // Create group chat with empty messages
    await GroupChat.create({
      groupId: group._id,
      name: `${name} Chat`,
      participants: [
        {
          userId: trainerId,
          role: 'trainer',
          joinedAt: new Date()
        }
      ],
      messages: [], // Explicitly initialize empty messages array
      pinnedMessages: [],
      stats: {
        totalMessages: 0,
        totalFiles: 0,
        totalParticipants: 1
      }
    });

    // Populate before sending response
    await group.populate('courseId', 'title category level');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group
    });

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group',
    });
  }
};

/**
 * Update Group
 * @route PUT /api/trainer/groups/:groupId
 * @access Private (Trainer only)
 * @body {Object} Updated group data
 * @returns {Object} Updated group
 */
exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const trainerId = req.user._id || req.user.id;

    const group = await Group.findOne({ _id: groupId, trainerId });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Fields that can be updated
    const allowedUpdates = [
      'name',
      'description',
      'schedule',
      'maxStudents',
      'thumbnail',
      'color',
      'status',
      'endDate'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        group[field] = req.body[field];
      }
    });

    await group.save();
    await group.populate('courseId', 'title category level');

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: group
    });

  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group',
    });
  }
};

/**
 * Delete/Archive Group
 * @route DELETE /api/trainer/groups/:groupId
 * @access Private (Trainer only)
 * @returns {Object} Success message
 */
exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const trainerId = req.user._id || req.user.id;
    const { permanent } = req.query; // ?permanent=true for hard delete

    const group = await Group.findOne({ _id: groupId, trainerId });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (permanent === 'true') {
      // Hard delete - remove completely
      await Group.findByIdAndDelete(groupId);

      // Also delete the associated group chat
      await GroupChat.findOneAndDelete({ groupId });

      res.status(200).json({
        success: true,
        message: 'Group permanently deleted'
      });
    } else {
      // Soft delete - archive
      group.status = 'archived';
      await group.save();

      res.status(200).json({
        success: true,
        message: 'Group archived successfully',
        data: group
      });
    }

  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete group',
    });
  }
};

/**
 * Add Student to Group
 * @route POST /api/trainer/groups/:groupId/students
 * @access Private (Trainer only)
 * @body {String} studentId
 * @returns {Object} Updated group
 */
exports.addStudentToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { studentId } = req.body;
    const trainerId = req.user._id || req.user.id;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    // Find group
    const group = await Group.findOne({ _id: groupId, trainerId });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Verify student exists and is a student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Valid student not found'
      });
    }

    // Add student using model method
    await group.addStudent(studentId);

    // Add student to group chat
    const groupChat = await GroupChat.findOne({ groupId });
    if (groupChat) {
      await groupChat.addParticipant(studentId, 'student');
    }

    await group.populate('students', 'name email');

    res.status(200).json({
      success: true,
      message: 'Student added to group successfully',
      data: group
    });

  } catch (error) {
    console.error('Error adding student:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add student to group'
    });
  }
};

/**
 * Remove Student from Group
 * @route DELETE /api/trainer/groups/:groupId/students/:studentId
 * @access Private (Trainer only)
 * @returns {Object} Updated group
 */
exports.removeStudentFromGroup = async (req, res) => {
  try {
    const { groupId, studentId } = req.params;
    const trainerId = req.user._id || req.user.id;

    const group = await Group.findOne({ _id: groupId, trainerId });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Remove student using model method
    await group.removeStudent(studentId);

    // Remove from group chat
    const groupChat = await GroupChat.findOne({ groupId });
    if (groupChat) {
      await groupChat.removeParticipant(studentId);
    }

    await group.populate('students', 'name email');

    res.status(200).json({
      success: true,
      message: 'Student removed from group successfully',
      data: group
    });

  } catch (error) {
    console.error('Error removing student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove student from group',
    });
  }
};

/**
 * Get Group Statistics
 * @route GET /api/trainer/groups/:groupId/stats
 * @access Private (Trainer only)
 * @returns {Object} Group statistics
 */
exports.getGroupStats = async (req, res) => {
  try {
    const { groupId } = req.params;
    const trainerId = req.user._id || req.user.id;

    const group = await Group.findOne({ _id: groupId, trainerId });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Update group statistics
    await group.updateStats();

    // Get session statistics
    const sessions = await Session.find({ groupId });

    const sessionStats = {
      total: sessions.length,
      completed: sessions.filter(s => s.status === 'completed').length,
      upcoming: sessions.filter(s => s.status === 'scheduled' && s.scheduledDate >= new Date()).length,
      cancelled: sessions.filter(s => s.status === 'cancelled').length
    };

    const stats = {
      students: {
        enrolled: group.students.length,
        capacity: group.maxStudents,
        utilizationRate: Math.round((group.students.length / group.maxStudents) * 100)
      },
      sessions: sessionStats,
      attendance: {
        average: group.stats.averageAttendance
      },
      performance: {
        average: group.stats.averagePerformance
      },
      progress: {
        completedSessions: group.progress.completedSessions,
        totalSessions: group.progress.totalSessions,
        percentage: group.progress.percentageComplete
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching group stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group statistics',
    });
  }
};

/**
 * Get Group Students with Details
 * @route GET /api/trainer/groups/:groupId/students
 * @access Private (Trainer only)
 * @returns {Array} List of students with performance data
 */
exports.getGroupStudents = async (req, res) => {
  try {
    const { groupId } = req.params;
    const trainerId = req.user._id || req.user.id;

    const group = await Group.findOne({ _id: groupId, trainerId })
      .populate({
        path: 'students',
        select: 'name email profile createdAt'
      })
      .populate('courseId', 'title');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Filter out null students (deleted students still in array)
    const validStudents = group.students.filter(student => student != null);

    // Enrich student data with attendance and performance
    const enrichedStudents = await Promise.all(
      validStudents.map(async (student) => {
        // Only get attendance if courseId exists
        let attendanceSummary = {
          percentage: 0,
          present: 0,
          absent: 0,
          late: 0,
          totalSessions: 0
        };

        if (group.courseId && group.courseId._id) {
          try {
            attendanceSummary = await require('../models/Attendance').getStudentSummary(
              group.courseId._id,
              student._id
            );
          } catch (err) {
            console.error('Error fetching attendance summary:', err);
            // Use default values if attendance fetch fails
          }
        }

        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          profile: student.profile,
          attendance: {
            percentage: attendanceSummary.percentage || 0,
            present: attendanceSummary.present || 0,
            absent: attendanceSummary.absent || 0,
            late: attendanceSummary.late || 0,
            total: attendanceSummary.totalSessions || 0
          },
          enrolledAt: student.createdAt
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedStudents
    });

  } catch (error) {
    console.error('Error fetching group students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group students',
    });
  }
};

/**
 * Get All Available Courses
 * @route GET /api/trainer/courses
 * @access Private (Trainer only)
 * @returns {Array} List of available courses
 */
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: 'published' })
      .select('title category level description thumbnail')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: courses
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
    });
  }
};
