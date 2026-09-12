const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  updateProjectParts,
} = require("../controllers/projects.controller");

router.get("/", protect, listProjects);
router.post("/", protect, createProject);
router.put("/:id", protect, updateProject);
router.delete("/:id", protect, deleteProject);
router.put("/:id/parts", protect, updateProjectParts);

module.exports = router;
