#!/usr/bin/env node
/**
 * Migration script to fix spending_categories.created_by foreign key constraint
 * Changes ON DELETE behavior from RESTRICT to SET NULL
 * This allows deleting users who have created categories
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

    // Drop the existing foreign key constraint
    console.log('Dropping existing foreign key constraint...');
    await client.query(`
      ALTER TABLE spending_categories 
      DROP CONSTRAINT IF EXISTS spending_categories_created_by_fkey
    `);
    console.log('✓ Dropped existing constraint');

    // Add the foreign key constraint with ON DELETE SET NULL
    console.log('Adding foreign key constraint with ON DELETE SET NULL...');
    await client.query(`
      ALTER TABLE spending_categories 
      ADD CONSTRAINT spending_categories_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL
    `);
    console.log('✓ Added new constraint with ON DELETE SET NULL\n');

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
