const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../utils/response');
const { createSession, verifySession, destroySession } = require('../utils/vaultSession');

/**
 * Log into the Vault
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return sendError(res, 'Username and password are required', 400);
    }

    const validUsername = process.env.VAULT_USERNAME;
    const validPasswordHash = process.env.VAULT_PASSWORD_HASH;

    if (!validUsername || !validPasswordHash) {
      console.error('Vault credentials not configured in environment variables');
      return sendError(res, 'Server configuration error', 500);
    }

    // Check username
    if (username !== validUsername) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Check password
    const isMatch = await bcrypt.compare(password, validPasswordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Authentication successful, create secure session
    const sessionId = createSession();

    // Set secure HttpOnly cookie
    // MaxAge: 7 days
    res.cookie('vault_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    return sendSuccess(res, { message: 'Vault authentication successful' });
  } catch (error) {
    console.error('Vault login error:', error);
    return sendError(res, 'Internal server error', 500);
  }
};

/**
 * Verify if the current session is active
 */
const verify = (req, res) => {
  try {
    const sessionId = req.cookies?.vault_session;
    
    if (!sessionId || !verifySession(sessionId)) {
      return sendError(res, 'Not authenticated', 401);
    }

    return sendSuccess(res, { message: 'Authenticated' });
  } catch (error) {
    console.error('Vault verify error:', error);
    return sendError(res, 'Internal server error', 500);
  }
};

/**
 * Logout and destroy the session
 */
const logout = (req, res) => {
  try {
    const sessionId = req.cookies?.vault_session;
    
    if (sessionId) {
      destroySession(sessionId);
    }

    res.clearCookie('vault_session');
    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    console.error('Vault logout error:', error);
    return sendError(res, 'Internal server error', 500);
  }
};

module.exports = {
  login,
  verify,
  logout
};
