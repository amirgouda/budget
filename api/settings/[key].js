/**
 * Vercel serverless function for updating a specific setting
 */

const settingsHandlers = require('../../handlers/settings');
const auth = require('../../auth');

function authenticateRequest(req) {
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      cookies[parts[0]] = parts[1];
    });
  }
  req.cookies = cookies;

  let token = req.cookies?.budget_session;
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    throw new Error('Authentication required');
  }

  const decoded = auth.verifyJWT(token);
  if (!decoded) {
    throw new Error('Invalid or expired token');
  }

  req.user = decoded;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    authenticateRequest(req);
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  req.params = { key: req.query.key };

  if (req.method === 'PUT') {
    return settingsHandlers.updateSettingHandler(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};
