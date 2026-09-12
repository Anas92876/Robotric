const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { requireGroupOwnership } = require('../middleware/groupOwnership');
const board = require('../controllers/board.controller');

router.use(requireAuth);
router.use(requireRoles('trainer', 'teacher'));

// GET  /api/trainer/board/:groupId          — get board (notes + tasks)
router.get('/:groupId', requireGroupOwnership, board.getBoard);

// Notes
router.post('/:groupId/notes', requireGroupOwnership, board.createNote);
router.patch('/:groupId/notes/:noteId', requireGroupOwnership, board.updateNote);
router.delete('/:groupId/notes/:noteId', requireGroupOwnership, board.deleteNote);

// Tasks
router.post('/:groupId/tasks', requireGroupOwnership, board.createTask);
router.patch('/:groupId/tasks/:taskId', requireGroupOwnership, board.updateTask);
router.delete('/:groupId/tasks/:taskId', requireGroupOwnership, board.deleteTask);

module.exports = router;
