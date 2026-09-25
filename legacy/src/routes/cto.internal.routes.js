const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const projectsCtrl = require('../controllers/cto.projects.controller');
const tasksCtrl = require('../controllers/cto.tasks.controller');
const analyticsCtrl = require('../controllers/cto.analytics.controller');
const subTasksCtrl = require('../controllers/subtasks.controller');
const timeExtCtrl = require('../controllers/timeExtension.controller');
const workCtrl = require('../controllers/workSessions.controller');
const upload = require('../middleware/upload');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireAuth);
router.use(requireRoles('cto', 'admin', 'superadmin'));

// All staff users list (for task assignment UI — excludes students)
router.get('/engineers', asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $ne: 'student' } })
    .select('_id name email role')
    .sort({ name: 1 })
    .lean();
  res.json({ success: true, data: users });
}));

// Client contacts list (for linking clients to a project)
router.get('/clients', asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'client' })
    .select('_id name email role')
    .sort({ name: 1 })
    .lean();
  res.json({ success: true, data: users });
}));

// Analytics
router.get('/analytics', analyticsCtrl.getAnalytics);
router.post('/analytics/employee-of-month', analyticsCtrl.setEmployeeOfMonth);
router.delete('/analytics/employee-of-month', analyticsCtrl.clearEmployeeOfMonth);

// Projects
router.post('/projects', projectsCtrl.createProject);
router.get('/projects', projectsCtrl.getProjects);
router.get('/projects/:id', projectsCtrl.getProjectById);
router.get('/projects/:id/sub-projects', projectsCtrl.getSubProjects);
router.post('/projects/:id/move', projectsCtrl.moveProject);
router.put('/projects/:id', projectsCtrl.updateProject);
router.delete('/projects/:id', projectsCtrl.deleteProject);

// Tasks
router.post('/tasks', tasksCtrl.createTask);
router.get('/tasks', tasksCtrl.getTasks);
router.get('/tasks/:id', tasksCtrl.getTaskById);
router.put('/tasks/:id', tasksCtrl.updateTask);
router.delete('/tasks/:id', tasksCtrl.deleteTask);

// Client requests
router.patch('/tasks/:id/decline', tasksCtrl.declineTask);
router.get('/tasks/:id/client-media', tasksCtrl.getClientMedia);

// Task attachments (manager uploads reference images)
router.post('/tasks/:id/attachments', upload.array('images', 10), tasksCtrl.addAttachments);
router.delete('/tasks/:id/attachments/:publicId', tasksCtrl.deleteAttachment);

// Sub-tasks (manager: read-all + delete any)
router.get('/tasks/:taskId/subtasks', subTasksCtrl.getSubTasksCTO);
router.delete('/subtasks/:id', subTasksCtrl.deleteSubTaskCTO);

// Work hours (manager: hourly staff + their clocked sessions)
router.get('/work/staff', workCtrl.getWorkStaff);
router.patch('/work/staff/:id/hourly', workCtrl.setHourlyFlag);
router.get('/work/sessions', workCtrl.getAllSessions);
router.put('/work/sessions/:id', workCtrl.updateSession);
router.delete('/work/sessions/:id', workCtrl.deleteSession);

// Time extension requests (manager: list all + review)
router.get('/extension-requests', timeExtCtrl.getAllRequests);
router.patch('/extension-requests/:id/review', timeExtCtrl.reviewRequest);

module.exports = router;
