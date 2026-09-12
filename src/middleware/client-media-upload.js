const multer = require('multer');
const { withVerification } = require('./fileValidation');

// Client task-request media: image, video, or voice recording.
// One file per request (see supabaseMedia.service.js for why uploads are sequential,
// not batched) — field name is deliberately "file" (singular), distinct from the
// existing Cloudinary pipeline's "images" field, to avoid any mixed-pipeline confusion.

const ALLOWED_MIME = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'], // quicktime = iPhone .mov
  audio: ['audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/mpeg', 'audio/ogg'], // MediaRecorder output varies by browser
};

const MAX_BYTES = {
  image: 15 * 1024 * 1024,  // 15MB
  video: 300 * 1024 * 1024, // 300MB
  audio: 20 * 1024 * 1024,  // 20MB
};

function kindOf(mimetype) {
  if (ALLOWED_MIME.image.includes(mimetype)) return 'image';
  if (ALLOWED_MIME.video.includes(mimetype)) return 'video';
  if (ALLOWED_MIME.audio.includes(mimetype)) return 'audio';
  return null;
}

// Extensions accepted per category, paired with ALLOWED_MIME above. The
// mimetype alone is client-controlled, so the extension must agree too; the
// magic-byte check in verifyUploadedFiles then confirms the actual contents.
const ALLOWED_EXT = {
  image: ['jpg', 'jpeg', 'png', 'webp'],
  video: ['mp4', 'mov', 'webm'],
  audio: ['webm', 'mp4', 'm4a', 'mp3', 'ogg', 'oga'],
};

const fileFilter = (req, file, cb) => {
  const kind = kindOf(file.mimetype);
  if (!kind) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }

  const parts = String(file.originalname || '').toLowerCase().split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  if (!ALLOWED_EXT[kind].includes(ext)) {
    return cb(new Error(`File extension ".${ext}" does not match type ${file.mimetype}`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  // multer's limits.fileSize is a single global ceiling (can't vary by mimetype
  // declaratively) — set it to the largest category and enforce the tighter
  // per-kind caps in the controller once req.file.mimetype is known.
  limits: { fileSize: MAX_BYTES.video, files: 1 },
});

module.exports = withVerification(upload);
module.exports.kindOf = kindOf;
module.exports.ALLOWED_EXT = ALLOWED_EXT;
module.exports.ALLOWED_MIME = ALLOWED_MIME;
module.exports.MAX_BYTES = MAX_BYTES;
