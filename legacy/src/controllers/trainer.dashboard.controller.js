/**
 * Trainer Dashboard Controller
 *
 * Handles all dashboard-related operations for trainers including:
 * - Dashboard statistics
 * - Today's schedule
 * - Recent activities
 * - Notifications
 * - Overview analytics
 *
 * @controller TrainerDashboardController
 */

const Group = require('../models/Group');
const Session = require('../models/Session');
const SessionEvaluation = require('../models/SessionEvaluation');
const Attendance = require('../models/Attendance');
const TrainerResource = require('../models/TrainerResource');

/**
 * Get Dashboard Statistics
 * @route GET /api/trainer/dashboard/stats
 * @access Private (Trainer only)
 * @returns {Object} Dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const trainerId = req.user._id || req.user.id;

    // Get current date/time information
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Parallel queries for better performance
    const [
      activeGroups,
      todaysSessions,
      weekSessions,
      totalStudents,
      recentEvaluations,
      upcomingSessions
    ] = await Promise.all([
      // Active groups count
      Group.countDocuments({
        trainerId,
        status: 'active'
      }),

      // Today's sessions
      Session.find({
        trainerId,
        scheduledDate: {
          $gte: today,
          $lt: tomorrow
        },
        status: { $ne: 'cancelled' }
      }).populate('groupId', 'name'),

      // This week's sessions
      Session.countDocuments({
        trainerId,
        scheduledDate: {
          $gte: weekStart,
          $lt: weekEnd
        },
        status: { $ne: 'cancelled' }
      }),

      // Total unique students across all groups
      Group.aggregate([
        { $match: { trainerId: trainerId, status: 'active' } },
        { $unwind: '$students' },
        { $group: { _id: '$students' } },
        { $count: 'total' }
      ]),

      // Recent evaluations for trend
      SessionEvaluation.find({ trainerId })
        .sort({ evaluationDate: -1 })
        .limit(5)
        .select('overallRating engagementLevel'),

      // Upcoming sessions count
      Session.countDocuments({
        trainerId,
        scheduledDate: { $gte: now },
        status: 'scheduled'
      })
    ]);

    // Calculate average rating from recent evaluations
    let averageRating = 0;
    if (recentEvaluations.length > 0) {
      const totalRating = recentEvaluations.reduce((sum, eval) => sum + eval.overallRating, 0);
      averageRating = (totalRating / recentEvaluations.length).toFixed(1);
    }

    // Count today's completed sessions
    const completedToday = todaysSessions.filter(s => s.status === 'completed').length;

    // Build response
    const stats = {
      activeGroups,
      todaysSessions: todaysSessions.length,
      completedToday,
      weekSessions,
      totalStudents: totalStudents.length > 0 ? totalStudents[0].total : 0,
      upcomingSessions,
      averageRating: parseFloat(averageRating),
      todaysSessionsList: todaysSessions.map(session => ({
        _id: session._id,
        title: session.title,
        groupName: session.groupId?.name || 'Unknown Group',
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        location: session.location
      }))
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
    });
  }
};

/**
 * Get Today's Schedule
 * @route GET /api/trainer/dashboard/schedule
 * @access Private (Trainer only)
 * @returns {Array} Today's sessions with details
 */
exports.getTodaysSchedule = async (req, res) => {
  try {
    const trainerId = req.user._id || req.user.id;

    const sessions = await Session.getTodaysSessions(trainerId);

    // Enrich with attendance info
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const attendance = await Attendance.findOne({
          course: session.courseId,
          'session.date': session.scheduledDate
        });

        return {
          _id: session._id,
          title: session.title,
          description: session.description,
          groupName: session.groupId?.name || 'Unknown',
          courseName: session.courseId?.title || 'Unknown',
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.duration,
          location: session.location,
          type: session.type,
          status: session.status,
          studentsCount: session.groupId?.students?.length || 0,
          attendanceMarked: attendance ? true : false,
          attendanceId: attendance?._id || null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedSessions
    });

  } catch (error) {
    console.error('Error fetching today\'s schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s schedule',
    });
  }
};

/**
 * Get Recent Activities
 * @route GET /api/trainer/dashboard/activities
 * @access Private (Trainer only)
 * @returns {Array} Recent activities
 */
exports.getRecentActivities = async (req, res) => {
  try {
    const trainerId = req.user._id || req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const activities = [];

    // Get recent sessions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await Session.find({
      trainerId,
      scheduledDate: { $gte: sevenDaysAgo },
      status: 'completed'
    })
      .sort({ actualEndTime: -1 })
      .limit(10)
      .populate('groupId', 'name')
      .select('title groupId actualEndTime');

    recentSessions.forEach(session => {
      activities.push({
        type: 'session_completed',
        icon: 'CheckCircle',
        title: 'Session Completed',
        description: `${session.title} - ${session.groupId?.name || 'Unknown Group'}`,
        timestamp: session.actualEndTime,
        link: `/trainer/sessions/${session._id}`
      });
    });

    // Get recent evaluations
    const recentEvaluations = await SessionEvaluation.find({ trainerId })
      .sort({ evaluationDate: -1 })
      .limit(5)
      .populate('sessionId', 'title')
      .populate('groupId', 'name')
      .select('sessionId groupId evaluationDate overallRating');

    recentEvaluations.forEach(evaluation => {
      activities.push({
        type: 'evaluation_submitted',
        icon: 'FileText',
        title: 'Session Evaluated',
        description: `${evaluation.sessionId?.title || 'Session'} - Rating: ${evaluation.overallRating}/5`,
        timestamp: evaluation.evaluationDate,
        link: `/trainer/evaluations/${evaluation._id}`
      });
    });

    // Get recent resource uploads
    const recentResources = await TrainerResource.find({
      trainerId,
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt fileType');

    recentResources.forEach(resource => {
      activities.push({
        type: 'resource_uploaded',
        icon: 'Upload',
        title: 'Resource Uploaded',
        description: `${resource.title} (${resource.fileType})`,
        timestamp: resource.createdAt,
        link: `/trainer/resources/${resource._id}`
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit the results
    const limitedActivities = activities.slice(0, limit);

    res.status(200).json({
      success: true,
      data: limitedActivities
    });

  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
    });
  }
};

/**
 * Get Notifications
 * @route GET /api/trainer/dashboard/notifications
 * @access Private (Trainer only)
 * @returns {Array} Notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const trainerId = req.user._id || req.user.id;
    const notifications = [];

    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Check for upcoming sessions today
    const upcomingToday = await Session.find({
      trainerId,
      scheduledDate: { $lte: todayEnd },
      status: 'scheduled'
    })
      .populate('groupId', 'name')
      .select('title groupId startTime')
      .limit(5);

    upcomingToday.forEach(session => {
      notifications.push({
        type: 'upcoming_session',
        priority: 'high',
        icon: 'Clock',
        title: 'Upcoming Session',
        message: `${session.title} at ${session.startTime}`,
        data: { sessionId: session._id },
        createdAt: new Date()
      });
    });

    // Check for sessions without evaluations (completed in last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const unevaluatedSessions = await Session.find({
      trainerId,
      status: 'completed',
      actualEndTime: { $gte: threeDaysAgo },
      evaluationId: null
    })
      .populate('groupId', 'name')
      .select('title groupId actualEndTime')
      .limit(5);

    unevaluatedSessions.forEach(session => {
      notifications.push({
        type: 'evaluation_pending',
        priority: 'medium',
        icon: 'AlertCircle',
        title: 'Evaluation Pending',
        message: `Please evaluate: ${session.title}`,
        data: { sessionId: session._id },
        createdAt: session.actualEndTime
      });
    });

    // Check for groups with low attendance
    const groups = await Group.find({
      trainerId,
      status: 'active'
    })
      .select('name stats')
      .limit(10);

    groups.forEach(group => {
      if (group.stats.averageAttendance < 70 && group.stats.averageAttendance > 0) {
        notifications.push({
          type: 'low_attendance',
          priority: 'medium',
          icon: 'Users',
          title: 'Low Attendance Alert',
          message: `${group.name} has ${group.stats.averageAttendance}% attendance`,
          data: { groupId: group._id },
          createdAt: new Date()
        });
      }
    });

    // Sort by priority and date
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    notifications.sort((a, b) => {
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
};

/**
 * Get Overview Analytics
 * @route GET /api/trainer/dashboard/overview
 * @access Private (Trainer only)
 * @returns {Object} Overview analytics
 */
exports.getOverview = async (req, res) => {
  try {
    const trainerId = req.user._id || req.user.id;

    // Get all groups
    const groups = await Group.find({ trainerId, status: 'active' })
      .populate('courseId', 'title category');

    // Get evaluation statistics
    const evalStats = await SessionEvaluation.getTrainerStats(trainerId);

    // Get total sessions stats
    const totalSessions = await Session.countDocuments({ trainerId });
    const completedSessions = await Session.countDocuments({ trainerId, status: 'completed' });
    const cancelledSessions = await Session.countDocuments({ trainerId, status: 'cancelled' });

    // Get resource statistics
    const resourceStats = await TrainerResource.getTrainerStats(trainerId);

    // Calculate overall metrics
    const overview = {
      groups: {
        total: groups.length,
        byCategory: {}
      },
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        cancelled: cancelledSessions,
        completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
      },
      evaluations: evalStats,
      resources: resourceStats,
      performance: {
        averageRating: evalStats.averageRating || 0,
        averageEngagement: evalStats.averageEngagement || 0,
        averageObjectivesAchievement: evalStats.averageObjectivesAchievement || 0
      }
    };

    // Count groups by category
    groups.forEach(group => {
      const category = group.courseId?.category || 'Other';
      if (!overview.groups.byCategory[category]) {
        overview.groups.byCategory[category] = 0;
      }
      overview.groups.byCategory[category]++;
    });

    res.status(200).json({
      success: true,
      data: overview
    });

  } catch (error) {
    console.error('Error fetching overview analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview analytics',
    });
  }
};
