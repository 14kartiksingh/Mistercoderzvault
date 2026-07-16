const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Get all categories
 * Categories are system-managed in V1.
 */
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return sendError(res, 'Failed to fetch categories', 500);
  }
};

module.exports = {
  getCategories,
};
