#!/usr/bin/env node
/**
 * Database migration script to add payment methods functionality
 * Adds payment_methods table, updates spendings and users tables
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

async function addPaymentMethods() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Create payment_methods table
    console.log('Creating payment_methods table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created payment_methods table');

    // Insert default payment methods
    console.log('\nInserting default payment methods...');
    const defaultMethods = [
      { name: 'Cash', icon: '💵' },
      { name: 'Credit Card', icon: '💳' },
      { name: 'Debit Card', icon: '💳' },
      { name: 'Bank Transfer', icon: '🏦' },
      { name: 'Mobile Wallet', icon: '📱' },
      { name: 'Online Payment', icon: '🌐' }
    ];

    for (const method of defaultMethods) {
      await client.query(`
        INSERT INTO payment_methods (name, icon)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [method.name, method.icon]);
    }
    console.log('✓ Default payment methods inserted');

    // Add payment_method_id column to spendings table
    console.log('\nUpdating spendings table...');
    await client.query(`
      ALTER TABLE spendings
      ADD COLUMN IF NOT EXISTS payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL
    `);
    console.log('✓ Added payment_method_id to spendings table');

    // Add default_payment_method_id column to users table
    console.log('\nUpdating users table...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS default_payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL
    `);
    console.log('✓ Added default_payment_method_id to users table');

    // Create index for better performance
    console.log('\nCreating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_spendings_payment_method_id ON spendings(payment_method_id)
    `);
    console.log('✓ Created indexes');

    // Display summary
    const methodCount = await client.query('SELECT COUNT(*) FROM payment_methods');
    const spendingCount = await client.query('SELECT COUNT(*) FROM spendings WHERE payment_method_id IS NOT NULL');

    console.log('\nDatabase Summary:');
    console.log(`  Payment Methods: ${methodCount.rows[0].count}`);
    console.log(`  Spendings with Payment Method: ${spendingCount.rows[0].count}`);
    console.log('\n✓ Payment methods migration complete!');

    await client.end();

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
addPaymentMethods();

