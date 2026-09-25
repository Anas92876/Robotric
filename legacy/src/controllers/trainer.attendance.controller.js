const asyncHandler         = require('../utils/asyncHandler');
const attendanceService    = require('../services/trainer.attendance.service');

exports.saveAttendance = asyncHandler(async (req, res) => {
  const { attendance, created } = await attendanceService.saveAttendance(req.user._id, req.body);
  const status  = created ? 201 : 200;
  const message = created ? 'Attendance saved successfully' : 'Attendance updated successfully';
  res.status(status).json({ success: true, message, data: attendance });
});

exports.getSessionAttendance = asyncHandler(async (req, res) => {
  const data = await attendanceService.getSessionAttendance(req.params.sessionId, req.user._id);
  res.status(200).json({ success: true, data });
});

exports.getTrainerAttendance = asyncHandler(async (req, res) => {
  const data = await attendanceService.getTrainerAttendance(req.user._id);
  res.status(200).json({ success: true, count: data.length, data });
});
