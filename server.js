/**
 * Express server for Portainer/Docker deployment
 * Main application entry point
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const auth = require('./auth');
const authHandlers = require('./handlers/auth');
const spendingHandlers = require('./handlers/spendings');
const categoryHandlers = require('./handlers/categories');
const memberHandlers = require('./handlers/members');
const subcategoryHandlers = require('./handlers/subcategories');
const paymentMethodHandlers = require('./handlers/payment_methods');
const settingsHandlers = require('./handlers/settings');

const app = express();

// Middleware
app.use(cors({
  origin: config.cors.origin === '*' ? true : config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.post('/api/auth/login', authHandlers.loginHandler);
app.post('/api/auth/logout', authHandlers.logoutHandler);

// Protected routes - require authentication
app.get('/api/auth/me', auth.getAuthMiddleware(), authHandlers.getCurrentUserHandler);

// Spending routes
app.get('/api/spendings', auth.getAuthMiddleware(), spendingHandlers.getSpendingsHandler);
app.post('/api/spendings', auth.getAuthMiddleware(), spendingHandlers.addSpendingHandler);
app.delete('/api/spendings/:id', auth.getAuthMiddleware(), spendingHandlers.deleteSpendingHandler);
app.get('/api/spendings/stats', auth.getAuthMiddleware(), spendingHandlers.getSpendingStatsHandler);

// Category routes (admin only)
app.get('/api/categories', auth.getAuthMiddleware(), categoryHandlers.getCategoriesHandler);
app.post('/api/categories', auth.getAuthMiddleware(), auth.requireAdmin, categoryHandlers.createCategoryHandler);
app.put('/api/categories/:id', auth.getAuthMiddleware(), auth.requireAdmin, categoryHandlers.updateCategoryHandler);
app.delete('/api/categories/:id', auth.getAuthMiddleware(), auth.requireAdmin, categoryHandlers.deleteCategoryHandler);

// Member routes (admin only)
app.get('/api/members', auth.getAuthMiddleware(), auth.requireAdmin, memberHandlers.getMembersHandler);
app.post('/api/members', auth.getAuthMiddleware(), auth.requireAdmin, memberHandlers.createMemberHandler);
app.put('/api/members/:id', auth.getAuthMiddleware(), auth.requireAdmin, memberHandlers.updateMemberHandler);
app.delete('/api/members/:id', auth.getAuthMiddleware(), auth.requireAdmin, memberHandlers.deleteMemberHandler);

// Subcategory routes
app.get('/api/subcategories', auth.getAuthMiddleware(), subcategoryHandlers.getSubcategoriesHandler);
app.post('/api/subcategories', auth.getAuthMiddleware(), subcategoryHandlers.createSubcategoryHandler);

// Payment method routes
app.get('/api/payment_methods', auth.getAuthMiddleware(), paymentMethodHandlers.getPaymentMethodsHandler);
app.get('/api/payment_methods/default', auth.getAuthMiddleware(), paymentMethodHandlers.getDefaultPaymentMethodHandler);
app.post('/api/payment_methods', auth.getAuthMiddleware(), auth.requireAdmin, paymentMethodHandlers.createPaymentMethodHandler);
app.put('/api/payment_methods/:id', auth.getAuthMiddleware(), auth.requireAdmin, paymentMethodHandlers.updatePaymentMethodHandler);
app.delete('/api/payment_methods/:id', auth.getAuthMiddleware(), auth.requireAdmin, paymentMethodHandlers.deletePaymentMethodHandler);
app.put('/api/payment_methods/default', auth.getAuthMiddleware(), auth.requireAdmin, paymentMethodHandlers.setDefaultPaymentMethodHandler);

// Settings routes
app.get('/api/settings', auth.getAuthMiddleware(), settingsHandlers.getSettingsHandler);
app.put('/api/settings/:key', auth.getAuthMiddleware(), auth.requireAdmin, settingsHandlers.updateSettingHandler);

// Error handling middleware (must be before catch-all route)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve static files from React build directory (in production)
if (config.server.env === 'production') {
  const buildPath = path.join(__dirname, 'frontend', 'build');
  app.use(express.static(buildPath));
  
  // Serve React app for all non-API routes (SPA routing)
  // This must be the last route handler
  // Express 5 doesn't support '*' wildcard, so we use app.use with a function
  app.use((req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Route not found' });
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // In development, just return 404 for non-API routes
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'Route not found' });
    } else {
      res.status(404).send('Frontend not available in development mode. Please run the frontend separately.');
    }
  });
}

// Start server (only if not in Vercel)
if (!config.server.isVercel) {
  const PORT = config.server.port;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${config.server.env}`);
  });
}

module.exports = app;

