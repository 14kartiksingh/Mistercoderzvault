const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const requireAuth = require('../../middleware/requireAuth');

router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
