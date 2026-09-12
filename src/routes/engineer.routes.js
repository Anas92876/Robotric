const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const engineerCtrl = require('../controllers/engineer.controller');
const subTasksCtrl = require('../controllers/subtasks.controller');
const timeExtCtrl = require('../controllers/timeExtension.controller');
const workCtrl = require('../controllers/workSessions.controller');
const upload = require('../middleware/upload');

router.use(requireAuth);

router.get('/projects', engineerCtrl.getMyProjects);
router.get('/projects/:id', engineerCtrl.getProjectById);
router.get('/tasks', engineerCtrl.getMyTasks);
router.patch('/tasks/:id/status', engineerCtrl.updateTaskStatus);
router.get('/tasks/:id/client-media', engineerCtrl.getClientMedia);

// Task submission (employee proof of work)
router.post('/tasks/:id/submission/images', upload.array('images', 10), engineerCtrl.addSubmissionImages);
router.delete('/tasks/:id/submission/images/:publicId', engineerCtrl.deleteSubmissionImage);
router.patch('/tasks/:id/submission/links', engineerCtrl.updateSubmissionLinks);

// Sub-tasks (employee: read, create, toggle, delete own)
router.get('/tasks/:taskId/subtasks', subTasksCtrl.getSubTasksEmployee);
router.post('/tasks/:taskId/subtasks', subTasksCtrl.createSubTask);
router.patch('/subtasks/:id/toggle', subTasksCtrl.toggleSubTask);
router.delete('/subtasks/:id', subTasksCtrl.deleteSubTaskEmployee);

// Work clock (hourly staff: clock in/out + own history)
router.get('/work/status', workCtrl.getWorkStatus);
router.post('/work/start', workCtrl.startWork);
router.post('/work/stop', workCtrl.stopWork);
router.get('/work/sessions', workCtrl.getMySessions);

// Time extension requests (employee)
router.post('/tasks/:taskId/extension-requests', timeExtCtrl.createRequest);
router.get('/tasks/:taskId/extension-requests', timeExtCtrl.getMyRequests);
router.delete('/extension-requests/:id', timeExtCtrl.cancelRequest);

module.exports = router;
