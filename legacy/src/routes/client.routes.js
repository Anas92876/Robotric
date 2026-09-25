const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const clientCtrl = require('../controllers/client.controller');
const mediaUpload = require('../middleware/client-media-upload');

router.use(requireAuth);
router.use(requireRoles('client'));

// Projects
router.get('/projects', clientCtrl.getMyProjects);
router.get('/projects/:id', clientCtrl.getProjectById);

// Tasks (requests)
router.get('/tasks', clientCtrl.getMyTasks);
router.get('/tasks/:id', clientCtrl.getTaskById);
router.post('/tasks', clientCtrl.createTask);

// Media (image / video / voice)
router.post('/tasks/:id/media', mediaUpload.single('file'), clientCtrl.addMedia);
router.get('/tasks/:id/media', clientCtrl.getMedia);
router.delete('/tasks/:id/media/:mediaId', clientCtrl.deleteMedia);

module.exports = router;
