const express = require('express');
const router = express.Router();
const healthRoutes = require('./health');

// Register all routes
router.use('/health', healthRoutes);

module.exports = router;
