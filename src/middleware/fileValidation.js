/**
 * Shared upload validation.
 *
 * The four upload middlewares each accepted a file when *either* its declared
 * mimetype *or* its filename extension looked acceptable. Both of those are
 * chosen by the client, so `payload.exe` renamed to `payload.pdf`, or sent with
 * `Content-Type: application/pdf`, passed. `upload.js` additionally allowed
 * `application/octet-stream`, which is the browser's "I don't know" type and
 * therefore matches anything at all.
 *
 * This module provides:
 *   - makeFileFilter(): requires mimetype AND extension to agree, both drawn
 *     from an explicit allowlist. Runs before the body is buffered, so it is
 *     the cheap first gate.
 *   - verifyMagicBytes(): inspects the actual leading bytes once the file is in
 *     memory. This is the gate that a renamed file cannot pass, and it must run
 *     after multer, because multer's own fileFilter sees headers only.
 */

// Leading-byte signatures. `offset` defaults to 0. `mask` entries of null match
// any byte at that position (used where a length field sits inside the header).
const SIGNATURES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/jpg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'application/zip': [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
    [0x50, 0x4b, 0x07, 0x08],
  ],
  'application/vnd.rar': [
    [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00],
    [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00],
  ],
  // ISO-BMFF containers: 4-byte size, then 'ftyp'.
  'video/mp4': [[null, null, null, null, 0x66, 0x74, 0x79, 0x70]],
  'video/quicktime': [[null, null, null, null, 0x66, 0x74, 0x79, 0x70]],
  'audio/mp4': [[null, null, null, null, 0x66, 0x74, 0x79, 0x70]],
  'audio/x-m4a': [[null, null, null, null, 0x66, 0x74, 0x79, 0x70]],
  // Matroska / WebM share the EBML header.
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
  'audio/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
  'audio/ogg': [[0x4f, 0x67, 0x67, 0x53]],
  'audio/mpeg': [
    [0x49, 0x44, 0x33], // ID3 tag
    [0xff, 0xfb],       // raw MPEG frame
    [0xff, 0xf3],
    [0xff, 0xf2],
  ],
};

// Aliases the browser may send for the same real format.
const MIME_ALIASES = {
  'application/x-zip-compressed': 'application/zip',
  'application/x-rar-compressed': 'application/vnd.rar',
};

function normalizeMime(mimetype) {
  const m = String(mimetype || '').toLowerCase();
  return MIME_ALIASES[m] || m;
}

function extensionOf(filename) {
  const parts = String(filename || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function matchesSignature(buffer, signature) {
  if (!buffer || buffer.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (signature[i] === null) continue;
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

/**
 * Does this buffer actually contain the format its mimetype claims?
 * Unknown mimetypes return false — allowlists must be explicit.
 */
function bufferMatchesMime(buffer, mimetype) {
  const candidates = SIGNATURES[normalizeMime(mimetype)];
  if (!candidates) return false;
  return candidates.some((sig) => matchesSignature(buffer, sig));
}

/**
 * Build a multer fileFilter that requires the declared mimetype AND the
 * filename extension to both be allowed. Note the AND: the previous filters
 * used OR, so satisfying either one was enough.
 *
 * @param {{mimes: string[], extensions: string[], label: string}} allowed
 */
function makeFileFilter({ mimes, extensions, label }) {
  const mimeSet = new Set(mimes.map(normalizeMime));
  const extSet = new Set(extensions.map((e) => e.toLowerCase()));

  return function fileFilter(req, file, cb) {
    const mime = normalizeMime(file.mimetype);
    const ext = extensionOf(file.originalname);

    if (!mimeSet.has(mime) || !extSet.has(ext)) {
      return cb(new Error(`Invalid file type. Allowed: ${label}.`), false);
    }
    cb(null, true);
  };
}

/**
 * Express middleware: verify the real bytes of everything multer parsed.
 *
 * Place immediately after the multer middleware on any route that accepts
 * uploads. Rejects with 400 rather than letting a disguised file reach storage.
 */
function verifyUploadedFiles(req, res, next) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    for (const group of Object.values(req.files)) {
      if (Array.isArray(group)) files.push(...group);
    }
  }

  for (const file of files) {
    // Only memory storage exposes a buffer; disk-backed uploads are read
    // elsewhere and are out of scope for this check.
    if (!file || !file.buffer) continue;

    if (!bufferMatchesMime(file.buffer, file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `File "${file.originalname}" does not match its declared type (${file.mimetype}).`,
          code: 'FILE_CONTENT_MISMATCH',
          statusCode: 400,
        },
      });
    }
  }

  next();
}

/**
 * Wrap a multer instance so every handler it produces runs verifyUploadedFiles
 * straight after parsing.
 *
 * Express accepts an array of middleware wherever it accepts one, so
 * `upload.single('image')` keeps its exact call signature at ~40 existing call
 * sites while gaining content verification. Wiring the check into each route by
 * hand would have meant editing all of them and missing some.
 */
function withVerification(multerInstance) {
  const wrapped = Object.create(multerInstance);

  for (const method of ['single', 'array', 'fields', 'any']) {
    if (typeof multerInstance[method] !== 'function') continue;
    wrapped[method] = (...args) => [
      multerInstance[method](...args),
      verifyUploadedFiles,
    ];
  }

  // `none()` parses no files, so there is nothing to verify.
  return wrapped;
}

module.exports = {
  makeFileFilter,
  verifyUploadedFiles,
  withVerification,
  bufferMatchesMime,
  normalizeMime,
  extensionOf,
};
