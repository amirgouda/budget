# Fix: Backend 500 Internal Server Error on Login

## Problem
When trying to login, you get a 500 Internal Server Error from the backend API.

## Common Causes

### 1. Database Not Initialized (Most Common)

The database tables might not exist yet.

**Solution:**
1. Go to Portainer → **Containers** → `budget-backend`
2. Click **Console** or **Execute container**
3. Run the initialization script:
   ```bash
   node init_db.js
   ```
4. You should see messages about creating tables

### 2. Database Connection Issue

The backend can't connect to PostgreSQL.

**Check:**
1. Go to Portainer → **Containers** → `budget-backend` → **Logs**
2. Look for database connection errors like:
   - "Connection refused"
   - "ECONNREFUSED"
   - "password authentication failed"
   - "database does not exist"

**Solution:**
1. Verify database environment variables in Portainer:
   ```env
   DB_HOST=am.lan
   DB_PORT=5432
   DB_USER=appuser
   DB_PASSWORD=P0stGress
   DB_NAME=budget_app
   ```
2. Test database connection from backend container:
   ```bash
   node -e "const db = require('./db'); db.query('SELECT NOW()').then(r => console.log('Connected!', r.rows[0])).catch(e => console.error('Error:', e.message))"
   ```

### 3. Missing Users Table

The `users` table doesn't exist.

**Solution:**
1. Run the init script (see #1 above)
2. Or manually create the table:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     id SERIAL PRIMARY KEY,
     username VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     role VARCHAR(50) DEFAULT 'user',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### 4. No Users in Database

The database is initialized but has no users.

**Solution:**
1. Create a user via SQL:
   ```sql
   -- Hash a password first (use bcrypt, or use the init script)
   -- Password: 'password123' (change this!)
   INSERT INTO users (username, password_hash, role) 
   VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'admin');
   ```
   
2. Or use the init script which should create a default admin user

3. Or create a user creation script:
   ```bash
   node -e "
   const auth = require('./auth');
   const db = require('./db');
   (async () => {
     const hash = await auth.hashPassword('your_password_here');
     await db.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', 
       ['admin', hash, 'admin']);
     console.log('User created!');
     process.exit(0);
   })();
   "
   ```

### 5. Missing Sessions Table

The `sessions` table doesn't exist (needed for Portainer deployment).

**Solution:**
Run the init script which creates the sessions table:
```bash
node init_db.js
```

## Step-by-Step Fix

### Step 1: Check Backend Logs

1. Go to Portainer → **Containers** → `budget-backend`
2. Click **Logs**
3. Look for error messages when you try to login
4. Common errors:
   - `relation "users" does not exist` → Database not initialized
   - `password authentication failed` → Wrong DB credentials
   - `Connection refused` → Can't reach database server
   - `database "budget_app" does not exist` → Database doesn't exist

### Step 2: Initialize Database

1. Go to `budget-backend` container → **Console**
2. Run:
   ```bash
   node init_db.js
   ```
3. You should see output like:
   ```
   Creating users table...
   Creating sessions table...
   Creating categories table...
   ...
   ```

### Step 3: Verify Database Connection

From backend container console:
```bash
node -e "const db = require('./db'); db.query('SELECT NOW()').then(r => console.log('✓ Connected:', r.rows[0])).catch(e => console.error('✗ Error:', e.message))"
```

### Step 4: Check if Users Exist

```bash
node -e "const db = require('./db'); db.query('SELECT id, username, role FROM users').then(r => {console.log('Users:', r.rows); process.exit(0)}).catch(e => {console.error('Error:', e.message); process.exit(1)})"
```

### Step 5: Create Admin User (if needed)

If no users exist, create one:
```bash
node -e "
const auth = require('./auth');
const db = require('./db');
(async () => {
  try {
    const hash = await auth.hashPassword('admin123');
    const result = await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      ['admin', hash, 'admin']
    );
    console.log('✓ Admin user created:', result.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error('✗ Error:', e.message);
    process.exit(1);
  }
})();
"
```

## Quick Diagnostic Script

Run this in the backend container console to check everything:

```bash
node -e "
const db = require('./db');
const auth = require('./auth');

(async () => {
  console.log('=== Database Diagnostic ===\n');
  
  // Test connection
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✓ Database connection: OK');
    console.log('  Server time:', result.rows[0].now);
  } catch (e) {
    console.error('✗ Database connection: FAILED');
    console.error('  Error:', e.message);
    process.exit(1);
  }
  
  // Check tables
  try {
    const tables = await db.query(\"
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    \");
    console.log('\n✓ Tables found:', tables.rows.map(r => r.table_name).join(', '));
    
    const required = ['users', 'sessions', 'spending_categories'];
    const found = tables.rows.map(r => r.table_name);
    const missing = required.filter(t => !found.includes(t));
    
    if (missing.length > 0) {
      console.error('✗ Missing tables:', missing.join(', '));
      console.error('  Run: node init_db.js');
    }
  } catch (e) {
    console.error('✗ Error checking tables:', e.message);
  }
  
  // Check users
  try {
    const users = await db.query('SELECT id, username, role FROM users');
    console.log('\n✓ Users found:', users.rows.length);
    if (users.rows.length > 0) {
      users.rows.forEach(u => console.log('  -', u.username, '(' + u.role + ')'));
    } else {
      console.error('✗ No users found! Create one with the script above.');
    }
  } catch (e) {
    console.error('✗ Error checking users:', e.message);
  }
  
  process.exit(0);
})();
"
```

## Environment Variables Checklist

Make sure these are set in Portainer:

```env
# Database (REQUIRED)
DB_HOST=am.lan
DB_PORT=5432
DB_USER=appuser
DB_PASSWORD=P0stGress
DB_NAME=budget_app

# Server
NODE_ENV=production
PORT=3001

# Security (REQUIRED - change these!)
SESSION_SECRET=<your-secret-here>
JWT_SECRET=<your-secret-here>
```

## Still Having Issues?

1. **Check backend logs** for the exact error message
2. **Verify PostgreSQL is running** and accessible from the Docker network
3. **Test database connection** from the backend container
4. **Ensure database exists** - create it if needed:
   ```sql
   CREATE DATABASE budget_app;
   ```
5. **Check network connectivity** - ensure `am.lan` is resolvable from the container

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `relation "users" does not exist` | Tables not created | Run `node init_db.js` |
| `password authentication failed` | Wrong DB password | Check `DB_PASSWORD` env var |
| `Connection refused` | Can't reach DB | Check `DB_HOST` and network |
| `database "budget_app" does not exist` | Database missing | Create database first |
| `Login failed` (500) | Generic error | Check backend logs for details |

