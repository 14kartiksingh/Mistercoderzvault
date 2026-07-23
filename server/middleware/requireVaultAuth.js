const { verifySession } = require('../utils/vaultSession');
const { sendError } = require('../utils/response');

/**
 * Global middleware to protect routes behind Vault Authentication.
 * Checks for a valid 'vault_session' HttpOnly cookie containing an active session ID.
 */
const requireVaultAuth = (req, res, next) => {
  try {
    const sessionId = req.cookies?.vault_session;

    if (!sessionId) {
      return sendError(res, 'Vault authentication required', 401);
    }

    // Verify session ID exists in the active in-memory store
    if (!verifySession(sessionId)) {
      // Session is invalid or has been destroyed/expired (e.g. server restart)
      res.clearCookie('vault_session');
      return sendError(res, 'Vault session expired or invalid', 401);
    }

    // Session is valid, proceed
    next();
  } catch (error) {
    console.error('Vault Auth Error:', error);
    return sendError(res, 'Internal server error during authentication', 500);
  }
};

module.exports = requireVaultAuth;
