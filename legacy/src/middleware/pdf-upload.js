const multer = require('multer');
const { makeFileFilter, withVerification } = require('./fileValidation');

// Use memory storage (file kept in RAM temporarily)
const storage = multer.memoryStorage();

// Requires both the mimetype and a .pdf extension; the magic-byte check in
// verifyUploadedFiles is what actually proves the bytes are a PDF.
const fileFilter = makeFileFilter({
  mimes: ['application/pdf'],
  extensions: ['pdf'],
  label: 'PDF',
});

// 100MB of memory storage per request was an easy out-of-memory kill.
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
});

module.exports = withVerification(upload);
