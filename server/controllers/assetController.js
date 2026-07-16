const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Get all active assets
 */
const getAssets = async (req, res) => {
  try {
    const { categorySlug } = req.query;
    const whereClause = { isDeleted: false };
    
    if (categorySlug) {
      whereClause.category = { slug: categorySlug };
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        category: true,
        tags: true,
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
      fileType,
      sizeBytes,
      description,
      thumbnailUrl,
      visibility,
      metadata,
    } = req.body;

    // Basic validation
    if (!name || !categoryId || !fileType || sizeBytes === undefined) {
      return sendError(res, 'Missing required fields: name, categoryId, fileType, sizeBytes');
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
        fileType,
        sizeBytes: BigInt(sizeBytes),
        description,
        thumbnailUrl,
        visibility: visibility || 'PRIVATE',
        metadata: metadata || {},
        tags: {
          connectOrCreate: tagConnectOrCreate,
        },
      },
      include: {
        category: true,
        tags: true,
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
      fileType,
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
    if (fileType !== undefined) data.fileType = fileType;
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

    await prisma.asset.delete({
      where: { id },
    });

    return sendSuccess(res, { message: 'Asset successfully deleted' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return sendError(res, 'Failed to delete asset', 500);
  }
};

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
};
