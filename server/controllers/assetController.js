const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { getBot } = require('../utils/telegramBot');
const https = require('https');
/**
 * Get all active assets
 */
const getAssets = async (req, res) => {
  try {
    const { categorySlug } = req.query;
    const whereClause = { isDeleted: false, isPending: false };
    
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
 * Download asset endpoint (future-friendly asset-level download)
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

    const channelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;
    if (!channelId) {
      return sendError(res, 'Storage channel is not configured on the backend', 500);
    }

    const cleanChannelId = channelId.startsWith('-100') ? channelId.slice(4) : channelId;

    if (asset.uploadType === 'SINGLE') {
      const file = asset.files[0];
      if (!file.telegramMessageId) {
        return sendError(res, 'Telegram message not found for this file', 404);
      }
      return res.redirect(`https://t.me/c/${cleanChannelId}/${file.telegramMessageId}`);
    } else {
      // For MULTIPART/FOLDER, return the files list with their download links
      const filesWithLinks = asset.files.map(f => ({
        id: f.id,
        fileName: f.fileName,
        fileSize: f.fileSize.toString(),
        partNumber: f.partNumber,
        relativePath: f.relativePath,
        downloadUrl: `https://t.me/c/${cleanChannelId}/${f.telegramMessageId}`
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
 * Download file-level endpoint
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

    const channelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;
    if (!channelId) {
      return sendError(res, 'Storage channel is not configured on the backend', 500);
    }

    const cleanChannelId = channelId.startsWith('-100') ? channelId.slice(4) : channelId;
    const redirectUrl = `https://t.me/c/${cleanChannelId}/${assetFile.telegramMessageId}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in downloadFile:', error);
    return sendError(res, 'Failed to download file', 500);
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

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  downloadAsset,
  downloadFile,
  getAssetStats,
};
