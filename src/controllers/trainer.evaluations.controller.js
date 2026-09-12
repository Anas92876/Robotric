/**
 * Trainer Evaluations Controller
 *
 * Handles all evaluation-related operations for trainers:
 * - Creating and updating student evaluations
 * - Viewing evaluation history
 * - Getting evaluation statistics
 * - Bulk evaluation operations
 *
 * @controller TrainerEvaluationsController
 * @description Manages student performance evaluations
 * @version 1.0.0
 */

const StudentEvaluation = require('../models/StudentEvaluation');
const Session = require('../models/Session');
const Group = require('../models/Group');
const User = require('../models/User');
const EvaluationCriteria = require('../models/EvaluationCriteria');
const { createAndEmitNotification } = require('../services/webNotification.service');
const logger = require('../utils/logger');

/**
 * @route   POST /api/trainer/evaluations
 * @desc    Create a new student evaluation
 * @access  Trainer only
 */
exports.createEvaluation = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const {
      studentId,
      sessionId,
      groupId,
      overallRating,
      skillRatings,
      attendance,
      participation,
      comprehension,
      behavior,
      achievements,
      improvements,
      homework,
      trainerNotes,
      progress,
      recommendations,
      flags,
      parameters
    } = req.body;

    // Validate required fields
    if (!studentId || !sessionId || !groupId || !overallRating) {
      return res.status(400).json({
        success: false,
        message: 'Student, session, group, and overall rating are required'
      });
    }

    // Verify session belongs to trainer
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // if (session.trainerId.toString() !== trainerId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'You can only evaluate students in your own sessions'
    //   });
    // }

    // Verify student is in the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isStudentInGroup = group.students.some(
      s => s.toString() === studentId
    );

    if (!isStudentInGroup) {
      return res.status(400).json({
        success: false,
        message: 'Student is not enrolled in this group'
      });
    }

    // Check if evaluation already exists
    const existingEvaluation = await StudentEvaluation.findOne({
      studentId,
      sessionId
    });

    if (existingEvaluation) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation already exists for this student in this session',
        evaluationId: existingEvaluation._id
      });
    }

    // Normalize trainerNotes - handle both string and object formats
    let normalizedTrainerNotes = {};
    if (typeof trainerNotes === 'string') {
      normalizedTrainerNotes = { generalNotes: trainerNotes };
    } else if (trainerNotes && typeof trainerNotes === 'object') {
      normalizedTrainerNotes = trainerNotes;
    }

    // Fetch evaluation criteria for this group to get parameter metadata
    let criteriaMetadata = null;
    if (parameters && Object.keys(parameters).length > 0) {
      const criteria = await EvaluationCriteria.findOne({
        $or: [
          { appliesTo: 'course', courseId: group.courseId, status: 'active' },
          { appliesTo: 'groups', groupIds: groupId, status: 'active' }
        ]
      }).sort({ appliesTo: -1 }); // Prefer group-specific over course-wide

      if (criteria) {
        criteriaMetadata = {
          parametersConfig: criteria.parameters.map(p => ({
            name: p.name,
            type: p.type,
            weight: p.weight,
            ratingScale: p.ratingScale
          })),
          includeOverallRating: criteria.includeOverallRating,
          overallRatingScale: criteria.overallRatingScale
        };
      }
    }

    // Build evaluation data - only include fields that are provided
    // Ensure overallRating is an integer (backend validation requirement)
    const normalizedOverallRating = overallRating ? Math.round(Number(overallRating)) : overallRating;
    
    const evaluationData = {
      studentId,
      trainerId,
      sessionId,
      groupId,
      overallRating: normalizedOverallRating,
      trainerNotes: normalizedTrainerNotes,
      parameters: parameters || {}
    };

    // Add criteria metadata if available
    if (criteriaMetadata) {
      evaluationData.criteriaMetadata = criteriaMetadata;
    }

    // Only add optional legacy fields if they're provided
    if (skillRatings) evaluationData.skillRatings = skillRatings;
    if (attendance) evaluationData.attendance = attendance;
    if (participation) evaluationData.participation = participation;
    if (comprehension) evaluationData.comprehension = comprehension;
    if (behavior) evaluationData.behavior = behavior;
    if (achievements) evaluationData.achievements = achievements;
    if (improvements) evaluationData.improvements = improvements;
    if (homework) evaluationData.homework = homework;
    if (progress) evaluationData.progress = progress;
    if (recommendations) evaluationData.recommendations = recommendations;
    if (flags) evaluationData.flags = flags;

    // Create evaluation
    const evaluation = await StudentEvaluation.create(evaluationData);

    // Populate references
    await evaluation.populate([
      { path: 'studentId', select: 'name email' },
      { path: 'sessionId', select: 'title scheduledDate type' },
      { path: 'groupId', select: 'name' }
    ]);

    // Create web notification for student
    try {
      await createAndEmitNotification(
        studentId,
        'evaluation',
        'New Evaluation Received',
        `You have received a new evaluation with a rating of ${normalizedOverallRating}/10. ${evaluation.sessionId?.title || 'Session evaluation'}`,
        {
          evaluationId: evaluation._id.toString(),
          sessionId: sessionId.toString(),
          overallRating: normalizedOverallRating
        },
        {
          actionUrl: `/student/evaluations`,
          actionLabel: 'View Evaluation'
        }
      );
    } catch (notifError) {
      logger.error(`Failed to create evaluation notification: ${notifError.message}`, {
        evaluationId: evaluation._id,
        studentId
      });
    }

    res.status(201).json({
      success: true,
      message: 'Student evaluation created successfully',
      data: evaluation
    });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create evaluation'
    });
  }
};

/**
 * @route   PUT /api/trainer/evaluations/:id
 * @desc    Update an existing evaluation
 * @access  Trainer only
 */
exports.updateEvaluation = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const { id } = req.params;

    const evaluation = await StudentEvaluation.findById(id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Verify trainer owns this evaluation
    if (evaluation.trainerId.toString() !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own evaluations'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'overallRating',
      'skillRatings',
      'attendance',
      'participation',
      'comprehension',
      'behavior',
      'achievements',
      'improvements',
      'homework',
      'trainerNotes',
      'progress',
      'recommendations',
      'flags',
      'parameters'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        // Special handling for trainerNotes - normalize string to object format
        if (field === 'trainerNotes' && typeof req.body[field] === 'string') {
          evaluation[field] = { generalNotes: req.body[field] };
        } else if (field === 'overallRating') {
          // Ensure overallRating is an integer (backend validation requirement)
          evaluation[field] = Math.round(Number(req.body[field]));
        } else {
          evaluation[field] = req.body[field];
        }
      }
    });

    // ✅ FIX: Refresh criteriaMetadata when parameters are updated
    if (req.body.parameters !== undefined && evaluation.groupId) {
      try {
        // Get the group to find courseId
        const Group = require('../models/Group');
        const group = await Group.findById(evaluation.groupId).select('courseId');

        if (group) {
          const criteria = await EvaluationCriteria.findOne({
            $or: [
              { appliesTo: 'course', courseId: group.courseId, status: 'active' },
              { appliesTo: 'groups', groupIds: evaluation.groupId, status: 'active' }
            ]
          }).sort({ appliesTo: -1 }); // Prefer group-specific over course-wide

          if (criteria) {
            // Update criteriaMetadata to match current criteria
            evaluation.criteriaMetadata = {
              parametersConfig: criteria.parameters.map(p => ({
                name: p.name,
                type: p.type,
                weight: p.weight,
                ratingScale: p.ratingScale
              })),
              includeOverallRating: criteria.includeOverallRating,
              overallRatingScale: criteria.overallRatingScale
            };

            // Clean up any parameters that no longer exist in criteria
            const validParameterNames = criteria.parameters.map(p => p.name);
            const currentParameterNames = Object.keys(evaluation.parameters || {});

            currentParameterNames.forEach(paramName => {
              if (!validParameterNames.includes(paramName)) {
                delete evaluation.parameters[paramName];
                console.log(`🗑️ Removed obsolete parameter: ${paramName}`);
              }
            });

            console.log(`✅ Updated criteriaMetadata for evaluation ${id}`);
          }
        }
      } catch (criteriaError) {
        console.error('Error fetching criteria for metadata update:', criteriaError.message);
        // Continue with save even if criteria fetch fails
      }
    }

    await evaluation.save();

    // Populate references
    await evaluation.populate([
      { path: 'studentId', select: 'name email' },
      { path: 'sessionId', select: 'title scheduledDate type' },
      { path: 'groupId', select: 'name' }
    ]);

    // Create web notification for student if rating changed
    if (req.body.overallRating !== undefined) {
      try {
        await createAndEmitNotification(
          evaluation.studentId._id || evaluation.studentId,
          'evaluation',
          'Evaluation Updated',
          `Your evaluation has been updated. New rating: ${evaluation.overallRating}/10.`,
          {
            evaluationId: evaluation._id.toString(),
            sessionId: evaluation.sessionId._id?.toString() || evaluation.sessionId.toString(),
            overallRating: evaluation.overallRating
          },
          {
            actionUrl: `/student/evaluations`,
            actionLabel: 'View Evaluation'
          }
        );
      } catch (notifError) {
        logger.error(`Failed to create evaluation update notification: ${notifError.message}`, {
          evaluationId: evaluation._id
        });
      }
    }

    res.json({
      success: true,
      message: 'Evaluation updated successfully',
      data: evaluation
    });
  } catch (error) {
    console.error('Error updating evaluation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update evaluation'
    });
  }
};

/**
 * @route   GET /api/trainer/evaluations/:id
 * @desc    Get a single evaluation by ID
 * @access  Trainer only
 */
exports.getEvaluationById = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const { id } = req.params;

    const evaluation = await StudentEvaluation.findById(id)
      .populate('studentId', 'name email')
      .populate('sessionId', 'title scheduledDate type')
      .populate('groupId', 'name');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Verify trainer owns this evaluation
    // if (evaluation.trainerId.toString() !== trainerId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'You can only view your own evaluations'
    //   });
    // }

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch evaluation'
    });
  }
};

/**
 * @route   GET /api/trainer/evaluations
 * @desc    Get all evaluations for trainer with filters
 * @access  Trainer only
 */
exports.getEvaluations = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const {
      studentId,
      sessionId,
      groupId,
      minRating,
      maxRating,
      needsAttention,
      atRisk,
      excelling,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'evaluationDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { trainerId };

    if (studentId) query.studentId = studentId;
    if (sessionId) query.sessionId = sessionId;
    if (groupId) query.groupId = groupId;
    if (minRating) query.overallRating = { ...query.overallRating, $gte: parseInt(minRating) };
    if (maxRating) query.overallRating = { ...query.overallRating, $lte: parseInt(maxRating) };
    if (needsAttention === 'true') query['flags.needsAttention'] = true;
    if (atRisk === 'true') query['flags.atRisk'] = true;
    if (excelling === 'true') query['flags.excelling'] = true;

    if (startDate || endDate) {
      query.evaluationDate = {};
      if (startDate) query.evaluationDate.$gte = new Date(startDate);
      if (endDate) query.evaluationDate.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const evaluations = await StudentEvaluation.find(query)
      .populate('studentId', 'name email')
      .populate('sessionId', 'title scheduledDate type')
      .populate('groupId', 'name')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StudentEvaluation.countDocuments(query);

    res.json({
      success: true,
      data: evaluations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch evaluations'
    });
  }
};

/**
 * @route   GET /api/trainer/evaluations/session/:sessionId
 * @desc    Get all evaluations for a specific session
 * @access  Trainer only
 */
exports.getSessionEvaluations = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const { sessionId } = req.params;

    // Verify session belongs to trainer
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // if (session.trainerId.toString() !== trainerId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'You can only view evaluations for your own sessions'
    //   });
    // }

    const evaluations = await StudentEvaluation.find({ sessionId })
      .populate('studentId', 'name email')
      .sort({ overallRating: -1 });

    // Filter out evaluations where the student was deleted (populate returns null)
    const validEvaluations = evaluations.filter(e => e.studentId != null);

    // Get students who haven't been evaluated yet
    const group = await Group.findById(session.groupId);
    if (!group) {
      return res.json({
        success: true,
        data: {
          session: { _id: session._id, title: session.title, groupId: session.groupId },
          evaluations: validEvaluations,
          unevaluatedStudents: [],
          stats: { totalStudents: validEvaluations.length, evaluated: validEvaluations.length, pending: 0 }
        }
      });
    }

    const evaluatedStudentIds = validEvaluations.map(e => e.studentId._id.toString());
    const unevaluatedStudents = group.students.filter(
      studentId => !evaluatedStudentIds.includes(studentId.toString())
    );

    const unevaluatedStudentDetails = await User.find({
      _id: { $in: unevaluatedStudents }
    }).select('name email');

    res.json({
      success: true,
      data: {
        session: {
          _id: session._id,
          title: session.title,
          groupId: session.groupId
        },
        evaluations: validEvaluations,
        unevaluatedStudents: unevaluatedStudentDetails,
        stats: {
          totalStudents: group.students.length,
          evaluated: validEvaluations.length,
          pending: unevaluatedStudentDetails.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching session evaluations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch session evaluations'
    });
  }
};

/**
 * @route   GET /api/trainer/evaluations/student/:studentId
 * @desc    Get all evaluations for a specific student
 * @access  Trainer only
 */
exports.getStudentEvaluations = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const { studentId } = req.params;
    const { groupId } = req.query;

    const query = { trainerId, studentId };
    if (groupId) query.groupId = groupId;

    const evaluations = await StudentEvaluation.find(query)
      .populate('sessionId', 'title scheduledDate type')
      .populate('groupId', 'name')
      .sort({ evaluationDate: -1 });

    // Get student statistics
    const stats = await StudentEvaluation.getStudentStats(studentId, groupId);

    // Get progress over time
    const progress = await StudentEvaluation.getStudentProgress(studentId, groupId);

    res.json({
      success: true,
      data: {
        evaluations,
        stats,
        progress
      }
    });
  } catch (error) {
    console.error('Error fetching student evaluations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch student evaluations'
    });
  }
};

/**
 * @route   GET /api/trainer/evaluations/stats
 * @desc    Get evaluation statistics for trainer
 * @access  Trainer only
 */
exports.getEvaluationStats = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const { groupId, startDate, endDate } = req.query;

    const query = { trainerId };
    if (groupId) query.groupId = groupId;
    if (startDate || endDate) {
      query.evaluationDate = {};
      if (startDate) query.evaluationDate.$gte = new Date(startDate);
      if (endDate) query.evaluationDate.$lte = new Date(endDate);
    }

    const evaluations = await StudentEvaluation.find(query);

    // Calculate statistics
    const total = evaluations.length;

    if (total === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          averageRating: 0,
          averagePerformanceScore: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          attendanceRate: 0,
          flaggedStudents: { needsAttention: 0, atRisk: 0, excelling: 0 }
        }
      });
    }

    let totalRating = 0;
    let totalPerformance = 0;
    let presentCount = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const flaggedStudents = { needsAttention: 0, atRisk: 0, excelling: 0 };

    evaluations.forEach(evaluation => {
      totalRating += evaluation.overallRating;
      totalPerformance += evaluation.performanceScore;
      ratingDistribution[evaluation.overallRating]++;

      if (evaluation.attendance?.status === 'present') presentCount++;
      if (evaluation.flags?.needsAttention) flaggedStudents.needsAttention++;
      if (evaluation.flags?.atRisk) flaggedStudents.atRisk++;
      if (evaluation.flags?.excelling) flaggedStudents.excelling++;
    });

    res.json({
      success: true,
      data: {
        total,
        averageRating: (totalRating / total).toFixed(1),
        averagePerformanceScore: Math.round(totalPerformance / total),
        ratingDistribution,
        attendanceRate: Math.round((presentCount / total) * 100),
        flaggedStudents
      }
    });
  } catch (error) {
    console.error('Error fetching evaluation stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch evaluation statistics'
    });
  }
};

/**
 * @route   POST /api/trainer/evaluations/bulk
 * @desc    Create multiple evaluations at once
 * @access  Trainer only
 */
exports.bulkCreateEvaluations = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const { sessionId, evaluations } = req.body;

    if (!sessionId || !evaluations || !Array.isArray(evaluations)) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and evaluations array are required'
      });
    }

    // Verify session belongs to trainer
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.trainerId.toString() !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only evaluate students in your own sessions'
      });
    }

    const createdEvaluations = [];
    const errors = [];

    // Process each evaluation
    for (const evalData of evaluations) {
      try {
        const evaluation = await StudentEvaluation.create({
          ...evalData,
          trainerId,
          sessionId,
          groupId: session.groupId
        });

        await evaluation.populate([
          { path: 'studentId', select: 'name email' },
          { path: 'sessionId', select: 'title scheduledDate' },
          { path: 'groupId', select: 'name' }
        ]);

        createdEvaluations.push(evaluation);
      } catch (error) {
        errors.push({
          studentId: evalData.studentId,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${createdEvaluations.length} evaluations`,
      data: {
        created: createdEvaluations,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Error creating bulk evaluations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create bulk evaluations'
    });
  }
};

/**
 * @route   DELETE /api/trainer/evaluations/:id
 * @desc    Delete an evaluation
 * @access  Trainer only
 */
exports.deleteEvaluation = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const { id } = req.params;

    const evaluation = await StudentEvaluation.findById(id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Verify trainer owns this evaluation
    if (evaluation.trainerId.toString() !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own evaluations'
      });
    }

    await evaluation.deleteOne();

    res.json({
      success: true,
      message: 'Evaluation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete evaluation'
    });
  }
};

/**
 * @route   POST /api/trainer/evaluations/:id/share
 * @desc    Share evaluation with student/parent
 * @access  Trainer only
 */
exports.shareEvaluation = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const { id } = req.params;
    const { shareWithStudent, shareWithParent } = req.body;

    const evaluation = await StudentEvaluation.findById(id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Verify trainer owns this evaluation
    if (evaluation.trainerId.toString() !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only share your own evaluations'
      });
    }

    if (shareWithStudent) {
      await evaluation.shareWithStudent();
    }

    if (shareWithParent) {
      await evaluation.shareWithParent();
    }

    res.json({
      success: true,
      message: 'Evaluation shared successfully',
      data: evaluation
    });
  } catch (error) {
    console.error('Error sharing evaluation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to share evaluation'
    });
  }
};

/**
 * @route   GET /api/trainer/evaluations/flagged
 * @desc    Get students flagged for attention
 * @access  Trainer only
 */
exports.getFlaggedStudents = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const { groupId } = req.query;

    const evaluations = await StudentEvaluation.getStudentsNeedingAttention(trainerId, groupId);

    // Group by student
    const studentMap = new Map();

    evaluations.forEach(evaluation => {
      const studentId = evaluation.studentId._id.toString();

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: evaluation.studentId,
          group: evaluation.groupId,
          evaluations: [],
          flags: {
            needsAttention: false,
            atRisk: false,
            parentContactNeeded: false
          }
        });
      }

      const studentData = studentMap.get(studentId);
      studentData.evaluations.push(evaluation);

      // Aggregate flags
      if (evaluation.flags?.needsAttention) studentData.flags.needsAttention = true;
      if (evaluation.flags?.atRisk) studentData.flags.atRisk = true;
      if (evaluation.flags?.parentContactNeeded) studentData.flags.parentContactNeeded = true;
    });

    const flaggedStudents = Array.from(studentMap.values());

    res.json({
      success: true,
      data: flaggedStudents
    });
  } catch (error) {
    console.error('Error fetching flagged students:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch flagged students'
    });
  }
};
