const express = require('express');
const router = express.Router();
const { setCurrentUploadId, checkUploadStatus } = require('../../utils/telegramBot');
const requireAuth = require('../../middleware/requireAuth');

// Note: These endpoints are for upload workflow only.

/**
 * Start an upload session
 * POST /api/telegram/upload-start
 */
router.post('/upload-start', requireAuth, (req, res) => {
  const { uploadId, metadata } = req.body;
  if (!uploadId) {
    return res.status(400).json({ status: 'error', message: 'uploadId is required' });
  }

  setCurrentUploadId(uploadId, metadata);
  return res.json({ status: 'success' });
});

/**
 * Check upload status
 * GET /api/telegram/status/:uploadId
 */
router.get('/status/:uploadId', requireAuth, (req, res) => {
  const { uploadId } = req.params;
  const status = checkUploadStatus(uploadId);
  
  return res.json({ status });
});

module.exports = router;
