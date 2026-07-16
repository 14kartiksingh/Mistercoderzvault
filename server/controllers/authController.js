const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../utils/response');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return sendError(res, 'Username and password are required', 400);
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (username !== adminUsername) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, adminPasswordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Issue JWT
    const token = jwt.sign(
      { role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return sendSuccess(res, { message: 'Logged in successfully' });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'Internal server error during login', 500);
  }
};

const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return sendSuccess(res, { message: 'Logged out successfully' });
};

module.exports = {
  login,
  logout,
};
