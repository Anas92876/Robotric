const asyncHandler       = require('../utils/asyncHandler');
const attendanceService  = require('../services/clo.attendance.service');

exports.getAllAttendance = asyncHandler(async (req, res) => {
  const { data, pagination } = await attendanceService.getAllAttendance(req.query);
  res.json({ success: true, data, pagination });
});

exports.getAttendanceById = asyncHandler(async (req, res) => {
  const data = await attendanceService.getAttendanceById(req.params.id);
  res.json({ success: true, data });
});

exports.getCourseAttendance = asyncHandler(async (req, res) => {
  const { attendanceRecords, stats } = await attendanceService.getCourseAttendance(req.params.courseId);
  res.json({ success: true, data: { attendanceRecords, stats } });
});

exports.getAttendanceStats = asyncHandler(async (req, res) => {
  const data = await attendanceService.getAttendanceStats(req.query);
  res.json({ success: true, data });
});
