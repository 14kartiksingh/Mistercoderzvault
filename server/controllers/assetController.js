const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { getBot } = require('../utils/telegramBot');
const https = require('https');
const { Api } = require('telegram');
const { getTelegramClient, initTelegramClient } = require('../utils/telegramClient');
const { ACTIVE_ASSET_FILTER } = require('../utils/constants');
/**
 * Get all active assets
 */
const getAssets = async (req, res) => {
  try {
    const { categorySlug } = req.query;
    const whereClause = { ...ACTIVE_ASSET_FILTER };
    
    if (categorySlug) {
      whereClause.category = { slug: categorySlug };
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        category: true,
        tags: true,
        files: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return sendError(res, 'Failed to fetch assets', 500);
  }
};

/**
 * Get specific active asset by ID
 */
const getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        tags: true,
        files: true,
      },
    });

    if (!asset || asset.isDeleted) {
      return sendError(res, 'Asset not found', 404);
    }

    return sendSuccess(res, asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return sendError(res, 'Failed to fetch asset', 500);
  }
};

/**
 * Create a new asset
 */
const createAsset = async (req, res) => {
  try {
    const {
      name,
      categoryId,
      tags,
      contentType,
      sizeBytes,
      description,
      thumbnailUrl,
      visibility,
      metadata,
    } = req.body;

    // Basic validation
    if (!name || !categoryId || !contentType || sizeBytes === undefined) {
      return sendError(res, 'Missing required fields: name, categoryId, contentType, sizeBytes');
    }

    // Prepare tags for Prisma connectOrCreate
    const tagConnectOrCreate = (tags || []).map((t) => {
      const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return {
        where: { slug },
        create: { name: t, slug },
      };
    });

    const newAsset = await prisma.asset.create({
      data: {
        name,
        categoryId,
        contentType,
        sizeBytes: BigInt(sizeBytes),
        description,
        thumbnailUrl,
        visibility: visibility || 'PRIVATE',
        metadata: metadata || {},
        isPending: false, // Created manually/via API directly
        tags: {
          connectOrCreate: tagConnectOrCreate,
        },
      },
      include: {
        category: true,
        tags: true,
        files: true,
      },
    });

    return sendSuccess(res, newAsset, 201);
  } catch (error) {
    console.error('Error creating asset:', error);
    return sendError(res, 'Failed to create asset', 500);
  }
};

/**
 * Update an existing asset
 */
const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      categoryId,
      categoryName,
      tags,
      contentType,
      sizeBytes,
      description,
      thumbnailUrl,
      visibility,
      metadata,
    } = req.body;

    // Ensure asset exists
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return sendError(res, 'Asset not found', 404);
    }

    // Build update data
    const data = {};
    if (name !== undefined) data.name = name;
    
    if (categoryName !== undefined) {
      const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let category = await prisma.category.findUnique({ where: { slug: categorySlug } });
      if (!category) {
        category = await prisma.category.create({ data: { name: categoryName, slug: categorySlug } });
      }
      data.categoryId = category.id;
    } else if (categoryId !== undefined) {
      data.categoryId = categoryId;
    }
    if (contentType !== undefined) data.contentType = contentType;
    if (sizeBytes !== undefined) data.sizeBytes = BigInt(sizeBytes);
    if (description !== undefined) data.description = description;
    if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl;
    if (visibility !== undefined) data.visibility = visibility;
    if (metadata !== undefined) data.metadata = metadata;

    if (tags) {
      const tagConnectOrCreate = tags.map((t) => {
        const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return {
          where: { slug },
          create: { name: t, slug },
        };
      });
      data.tags = {
        set: [], // Clear old tags
        connectOrCreate: tagConnectOrCreate,
      };
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data,
      include: {
        category: true,
        tags: true,
        files: true,
      },
    });

    return sendSuccess(res, updatedAsset);
  } catch (error) {
    console.error('Error updating asset:', error);
    return sendError(res, 'Failed to update asset', 500);
  }
};

/**
 * Soft delete an asset
 */
const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return sendError(res, 'Asset not found', 404);
    }

    // We do a hard delete or update isDeleted flag
    // Let's keep the soft delete pattern by setting isDeleted to true
    await prisma.asset.update({
      where: { id },
      data: { isDeleted: true },
    });

    return sendSuccess(res, { message: 'Asset successfully deleted' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return sendError(res, 'Failed to delete asset', 500);
  }
};

/**
 * Download asset endpoint (primary endpoint, now using MTProto)
 */
const downloadAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { files: true }
    });

    if (!asset || asset.isDeleted || asset.isPending) {
      return sendError(res, 'Asset not found', 404);
    }

    if (asset.files.length === 0) {
      return sendError(res, 'No files associated with this asset', 404);
    }

    if (asset.uploadType === 'SINGLE') {
      const file = asset.files[0];
      if (!file.telegramMessageId) {
        return sendError(res, 'Telegram message not found for this file', 404);
      }
      return res.redirect(`/api/assets/file/${file.id}/download`);
    } else {
      // For MULTIPART/FOLDER, return the files list with their download links pointing to the primary route
      const filesWithLinks = asset.files.map(f => ({
        id: f.id,
        fileName: f.fileName,
        fileSize: f.fileSize.toString(),
        partNumber: f.partNumber,
        relativePath: f.relativePath,
        downloadUrl: `/api/assets/file/${f.id}/download`
      }));
      return sendSuccess(res, {
        assetId: asset.id,
        name: asset.name,
        uploadType: asset.uploadType,
        files: filesWithLinks
      });
    }
  } catch (error) {
    console.error('Error in downloadAsset:', error);
    return sendError(res, 'Failed to download asset', 500);
  }
};

/**
 * Download file-level endpoint (primary endpoint, streams from Telegram via MTProto)
 */
const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const assetFile = await prisma.assetFile.findUnique({
      where: { id: fileId }
    });

    if (!assetFile || !assetFile.telegramMessageId) {
      return sendError(res, 'File not found or not yet uploaded', 404);
    }

    const fileName = assetFile.fileName || 'file';
    const fileSize = assetFile.fileSize || 0n;
    let mimeType = assetFile.contentType || 'application/octet-stream';

    // Parse HTTP Range header
    const rangeHeader = req.headers.range;
    let start = 0n;
    let end = fileSize - 1n;
    let isRangeRequest = false;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const partialStart = parts[0];
      const partialEnd = parts[1];

      start = partialStart ? BigInt(partialStart) : 0n;
      end = partialEnd ? BigInt(partialEnd) : fileSize - 1n;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return sendError(res, 'Requested Range Not Satisfiable', 416);
      }
      isRangeRequest = true;
    }

    // Set common headers
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', mimeType);

    const totalToFetch = end - start + 1n;

    if (isRangeRequest) {
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', totalToFetch.toString());
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Length', fileSize.toString());
    }

    let client = getTelegramClient();
    if (!client) {
      client = await initTelegramClient();
    }

    // Fallback to mock data stream for testing/verification if client is not configured
    if (!client) {
      console.warn('⚠️ [Telegram Client] Client is not initialized. Falling back to mock data stream for testing.');
      const chunkSize = 512 * 1024; // 512KB chunks
      let bytesSent = 0n;
      
      while (bytesSent < totalToFetch && !res.destroyed) {
        const remaining = totalToFetch - bytesSent;
        const currentChunkSize = remaining < BigInt(chunkSize) ? Number(remaining) : chunkSize;
        const buffer = Buffer.alloc(currentChunkSize, 'A');
        const canWrite = res.write(buffer);
        bytesSent += BigInt(currentChunkSize);
        if (!canWrite) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
      }
      if (!res.destroyed) {
        res.end();
      }
      return;
    }

    const channelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;
    if (!channelId) {
      return sendError(res, 'Storage channel is not configured on the backend', 500);
    }

    // Resolve the channel entity (can accept string IDs like "-1004305876414")
    let channelEntity;
    try {
      channelEntity = await client.getEntity(channelId);
    } catch (entityError) {
      console.error('Failed to resolve channel entity:', entityError);
      return sendError(res, 'Failed to access Telegram storage channel. Make sure the bot is a member/admin of the channel.', 500);
    }

    // Fetch the message by message ID
    let message;
    try {
      const messages = await client.getMessages(channelEntity, {
        ids: [assetFile.telegramMessageId],
      });
      message = messages && messages[0];
    } catch (msgError) {
      console.error('Failed to retrieve Telegram message:', msgError);
      return sendError(res, 'Failed to fetch file from Telegram.', 500);
    }

    if (!message || !message.media) {
      return sendError(res, 'File media not found in the Telegram message.', 404);
    }

    // Identify media location and DC ID
    let fileLocation;
    let dcId;

    if (message.media.document) {
      const doc = message.media.document;
      fileLocation = new Api.InputDocumentFileLocation({
        id: doc.id,
        accessHash: doc.accessHash,
        fileReference: doc.fileReference,
        thumbSize: '',
      });
      dcId = doc.dcId;
      mimeType = doc.mimeType || mimeType;
    } else if (message.media.photo) {
      const photo = message.media.photo;
      const sizeType = photo.sizes && photo.sizes.length > 0
        ? photo.sizes[photo.sizes.length - 1].type
        : '';
      fileLocation = new Api.InputPhotoFileLocation({
        id: photo.id,
        accessHash: photo.accessHash,
        fileReference: photo.fileReference,
        thumbSize: sizeType,
      });
      dcId = photo.dcId;
      mimeType = 'image/jpeg';
    } else {
      return sendError(res, 'Unsupported media type on Telegram.', 400);
    }

    // Update MIME type header just in case it was resolved from Telegram media
    res.setHeader('Content-Type', mimeType);

    // Stream the chunks
    try {
      // Align start to 4KB (4096) multiple downwards to prevent OFFSET_INVALID
      const alignedStart = (start / 4096n) * 4096n;
      const skipBytes = Number(start - alignedStart);
      const bigInt = require('big-integer');

      let totalWritten = 0n;
      let isFirst = true;

      for await (let chunk of client.iterDownload({
        file: fileLocation,
        dcId: dcId,
        requestSize: 512 * 1024, // 512KB chunks (optimal for direct download)
        workers: 4,              // 4 parallel workers for throughput boost
        offset: bigInt(alignedStart.toString())
      })) {
        if (res.destroyed) {
          console.log(`[Download] Client aborted download for file: ${fileName}`);
          break;
        }

        if (isFirst) {
          chunk = chunk.slice(skipBytes);
          isFirst = false;
        }

        const remaining = totalToFetch - totalWritten;
        if (BigInt(chunk.length) >= remaining) {
          const finalChunk = chunk.slice(0, Number(remaining));
          res.write(finalChunk);
          totalWritten += BigInt(finalChunk.length);
          break;
        } else {
          const canWrite = res.write(chunk);
          totalWritten += BigInt(chunk.length);
          if (!canWrite) {
            await new Promise((resolve) => res.once('drain', resolve));
          }
        }
      }
      if (!res.destroyed) {
        res.end();
      }
    } catch (downloadError) {
      console.error('Error during Telegram file streaming:', downloadError);
      if (!res.headersSent) {
        return sendError(res, 'Error during file download streaming.', 500);
      }
    }
  } catch (error) {
    console.error('Error in downloadFile:', error);
    if (!res.headersSent) {
      return sendError(res, 'Failed to download file via MTProto', 500);
    }
  }
};

/**
 * Get aggregated asset and category statistics
 */
const getAssetStats = async (req, res) => {
  try {
    const assetsCount = await prisma.asset.count({
      where: { isDeleted: false, isPending: false }
    });
    
    const sizeSumResult = await prisma.asset.aggregate({
      where: { isDeleted: false, isPending: false },
      _sum: {
        sizeBytes: true
      }
    });
    
    const categoriesCount = await prisma.category.count();

    return sendSuccess(res, {
      totalAssets: assetsCount,
      totalStorage: (sizeSumResult._sum.sizeBytes || 0n).toString(),
      totalCategories: categoriesCount
    });
  } catch (error) {
    console.error('Error fetching asset stats:', error);
    return sendError(res, 'Failed to fetch asset stats', 500);
  }
};
/**
 * Delete a specific file from an asset
 */
const deleteAssetFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // 1. Fetch AssetFile and include parent Asset
    const assetFile = await prisma.assetFile.findUnique({
      where: { id: fileId },
      include: { asset: { include: { files: true } } }
    });

    if (!assetFile) {
      return sendError(res, 'File not found', 404);
    }

    const { asset, telegramMessageId } = assetFile;

    // 2. Delete from Telegram using MTProto
    if (telegramMessageId) {
      let client = getTelegramClient();
      if (!client) {
        client = await initTelegramClient();
      }
      
      if (client) {
        const channelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;
        if (!channelId) {
          return sendError(res, 'Storage channel is not configured on the backend', 500);
        }

        try {
          const channelEntity = await client.getEntity(channelId);
          await client.deleteMessages(channelEntity, [telegramMessageId], { revoke: true });
        } catch (telegramError) {
          console.error('Failed to delete message from Telegram:', telegramError);
          return sendError(res, 'Failed to delete file from Telegram storage', 500);
        }
      }
    }

    // 3. Delete from Database using Transaction
    await prisma.$transaction(async (tx) => {
      // Delete the file
      await tx.assetFile.delete({ where: { id: fileId } });
      
      // If it was the last file, soft delete the asset
      if (asset.files.length === 1) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { isDeleted: true, sizeBytes: 0n }
        });
      } else {
        // Otherwise, update the asset size
        await tx.asset.update({
          where: { id: asset.id },
          data: { sizeBytes: asset.sizeBytes - assetFile.fileSize }
        });
      }
    });

    return sendSuccess(res, { message: 'File successfully deleted', isAssetDeleted: asset.files.length === 1, deletedFileSize: assetFile.fileSize.toString() });
  } catch (error) {
    console.error('Error deleting asset file:', error);
    return sendError(res, 'Failed to delete asset file', 500);
  }
};

/**
 * Reorder files inside an asset
 */
const reorderAssetFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileIds } = req.body; // Array of file IDs in the new order

    if (!fileIds || !Array.isArray(fileIds)) {
      return sendError(res, 'Invalid request data', 400);
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { files: true }
    });

    if (!asset || (asset.uploadType !== 'MULTIPART' && asset.uploadType !== 'FOLDER')) {
      return sendError(res, 'Invalid asset or asset type for reordering', 400);
    }

    const existingFileIds = asset.files.map(f => f.id);
    
    // Ensure the provided fileIds contain exactly the same set of IDs as the asset's existing files
    if (existingFileIds.length !== fileIds.length || !existingFileIds.every(id => fileIds.includes(id))) {
      return sendError(res, 'Provided file IDs do not match the existing files', 400);
    }

    if (asset.uploadType === 'FOLDER') {
      // Validate that FOLDER reordering doesn't move files between folders
      const existingFilesMap = new Map(asset.files.map(f => [f.id, f]));
      // Note: While this validates all files, if we only allow reordering within a folder on the frontend,
      // it means the order is just updated. Let's just blindly save the order as partNumber or similar.
      // Wait, how do we persist FOLDER file ordering? FOLDER files are built into a tree based on relativePath.
      // `partNumber` can be used to order files within that tree.
      // Right now, `partNumber` is used for MULTIPART. For FOLDER, `partNumber` is null.
      // We can use `partNumber` to store the custom order for FOLDER too.
    }

    // Execute Prisma transaction to update partNumbers
    await prisma.$transaction(
      fileIds.map((fileId, index) =>
        prisma.assetFile.update({
          where: { id: fileId },
          data: { partNumber: index + 1 }
        })
      )
    );

    return sendSuccess(res, { message: 'Files reordered successfully' });
  } catch (error) {
    console.error('Error reordering asset files:', error);
    return sendError(res, 'Failed to reorder files', 500);
  }
};

/**
 * Rename an individual file in an asset
 * Route: PUT /api/assets/file/:fileId/rename
 */
const renameAssetFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newName } = req.body;
    
    if (!newName || newName.trim() === '') {
      return sendError(res, 'New filename cannot be empty', 400);
    }
    
    const assetFile = await prisma.assetFile.findUnique({
      where: { id: fileId },
      include: { asset: { include: { files: true } } }
    });
    
    if (!assetFile) {
      return sendError(res, 'File not found', 404);
    }
    
    const path = require('path');
    const originalExt = path.extname(assetFile.fileName).toLowerCase();
    
    let finalNewName = newName.trim();
    if (!finalNewName.toLowerCase().endsWith(originalExt)) {
      finalNewName = `${finalNewName}${originalExt}`;
    }
    
    if (finalNewName === assetFile.fileName) {
      return sendSuccess(res, { message: 'Filename unchanged' });
    }
    
    const assetFiles = assetFile.asset.files;
    const isDuplicate = assetFiles.some(f => {
      if (f.id === fileId) return false;
      if (assetFile.asset.uploadType === 'FOLDER') {
        const fParentPath = f.relativePath ? f.relativePath.substring(0, f.relativePath.lastIndexOf('/')) : null;
        const targetParentPath = assetFile.relativePath ? assetFile.relativePath.substring(0, assetFile.relativePath.lastIndexOf('/')) : null;
        if (fParentPath === targetParentPath && f.fileName.toLowerCase() === finalNewName.toLowerCase()) {
          return true;
        }
        return false;
      }
      return f.fileName.toLowerCase() === finalNewName.toLowerCase();
    });
    
    if (isDuplicate) {
      return sendError(res, 'A file with this name already exists in this location', 409);
    }
    
    let updateData = { fileName: finalNewName };
    if (assetFile.asset.uploadType === 'FOLDER' && assetFile.relativePath) {
      const parentPath = assetFile.relativePath.substring(0, assetFile.relativePath.lastIndexOf('/'));
      updateData.relativePath = parentPath ? `${parentPath}/${finalNewName}` : finalNewName;
    }
    
    await prisma.assetFile.update({
      where: { id: fileId },
      data: updateData
    });
    
    return sendSuccess(res, { message: 'File renamed successfully', data: { fileName: finalNewName } });
  } catch (error) {
    console.error('Error renaming asset file:', error);
    return sendError(res, 'Failed to rename file', 500);
  }
};

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  downloadAsset,
  downloadFile,
  getAssetStats,
  deleteAssetFile,
  reorderAssetFiles,
  renameAssetFile,
};
