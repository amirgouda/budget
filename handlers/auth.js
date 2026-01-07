/**
 * Authentication handlers
 * Shared logic for both Express and Vercel
 */

const auth = require('../auth');
const db = require('../db');
const config = require('../config');

/**
 * Login handler
 */
async function loginHandler(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await auth.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await auth.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session or JWT based on environment
    let token;
    if (config.server.isVercel) {
      // Vercel: use JWT
      token = auth.generateJWT({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } else {
      // Portainer: use database session
      token = await auth.createSession(user.id);
    }

    // Set cookie
    res.cookie(config.session.cookieName, token, {
      httpOnly: true,
      secure: config.server.env === 'production',
      sameSite: 'lax',
      maxAge: config.session.maxAge,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * Logout handler
 */
async function logoutHandler(req, res) {
  try {
    const token = req.cookies?.[config.session.cookieName] || 
                  req.headers.authorization?.replace('Bearer ', '');

    if (token && !config.server.isVercel) {
      // Only delete database sessions (not JWT)
      await auth.deleteSession(token);
    }

    res.clearCookie(config.session.cookieName);
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

/**
 * Get current user handler
 */
async function getCurrentUserHandler(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}

module.exports = {
  loginHandler,
  logoutHandler,
  getCurrentUserHandler,
};

