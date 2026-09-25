const Course = require('../models/Course');
const Group = require('../models/Group');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

/**
 * Get all courses with statistics
 * @route GET /api/tdo/courses
 * @access TDO Admin only
 */
exports.getAllCourses = async (req, res) => {
  try {
    const { status, category, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // By default exclude sub-courses (they appear nested under their bundle)
    if (!req.query.includeSubCourses) {
      query.parentBundle = null;
    }

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Get courses
    const courses = await Course.find(query)
      .populate('instructor', 'name email')
      .populate({
        path: 'bundleCourses',
        select: 'title price duration totalHours instructor level status',
        populate: { path: 'instructor', select: 'name email' }
      })
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 });

    // Get statistics for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        // Get groups count
        const totalGroups = await Group.countDocuments({ courseId: course._id });
        const activeGroups = await Group.countDocuments({
          courseId: course._id,
          status: 'active'
        });

        // Get enrollments count
        const totalEnrollments = await Enrollment.countDocuments({ course: course._id });
        const activeEnrollments = await Enrollment.countDocuments({
          course: course._id,
          status: 'active'
        });
        const completedEnrollments = await Enrollment.countDocuments({
          course: course._id,
          status: 'completed'
        });

        // Calculate completion rate
        const completionRate = totalEnrollments > 0
          ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
          : 0;

        // Get unique trainers teaching this course
        const trainersCount = await Group.distinct('trainerId', { courseId: course._id });

        // For bundles: compute individual total and savings
        let bundleStats = {};
        if (course.type === 'bundle' && course.bundleCourses?.length) {
          const individualTotal = course.bundleCourses.reduce((sum, c) => sum + (c.price || 0), 0);
          const savings = course.bundlePrice != null ? individualTotal - course.bundlePrice : 0;
          const discountPct = individualTotal > 0 && savings > 0
            ? Math.round((savings / individualTotal) * 100)
            : 0;
          bundleStats = { individualTotal, savings, discountPct, subCourseCount: course.bundleCourses.length };
        }

        return {
          ...course.toObject(),
          stats: {
            totalGroups,
            activeGroups,
            totalEnrollments,
            activeEnrollments,
            completedEnrollments,
            completionRate: parseFloat(completionRate),
            trainersCount: trainersCount.length,
            ...bundleStats
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: coursesWithStats
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
    });
  }
};

/**
 * Get course details with full statistics
 * @route GET /api/tdo/courses/:id
 * @access TDO Admin only
 */
exports.getCourseDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Get course
    const course = await Course.findById(id)
      .populate('instructor', 'name email profile');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get groups with trainers
    const groups = await Group.find({ courseId: id })
      .populate('trainerId', 'name email')
      .select('name trainerId students status startDate endDate schedule');

    // Get enrollments
    const enrollments = await Enrollment.find({ course: id })
      .populate('student', 'name email')
      .select('student status enrolledAt completedAt progress');

    // Get trainers teaching this course
    const trainerIds = await Group.distinct('trainerId', { courseId: id });
    const trainers = await User.find({
      _id: { $in: trainerIds },
      role: 'trainer'
    }).select('name email profile');

    // Calculate statistics
    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => e.status === 'active').length;
    const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
    const completionRate = totalEnrollments > 0
      ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
      : 0;

    const avgProgress = totalEnrollments > 0
      ? (enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / totalEnrollments).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        course: course.toObject(),
        groups,
        trainers,
        enrollments,
        stats: {
          totalGroups: groups.length,
          activeGroups: groups.filter(g => g.status === 'active').length,
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          completionRate: parseFloat(completionRate),
          avgProgress: parseFloat(avgProgress),
          trainersCount: trainers.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course details',
    });
  }
};

/**
 * Create a new course
 * @route POST /api/tdo/courses
 * @access TDO Admin only
 */
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level,
      duration,
      price,
      instructor,
      thumbnail,
      syllabus,
      objectives,
      prerequisites,
      type,
      bundlePrice,
      parentBundle,
      wroDocumentsRequired
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title and category are required'
      });
    }

    const isBundleType = type === 'bundle';

    // Bundle must have a bundlePrice; individual courses must have a price
    if (isBundleType && (bundlePrice == null || bundlePrice < 0)) {
      return res.status(400).json({ success: false, message: 'Bundle price is required for bundle courses' });
    }

    if (instructor) {
      const instructorUser = await User.findById(instructor);
      if (!instructorUser || (instructorUser.role !== 'trainer' && instructorUser.role !== 'admin')) {
        return res.status(400).json({ success: false, message: 'Invalid instructor' });
      }
    }

    // If parentBundle provided, validate it exists and is of type 'bundle'
    if (parentBundle) {
      const parent = await Course.findById(parentBundle);
      if (!parent) return res.status(404).json({ success: false, message: 'Parent bundle not found' });
      if (parent.type !== 'bundle') return res.status(400).json({ success: false, message: 'Parent course is not a bundle' });
    }

    const parsedHours = parseFloat(duration) || 0;

    const course = await Course.create({
      title,
      description,
      category,
      level: level || 'beginner',
      duration: String(parsedHours),
      totalHours: parsedHours,
      price: isBundleType ? 0 : (price || 0),
      instructor: isBundleType ? undefined : instructor,
      thumbnail,
      syllabus: syllabus || [],
      objectives: objectives || [],
      prerequisites: prerequisites || [],
      status: 'draft',
      type: type || 'single',
      bundlePrice: isBundleType ? bundlePrice : undefined,
      parentBundle: parentBundle || null,
      wroDocumentsRequired: wroDocumentsRequired || false
    });

    // Link this course into the parent bundle's bundleCourses array
    if (parentBundle) {
      await Course.findByIdAndUpdate(parentBundle, { $addToSet: { bundleCourses: course._id } });
    }

    await course.populate('instructor', 'name email');

    res.status(201).json({
      success: true,
      message: isBundleType ? 'Bundle created successfully' : 'Course created successfully',
      data: course
    });

  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ success: false, message: 'Failed to create course' });
  }
};

/**
 * Update course information
 * @route PUT /api/tdo/courses/:id
 * @access TDO Admin only
 */
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if course exists
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // If instructor is being updated, verify they exist
    if (updateData.instructor) {
      const instructorUser = await User.findById(updateData.instructor);
      if (!instructorUser || (instructorUser.role !== 'trainer' && instructorUser.role !== 'admin')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid instructor'
        });
      }
    }

    // Prevent downgrading a bundle that has sub-courses
    if (updateData.type === 'single' && course.type === 'bundle' && course.bundleCourses?.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change a bundle to a single course while it has sub-courses. Remove all sub-courses first.'
      });
    }

    // Update course — keep totalHours in sync with duration
    Object.keys(updateData).forEach(key => {
      course[key] = updateData[key];
    });
    if (updateData.duration !== undefined) {
      course.totalHours = parseFloat(updateData.duration) || 0;
    }

    await course.save();
    await course.populate('instructor', 'name email');
    await course.populate({
      path: 'bundleCourses',
      select: 'title price duration totalHours instructor level status',
      populate: { path: 'instructor', select: 'name email' }
    });

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });

  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course',
    });
  }
};

/**
 * Delete a course permanently
 * @route DELETE /api/clo/courses/:id
 * @access CLO Admin only
 */
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if course exists
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Only allow deletion of draft courses
    if (course.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft courses can be deleted. Please archive published courses instead.'
      });
    }

    // Check if course has any groups
    const groupsCount = await Group.countDocuments({ courseId: id });
    if (groupsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with existing groups. Please remove all groups first.'
      });
    }

    // Check if course has any enrollments
    const enrollmentsCount = await Enrollment.countDocuments({ course: id });
    if (enrollmentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with existing enrollments.'
      });
    }

    // If this is a bundle: detach all sub-courses (clear their parentBundle reference)
    if (course.type === 'bundle' && course.bundleCourses?.length > 0) {
      await Course.updateMany(
        { _id: { $in: course.bundleCourses } },
        { $set: { parentBundle: null } }
      );
    }

    // If this is a sub-course: remove it from its parent bundle's bundleCourses array
    if (course.parentBundle) {
      await Course.findByIdAndUpdate(course.parentBundle, { $pull: { bundleCourses: course._id } });
    }

    await Course.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course',
    });
  }
};

/**
 * Archive/unarchive a course
 * @route PUT /api/clo/courses/:id/archive
 * @access CLO Admin only
 */
exports.archiveCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { action = 'archive' } = req.body;

    // Check if course exists
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course has active groups
    const activeGroups = await Group.countDocuments({
      courseId: id,
      status: 'active'
    });

    if (action === 'archive' && activeGroups > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot archive course with active groups. Please complete or close all active groups first.'
      });
    }

    // Update course status
    course.status = action === 'archive' ? 'archived' : 'published';
    await course.save();

    res.status(200).json({
      success: true,
      message: `Course ${action === 'archive' ? 'archived' : 'unarchived'} successfully`,
      data: {
        _id: course._id,
        title: course.title,
        status: course.status
      }
    });

  } catch (error) {
    console.error('Error archiving course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course status',
    });
  }
};

/**
 * Get course statistics and analytics
 * @route GET /api/tdo/courses/:id/statistics
 * @access TDO Admin only
 */
exports.getCourseStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30' } = req.query; // days

    // Check if course exists
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Enrollment trends
    const enrollmentTrends = await Enrollment.aggregate([
      {
        $match: {
          course: course._id,
          enrolledAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$enrolledAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Completion trends
    const completionTrends = await Enrollment.aggregate([
      {
        $match: {
          course: course._id,
          status: 'completed',
          completedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Progress distribution
    const progressDistribution = await Enrollment.aggregate([
      {
        $match: { course: course._id }
      },
      {
        $bucket: {
          groupBy: '$progress.percentageComplete',
          boundaries: [0, 25, 50, 75, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            students: { $push: '$student' }
          }
        }
      }
    ]);

    // Group performance
    const groupPerformance = await Group.aggregate([
      {
        $match: { courseId: course._id }
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
        $project: {
          _id: 1,
          name: 1,
          trainerName: '$trainer.name',
          studentsCount: { $size: { $ifNull: ['$students', []] } },
          status: 1,
          startDate: 1,
          endDate: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        course: {
          _id: course._id,
          title: course.title,
          category: course.category
        },
        period: daysAgo,
        enrollmentTrends,
        completionTrends,
        progressDistribution,
        groupPerformance
      }
    });

  } catch (error) {
    console.error('Error fetching course statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course statistics',
    });
  }
};

// ============================================================
// Bundle Management
// ============================================================

/**
 * Get all sub-courses for a bundle with stats
 * @route GET /api/clo/courses/:bundleId/sub-courses
 */
exports.getBundleSubCourses = async (req, res) => {
  try {
    const { bundleId } = req.params;

    const bundle = await Course.findById(bundleId)
      .populate({
        path: 'bundleCourses',
        select: 'title description price duration totalHours instructor level status category',
        populate: { path: 'instructor', select: 'name email' }
      });

    if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
    if (bundle.type !== 'bundle') return res.status(400).json({ success: false, message: 'Course is not a bundle' });

    const subCoursesWithStats = await Promise.all(
      (bundle.bundleCourses || []).map(async (sc) => {
        const totalGroups = await Group.countDocuments({ courseId: sc._id });
        const activeEnrollments = await Enrollment.countDocuments({ course: sc._id, status: 'active' });
        return { ...sc.toObject(), stats: { totalGroups, activeEnrollments } };
      })
    );

    const individualTotal = subCoursesWithStats.reduce((sum, c) => sum + (c.price || 0), 0);
    const savings = bundle.bundlePrice != null ? individualTotal - bundle.bundlePrice : 0;
    const discountPct = individualTotal > 0 && savings > 0 ? Math.round((savings / individualTotal) * 100) : 0;

    res.json({
      success: true,
      data: {
        bundle: { _id: bundle._id, title: bundle.title, bundlePrice: bundle.bundlePrice },
        subCourses: subCoursesWithStats,
        pricing: { individualTotal, bundlePrice: bundle.bundlePrice, savings, discountPct }
      }
    });
  } catch (error) {
    console.error('Error fetching bundle sub-courses:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sub-courses' });
  }
};

/**
 * Link an existing course into a bundle
 * @route POST /api/clo/courses/:bundleId/sub-courses
 * @body { courseId }
 */
exports.addSubCourse = async (req, res) => {
  try {
    const { bundleId } = req.params;
    const { courseId } = req.body;

    if (!courseId) return res.status(400).json({ success: false, message: 'courseId is required' });

    const [bundle, course] = await Promise.all([
      Course.findById(bundleId),
      Course.findById(courseId)
    ]);

    if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (bundle.type !== 'bundle') return res.status(400).json({ success: false, message: 'Target is not a bundle' });
    if (course.type === 'bundle') return res.status(400).json({ success: false, message: 'Cannot nest a bundle inside a bundle' });
    if (course.parentBundle && course.parentBundle.toString() !== bundleId) {
      return res.status(400).json({ success: false, message: 'Course already belongs to another bundle' });
    }

    // Link
    course.parentBundle = bundle._id;
    await course.save();
    await Course.findByIdAndUpdate(bundleId, { $addToSet: { bundleCourses: courseId } });

    const updatedBundle = await Course.findById(bundleId).populate({
      path: 'bundleCourses',
      select: 'title price duration totalHours instructor level status',
      populate: { path: 'instructor', select: 'name email' }
    });

    res.json({ success: true, message: 'Sub-course added to bundle', data: updatedBundle });
  } catch (error) {
    console.error('Error adding sub-course:', error);
    res.status(500).json({ success: false, message: 'Failed to add sub-course' });
  }
};

/**
 * Detach a sub-course from a bundle (does not delete the course)
 * @route DELETE /api/clo/courses/:bundleId/sub-courses/:courseId
 */
exports.removeSubCourse = async (req, res) => {
  try {
    const { bundleId, courseId } = req.params;

    const [bundle, course] = await Promise.all([
      Course.findById(bundleId),
      Course.findById(courseId)
    ]);

    if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Clear parentBundle on the sub-course
    course.parentBundle = null;
    await course.save();

    // Remove from bundle's array
    await Course.findByIdAndUpdate(bundleId, { $pull: { bundleCourses: course._id } });

    res.json({ success: true, message: 'Sub-course removed from bundle' });
  } catch (error) {
    console.error('Error removing sub-course:', error);
    res.status(500).json({ success: false, message: 'Failed to remove sub-course' });
  }
};
