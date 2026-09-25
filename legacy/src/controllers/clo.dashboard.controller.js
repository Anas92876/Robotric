const User = require('../models/User');
const Course = require('../models/Course');
const Group = require('../models/Group');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get dashboard statistics for TDO Admin
 * @route GET /api/tdo/dashboard
 * @access TDO Admin only
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
    // Get all trainers
    const totalTrainers = await User.countDocuments({ role: 'trainer' });
    const activeTrainers = await User.countDocuments({
      role: 'trainer',
      'profile.status': { $ne: 'inactive' }
    });

    // Get all courses
    const totalCourses = await Course.countDocuments();
    const publishedCourses = await Course.countDocuments({ status: 'published' });

    // Get all groups
    const totalGroups = await Group.countDocuments();
    const activeGroups = await Group.countDocuments({ status: 'active' });

    // Get total students
    const totalStudents = await User.countDocuments({ role: 'student' });

    // Get total enrollments
    const totalEnrollments = await Enrollment.countDocuments();
    const activeEnrollments = await Enrollment.countDocuments({ status: 'active' });

    // Calculate average attendance rate
    const attendanceRecords = await Attendance.aggregate([
      {
        $unwind: '$records'
      },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: {
              $cond: [
                { $in: ['$records.status', ['present', 'late']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const attendanceRate = attendanceRecords.length > 0
      ? ((attendanceRecords[0].presentCount / attendanceRecords[0].totalRecords) * 100).toFixed(1)
      : 0;

    // Get recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEnrollments = await Enrollment.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get course completion rate
    const completedEnrollments = await Enrollment.countDocuments({
      status: 'completed'
    });
    const completionRate = totalEnrollments > 0
      ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
      : 0;

    // Get top performing trainers (by average attendance in their groups)
    const topTrainers = await Group.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'trainerId',
          foreignField: '_id',
          as: 'trainer'
        }
      },
      {
        $unwind: '$trainer'
      },
      {
        $lookup: {
          from: 'attendances',
          let: { groupId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$group', '$$groupId']
                }
              }
            },
            {
              $unwind: '$records'
            },
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                presentCount: {
                  $sum: {
                    $cond: [
                      { $in: ['$records.status', ['present', 'late']] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ],
          as: 'attendance'
        }
      },
      {
        $group: {
          _id: '$trainerId',
          trainerName: { $first: '$trainer.name' },
          trainerEmail: { $first: '$trainer.email' },
          totalGroups: { $sum: 1 },
          attendanceData: { $push: '$attendance' }
        }
      },
      {
        $project: {
          _id: 1,
          trainerName: 1,
          trainerEmail: 1,
          totalGroups: 1,
          avgAttendance: {
            $avg: {
              $map: {
                input: '$attendanceData',
                as: 'att',
                in: {
                  $cond: [
                    { $gt: [{ $size: '$$att' }, 0] },
                    {
                      $multiply: [
                        {
                          $divide: [
                            { $arrayElemAt: ['$$att.presentCount', 0] },
                            { $arrayElemAt: ['$$att.totalRecords', 0] }
                          ]
                        },
                        100
                      ]
                    },
                    0
                  ]
                }
              }
            }
          }
        }
      },
      {
        $sort: { avgAttendance: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get recent activity (groups created, courses published)
    const recentGroups = await Group.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('courseId', 'title')
      .populate('trainerId', 'name email')
      .select('name courseId trainerId startDate status createdAt');

    const recentCourses = await Course.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('instructor', 'name email')
      .select('title category status duration createdAt');

    res.status(200).json({
      success: true,
      data: {
        stats: {
          trainers: {
            total: totalTrainers,
            active: activeTrainers,
            inactive: totalTrainers - activeTrainers
          },
          courses: {
            total: totalCourses,
            published: publishedCourses,
            draft: totalCourses - publishedCourses
          },
          groups: {
            total: totalGroups,
            active: activeGroups,
            completed: totalGroups - activeGroups
          },
          students: {
            total: totalStudents
          },
          enrollments: {
            total: totalEnrollments,
            active: activeEnrollments,
            recent: recentEnrollments
          },
          performance: {
            attendanceRate: parseFloat(attendanceRate),
            completionRate: parseFloat(completionRate)
          }
        },
        topTrainers,
        recentActivity: {
          groups: recentGroups,
          courses: recentCourses
        }
      }
    });
});

/**
 * Get analytics overview for TDO Admin
 * @route GET /api/tdo/analytics
 * @access TDO Admin only
 */
exports.getAnalyticsOverview = asyncHandler(async (req, res) => {
    const { period = '30' } = req.query; // days
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Enrollment trends
    const enrollmentTrends = await Enrollment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Attendance trends
    const attendanceTrends = await Attendance.aggregate([
      {
        $match: {
          'session.date': { $gte: startDate }
        }
      },
      {
        $unwind: '$records'
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$session.date' }
          },
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0]
            }
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Course popularity (by enrollments)
    const coursePopularity = await Enrollment.aggregate([
      {
        $group: {
          _id: '$courseId',
          enrollmentCount: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $unwind: '$course'
      },
      {
        $project: {
          _id: 1,
          courseTitle: '$course.title',
          courseCategory: '$course.category',
          enrollmentCount: 1,
          activeCount: 1,
          completedCount: 1,
          completionRate: {
            $cond: [
              { $gt: ['$enrollmentCount', 0] },
              {
                $multiply: [
                  { $divide: ['$completedCount', '$enrollmentCount'] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      {
        $sort: { enrollmentCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Trainer workload distribution
    const trainerWorkload = await Group.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$trainerId',
          totalGroups: { $sum: 1 },
          students: { $push: '$students' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'trainer'
        }
      },
      {
        $unwind: '$trainer'
      },
      {
        $project: {
          _id: 1,
          trainerName: '$trainer.name',
          trainerEmail: '$trainer.email',
          totalGroups: 1,
          totalStudents: {
            $size: {
              $reduce: {
                input: '$students',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] }
              }
            }
          }
        }
      },
      {
        $sort: { totalGroups: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: daysAgo,
        enrollmentTrends,
        attendanceTrends,
        coursePopularity,
        trainerWorkload
      }
    });
});
