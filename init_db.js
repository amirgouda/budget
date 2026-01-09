#!/usr/bin/env node
/**
 * Database initialization script
 * Creates budget_app database and all required tables
 */

const { Client } = require('pg');

// Hardcoded database configuration
const dbConfig = {
  host: '192.168.0.100',
  user: 'appuser',
  password: 'P0stGress',
  port: 5432,
  database: 'postgres' // Connect to default database first
};

const targetDatabase = 'budget_app';

async function initDatabase() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Check if target database exists
    const dbCheck = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = '${targetDatabase}'`
    );

    if (dbCheck.rows.length === 0) {
      console.log(`Creating ${targetDatabase} database...`);
      // Terminate existing connections to target database if any
      await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${targetDatabase}' AND pid <> pg_backend_pid()
      `);
      await client.query(`CREATE DATABASE ${targetDatabase}`);
      console.log(`✓ Database ${targetDatabase} created\n`);
    } else {
      console.log(`✓ Database ${targetDatabase} already exists\n`);
    }

    await client.end();

    // Connect to target database
    const appDbConfig = { ...dbConfig, database: targetDatabase };
    const appClient = new Client(appDbConfig);
    await appClient.connect();
    console.log(`Connected to ${targetDatabase} database\n`);

    // Create tables
    console.log('Creating tables...\n');

    // Payment methods table (created first as it's referenced by users)
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        icon VARCHAR(50),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created payment_methods table');

    // Insert default payment methods
    const defaultMethods = [
      { name: 'Cash', icon: '💵', isDefault: true },
      { name: 'Credit Card', icon: '💳', isDefault: false },
      { name: 'Debit Card', icon: '💳', isDefault: false },
      { name: 'Bank Transfer', icon: '🏦', isDefault: false },
      { name: 'Mobile Wallet', icon: '📱', isDefault: false },
      { name: 'Online Payment', icon: '🌐', isDefault: false }
    ];

    for (const method of defaultMethods) {
      await appClient.query(`
        INSERT INTO payment_methods (name, icon, is_default)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [method.name, method.icon, method.isDefault]);
    }
    console.log('✓ Inserted default payment methods');

    // Create unique constraint to ensure only one default
    await appClient.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_single_default 
      ON payment_methods (is_default) 
      WHERE is_default = TRUE
    `);
    console.log('✓ Created unique constraint for single default');

    // Users table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created users table');

    // Spending categories table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS spending_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        monthly_budget DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name)
      )
    `);
    console.log('✓ Created spending_categories table');

    // Spendings table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS spendings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category_id INTEGER NOT NULL REFERENCES spending_categories(id) ON DELETE RESTRICT,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created spendings table');

    // Sessions table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created sessions table');

    // App settings table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created app_settings table');

    // Insert default month_start_day setting
    await appClient.query(`
      INSERT INTO app_settings (key, value)
      VALUES ('month_start_day', '1')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✓ Inserted default month_start_day setting');

    // Create indexes for better performance
    console.log('\nCreating indexes...');
    
    await appClient.query(`
      CREATE INDEX IF NOT EXISTS idx_spendings_user_id ON spendings(user_id)
    `);
    await appClient.query(`
      CREATE INDEX IF NOT EXISTS idx_spendings_category_id ON spendings(category_id)
    `);
    await appClient.query(`
      CREATE INDEX IF NOT EXISTS idx_spendings_date ON spendings(date)
    `);
    await appClient.query(`
      CREATE INDEX IF NOT EXISTS idx_spendings_payment_method_id ON spendings(payment_method_id)
    `);
    await appClient.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)
    `);
    await appClient.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `);
    await appClient.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)
    `);
    
    console.log('✓ Created indexes\n');

    // Check if admin user exists
    const adminCheck = await appClient.query(
      "SELECT id FROM users WHERE username = 'admin'"
    );

    if (adminCheck.rows.length === 0) {
      console.log('Creating default admin user...');
      console.log('Username: admin');
      console.log('Password: admin123 (please change after first login!)');
      
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      await appClient.query(`
        INSERT INTO users (username, password_hash, role)
        VALUES ($1, $2, $3)
      `, ['admin', passwordHash, 'admin']);
      
      console.log('✓ Default admin user created\n');
    } else {
      console.log('✓ Admin user already exists\n');
    }

    // Display summary
    const userCount = await appClient.query('SELECT COUNT(*) FROM users');
    const categoryCount = await appClient.query('SELECT COUNT(*) FROM spending_categories');
    const spendingCount = await appClient.query('SELECT COUNT(*) FROM spendings');

    console.log('Database Summary:');
    console.log(`  Users: ${userCount.rows[0].count}`);
    console.log(`  Categories: ${categoryCount.rows[0].count}`);
    console.log(`  Spendings: ${spendingCount.rows[0].count}`);
    console.log('\n✓ Database initialization complete!');

    await appClient.end();

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run initialization
initDatabase();

