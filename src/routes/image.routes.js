const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const ImageController = require("../controllers/image.controller");
const { protect, restrictTo } = require("../middleware/auth");

// Public routes - these should come first to avoid conflicts
router.get("/:id", ImageController.getImage);
router.get("/:id/thumbnail", ImageController.getThumbnail);

// NEW: Get image by associated entity (public route)
router.get("/by/:imageType/:associatedId", ImageController.getImageByAssociation);
router.get("/by/:imageType/:associatedId/thumbnail", ImageController.getThumbnailByAssociation);

// Auth required
router.use(protect);

// Admins and superadmins only
router.use(restrictTo("admin", "superadmin"));
router.post("/upload", upload.single("image"), ImageController.uploadSingle);

module.exports = router;
