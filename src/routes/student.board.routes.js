const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { requireGroupMembership } = require('../middleware/groupOwnership');
const board = require('../controllers/board.controller');

router.use(requireAuth);
router.use(requireRoles('student'));

// GET  /api/student/board/:groupId          — get board (notes + tasks)
router.get('/:groupId', requireGroupMembership, board.getBoard);

// Notes
router.post('/:groupId/notes', requireGroupMembership, board.createNote);
router.patch('/:groupId/notes/:noteId', requireGroupMembership, board.updateNote);
router.delete('/:groupId/notes/:noteId', requireGroupMembership, board.deleteNote);

// Task status update (own tasks only, enforced in controller)
router.patch('/:groupId/tasks/:taskId/status', requireGroupMembership, board.updateTaskStatus);

module.exports = router;
