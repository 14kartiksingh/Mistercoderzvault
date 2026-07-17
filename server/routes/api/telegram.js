const express = require('express');
const router = express.Router();
const prisma = require('../../config/db');
const { setCurrentUploadId, checkUploadStatus, markUploadComplete, getActiveAssetId, clearSession } = require('../../utils/telegramBot');
const requireAuth = require('../../middleware/requireAuth');
const { sendSuccess, sendError } = require('../../utils/response');

// Note: These endpoints are for upload workflow only.

/**
 * Start an upload session
 * POST /api/telegram/upload-start
 */
router.post('/upload-start', requireAuth, async (req, res) => {
  const { uploadId, metadata } = req.body;
  if (!uploadId) {
    return sendError(res, 'uploadId is required');
  }

  // If upload type is MULTIPART or FOLDER, pre-create the Asset and AssetFiles in database
  if (metadata && (metadata.uploadType === 'MULTIPART' || metadata.uploadType === 'FOLDER')) {
    try {
      const uploadType = metadata.uploadType;
      const files = metadata.files || [];
      const totalSizeBytes = files.reduce((acc, f) => acc + BigInt(f.size || 0), BigInt(0));

      // Resolve category
      const categorySlug = metadata.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let category = await prisma.category.findUnique({
        where: { slug: categorySlug }
      });
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: metadata.category,
            slug: categorySlug
          }
        });
      }

      // Prepare tags
      const tagConnectOrCreate = (metadata.tags || []).map((t) => {
        const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return {
          where: { slug },
          create: { name: t, slug },
        };
      });

      // Sort files alphabetically for auto-generating part numbers in MULTIPART
      const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

      // Create Asset and AssetFile records
      const newAsset = await prisma.asset.create({
        data: {
          name: metadata.title,
          description: metadata.description || null,
          thumbnailUrl: metadata.thumbnail || null,
          visibility: 'PRIVATE',
          uploadType: uploadType,
          isPending: true,
          contentType: uploadType,
          sizeBytes: totalSizeBytes,
          categoryId: category.id,
          tags: {
            connectOrCreate: tagConnectOrCreate,
          },
          files: {
            create: sortedFiles.map((f, idx) => ({
              fileName: f.name,
              fileSize: BigInt(f.size || 0),
              relativePath: f.path || null,
              partNumber: uploadType === 'MULTIPART' ? (idx + 1) : null
            }))
          }
        }
      });

      // Store in memory
      setCurrentUploadId(uploadId, {
        ...metadata,
        assetId: newAsset.id
      });

      return sendSuccess(res, { assetId: newAsset.id });
    } catch (error) {
      console.error('Error pre-creating asset for upload:', error);
      return sendError(res, 'Failed to initialize upload session', 500);
    }
  } else {
    // SINGLE upload: keep existing deferred creation
    setCurrentUploadId(uploadId, {
      ...metadata,
      uploadType: 'SINGLE'
    });
    return sendSuccess(res, null);
  }
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

/**
 * Finish an upload session manually (for Multipart or Folder uploads)
 * POST /api/telegram/upload-finish/:uploadId
 */
router.post('/upload-finish/:uploadId', requireAuth, async (req, res) => {
  const { uploadId } = req.params;
  const assetId = getActiveAssetId(uploadId);
  
  try {
    if (assetId) {
      // Mark the asset as complete (not pending)
      await prisma.asset.update({
        where: { id: assetId },
        data: { isPending: false }
      });
    }
    markUploadComplete(uploadId);
    clearSession();
    return sendSuccess(res, { message: 'Upload successfully finished' });
  } catch (error) {
    console.error('Error finishing upload session:', error);
    return sendError(res, 'Failed to finish upload session', 500);
  }
});

module.exports = router;
