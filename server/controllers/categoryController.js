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
            assets: showAll ? true : { where: ACTIVE_ASSET_FILTER }
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

    // Check if category contains any assets (including soft-deleted)
    const assetCount = await prisma.asset.count({
      where: {
        categoryId: id
      }
    });

    if (assetCount > 0) {
      return sendError(res, `Cannot delete category because it still contains ${assetCount} assets.`, 409);
    }

    await prisma.category.delete({
      where: { id }
    });

    return sendSuccess(res, { message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error.code === 'P2003') {
      return sendError(res, 'Cannot delete category because it still contains assets.', 409);
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
