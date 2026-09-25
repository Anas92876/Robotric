const asyncHandler   = require('../utils/asyncHandler');
const sessionService = require('../services/session.service');

exports.getAllSessions = asyncHandler(async (req, res) => {
  const { data } = await sessionService.getSessions(req.user._id, req.query);
  res.status(200).json({ success: true, count: data.length, data });
});

exports.getSessionById = asyncHandler(async (req, res) => {
  const data = await sessionService.getSessionById(req.params.sessionId, req.user._id);
  res.status(200).json({ success: true, data });
});

exports.createSession = asyncHandler(async (req, res) => {
  const data = await sessionService.createSession(req.user._id, req.body);
  res.status(201).json({ success: true, message: 'Session created successfully', data });
});

exports.updateSession = asyncHandler(async (req, res) => {
  const data = await sessionService.updateSession(req.params.sessionId, req.user._id, req.body);
  res.status(200).json({ success: true, message: 'Session updated successfully', data });
});

exports.deleteSession = asyncHandler(async (req, res) => {
  const { permanent, reason } = req.query;
  const data = await sessionService.deleteSession(
    req.params.sessionId,
    req.user._id,
    { permanent: permanent === 'true', reason }
  );

  if (!data) {
    return res.status(200).json({ success: true, message: 'Session permanently deleted' });
  }
  res.status(200).json({ success: true, message: 'Session cancelled successfully', data });
});

exports.startSession = asyncHandler(async (req, res) => {
  const data = await sessionService.startSession(req.params.sessionId, req.user._id);
  res.status(200).json({ success: true, message: 'Session started successfully', data });
});

exports.endSession = asyncHandler(async (req, res) => {
  const data = await sessionService.endSession(req.params.sessionId, req.user._id);
  res.status(200).json({ success: true, message: 'Session ended successfully', data });
});

exports.getCalendarView = asyncHandler(async (req, res) => {
  const { view, date } = req.query;
  const result = await sessionService.getCalendarView(req.user._id, view, date);
  res.status(200).json({
    success:   true,
    view:      result.view,
    startDate: result.startDate,
    endDate:   result.endDate,
    count:     result.events.length,
    data:      result.events
  });
});

exports.updateLessonPlan = asyncHandler(async (req, res) => {
  const data = await sessionService.updateLessonPlan(req.params.sessionId, req.user._id, req.body);
  res.status(200).json({ success: true, message: 'Lesson plan updated successfully', data });
});
