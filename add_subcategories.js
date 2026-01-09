#!/usr/bin/env node
/**
 * Add subcategories table and update spendings table
 */

const { Client } = require('pg');

const dbConfig = {
  host: 'am.lan',
  user: 'appuser',
  password: 'P0stGress',
  port: 5432,
  database: 'budget_app'
};

async function addSubcategories() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Connected to budget_app database\n');

    // Create subcategories table
    console.log('Creating subcategories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category_id INTEGER NOT NULL REFERENCES spending_categories(id) ON DELETE CASCADE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, category_id)
      )
    `);
    console.log('✓ Created subcategories table');

    // Add subcategory_id to spendings table
    console.log('\nAdding subcategory_id to spendings table...');
    await client.query(`
      ALTER TABLE spendings 
      ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL
    `);
    console.log('✓ Added subcategory_id column');

    // Remove description column if it exists (optional - we'll keep it for now but not use it)
    // await client.query('ALTER TABLE spendings DROP COLUMN IF EXISTS description');
    
    // Create index for better performance
    console.log('\nCreating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subcategories_name ON subcategories(name)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_spendings_subcategory_id ON spendings(subcategory_id)
    `);
    console.log('✓ Created indexes\n');

    console.log('✓ Database migration complete!');

    await client.end();

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addSubcategories();


