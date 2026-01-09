#!/usr/bin/env node
/**
 * Migration script to preserve data when deleting users
 * Changes spendings.user_id to allow NULL and use ON DELETE SET NULL
 * This ensures spending data is preserved even when users are deleted
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

    // Drop the existing foreign key constraint on spendings.user_id
    console.log('Dropping existing foreign key constraint on spendings.user_id...');
    await client.query(`
      ALTER TABLE spendings 
      DROP CONSTRAINT IF EXISTS spendings_user_id_fkey
    `);
    console.log('✓ Dropped existing constraint');

    // Make user_id nullable (since we'll set it to NULL when user is deleted)
    console.log('Making spendings.user_id nullable...');
    await client.query(`
      ALTER TABLE spendings 
      ALTER COLUMN user_id DROP NOT NULL
    `);
    console.log('✓ Made user_id nullable');

    // Add the foreign key constraint with ON DELETE SET NULL
    console.log('Adding foreign key constraint with ON DELETE SET NULL...');
    await client.query(`
      ALTER TABLE spendings 
      ADD CONSTRAINT spendings_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL
    `);
    console.log('✓ Added new constraint with ON DELETE SET NULL\n');

    console.log('✓ Migration complete!');
    console.log('Note: Spending records will now preserve data when users are deleted.');
    console.log('The user_id will be set to NULL, but all spending amounts and details will remain.');
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
