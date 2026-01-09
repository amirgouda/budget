/**
 * Authentication utilities
 * Handles password hashing, session management, and JWT tokens
 * Supports both Portainer (express-session) and Vercel (JWT)
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');
const config = require('./config');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random session token
 * @returns {string} Session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a session in the database
 * @param {number} userId - User ID
 * @param {number} expiresInDays - Days until expiration (default: 30)
 * @returns {Promise<string>} Session token
 */
async function createSession(userId, expiresInDays = 30) {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await db.query(
    'INSERT INTO sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

/**
 * Get session from database
 * @param {string} token - Session token
 * @returns {Promise<Object|null>} Session object or null
 */
async function getSession(token) {
  const result = await db.query(
    'SELECT * FROM sessions WHERE session_token = $1 AND expires_at > NOW()',
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Delete a session
 * @param {string} token - Session token
 * @returns {Promise<void>}
 */
async function deleteSession(token) {
  await db.query('DELETE FROM sessions WHERE session_token = $1', [token]);
}

/**
 * Delete all sessions for a user
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function deleteUserSessions(userId) {
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

/**
 * Clean up expired sessions
 * @returns {Promise<void>}
 */
async function cleanupExpiredSessions() {
  await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
}

/**
 * Generate JWT token (for Vercel)
 * @param {Object} user - User object with id and username
 * @returns {string} JWT token
 */
function generateJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Verify JWT token (for Vercel)
 * @param {string} token - JWT token
 * @returns {Promise<Object|null>} Decoded token or null
 */
function verifyJWT(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserById(userId) {
  const result = await db.query('SELECT id, username, role, created_at FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<Object|null>} User object with password_hash or null
 */
async function getUserByUsername(username) {
  const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * Authentication middleware for Express (Portainer)
 * Checks session token from cookie or Authorization header
 */
async function authenticateSession(req, res, next) {
  try {
    // Try to get token from cookie first
    let token = req.cookies?.[config.session.cookieName];
    
    // If not in cookie, try Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = await getSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await getUserById(session.user_id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.sessionToken = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Authentication middleware for Vercel serverless
 * Checks JWT token from cookie or Authorization header
 */
function authenticateJWT(req, res, next) {
  try {
    // Try to get token from cookie first
    let token = req.cookies?.[config.session.cookieName];
    
    // If not in cookie, try Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Admin-only middleware
 * Must be used after authentication middleware
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Get authentication middleware based on environment
 */
function getAuthMiddleware() {
  if (config.server.isVercel) {
    return authenticateJWT;
  } else {
    return authenticateSession;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  createSession,
  getSession,
  deleteSession,
  deleteUserSessions,
  cleanupExpiredSessions,
  generateJWT,
  verifyJWT,
  getUserById,
  getUserByUsername,
  authenticateSession,
  authenticateJWT,
  requireAdmin,
  getAuthMiddleware,
};


