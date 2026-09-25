const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth");
const { limitJudgeAccess } = require("../middleware/limitJudgeAccess");
const {
  listCompetitions,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  createEvaluation,
  rankings,
} = require("../controllers/competitions.controller");

router.get("/", protect, limitJudgeAccess, listCompetitions);

router.post(
  "/",
  protect,
  restrictTo("organizer", "superadmin", "admin"),
  createCompetition
);

router.put(
  "/:id",
  protect,
  restrictTo("organizer", "superadmin", "admin"),
  updateCompetition
);

router.delete(
  "/:id",
  protect,
  restrictTo("organizer", "superadmin", "admin"),
  deleteCompetition
);

// Teams routes moved to /api/teams

router.post(
  "/:id/evaluations",
  protect,
  restrictTo("judge"),
  limitJudgeAccess,
  createEvaluation
);

router.get("/:id/rankings", protect, limitJudgeAccess, rankings);

module.exports = router;
