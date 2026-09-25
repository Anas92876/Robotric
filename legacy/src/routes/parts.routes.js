const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  listParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
} = require("../controllers/parts.controller");

router.get("/", listParts);
router.get("/:id", getPartById);

router.post("/", protect, restrictTo("admin", "superadmin"), createPart);

router.put("/:id", protect, restrictTo("admin", "superadmin"), updatePart);

router.delete("/:id", protect, restrictTo("admin", "superadmin"), deletePart);

module.exports = router;
