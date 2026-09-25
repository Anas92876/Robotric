/**
 * CLO Evaluations Controller
 *
 * Handles viewing student evaluations for CLO oversight
 * CLO can view all evaluations across all groups
 *
 * @controller CLOEvaluationsController
 * @description CLO evaluation viewing operations
 */

const StudentEvaluation = require('../models/StudentEvaluation');
const Session = require('../models/Session');
const Group = require('../models/Group');

/**
 * @route   GET /api/clo/evaluations
 * @desc    Get all session evaluations with filters
 * @access  CLO only
 */
exports.getAllEvaluations = async (req, res) => {
  try {
    const {
      groupId,
      trainerId,
      startDate,
      endDate,
      minRating,
      maxRating,
      engagementLevel,
      page = 1,
      limit = 20,
      sortBy = 'evaluationDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (groupId) query.groupId = groupId;
    if (trainerId) query.trainerId = trainerId;
    if (minRating) query.overallRating = { ...query.overallRating, $gte: parseInt(minRating) };
    if (maxRating) query.overallRating = { ...query.overallRating, $lte: parseInt(maxRating) };
    if (engagementLevel) query.engagementLevel = engagementLevel;

    if (startDate || endDate) {
      query.evaluationDate = {};
      if (startDate) query.evaluationDate.$gte = new Date(startDate);
      if (endDate) query.evaluationDate.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const evaluations = await StudentEvaluation.find(query)
      .populate({
        path: 'studentId',
        select: 'name email'
      })
      .populate({
        path: 'sessionId',
        select: 'title scheduledDate type duration location'
      })
      .populate({
        path: 'trainerId',
        select: 'name email'
      })
      .populate({
        path: 'groupId',
        select: 'name courseId',
        populate: {
          path: 'courseId',
          select: 'title category'
        }
      })
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

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
 * @route   GET /api/clo/evaluations/:id
 * @desc    Get a single evaluation by ID
 * @access  CLO only
 */
exports.getEvaluationById = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluation = await StudentEvaluation.findById(id)
      .populate({
        path: 'sessionId',
        select: 'title scheduledDate type duration location lessonPlan'
      })
      .populate({
        path: 'trainerId',
        select: 'name email profile'
      })
      .populate({
        path: 'groupId',
        select: 'name courseId students',
        populate: {
          path: 'courseId',
          select: 'title category level'
        }
      })
      .lean();

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

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
 * @route   GET /api/clo/evaluations/group/:groupId
 * @desc    Get all evaluations for a specific group
 * @access  CLO only
 */
exports.getGroupEvaluations = async (req, res) => {
  try {
    const { groupId } = req.params;

    const evaluations = await StudentEvaluation.find({ groupId })
      .populate({
        path: 'sessionId',
        select: 'title scheduledDate sessionNumber type'
      })
      .populate({
        path: 'trainerId',
        select: 'name email'
      })
      .sort({ evaluationDate: -1 })
      .lean();

    // Calculate group statistics
    let totalRating = 0;
    let totalEngagement = 0;
    let totalObjectives = 0;

    evaluations.forEach(evaluation => {
      totalRating += evaluation.overallRating;
      const engagementMap = {
        'very_low': 1,
        'low': 2,
        'medium': 3,
        'high': 4,
        'very_high': 5
      };
      totalEngagement += engagementMap[evaluation.engagementLevel] || 3;
      totalObjectives += evaluation.objectivesAchievement;
    });

    const stats = evaluations.length > 0 ? {
      totalEvaluations: evaluations.length,
      averageRating: (totalRating / evaluations.length).toFixed(1),
      averageEngagement: (totalEngagement / evaluations.length).toFixed(1),
      averageObjectivesAchievement: Math.round(totalObjectives / evaluations.length)
    } : {
      totalEvaluations: 0,
      averageRating: 0,
      averageEngagement: 0,
      averageObjectivesAchievement: 0
    };

    res.json({
      success: true,
      data: {
        evaluations,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching group evaluations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch group evaluations'
    });
  }
};

/**
 * @route   GET /api/clo/evaluations/stats
 * @desc    Get overall evaluation statistics
 * @access  CLO only
 */
exports.getEvaluationStats = async (req, res) => {
  try {
    const { groupId, trainerId, startDate, endDate } = req.query;

    const query = {};
    if (groupId) query.groupId = groupId;
    if (trainerId) query.trainerId = trainerId;
    if (startDate || endDate) {
      query.evaluationDate = {};
      if (startDate) query.evaluationDate.$gte = new Date(startDate);
      if (endDate) query.evaluationDate.$lte = new Date(endDate);
    }

    const evaluations = await StudentEvaluation.find(query).lean();

    const total = evaluations.length;

    if (total === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          averageRating: 0,
          averageObjectivesAchievement: 0,
          engagementDistribution: {
            very_low: 0,
            low: 0,
            medium: 0,
            high: 0,
            very_high: 0
          },
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      });
    }

    let totalRating = 0;
    let totalObjectives = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const engagementDistribution = {
      very_low: 0,
      low: 0,
      medium: 0,
      high: 0,
      very_high: 0
    };

    evaluations.forEach(evaluation => {
      totalRating += evaluation.overallRating;
      totalObjectives += evaluation.objectivesAchievement;
      ratingDistribution[evaluation.overallRating]++;
      engagementDistribution[evaluation.engagementLevel]++;
    });

    res.json({
      success: true,
      data: {
        total,
        averageRating: (totalRating / total).toFixed(1),
        averageObjectivesAchievement: Math.round(totalObjectives / total),
        engagementDistribution,
        ratingDistribution
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

module.exports = exports;
