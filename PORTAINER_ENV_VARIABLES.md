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

### Frontend Configuration (Required)

```env
REACT_APP_API_URL=http://YOUR_SERVER_IP:3001/api
```

**Replace `YOUR_SERVER_IP` with:**
- Your server's IP address (e.g., `http://192.168.1.100:3001/api`)
- Or your domain name (e.g., `http://budget.yourdomain.com:3001/api`)

### Optional Environment Variables

```env
CORS_ORIGIN=*
FRONTEND_URL=http://localhost:80
FRONTEND_PORT=80
NODE_ENV=production
PORT=3001
```

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

# Frontend API URL (UPDATE WITH YOUR SERVER IP)
REACT_APP_API_URL=http://<YOUR_SERVER_IP>:3001/api

# Optional
CORS_ORIGIN=*
FRONTEND_URL=http://localhost:80
FRONTEND_PORT=80
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

4. **API URL**:
   - Must be accessible from the browser
   - If using a domain, ensure DNS is configured
   - If using IP, ensure firewall allows access

## Testing Database Connection

After deployment, test the connection:

1. Go to **Containers** → `budget-backend`
2. Click **Console**
3. Run: `node -e "const db = require('./db'); db.query('SELECT NOW()').then(r => console.log('Connected!', r.rows[0])).catch(e => console.error('Error:', e.message))"`

## Troubleshooting

**Can't connect to database?**
- Verify `am.lan` is reachable from the container
- Check PostgreSQL is running and accepting connections
- Verify credentials are correct
- Check firewall/network rules

**Frontend can't reach API?**
- Verify `REACT_APP_API_URL` matches your server IP
- Check backend container is running on port 3001
- Verify CORS settings allow your frontend origin

