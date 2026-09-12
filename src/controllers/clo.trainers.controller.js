const User = require('../models/User');
const Course = require('../models/Course');
const Group = require('../models/Group');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Get all trainers with their statistics
 * @route GET /api/tdo/trainers
 * @access TDO Admin only
 */
exports.getAllTrainers = asyncHandler(async (req, res) => {
    const { status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build query
    const query = { role: 'trainer' };

    if (status) {
      if (status === 'active') {
        query['profile.status'] = { $ne: 'inactive' };
      } else if (status === 'inactive') {
        query['profile.status'] = 'inactive';
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Use aggregation to get trainers with stats in a single query
    const trainersWithStats = await User.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'groups',
          localField: '_id',
          foreignField: 'trainerId',
          as: 'groups'
        }
      },
      {
        $lookup: {
          from: 'attendances',
          let: { trainerId: '$_id' },
          pipeline: [
            {
              $lookup: {
                from: 'groups',
                localField: 'group',
                foreignField: '_id',
                as: 'groupData'
              }
            },
            {
              $unwind: '$groupData'
            },
            {
              $match: {
                $expr: {
                  $eq: ['$groupData.trainerId', '$$trainerId']
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
          as: 'attendanceStats'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          profile: 1,
          createdAt: 1,
          updatedAt: 1,
          stats: {
            totalGroups: { $size: '$groups' },
            activeGroups: {
              $size: {
                $filter: {
                  input: '$groups',
                  as: 'group',
                  cond: { $eq: ['$$group.status', 'active'] }
                }
              }
            },
            totalStudents: {
              $reduce: {
                input: '$groups',
                initialValue: 0,
                in: { $add: ['$$value', { $size: { $ifNull: ['$$this.students', []] } }] }
              }
            },
            coursesCount: {
              $size: {
                $setUnion: {
                  $map: {
                    input: '$groups',
                    as: 'group',
                    in: '$$group.courseId'
                  }
                }
              }
            },
            avgAttendance: {
              $cond: [
                {
                  $and: [
                    { $gt: [{ $size: '$attendanceStats' }, 0] },
                    { $gt: [{ $arrayElemAt: ['$attendanceStats.totalRecords', 0] }, 0] }
                  ]
                },
                {
                  $multiply: [
                    {
                      $divide: [
                        { $arrayElemAt: ['$attendanceStats.presentCount', 0] },
                        { $arrayElemAt: ['$attendanceStats.totalRecords', 0] }
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
      },
      {
        $sort: { [sortBy]: order === 'desc' ? -1 : 1 }
      }
    ]);

    // Remove passwordHash field (it shouldn't be in the result, but ensure it's not)
    const sanitizedTrainers = trainersWithStats.map(trainer => {
      const { passwordHash, ...rest } = trainer;
      return rest;
    });

  res.status(200).json({
    success: true,
    data: sanitizedTrainers
  });
});

/**
 * Create a new trainer
 * @route POST /api/tdo/trainers
 * @access TDO Admin only
 */
exports.createTrainer = asyncHandler(async (req, res) => {
  const { name, email, password, profile } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    throw new BadRequestError('Name, email, and password are required');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create trainer
    const trainer = await User.create({
      name,
      email,
      passwordHash,
      role: 'trainer',
      profile: {
        ...profile,
        isActive: true,
        specialization: profile?.specialization || '',
        bio: profile?.bio || '',
        phone: profile?.phone || ''
      }
    });

    // Remove password hash from response
    const trainerObj = trainer.toObject();
    delete trainerObj.passwordHash;

  res.status(201).json({
    success: true,
    message: 'Trainer created successfully',
    data: trainerObj
  });
});

/**
 * Update trainer information
 * @route PUT /api/tdo/trainers/:id
 * @access TDO Admin only
 */
exports.updateTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, profile, password } = req.body;

  // Check if trainer exists
  const trainer = await User.findById(id);
  if (!trainer || trainer.role !== 'trainer') {
    throw new NotFoundError('Trainer');
  }

  // Update fields
  if (name) trainer.name = name;
  if (email) {
    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }
    trainer.email = email;
  }

    if (profile) {
      trainer.profile = {
        ...trainer.profile,
        ...profile
      };
    }

    // Update password if provided
    if (password) {
      trainer.passwordHash = await bcrypt.hash(password, 10);
    }

    await trainer.save();

    // Remove password hash from response
    const trainerObj = trainer.toObject();
    delete trainerObj.passwordHash;

  res.status(200).json({
    success: true,
    message: 'Trainer updated successfully',
    data: trainerObj
  });
});

/**
 * Deactivate/reactivate trainer
 * @route DELETE /api/tdo/trainers/:id
 * @access TDO Admin only
 */
exports.deactivateTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action = 'deactivate' } = req.body;

  // Check if trainer exists
  const trainer = await User.findById(id);
  if (!trainer || trainer.role !== 'trainer') {
    throw new NotFoundError('Trainer');
  }

    // Update status
    trainer.profile = {
      ...trainer.profile,
      status: action === 'activate' ? 'active' : 'inactive'
    };

    await trainer.save();

  res.status(200).json({
    success: true,
    message: `Trainer ${action === 'activate' ? 'activated' : 'deactivated'} successfully`,
    data: {
      _id: trainer._id,
      name: trainer.name,
      email: trainer.email,
      status: trainer.profile.status
    }
  });
});

/**
 * Get trainer performance metrics
 * @route GET /api/tdo/trainers/:id/performance
 * @access TDO Admin only
 */
exports.getTrainerPerformance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { period = '30' } = req.query; // days

  // Check if trainer exists
  const trainer = await User.findById(id);
  if (!trainer || trainer.role !== 'trainer') {
    throw new NotFoundError('Trainer');
  }

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get all groups
    const groups = await Group.find({ trainerId: id })
      .populate('courseId', 'title category')
      .select('name courseId students status startDate endDate');

    // Get attendance statistics
    const attendanceStats = await Attendance.aggregate([
      {
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: '_id',
          as: 'groupData'
        }
      },
      {
        $unwind: '$groupData'
      },
      {
        $match: {
          'groupData.trainerId': trainer._id,
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
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: {
              $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0]
            }
          },
          lateCount: {
            $sum: {
              $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0]
            }
          },
          absentCount: {
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

    // Calculate overall attendance rate
    const totalAttendance = attendanceStats.reduce((sum, day) => sum + day.totalRecords, 0);
    const totalPresent = attendanceStats.reduce((sum, day) => sum + day.presentCount + day.lateCount, 0);
    const overallAttendanceRate = totalAttendance > 0
      ? ((totalPresent / totalAttendance) * 100).toFixed(1)
      : 0;

    // Get courses taught
    const coursesTaught = await Group.distinct('courseId', { trainerId: id });
    const courses = await Course.find({ _id: { $in: coursesTaught } })
      .select('title category');

    // Get total students
    const totalStudents = groups.reduce((sum, group) => sum + (group.students?.length || 0), 0);

  res.status(200).json({
    success: true,
    data: {
      trainer: {
        _id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        profile: trainer.profile
      },
      performance: {
        period: daysAgo,
        totalGroups: groups.length,
        activeGroups: groups.filter(g => g.status === 'active').length,
        totalStudents,
        coursesCount: courses.length,
        overallAttendanceRate: parseFloat(overallAttendanceRate)
      },
      groups,
      courses,
      attendanceTrends: attendanceStats
    }
  });
});

/**
 * Assign trainer to a course
 * @route POST /api/tdo/trainers/:id/assign-course
 * @access TDO Admin only
 */
exports.assignTrainerToCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { courseId } = req.body;

  // Validate
  if (!courseId) {
    throw new BadRequestError('Course ID is required');
  }

  // Check if trainer exists
  const trainer = await User.findById(id);
  if (!trainer || trainer.role !== 'trainer') {
    throw new NotFoundError('Trainer');
  }

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course');
  }

    // Add trainer to course's authorized trainers list
    if (!trainer.profile) {
      trainer.profile = {};
    }
    if (!trainer.profile.authorizedCourses) {
      trainer.profile.authorizedCourses = [];
    }

    if (!trainer.profile.authorizedCourses.includes(courseId)) {
      trainer.profile.authorizedCourses.push(courseId);
      await trainer.save();
    }

  res.status(200).json({
    success: true,
    message: 'Trainer assigned to course successfully',
    data: {
      trainerId: trainer._id,
      trainerName: trainer.name,
      courseId: course._id,
      courseTitle: course.title
    }
  });
});

/**
 * Remove trainer from a course
 * @route DELETE /api/tdo/trainers/:trainerId/courses/:courseId
 * @access TDO Admin only
 */
exports.removeTrainerFromCourse = asyncHandler(async (req, res) => {
  const { trainerId, courseId } = req.params;

  // Check if trainer exists
  const trainer = await User.findById(trainerId);
  if (!trainer || trainer.role !== 'trainer') {
    throw new NotFoundError('Trainer');
  }

    // Remove course from authorized courses
    if (trainer.profile?.authorizedCourses) {
      trainer.profile.authorizedCourses = trainer.profile.authorizedCourses.filter(
        cId => cId.toString() !== courseId
      );
      await trainer.save();
    }

  res.status(200).json({
    success: true,
    message: 'Trainer removed from course successfully'
  });
});
