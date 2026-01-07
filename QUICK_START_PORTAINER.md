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

# API URL - Replace with your server IP/domain
REACT_APP_API_URL=http://YOUR_SERVER_IP:8081/api

# Optional (defaults shown)
BACKEND_PORT=8081
FRONTEND_PORT=8080
CORS_ORIGIN=*
FRONTEND_URL=http://localhost:80
```

**Important**: 
- Replace PostgreSQL connection details with your existing database information
- Replace `YOUR_SERVER_IP` with your actual server IP address or domain name
- Generate secure secrets (see below)

### 4. Deploy

Click **Deploy the stack** and wait for services to start.

### 5. Initialize Database

After deployment:

1. Go to **Containers** → `budget-backend`
2. Click **Console** or **Execute container**
3. Run: `node init_db.js`

### 6. Access

- **Frontend**: `http://YOUR_SERVER_IP:8080`
- **Backend API**: `http://YOUR_SERVER_IP:8081`

## Generate Secure Secrets

Use these commands to generate secure secrets:

```bash
# Session Secret (32+ characters)
openssl rand -base64 32

# JWT Secret (32+ characters)
openssl rand -base64 32
```

## Troubleshooting

**Backend won't start?**
- Check logs: Containers → budget-backend → Logs
- Verify database connection details are correct
- Ensure PostgreSQL is accessible from Docker network
- If PostgreSQL is on host machine, try `host.docker.internal` as DB_HOST (Docker Desktop) or host IP

**Frontend can't connect to API?**
- Verify `REACT_APP_API_URL` matches your server IP
- Check backend is running on port 3001
- Rebuild frontend if you changed API URL: Stack → Editor → Update

**Port already in use?**
- Default ports are now 8081 (backend) and 8080 (frontend)
- Change `BACKEND_PORT` or `FRONTEND_PORT` environment variables if needed
- Or modify port mappings in docker-compose.yml

## Full Documentation

See `PORTAINER_DEPLOYMENT.md` for detailed instructions.

