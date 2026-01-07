# Portainer Environment Variables Configuration

Based on your current database configuration, here are the environment variables you need to add in Portainer.

## Required Environment Variables

Add these in Portainer when creating/editing your stack:

### Database Connection (Required)

```env
DB_HOST=am.lan
DB_PORT=5432
DB_USER=appuser
DB_PASSWORD=P0stGress
DB_NAME=budget_app
```

**Note**: 
- If your database name is different (e.g., `appdb` or `postgres`), change `DB_NAME` accordingly
- If your PostgreSQL is on a different host, update `DB_HOST`
- If your PostgreSQL uses a different port, update `DB_PORT`

### Security Secrets (Required - Generate New Ones!)

```env
SESSION_SECRET=<generate-a-random-32-char-secret>
JWT_SECRET=<generate-a-random-32-char-secret>
```

**Generate secure secrets using:**
```bash
# On Linux/Mac
openssl rand -base64 32

# Or use an online generator
# Each secret should be at least 32 characters long
```

**Example generated secrets:**
```env
SESSION_SECRET=K8mN2pQ5rT9vW1xY4zA7bC0dE3fG6hI9jK2lM5nO8pQ1rS4tU7vW0xY3zA6b
JWT_SECRET=M9nP2qR5sT8uV1wX4yZ7aB0cD3eF6gH9iJ2kL5mN8oP1qR4sT7uV0wX3yZ6a
```

### Optional Environment Variables

```env
APP_PORT=8080
CORS_ORIGIN=*
FRONTEND_URL=http://localhost:8080
NODE_ENV=production
PORT=3001
```

**Note**: 
- `APP_PORT` is the external port (default: 8080) - change if needed
- `PORT` is the internal port (3001) - don't change this
- `CORS_ORIGIN` can be `*` for development or specific domain(s) for production

## Complete Example for Portainer

Copy and paste this into Portainer's **Environment variables** section, then update the values marked with `<>`:

```env
# Database Connection
DB_HOST=am.lan
DB_PORT=5432
DB_USER=appuser
DB_PASSWORD=P0stGress
DB_NAME=budget_app

# Security Secrets (CHANGE THESE!)
SESSION_SECRET=<generate-new-secret-here>
JWT_SECRET=<generate-new-secret-here>

# Port Configuration (default: 8080 external, 3001 internal)
APP_PORT=8080

# Optional
CORS_ORIGIN=*
FRONTEND_URL=http://localhost:8080
NODE_ENV=production
```

## Quick Setup Steps in Portainer

1. **Go to Stacks** → **Add stack** (or edit existing)
2. **Name**: `budget-app`
3. **Repository URL**: `https://github.com/amirgouda/budget.git`
4. **Reference**: `main`
5. **Compose path**: `docker-compose.yml`
6. **Click "Environment variables"**
7. **Add each variable** from the list above
8. **Deploy the stack**

## Important Notes

1. **Database Name**: 
   - Default is `budget_app`
   - If your database is named differently, update `DB_NAME`
   - The database should exist before deployment (or create it first)

2. **Network Access**:
   - Ensure `am.lan` is resolvable from your Docker containers
   - If PostgreSQL is on the same host, you might need to use:
     - `host.docker.internal` (Docker Desktop)
     - The host's IP address
     - Or configure Docker network access

3. **Security**:
   - **Never commit secrets to git**
   - Always generate new `SESSION_SECRET` and `JWT_SECRET` for production
   - Consider using Portainer's secret management for sensitive values

4. **Unified Deployment**:
   - Frontend and backend are now in a single container
   - No need to configure `REACT_APP_API_URL` - API calls use relative paths (`/api`)
   - Single port to expose (default: 8080)

## Testing Database Connection

After deployment, test the connection:

1. Go to **Containers** → `budget-app`
2. Click **Console**
3. Run: `node -e "const db = require('./db'); db.query('SELECT NOW()').then(r => console.log('Connected!', r.rows[0])).catch(e => console.error('Error:', e.message))"`

## Troubleshooting

**Can't connect to database?**
- Verify `am.lan` is reachable from the container
- Check PostgreSQL is running and accepting connections
- Verify credentials are correct
- Check firewall/network rules

**App won't start?**
- Check container logs: Containers → budget-app → Logs
- Verify all required environment variables are set
- Ensure the port (default: 8080) is not already in use

**Can't access the application?**
- Verify `APP_PORT` matches the port you're accessing
- Check firewall allows access to the port
- Ensure the container is running and healthy
