const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { ACTIVE_ASSET_FILTER } = require('../utils/constants');

/**
 * Get all categories
 */
const getCategories = async (req, res) => {
  try {
    const showAll = req.query.all === 'true';
    const where = showAll ? {} : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { 
            assets: { where: ACTIVE_ASSET_FILTER }
          }
        }
      },
      orderBy: { order: 'asc' },
    });
    return sendSuccess(res, categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return sendError(res, 'Failed to fetch categories', 500);
  }
};

/**
 * Create a new category
 */
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return sendError(res, 'Name is required', 400);
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!slug) {
      return sendError(res, 'Invalid category name', 400);
    }

    // Check duplicate name or slug
    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          { slug }
        ]
      }
    });

    if (existing) {
      return sendError(res, 'Category name already exists', 400);
    }

    // Find max order
    const maxOrderCategory = await prisma.category.findFirst({
      orderBy: { order: 'desc' }
    });
    const order = maxOrderCategory ? maxOrderCategory.order + 1 : 0;

    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        order,
        isActive: true
      }
    });

    return sendSuccess(res, newCategory, 201);
  } catch (error) {
    console.error('Error creating category:', error);
    return sendError(res, 'Failed to create category', 500);
  }
};

/**
 * Update a category (name, isActive, order)
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, order } = req.body;

    const data = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return sendError(res, 'Name cannot be empty', 400);
      }
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!slug) {
        return sendError(res, 'Invalid category name', 400);
      }

      // Check duplicate name/slug (excluding current category)
      const existing = await prisma.category.findFirst({
        where: {
          NOT: { id },
          OR: [
            { name: { equals: name.trim(), mode: 'insensitive' } },
            { slug }
          ]
        }
      });
      if (existing) {
        return sendError(res, 'Category name already exists', 400);
      }

      data.name = name.trim();
      data.slug = slug;
    }

    if (isActive !== undefined) {
      data.isActive = !!isActive;
    }

    if (order !== undefined) {
      data.order = parseInt(order, 10);
    }

    const updated = await prisma.category.update({
      where: { id },
      data
    });

    return sendSuccess(res, updated);
  } catch (error) {
    console.error('Error updating category:', error);
    return sendError(res, 'Failed to update category', 500);
  }
};

/**
 * Delete a category
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Check if category contains any ACTIVE assets
    const activeAssetCount = await prisma.asset.count({
      where: {
        categoryId: id,
        ...ACTIVE_ASSET_FILTER
      }
    });

    if (activeAssetCount > 0) {
      return sendError(res, `Cannot delete category because it still contains ${activeAssetCount} active assets.`, 409);
    }

    // 2. Since there are no active assets, we can safely delete the category.
    // To prevent Prisma P2003 foreign key constraints, we must first 
    // permanently wipe any soft-deleted or pending assets that still belong to it.
    
    const assetsToDelete = await prisma.asset.findMany({
      where: { categoryId: id },
      select: { id: true }
    });
    
    const assetIds = assetsToDelete.map(a => a.id);

    if (assetIds.length > 0) {
      // Hard delete associated files first
      await prisma.assetFile.deleteMany({
        where: { assetId: { in: assetIds } }
      });
      // Hard delete the assets themselves
      await prisma.asset.deleteMany({
        where: { id: { in: assetIds } }
      });
    }

    // 3. Delete the category safely
    await prisma.category.delete({
      where: { id }
    });

    return sendSuccess(res, { message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error.code === 'P2003') {
      return sendError(res, 'Cannot delete category because it still contains active assets.', 409);
    }
    return sendError(res, 'Failed to delete category', 500);
  }
};

/**
 * Reorder categories batch
 */
const reorderCategories = async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }
    if (!orders || !Array.isArray(orders)) {
      return sendError(res, 'Orders list is required', 400);
    }

    await prisma.$transaction(
      orders.map(item => prisma.category.update({
        where: { id: item.id },
        data: { order: parseInt(item.order, 10) }
      }))
    );

    return sendSuccess(res, { message: 'Categories reordered successfully' });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return sendError(res, 'Failed to reorder categories', 500);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
