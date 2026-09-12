const Image = require("../models/Image");
const sharp = require("sharp");
const fs = require("fs").promises;
const logger = require("../utils/logger");
const asyncHandler = require("../utils/asyncHandler");
const { BadRequestError, NotFoundError, InternalError } = require("../utils/errors");
let uuidv4;

// Dynamically import uuid for ESM compatibility
import("uuid").then((mod) => {
  uuidv4 = mod.v4;
});
const path = require("path");

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(err => {
  logger.error('Failed to create uploads directory', err);
});

class ImageController {
  // Upload single
  static uploadSingle = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new BadRequestError('No file provided', 'NO_FILE');
    }

    const { imageType, associatedId, associatedModel } = req.body;
    if (!["profile", "part", "project", "post", "other"].includes(imageType)) {
      throw new BadRequestError('Invalid imageType. Must be one of: profile, part, project, post, other', 'INVALID_IMAGE_TYPE');
    }

    let buffer = req.file.buffer;
    const mimetype = req.file.mimetype;

    // Try to optimize image, but continue with original if optimization fails
    try {
      const meta = await sharp(buffer).metadata();
      let s = sharp(buffer);
      if (meta.width > 1920 || meta.height > 1920) {
        s = s.resize(1920, 1920, { fit: "inside", withoutEnlargement: true });
      }
      if (mimetype === "image/jpeg") {
        buffer = await s.jpeg({ quality: 85 }).toBuffer();
      } else if (mimetype === "image/png") {
        buffer = await s.png({ compressionLevel: 8 }).toBuffer();
      } else {
        buffer = await s.toBuffer();
      }
    } catch (err) {
      logger.logError(err, { context: 'image_optimization_failed' });
      // Continue with original buffer if optimization fails
    }

    // Get original filename without extension
    const originalNameWithoutExt = path.parse(req.file.originalname).name;
    // Get extension from original file
    const ext = path.extname(req.file.originalname);
    // Add timestamp prefix to avoid conflicts while keeping original name
    const filename = `${Date.now()}_${originalNameWithoutExt}${ext}`;

    // Save to filesystem
    const filePath = path.join(UPLOADS_DIR, filename);
    try {
      await fs.writeFile(filePath, buffer);
      logger.info(`File saved to filesystem: ${filePath}`);
    } catch (error) {
      logger.logError(error, { context: 'filesystem_write_failed', filePath });
      throw new InternalError('Failed to save file to filesystem', 'FILESYSTEM_ERROR');
    }

    // Save to database
    let image;
    try {
      image = await Image.create({
        filename,
        originalname: req.file.originalname,
        mimetype,
        size: buffer.length,
        data: buffer,
        filePath, // Store the file path in database
        imageType,
        associatedId: associatedId || null,
        associatedModel: associatedModel || null,
        uploadedBy: req.user.id,
      });
    } catch (error) {
      logger.logError(error, { context: 'database_save_failed', filePath });
      
      // Try to clean up file if database save fails
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        logger.logError(unlinkError, { context: 'cleanup_failed_after_db_error', filePath });
      }
      
      throw new InternalError('Failed to save image to database', 'DATABASE_ERROR');
    }

    res.status(201).json({
      success: true,
      data: { _id: image._id, url: `/api/images/${image._id}` },
    });
  });

  // Get image by ID
  static getImage = asyncHandler(async (req, res) => {
    const image = await Image.findById(req.params.id);
    if (!image) {
      throw new NotFoundError('Image', 'IMAGE_NOT_FOUND');
    }

    // Try to serve from filesystem first
    const filePath = path.join(UPLOADS_DIR, image.filename);
    try {
      await fs.access(filePath);
      res.set({ "Content-Type": image.mimetype });
      res.sendFile(filePath);
    } catch {
      // Fallback to database if file doesn't exist in filesystem
      res.set({
        "Content-Type": image.mimetype,
        "Content-Length": image.size,
      });
      res.send(image.data);
    }
  });

  // NEW: Get image by associated entity
  static getImageByAssociation = asyncHandler(async (req, res) => {
    const { associatedId, imageType } = req.params;
    
    const image = await Image.findOne({
      associatedId,
      imageType,
      isActive: true
    }).sort({ createdAt: -1 }); // Get the most recent image
    
    if (!image) {
      throw new NotFoundError('Image', 'IMAGE_NOT_FOUND');
    }

    // Try to serve from filesystem first
    const filePath = path.join(UPLOADS_DIR, image.filename);
    try {
      await fs.access(filePath);
      res.set({ "Content-Type": image.mimetype });
      res.sendFile(filePath);
    } catch {
      // Fallback to database if file doesn't exist in filesystem
      res.set({
        "Content-Type": image.mimetype,
        "Content-Length": image.size,
      });
      res.send(image.data);
    }
  });

  // Get thumbnail
  static getThumbnail = asyncHandler(async (req, res) => {
    const image = await Image.findById(req.params.id);
    if (!image) {
      throw new NotFoundError('Image', 'IMAGE_NOT_FOUND');
    }

    try {
      const thumb = await sharp(image.data)
        .resize(
          parseInt(req.query.width || 150),
          parseInt(req.query.height || 150)
        )
        .jpeg({ quality: 80 })
        .toBuffer();

      res.set({ "Content-Type": "image/jpeg", "Content-Length": thumb.length });
      res.send(thumb);
    } catch (error) {
      logger.logError(error, { context: 'thumbnail_generation_failed', imageId: req.params.id });
      throw new InternalError('Failed to generate thumbnail', 'THUMBNAIL_ERROR');
    }
  });

  // NEW: Get thumbnail by association
  static getThumbnailByAssociation = asyncHandler(async (req, res) => {
    const { associatedId, imageType } = req.params;
    
    const image = await Image.findOne({
      associatedId,
      imageType,
      isActive: true
    }).sort({ createdAt: -1 });
    
    if (!image) {
      throw new NotFoundError('Image', 'IMAGE_NOT_FOUND');
    }

    try {
      const thumb = await sharp(image.data)
        .resize(
          parseInt(req.query.width || 150),
          parseInt(req.query.height || 150)
        )
        .jpeg({ quality: 80 })
        .toBuffer();

      res.set({ "Content-Type": "image/jpeg", "Content-Length": thumb.length });
      res.send(thumb);
    } catch (error) {
      logger.logError(error, {
        context: 'thumbnail_generation_failed',
        associatedId,
        imageType
      });
      throw new InternalError('Failed to generate thumbnail', 'THUMBNAIL_ERROR');
    }
  });
}

module.exports = ImageController;