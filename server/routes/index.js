const express = require('express');
const router = express.Router();
const healthRoutes = require('./health');
const authRoutes = require('./api/auth');
const assetRoutes = require('./api/assets');
const categoryRoutes = require('./api/categories');

const telegramRoutes = require('./api/telegram');

// Register all routes
router.use('/health', healthRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/assets', assetRoutes);
router.use('/api/categories', categoryRoutes);
router.use('/api/telegram', telegramRoutes);

module.exports = router;
