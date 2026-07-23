const crypto = require('crypto');

// In-memory store for active Vault sessions
// Set of active session IDs
const activeSessions = new Set();

/**
 * Creates a new secure session and returns the session ID
 * @returns {string} sessionId
 */
const createSession = () => {
  const sessionId = crypto.randomUUID();
  activeSessions.add(sessionId);
  return sessionId;
};

/**
 * Verifies if a session ID is currently active
 * @param {string} sessionId 
 * @returns {boolean}
 */
const verifySession = (sessionId) => {
  return activeSessions.has(sessionId);
};

/**
 * Destroys a session by removing it from the store
 * @param {string} sessionId 
 */
const destroySession = (sessionId) => {
  activeSessions.delete(sessionId);
};

module.exports = {
  createSession,
  verifySession,
  destroySession
};
