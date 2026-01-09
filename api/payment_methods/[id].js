/**
 * Vercel serverless function for payment method by ID (admin only)
 */

const paymentMethodHandlers = require('../../handlers/payment_methods');
const auth = require('../../auth');

function authenticateRequest(req) {
  // Parse cookies manually for Vercel
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      cookies[parts[0]] = parts[1];
    });
  }
  req.cookies = cookies;

  // Try to get token from cookie or Authorization header
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
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authenticate
  try {
    authenticateRequest(req);
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }

  // Admin only
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Get ID from query or path
  const id = req.query.id || req.url.split('/').pop();

  if (req.method === 'PUT') {
    req.params = { id };
    return paymentMethodHandlers.updatePaymentMethodHandler(req, res);
  } else if (req.method === 'DELETE') {
    req.params = { id };
    return paymentMethodHandlers.deletePaymentMethodHandler(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};


