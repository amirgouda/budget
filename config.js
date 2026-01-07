/**
 * Configuration file for database and application settings
 * Supports both Portainer (Docker) and Vercel deployments
 */

require('dotenv').config();

const config = {
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'am.lan',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'appuser',
    password: process.env.DB_PASSWORD || 'P0stGress',
    database: process.env.DB_NAME || 'budget_app',
    // Connection pool settings for Portainer
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  },

  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3001'),
    env: process.env.NODE_ENV || 'development',
    // For Vercel, we don't need a port
    isVercel: process.env.VERCEL === '1',
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'change-this-secret-key-in-production',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours in milliseconds
    cookieName: 'budget_session',
  },

  // JWT configuration (for Vercel serverless)
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-jwt-secret-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },

  // Frontend URL (for CORS and redirects)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// Generate database connection string
config.database.connectionString = process.env.DATABASE_URL || 
  `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`;

module.exports = config;

