const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/categoryController');
const requireAuth = require('../../middleware/requireAuth');

// GET all categories (public, but can pass ?all=true if admin)
router.get('/', categoryController.getCategories);

// Admin-only Category actions
router.post('/', requireAuth, categoryController.createCategory);
router.post('/reorder', requireAuth, categoryController.reorderCategories);
router.put('/:id', requireAuth, categoryController.updateCategory);
router.delete('/:id', requireAuth, categoryController.deleteCategory);

module.exports = router;
