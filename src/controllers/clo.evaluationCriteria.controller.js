/**
 * CLO Evaluation Criteria Controller
 *
 * Handles CRUD operations for evaluation criteria configuration
 * CLO can create criteria for courses or specific groups
 *
 * @controller CLOEvaluationCriteriaController
 * @version 1.0.0
 */

const EvaluationCriteria = require('../models/EvaluationCriteria');
const Course = require('../models/Course');
const Group = require('../models/Group');

/**
 * Get All Criteria (for CLO)
 * @route GET /api/clo/evaluation-criteria
 * @access Private (CLO only)
 */
exports.getAllCriteria = async (req, res) => {
  try {
    const { courseId, status } = req.query;
    const query = { createdBy: req.user._id || req.user.id };

    if (courseId) {
      query.courseIds = courseId;
    }

    if (status) {
      query.status = status;
    }

    const criteria = await EvaluationCriteria.find(query)
      .populate('courseIds', 'title category')
      .populate('groupIds', 'name')
      .sort({ updatedAt: -1 });

    // Defensively drop dangling refs (e.g. a course/group deleted directly in the DB)
    // so a stale ID never crashes the frontend's render/map calls.
    const sanitized = criteria.map((c) => {
      const obj = c.toObject();
      obj.courseIds = (obj.courseIds || []).filter(Boolean);
      obj.groupIds = (obj.groupIds || []).filter(Boolean);
      return obj;
    });

    res.status(200).json({
      success: true,
      count: sanitized.length,
      data: sanitized
    });
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evaluation criteria',
    });
  }
};

/**
 * Get Single Criteria
 * @route GET /api/clo/evaluation-criteria/:id
 * @access Private (CLO only)
 */
exports.getCriteriaById = async (req, res) => {
  try {
    const { id } = req.params;

    const criteria = await EvaluationCriteria.findById(id)
      .populate('courseIds', 'title category level')
      .populate('groupIds', 'name students');

    if (!criteria) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation criteria not found'
      });
    }

    // Defensively drop dangling refs (e.g. a course/group deleted directly in the DB)
    const sanitized = criteria.toObject();
    sanitized.courseIds = (sanitized.courseIds || []).filter(Boolean);
    sanitized.groupIds = (sanitized.groupIds || []).filter(Boolean);

    res.status(200).json({
      success: true,
      data: sanitized
    });
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evaluation criteria',
    });
  }
};

/**
 * Create New Criteria
 * @route POST /api/clo/evaluation-criteria
 * @access Private (CLO only)
 */
exports.createCriteria = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      name,
      description,
      appliesTo,
      courseIds,
      groupIds,
      parameters,
      includeOverallRating,
      overallRatingScale
    } = req.body;

    // Validate required fields
    if (!name || !courseIds || !courseIds.length || !appliesTo) {
      return res.status(400).json({
        success: false,
        message: 'Name, courseIds, and appliesTo are required'
      });
    }

    // Verify all courses exist
    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more courses not found'
      });
    }

    // If appliesTo is 'groups', verify groups exist and belong to one of the selected courses
    if (appliesTo === 'groups') {
      if (!groupIds || groupIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one group must be specified'
        });
      }

      // Expand to include sub-courses of any selected "bucket"/bundle courses,
      // so groups belonging to those sub-courses are accepted too.
      const expandedCourseIds = [...courseIds];
      courses.forEach((c) => {
        if (c.type === 'bundle' && c.bundleCourses?.length) {
          c.bundleCourses.forEach((scId) => {
            if (!expandedCourseIds.some((id) => id.toString() === scId.toString())) {
              expandedCourseIds.push(scId);
            }
          });
        }
      });

      const groups = await Group.find({ _id: { $in: groupIds }, courseId: { $in: expandedCourseIds } });
      if (groups.length !== groupIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some groups not found or do not belong to the specified courses'
        });
      }
    }

    // Create criteria
    const criteria = await EvaluationCriteria.create({
      name,
      description,
      appliesTo,
      courseIds,
      groupIds: appliesTo === 'groups' ? groupIds : [],
      parameters: parameters || [],
      includeOverallRating: includeOverallRating !== undefined ? includeOverallRating : true,
      overallRatingScale: overallRatingScale || { min: 1, max: 5 },
      createdBy: userId,
      status: 'active'
    });

    await criteria.populate([
      { path: 'courseIds', select: 'title category' },
      { path: 'groupIds', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Evaluation criteria created successfully',
      data: criteria
    });
  } catch (error) {
    console.error('Error creating criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create evaluation criteria',
    });
  }
};

/**
 * Update Criteria
 * @route PUT /api/clo/evaluation-criteria/:id
 * @access Private (CLO only)
 */
exports.updateCriteria = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const criteria = await EvaluationCriteria.findOne({ _id: id, createdBy: userId });

    if (!criteria) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation criteria not found'
      });
    }

    // Track if parameters were changed
    const oldParameterNames = criteria.parameters.map(p => p.name);
    const parametersChanged = req.body.parameters !== undefined;

    const allowedUpdates = [
      'name',
      'description',
      'appliesTo',
      'courseIds',
      'groupIds',
      'parameters',
      'includeOverallRating',
      'overallRatingScale',
      'status'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        criteria[field] = req.body[field];
      }
    });

    await criteria.save();

    // ✅ FIX: Clean up existing evaluations if parameters changed
    if (parametersChanged) {
      const newParameterNames = criteria.parameters.map(p => p.name);
      const removedParameters = oldParameterNames.filter(name => !newParameterNames.includes(name));

      console.log(`🔄 Criteria updated: Cleaning up evaluations...`);
      console.log(`   Old parameters: ${oldParameterNames.join(', ')}`);
      console.log(`   New parameters: ${newParameterNames.join(', ')}`);
      console.log(`   Removed: ${removedParameters.join(', ') || 'none'}`);

      // Get all evaluations affected by this criteria
      const StudentEvaluation = require('../models/StudentEvaluation');
      let query;

      if (criteria.appliesTo === 'groups') {
        query = { groupId: { $in: criteria.groupIds } };
      } else {
        // For course-level criteria, get all groups in any of the selected courses
        const Group = require('../models/Group');
        const groups = await Group.find({ courseId: { $in: criteria.courseIds } }).select('_id');
        const groupIds = groups.map(g => g._id);
        query = { groupId: { $in: groupIds } };
      }

      const evaluations = await StudentEvaluation.find(query);

      console.log(`   Found ${evaluations.length} evaluations to update`);

      let updatedCount = 0;
      for (const evaluation of evaluations) {
        let modified = false;

        // Remove old parameters that no longer exist
        if (evaluation.parameters) {
          removedParameters.forEach(paramName => {
            if (evaluation.parameters[paramName] !== undefined) {
              delete evaluation.parameters[paramName];
              modified = true;
            }
          });
        }

        // Update criteriaMetadata to match new criteria
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
        modified = true;

        if (modified) {
          await evaluation.save();
          updatedCount++;
        }
      }

      console.log(`✅ Updated ${updatedCount} evaluations with new criteria`);
    }

    await criteria.populate([
      { path: 'courseIds', select: 'title category' },
      { path: 'groupIds', select: 'name' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Evaluation criteria updated successfully',
      data: criteria
    });
  } catch (error) {
    console.error('Error updating criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update evaluation criteria',
    });
  }
};

/**
 * Delete Criteria
 * @route DELETE /api/clo/evaluation-criteria/:id
 * @access Private (CLO only)
 */
exports.deleteCriteria = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const criteria = await EvaluationCriteria.findOne({ _id: id, createdBy: userId });

    if (!criteria) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation criteria not found'
      });
    }

    // Permanently delete the criteria
    await EvaluationCriteria.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Evaluation criteria deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete evaluation criteria',
    });
  }
};

/**
 * Get Criteria for a Group (used by trainers)
 * @route GET /api/trainer/evaluation-criteria/group/:groupId
 * @access Private (Trainer only)
 */
exports.getCriteriaForGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).select('courseId');
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const criteria = await EvaluationCriteria.getCriteriaForGroup(groupId, group.courseId);

    if (!criteria) {
      return res.status(404).json({
        success: false,
        message: 'No evaluation criteria found for this group'
      });
    }

    res.status(200).json({
      success: true,
      data: criteria
    });
  } catch (error) {
    console.error('Error fetching criteria for group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evaluation criteria',
    });
  }
};
