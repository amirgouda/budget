#!/usr/bin/env node
/**
 * Verify database setup
 */

const { Client } = require('pg');

const dbConfig = {
  host: 'am.lan',
  user: 'appuser',
  password: 'P0stGress',
  port: 5432,
  database: 'budget_app'
};

async function verifyDatabase() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✓ Connected to budget_app database\n');

    // List all tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tables:');
    for (const row of tables.rows) {
      const tableName = row.table_name;
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      console.log(`\n  ${tableName}:`);
      columns.rows.forEach(col => {
        console.log(`    - ${col.column_name} (${col.data_type})${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
      });
    }

    // Check users
    const users = await client.query('SELECT id, username, role FROM users');
    console.log('\n\nUsers:');
    users.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role})`);
    });

    await client.end();
    console.log('\n✓ Database verification complete!');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

verifyDatabase();


