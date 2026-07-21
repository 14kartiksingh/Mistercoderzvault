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
            create: uploadType === 'MULTIPART' ? [] : sortedFiles.map((f) => ({
              fileName: f.name,
              fileSize: BigInt(f.size || 0),
              relativePath: f.path || null,
              partNumber: null
            }))
          }
        }
      });

      // Store in database
      await setCurrentUploadId(uploadId, {
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
    await setCurrentUploadId(uploadId, {
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
router.get('/status/:uploadId', requireAuth, async (req, res) => {
  const { uploadId } = req.params;
  const status = await checkUploadStatus(uploadId);
  return res.json({ status });
});

/**
 * Finish an upload session manually (for Multipart or Folder uploads)
 * POST /api/telegram/upload-finish/:uploadId
 */
router.post('/upload-finish/:uploadId', requireAuth, async (req, res) => {
  const { uploadId } = req.params;
  const assetId = await getActiveAssetId(uploadId);
  
  try {
    if (assetId) {
      // Mark the asset as complete (not pending)
      await prisma.asset.update({
        where: { id: assetId },
        data: { isPending: false }
      });
    }
    await markUploadComplete(uploadId);
    await clearSession();
    return sendSuccess(res, { message: 'Upload successfully finished' });
  } catch (error) {
    console.error('Error finishing upload session:', error);
    return sendError(res, 'Failed to finish upload session', 500);
  }
});

/**
 * Cancel an upload session manually (clean up pending database asset and clear session)
 * POST /api/telegram/upload-cancel/:uploadId
 */
router.post('/upload-cancel/:uploadId', requireAuth, async (req, res) => {
  const { uploadId } = req.params;
  const assetId = await getActiveAssetId(uploadId);

  try {
    if (assetId) {
      // Verify first that it's a pending asset
      const asset = await prisma.asset.findUnique({
        where: { id: assetId }
      });

      if (asset && asset.isPending) {
        // Delete dependent AssetFile records first
        await prisma.assetFile.deleteMany({
          where: { assetId: assetId }
        });
        // Delete the Asset record itself
        await prisma.asset.delete({
          where: { id: assetId }
        });
        console.log(`[Cancel Upload] Cleaned up pending database records for Asset ID: ${assetId}`);
      }
    }
    await clearSession();
    return sendSuccess(res, { message: 'Upload successfully cancelled' });
  } catch (error) {
    console.error('Error cancelling upload session:', error);
    return sendError(res, 'Failed to cancel upload session', 500);
  }
});

/**
 * Append files to an existing upload session
 * POST /api/telegram/upload-append
 */
router.post('/upload-append', requireAuth, async (req, res) => {
  const { uploadId, assetId, files, expectedPartsToAdd } = req.body;
  
  if (!uploadId || !assetId) {
    return sendError(res, 'uploadId and assetId are required');
  }

  try {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { files: true }
    });

    if (!asset || (asset.uploadType !== 'MULTIPART' && asset.uploadType !== 'FOLDER')) {
      return sendError(res, 'Invalid asset or asset type for appending');
    }

    const uploadType = asset.uploadType;
    let expectedTotalParts = 0;
    
    if (uploadType === 'MULTIPART') {
      if (!expectedPartsToAdd || expectedPartsToAdd <= 0) {
        return sendError(res, 'expectedPartsToAdd is required for MULTIPART appends');
      }
    } else {
      if (!files || files.length === 0) {
        return sendError(res, 'files are required for FOLDER appends');
      }
    }

    // Logic for FOLDER (legacy append)
    if (uploadType === 'FOLDER') {
      const existingNames = new Set(asset.files.map(f => (f.relativePath || f.fileName).toLowerCase()));
      const totalSizeBytes = files.reduce((acc, f) => acc + BigInt(f.size || 0), BigInt(0));

      for (const f of files) {
        const pathToCheck = (f.path || f.name).toLowerCase();
        if (existingNames.has(pathToCheck)) {
          return sendError(res, `Duplicate file detected: ${f.name}`);
        }
      }

      await prisma.assetFile.createMany({
        data: files.map((f) => ({
          assetId: asset.id,
          fileName: f.name,
          fileSize: BigInt(f.size || 0),
          relativePath: (f.path || f.name),
          partNumber: null
        }))
      });

      await prisma.asset.update({
        where: { id: assetId },
        data: {
          sizeBytes: BigInt(asset.sizeBytes) + totalSizeBytes
        }
      });
    }

    // Store in database via setCurrentUploadId
    await setCurrentUploadId(uploadId, {
      assetId: asset.id,
      uploadType: uploadType,
      isAppend: true,
      existingParts: uploadType === 'MULTIPART' ? asset.files.length : undefined,
      expectedPartsToAdd: uploadType === 'MULTIPART' ? expectedPartsToAdd : undefined
    });

    return sendSuccess(res, { assetId: asset.id });
  } catch (error) {
    console.error('Error appending files to asset:', error);
    return sendError(res, 'Failed to initialize append session', 500);
  }
});

module.exports = router;
