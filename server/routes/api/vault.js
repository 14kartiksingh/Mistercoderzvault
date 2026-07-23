const express = require('express');
const router = express.Router();
const vaultAuthController = require('../../controllers/vaultAuthController');

router.post('/login', vaultAuthController.login);
router.get('/verify', vaultAuthController.verify);
router.post('/logout', vaultAuthController.logout);

module.exports = router;
