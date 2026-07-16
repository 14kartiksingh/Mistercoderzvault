const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

const requireAuth = (req, res, next) => {
  // Extract token exclusively from httpOnly cookies
  const token = req.cookies?.token;

  if (!token) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    // Verify the JWT signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // Optional, attach payload if needed
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired token', 401);
  }
};

module.exports = requireAuth;
