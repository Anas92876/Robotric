const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const docUpload = require('../middleware/doc-upload');
const {
  uploadDocument,
  getDocuments,
  deleteDocument,
  debugWroAccess,
} = require('../controllers/student.documents.controller');

router.use(protect);

// GET  /api/student/documents        — list own documents
// POST /api/student/documents        — upload/replace a document
router.route('/')
  .get(getDocuments)
  .post(docUpload.single('document'), uploadDocument);

// DELETE /api/student/documents/:docId — delete own pending document
router.delete('/:docId', deleteDocument);

// GET /api/student/documents/debug-wro — diagnose WRO access (dev only)
router.get('/debug-wro', debugWroAccess);

module.exports = router;
