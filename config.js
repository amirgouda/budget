/**
 * Configuration file for database and application settings
 * Hardcoded for Docker deployment
 */

const config = {
  // Database configuration - hardcoded
  database: {
    host: 'am.lan',
    port: 5432,
    user: 'appuser',
    password: 'P0stGress',
    database: 'budget_app',
    // Connection pool settings
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // Server configuration
  server: {
    port: 3001,
    env: 'production',
    // For Vercel, we don't need a port
    isVercel: false,
  },

  // Session configuration
  session: {
    secret: 'budget-app-session-secret-key-change-in-production',
    maxAge: 86400000, // 24 hours in milliseconds
    cookieName: 'budget_session',
  },

  // JWT configuration
  jwt: {
    secret: 'budget-app-jwt-secret-key-change-in-production',
    expiresIn: '7d',
  },

  // CORS configuration
  cors: {
    origin: '*',
    credentials: true,
  },

  // Frontend URL (for CORS and redirects)
  frontendUrl: 'http://localhost:3030',
};

// Generate database connection string
config.database.connectionString = 
  `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`;

module.exports = config;
