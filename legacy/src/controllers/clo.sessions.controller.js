const asyncHandler      = require('../utils/asyncHandler');
const cloSessionService = require('../services/clo.sessions.service');

/**
 * GET /api/clo/sessions
 * List all sessions (CLO can see every session, with optional filters)
 * Query: groupId, status, startDate, endDate, search
 */
exports.getAllSessions = asyncHandler(async (req, res) => {
  const data = await cloSessionService.getSessions(req.query);
  res.status(200).json({ success: true, count: data.length, data });
});

/**
 * GET /api/clo/sessions/:sessionId
 * Get a single session by ID
 */
exports.getSessionById = asyncHandler(async (req, res) => {
  const data = await cloSessionService.getSessionById(req.params.sessionId);
  res.status(200).json({ success: true, data });
});

/**
 * POST /api/clo/sessions
 * Create a new session for any group
 */
exports.createSession = asyncHandler(async (req, res) => {
  const data = await cloSessionService.createSession(req.user._id, req.body);
  res.status(201).json({ success: true, message: 'Session created successfully', data });
});

/**
 * PUT /api/clo/sessions/:sessionId
 * Update a session
 */
exports.updateSession = asyncHandler(async (req, res) => {
  const data = await cloSessionService.updateSession(req.params.sessionId, req.body);
  res.status(200).json({ success: true, message: 'Session updated successfully', data });
});

/**
 * DELETE /api/clo/sessions/:sessionId
 * Delete or cancel a session
 * Query: permanent (true|false), reason
 */
exports.deleteSession = asyncHandler(async (req, res) => {
  const { permanent, reason } = req.query;
  const data = await cloSessionService.deleteSession(
    req.params.sessionId,
    { permanent: permanent === 'true', reason }
  );

  if (!data) {
    return res.status(200).json({ success: true, message: 'Session permanently deleted' });
  }
  res.status(200).json({ success: true, message: 'Session cancelled successfully', data });
});

/**
 * PUT /api/clo/sessions/:sessionId/lesson-plan
 * Update lesson plan for a session
 */
exports.updateLessonPlan = asyncHandler(async (req, res) => {
  const data = await cloSessionService.updateLessonPlan(req.params.sessionId, req.body);
  res.status(200).json({ success: true, message: 'Lesson plan updated successfully', data });
});
