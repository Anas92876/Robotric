const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError } = require('../utils/errors');
const InternalTask = require('../models/InternalTask');
const InternalProject = require('../models/InternalProject');
const User = require('../models/User');
const EmployeeOfMonthOverride = require('../models/EmployeeOfMonthOverride');

const PRIORITY_WEIGHT = { 1: 15, 2: 10, 3: 5 };
const ON_TIME_BONUS = 5;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

exports.getAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // ── Employee scores ───────────────────────────────────────────────────────
  const allDoneTasks = await InternalTask.find({ status: 'done' })
    .select('assignedTo priority dueDate completedAt updatedAt')
    .lean();

  const scoreMap = {};

  for (const task of allDoneTasks) {
    const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [];
    const completedAt = task.completedAt || task.updatedAt;
    const isThisMonth = completedAt >= startOfMonth;
    const base = PRIORITY_WEIGHT[task.priority] || 5;
    const onTime = task.dueDate && completedAt <= new Date(task.dueDate) ? ON_TIME_BONUS : 0;
    const points = base + onTime;

    for (const userId of assignees) {
      const key = userId.toString();
      if (!scoreMap[key]) scoreMap[key] = { allTime: 0, thisMonth: 0, tasksAllTime: 0, tasksThisMonth: 0 };
      scoreMap[key].allTime += points;
      scoreMap[key].tasksAllTime += 1;
      if (isThisMonth) {
        scoreMap[key].thisMonth += points;
        scoreMap[key].tasksThisMonth += 1;
      }
    }
  }

  const scoredUserIds = Object.keys(scoreMap);
  const scoredUsers = scoredUserIds.length > 0
    ? await User.find({ _id: { $in: scoredUserIds } }).select('_id name email role').lean()
    : [];

  const employeeScores = scoredUsers.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    allTimeScore: scoreMap[u._id.toString()].allTime,
    thisMonthScore: scoreMap[u._id.toString()].thisMonth,
    tasksAllTime: scoreMap[u._id.toString()].tasksAllTime,
    tasksThisMonth: scoreMap[u._id.toString()].tasksThisMonth,
  })).sort((a, b) => b.thisMonthScore - a.thisMonthScore);

  // ── Employee of the Month ─────────────────────────────────────────────────
  const manualOverride = await EmployeeOfMonthOverride.findOne({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }).populate('userId', 'name email role').lean();

  let employeeOfMonth = null;
  if (manualOverride?.userId) {
    const s = scoreMap[manualOverride.userId._id.toString()] || { thisMonth: 0, tasksThisMonth: 0 };
    employeeOfMonth = {
      _id: manualOverride.userId._id,
      name: manualOverride.userId.name,
      email: manualOverride.userId.email,
      role: manualOverride.userId.role,
      score: s.thisMonth,
      tasks: s.tasksThisMonth,
      isManual: true,
    };
  } else if (employeeScores[0]) {
    const top = employeeScores[0];
    employeeOfMonth = {
      _id: top._id,
      name: top.name,
      email: top.email,
      role: top.role,
      score: top.thisMonthScore,
      tasks: top.tasksThisMonth,
      isManual: false,
    };
  }

  // ── Monthly productivity (last 6 months) ──────────────────────────────────
  const monthlyRaw = await InternalTask.aggregate([
    { $match: { status: 'done', updatedAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } },
        completed: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthlyProductivity = monthlyRaw.map(m => ({
    month: `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`,
    completed: m.completed,
  }));

  // ── Status breakdown ──────────────────────────────────────────────────────
  const statusCounts = await InternalTask.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const statusBreakdown = { todo: 0, in_progress: 0, done: 0 };
  for (const s of statusCounts) statusBreakdown[s._id] = s.count;

  // ── Priority breakdown ────────────────────────────────────────────────────
  const priorityCounts = await InternalTask.aggregate([
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);
  const priorityBreakdown = { 1: 0, 2: 0, 3: 0 };
  for (const p of priorityCounts) priorityBreakdown[p._id] = p.count;

  // ── Top employees for bar chart (first name, this month) ─────────────────
  const topEmployees = employeeScores.slice(0, 8).map(e => ({
    name: e.name.split(' ')[0],
    fullName: e.name,
    score: e.thisMonthScore,
    tasks: e.tasksThisMonth,
  }));

  // ── Overdue count (soft dueDate missed) ──────────────────────────────────
  const overdueCount = await InternalTask.countDocuments({
    status: { $ne: 'done' },
    dueDate: { $lt: now },
  });

  // ── Hard deadline breached count ──────────────────────────────────────────
  const hardDeadlineBreachedCount = await InternalTask.countDocuments({
    status: { $ne: 'done' },
    hardDeadline: { $lt: now },
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const [totalProjects, totalTasks, totalUsers] = await Promise.all([
    InternalProject.countDocuments({ parentProject: null }),
    InternalTask.countDocuments(),
    User.countDocuments({ role: { $ne: 'student' } }),
  ]);

  res.json({
    success: true,
    data: {
      summary: { totalProjects, totalTasks, totalUsers, overdueCount, hardDeadlineBreachedCount, ...statusBreakdown },
      priorityBreakdown,
      monthlyProductivity,
      statusBreakdown,
      employeeScores,
      topEmployees,
      employeeOfMonth,
    },
  });
});

exports.setEmployeeOfMonth = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const now = new Date();

  const user = await User.findById(userId).select('_id name email role');
  if (!user) throw new NotFoundError('User', 'USER_NOT_FOUND');

  await EmployeeOfMonthOverride.findOneAndUpdate(
    { month: now.getMonth() + 1, year: now.getFullYear() },
    { userId, month: now.getMonth() + 1, year: now.getFullYear() },
    { upsert: true, new: true }
  );

  res.json({ success: true, message: 'Employee of the Month updated', data: user });
});

exports.clearEmployeeOfMonth = asyncHandler(async (req, res) => {
  const now = new Date();
  await EmployeeOfMonthOverride.deleteOne({ month: now.getMonth() + 1, year: now.getFullYear() });
  res.json({ success: true, message: 'Override cleared — score-based selection restored' });
});
