const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTrainerResources,
  getTrainerGroupsForResources
} = require('../controllers/trainer.resources.controller');

router.use(protect);

// GET /api/trainer/resources/groups  — list trainer's groups (filter dropdown)
router.get('/groups', getTrainerGroupsForResources);

// GET /api/trainer/resources  — all resources assigned to trainer's groups
router.get('/', getTrainerResources);

module.exports = router;
