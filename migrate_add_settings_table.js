#!/usr/bin/env node
/**
 * Migration script to add app_settings table
 * Run this if your database was initialized before the custom month start day feature
 */

const { Client } = require('pg');

// Hardcoded database configuration
const dbConfig = {
  host: '192.168.0.100',
  user: 'appuser',
  password: 'P0stGress',
  port: 5432,
  database: 'budget_app'
};

async function migrate() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Create app_settings table
    console.log('Creating app_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created app_settings table');

    // Insert default month_start_day setting if it doesn't exist
    console.log('Inserting default month_start_day setting...');
    await client.query(`
      INSERT INTO app_settings (key, value)
      VALUES ('month_start_day', '1')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✓ Inserted default month_start_day setting\n');

    console.log('✓ Migration complete!');
    await client.end();

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

// Run migration
migrate();
