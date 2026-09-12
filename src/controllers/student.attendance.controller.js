const asyncHandler       = require('../utils/asyncHandler');
const attendanceService  = require('../services/student.attendance.service');

exports.getAttendanceOverview = asyncHandler(async (req, res) => {
  const data = await attendanceService.getAttendanceOverview(req.user._id);
  res.json({ success: true, data });
});

exports.getCourseAttendance = asyncHandler(async (req, res) => {
  const data = await attendanceService.getCourseAttendance(req.user._id, req.params.courseId);
  res.json({ success: true, count: data.length, data });
});

exports.getAttendanceSummary = asyncHandler(async (req, res) => {
  const data = await attendanceService.getAttendanceSummary(req.user._id, req.params.courseId);
  res.json({ success: true, data });
});

exports.getMonthlyAttendance = asyncHandler(async (req, res) => {
  const { courseId, year, month } = req.params;
  const data = await attendanceService.getMonthlyAttendance(req.user._id, courseId, year, month);
  res.json({
    success: true,
    month:   `${year}-${String(month).padStart(2, '0')}`,
    count:   data.length,
    data
  });
});
