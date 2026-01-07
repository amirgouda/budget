#!/usr/bin/env node
/**
 * Database migration script to add admin management for payment methods
 * Adds is_default column to payment_methods table
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

async function updatePaymentMethodsForAdmin() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Add is_default column to payment_methods table
    console.log('Updating payment_methods table...');
    await client.query(`
      ALTER TABLE payment_methods
      ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE
    `);
    console.log('✓ Added is_default column to payment_methods table');

    // Set first payment method as default if none exists
    const defaultCheck = await client.query(
      'SELECT id FROM payment_methods WHERE is_default = TRUE LIMIT 1'
    );
    
    if (defaultCheck.rows.length === 0) {
      const firstMethod = await client.query(
        'SELECT id FROM payment_methods ORDER BY id LIMIT 1'
      );
      if (firstMethod.rows.length > 0) {
        await client.query(
          'UPDATE payment_methods SET is_default = TRUE WHERE id = $1',
          [firstMethod.rows[0].id]
        );
        console.log('✓ Set first payment method as default');
      }
    }

    // Remove default_payment_method_id from users table (no longer needed)
    console.log('\nCleaning up users table...');
    await client.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS default_payment_method_id
    `);
    console.log('✓ Removed default_payment_method_id from users table');

    // Create unique constraint to ensure only one default
    console.log('\nCreating constraints...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_single_default 
      ON payment_methods (is_default) 
      WHERE is_default = TRUE
    `);
    console.log('✓ Created unique constraint for single default');

    console.log('\n✓ Payment methods admin migration complete!');

    await client.end();

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
updatePaymentMethodsForAdmin();

