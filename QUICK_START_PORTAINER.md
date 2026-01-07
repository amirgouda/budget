# Quick Start: Deploy on Portainer

## Fast Deployment Steps

### 1. In Portainer, go to **Stacks** → **Add stack**

### 2. Stack Configuration

**Name**: `budget-app`

**Method**: Choose one:
- **Repository** (Recommended): 
  - URL: `https://github.com/amirgouda/budget.git`
  - Reference: `main`
  - Compose path: `docker-compose.yml`
  
- **Web editor**: Copy/paste the `docker-compose.yml` content

### 3. Environment Variables

Add these in the **Environment variables** section:

```env
# Required - PostgreSQL Connection (your existing database)
DB_HOST=your-postgres-host-or-ip
DB_PORT=5432
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name

# Required - Security Secrets
SESSION_SECRET=your-random-session-secret-min-32-chars
JWT_SECRET=your-random-jwt-secret-min-32-chars

# Optional (defaults shown)
APP_PORT=8080
CORS_ORIGIN=*
FRONTEND_URL=http://localhost:8080
```

**Important**: 
- Replace PostgreSQL connection details with your existing database information
- Generate secure secrets (see below)
- `APP_PORT` is the external port (default: 8080) - the app runs on port 3001 internally

### 4. Deploy

Click **Deploy the stack** and wait for the service to start.

**Note**: The first build may take several minutes as it builds both frontend and backend.

### 5. Initialize Database

After deployment:

1. Go to **Containers** → `budget-app`
2. Click **Console** or **Execute container**
3. Run: `node init_db.js`

### 6. Access

- **Application**: `http://YOUR_SERVER_IP:8080` (or your configured APP_PORT)
- **Health Check**: `http://YOUR_SERVER_IP:8080/health`
- **API**: `http://YOUR_SERVER_IP:8080/api/*`

## Generate Secure Secrets

Use these commands to generate secure secrets:

```bash
# Session Secret (32+ characters)
openssl rand -base64 32

# JWT Secret (32+ characters)
openssl rand -base64 32
```

## Troubleshooting

**Build fails with "frontend not found"?**
- This should be fixed now. If you still see this error, ensure you're using the latest code from the repository.

**App won't start?**
- Check logs: Containers → budget-app → Logs
- Verify database connection details are correct
- Ensure PostgreSQL is accessible from Docker network
- If PostgreSQL is on host machine, try `host.docker.internal` as DB_HOST (Docker Desktop) or host IP

**Can't access the application?**
- Verify `APP_PORT` is set correctly (default: 8080)
- Check the port is not already in use
- Ensure firewall allows access to the port
- Check container logs for errors

**Port already in use?**
- Change `APP_PORT` environment variable to a different port (e.g., `8081`, `3000`, etc.)

## Full Documentation

See `PORTAINER_DEPLOYMENT.md` for detailed instructions.
