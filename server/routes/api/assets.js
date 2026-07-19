const express = require('express');
const router = express.Router();
const assetController = require('../../controllers/assetController');
const requireAuth = require('../../middleware/requireAuth');

// Asset CRUD routes
router.get('/', assetController.getAssets);
router.get('/stats', assetController.getAssetStats);
router.get('/:id', assetController.getAssetById);
router.get('/:id/download', assetController.downloadAsset);
router.get('/file/:fileId/download', assetController.downloadFile);
router.post('/', requireAuth, assetController.createAsset);
router.put('/:id', requireAuth, assetController.updateAsset);
router.put('/:id/reorder-files', requireAuth, assetController.reorderAssetFiles);
router.delete('/file/:fileId', requireAuth, assetController.deleteAssetFile);
router.delete('/:id', requireAuth, assetController.deleteAsset);

module.exports = router;
