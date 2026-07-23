const express = require('express');
const router = express.Router();
const healthRoutes = require('./health');
const authRoutes = require('./api/auth');
const assetRoutes = require('./api/assets');
const categoryRoutes = require('./api/categories');
const telegramRoutes = require('./api/telegram');
const vaultRoutes = require('./api/vault');
const requireVaultAuth = require('../middleware/requireVaultAuth');
// Register all routes
// Register Vault Auth routes (unprotected gateway)
router.use('/api/vault', vaultRoutes);

// Protect ALL routes below this point with Vault Authentication
router.use(requireVaultAuth);

router.use('/health', healthRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/assets', assetRoutes);
router.use('/api/categories', categoryRoutes);
router.use('/api/telegram', telegramRoutes);

module.exports = router;
