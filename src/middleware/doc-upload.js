const multer = require('multer');
const { makeFileFilter, withVerification } = require('./fileValidation');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

const storage = multer.memoryStorage();

// Requires mimetype AND extension to agree. The previous filter used OR, so
// either a truthful extension or a truthful mimetype was enough to pass, and
// the client controls both.
const fileFilter = makeFileFilter({
  mimes: ALLOWED_MIME_TYPES,
  extensions: ALLOWED_EXTENSIONS,
  label: 'JPEG, PNG, WebP, PDF',
});

const docUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

module.exports = withVerification(docUpload);
