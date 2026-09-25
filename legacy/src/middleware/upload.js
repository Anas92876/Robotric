const multer = require("multer");
const { makeFileFilter, withVerification } = require("./fileValidation");

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
// "application/octet-stream" used to be listed here. It is the browser's
// "unknown type" value, so allowing it allowed every file. Removed; the real
// zip/rar aliases are normalised in fileValidation instead.
const ALLOWED_ARCHIVE_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
];

// Store in memory.
// Note: memory storage means limits below are also a RAM budget per request.
const storage = multer.memoryStorage();

// Requires mimetype AND extension to agree. Previously either one sufficed,
// and both are client-controlled — see fileValidation.js.
const fileFilter = makeFileFilter({
  mimes: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_ARCHIVE_TYPES],
  extensions: ["jpg", "jpeg", "png", "webp", "zip", "rar"],
  label: "JPEG, PNG, WebP, ZIP, RAR",
});

// 50MB x 20 files allowed a single request to buffer 1GB into RAM, which is an
// out-of-memory kill rather than a rejected request. Reduced to a budget the
// container can actually absorb.
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
});

module.exports = withVerification(upload);
module.exports.ALLOWED_ARCHIVE_TYPES = ALLOWED_ARCHIVE_TYPES;
