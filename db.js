/**
 * Database connection module
 * Handles both Portainer (connection pool) and Vercel (per-request connections)
 */

const { Pool, Client } = require('pg');
const config = require('./config');

let pool = null;
let isVercel = config.server.isVercel;

/**
 * Get database connection pool (for Portainer/Docker)
 * Creates a pool if it doesn't exist
 */
function getPool() {
  if (!pool && !isVercel) {
    pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      max: config.database.max,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

/**
 * Get a new database client (for Vercel serverless)
 * Creates a new client for each request
 */
function getClient() {
  return new Client({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
  });
}

/**
 * Execute a query - works for both pool and client
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
async function query(text, params) {
  if (isVercel) {
    // Vercel: create new client for each query
    const client = getClient();
    try {
      await client.connect();
      const result = await client.query(text, params);
      await client.end();
      return result;
    } catch (error) {
      await client.end();
      throw error;
    }
  } else {
    // Portainer: use connection pool
    const pool = getPool();
    return pool.query(text, params);
  }
}

/**
 * Execute a transaction
 * @param {Function} callback - Function that receives a client and performs queries
 * @returns {Promise} Transaction result
 */
async function transaction(callback) {
  if (isVercel) {
    // Vercel: create new client for transaction
    const client = getClient();
    try {
      await client.connect();
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      await client.end();
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      await client.end();
      throw error;
    }
  } else {
    // Portainer: use pool client for transaction
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Close all database connections
 * Useful for graceful shutdown
 */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  query,
  transaction,
  getPool,
  getClient,
  close,
};

