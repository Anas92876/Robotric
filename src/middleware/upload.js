const multer = require("multer");

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_ARCHIVE_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/octet-stream", // some browsers send rar as this
];

// Store in memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  const isArchiveExt = ext === 'zip' || ext === 'rar';

  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else if (ALLOWED_ARCHIVE_TYPES.includes(file.mimetype) || isArchiveExt) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed: JPEG, PNG, WebP, ZIP, RAR."), false);
  }
};

// Multer instance — 50MB limit, no request timeout enforced here
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 20 },
});

module.exports = upload;
module.exports.ALLOWED_ARCHIVE_TYPES = ALLOWED_ARCHIVE_TYPES;
