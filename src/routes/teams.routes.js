const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { limitJudgeAccess } = require("../middleware/limitJudgeAccess");
const {
  listTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
} = require("../controllers/teams.controller");

router.get("/", protect, limitJudgeAccess, listTeams);
router.get("/:id", protect, getTeamById);
router.post("/", protect, createTeam);
router.put("/:id", protect, updateTeam);
router.delete("/:id", protect, deleteTeam);

module.exports = router;
