
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../utils/response');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return sendError(res, 'Username and password are required', 400);
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (username !== adminUsername || password !== adminPassword) {
      // 1 second delay to discourage brute-force without locking out
      await new Promise((resolve) => setTimeout(resolve, 1000));
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

    return sendSuccess(res, { message: 'Logged in successfully', token });
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

const fs = require('fs');
const path = require('path');

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current password and new password are required', 400);
    }

    if (currentPassword !== process.env.ADMIN_PASSWORD) {
      return sendError(res, 'Invalid current password', 401);
    }

    // Update process.env immediately in memory
    process.env.ADMIN_PASSWORD = newPassword;

    // Log user out and send success response FIRST
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    sendSuccess(res, { message: 'Password changed successfully' });

    // Update .env file asynchronously to prevent dev server restart from killing the connection mid-flight
    setTimeout(() => {
      try {
        const envPath = path.resolve(__dirname, '../../.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          
          const regex = /^ADMIN_PASSWORD=.*$/m;
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `ADMIN_PASSWORD="${newPassword}"`);
          } else {
            envContent += `\nADMIN_PASSWORD="${newPassword}"`;
          }
          
          fs.writeFileSync(envPath, envContent, 'utf8');
        }
      } catch (err) {
        console.error('Failed to write .env file:', err);
      }
    }, 100);

    return;
  } catch (error) {
    console.error('Change password error:', error);
    return sendError(res, 'Internal server error during password change', 500);
  }
};

module.exports = {
  login,
  logout,
  changePassword,
};
