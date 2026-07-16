const express = require('express');
const router = express.Router();
const healthRoutes = require('./health');
const assetRoutes = require('./api/assets');
const categoryRoutes = require('./api/categories');

// Register all routes
router.use('/health', healthRoutes);
router.use('/api/assets', assetRoutes);
router.use('/api/categories', categoryRoutes);

module.exports = router;
