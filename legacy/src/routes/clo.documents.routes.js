const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllDocuments,
  getStudentDocuments,
  updateDocumentStatus,
  downloadDocument,
  getStudentsSummary,
} = require('../controllers/clo.documents.controller');

router.use(protect);

// GET  /api/clo/documents                          — list all docs (paginated, filterable)
// GET  /api/clo/documents/students-summary         — per-student doc summary
// GET  /api/clo/documents/student/:studentId       — all docs for one student
// PATCH /api/clo/documents/:docId/status           — update verification status
// GET  /api/clo/documents/:docId/download          — get signed download URL

router.get('/', getAllDocuments);
router.get('/students-summary', getStudentsSummary);
router.get('/student/:studentId', getStudentDocuments);
router.patch('/:docId/status', updateDocumentStatus);
router.get('/:docId/download', downloadDocument);

module.exports = router;
