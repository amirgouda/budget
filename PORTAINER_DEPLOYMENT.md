# Deploying Budget App on Portainer

This guide will walk you through deploying the Budget application on Portainer using Docker Compose. The application now runs as a **unified single-server** deployment (frontend + backend in one container).

## Prerequisites

1. **Portainer installed and running** on your Docker host
2. **Docker and Docker Compose** installed
3. **Access to Portainer** web interface
4. **PostgreSQL database** (external, not included in this stack)

## Deployment Methods

### Method 1: Using Portainer Stack (Recommended)

This is the easiest method using Portainer's built-in stack deployment feature.

#### Step 1: Access Portainer

1. Open your Portainer web interface (usually `http://your-server:9000`)
2. Log in with your credentials
3. Select your **Environment** (Docker)

#### Step 2: Create a New Stack

1. Navigate to **Stacks** in the left sidebar
2. Click **Add stack**
3. Give your stack a name: `budget-app`

#### Step 3: Configure the Stack

1. **Option A: Using Git Repository (Recommended)**
   - Select **Repository** tab
   - **Repository URL**: `https://github.com/amirgouda/budget.git`
   - **Repository reference**: `main` (or your branch name)
   - **Compose path**: `docker-compose.yml`
   - **Auto-update**: Enable if you want automatic updates

2. **Option B: Using Web Editor**
   - Select **Web editor** tab
   - Copy and paste the contents of `docker-compose.yml`
   - Or use the file upload option

#### Step 4: Configure Environment Variables

Click on **Environment variables** and add the following:

```env
# PostgreSQL Connection (Your Existing Database)
DB_HOST=your-postgres-host-or-ip
DB_PORT=5432
DB_USER=your-database-username
DB_PASSWORD=your-database-password
DB_NAME=your-database-name

# Security Secrets (REQUIRED - Generate new ones!)
SESSION_SECRET=your-random-session-secret-here
JWT_SECRET=your-random-jwt-secret-here

# Application Configuration
APP_PORT=8080
CORS_ORIGIN=*
FRONTEND_URL=http://localhost:8080
```

**Important Notes:**
- **Database Connection**: Provide your existing PostgreSQL connection details
  - `DB_HOST`: IP address or hostname of your PostgreSQL server
  - `DB_PORT`: Usually `5432` (default PostgreSQL port)
  - `DB_USER`: Your PostgreSQL username
  - `DB_PASSWORD`: Your PostgreSQL password
  - `DB_NAME`: Your database name (create it if it doesn't exist)
- **Security**: Change `SESSION_SECRET` and `JWT_SECRET` to random secure strings (use `openssl rand -base64 32`)
- **Port**: `APP_PORT` is the external port (default: 8080). The app runs on port 3001 internally.
- **CORS**: `CORS_ORIGIN` can be `*` for development or specific domain(s) for production

#### Step 5: Deploy the Stack

1. Click **Deploy the stack**
2. Wait for the service to start (this may take a few minutes on first deployment as it builds both frontend and backend)
3. Monitor the logs to ensure everything starts correctly

**Note**: The unified Dockerfile uses a multi-stage build:
- First stage: Builds the React frontend
- Second stage: Sets up Node.js backend and copies the built frontend

#### Step 6: Initialize the Database

After the stack is deployed, you need to initialize the database schema:

1. Go to **Containers** in Portainer
2. Find the `budget-app` container
3. Click on it, then click **Console**
4. Run the initialization command:
   ```bash
   node init_db.js
   ```

Alternatively, you can use Portainer's **Execute container** feature:
1. Select `budget-app` container
2. Click **Execute container**
3. Command: `node init_db.js`
4. Click **Execute**

**Note**: Make sure your PostgreSQL database is accessible from the Docker network where the container is running. If your PostgreSQL is on a different network, you may need to configure network access or use the host's IP address.

#### Step 7: Access Your Application

- **Application**: `http://your-server-ip:8080` (or the port you configured in `APP_PORT`)
- **Health Check**: `http://your-server-ip:8080/health`
- **API Endpoints**: `http://your-server-ip:8080/api/*`

The frontend and backend are now served from the same server, so there are no CORS issues and no need to configure separate API URLs.

### Method 2: Using Portainer Compose Editor

If you prefer to manually edit the compose file:

1. Navigate to **Stacks** → **Add stack**
2. Select **Web editor**
3. Copy the `docker-compose.yml` content
4. Make any necessary modifications
5. Add environment variables as shown above
6. Deploy

## Post-Deployment Configuration

### 1. Create Admin User

You'll need to create an admin user. You can do this by:

1. Access the container console
2. Create a script or use SQL directly to insert an admin user

Or use the API after deployment (you may need to temporarily allow registration).

### 2. Configure Reverse Proxy (Optional)

If you want to use a domain name instead of IP addresses:

1. Set up a reverse proxy (Nginx, Traefik, etc.)
2. Point it to: `http://budget-app:3001` (internal container port)
3. Update `FRONTEND_URL` environment variable to match your domain

### 3. Set Up SSL/HTTPS (Optional)

1. Use a reverse proxy with Let's Encrypt
2. Or use Portainer's built-in SSL configuration
3. Update all URLs to use `https://`

## Monitoring and Maintenance

### View Logs

1. Go to **Containers** in Portainer
2. Click on `budget-app` container
3. Click **Logs** to view real-time logs

### Restart Services

1. Go to **Stacks**
2. Click on `budget-app` stack
3. Click **Editor** to modify configuration
4. Click **Update the stack** to apply changes

### Backup Database

Since the database is external, backup your PostgreSQL database using standard PostgreSQL backup methods:

```bash
pg_dump -U appuser budget_app > backup.sql
```

Or create a scheduled backup job in your PostgreSQL server.

## Troubleshooting

### Build fails with "frontend not found"

- Ensure you're using the latest code from the repository
- Check that `.dockerignore` doesn't exclude the `frontend` directory
- Verify the repository branch is correct

### App won't start

1. Check container logs: `Containers` → `budget-app` → `Logs`
2. Verify database connection:
   - Ensure PostgreSQL is accessible
   - Check database credentials in environment variables
3. Check if the configured port (default: 8080) is available

### Frontend shows errors

1. Check container logs for build errors
2. Verify the React build completed successfully
3. Check browser console for JavaScript errors
4. Ensure the container is running and healthy

### Database connection issues

1. Verify your PostgreSQL server is running and accessible
2. Check database credentials are correct in environment variables
3. Ensure the database host is reachable from the Docker network:
   - If PostgreSQL is on the same host: use host IP or `host.docker.internal` (Docker Desktop)
   - If PostgreSQL is on another server: use the server's IP address
   - If PostgreSQL is in another Docker network: configure network access
4. Test connection from container console:
   ```bash
   node -e "const db = require('./db'); db.query('SELECT NOW()').then(r => console.log(r)).catch(e => console.error(e))"
   ```

### Port conflicts

1. Default port is 8080 to avoid common conflicts
2. If this is in use, change via environment variable:
   ```env
   APP_PORT=8081
   ```
3. Or modify port mapping in `docker-compose.yml`:
   ```yaml
   ports:
     - "${APP_PORT:-8081}:3001"  # Change external port
   ```

## Updating the Application

### Update from Git

If you used the Git repository method:

1. Go to **Stacks** → `budget-app`
2. Click **Editor**
3. Click **Pull and redeploy** (if auto-update is enabled)
4. Or manually pull latest changes and redeploy

### Manual Update

1. Pull latest code: `git pull origin main`
2. Rebuild images or restart stack
3. Run database migrations if needed

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | **Yes** | PostgreSQL server hostname or IP address |
| `DB_PORT` | No | PostgreSQL port (default: `5432`) |
| `DB_USER` | **Yes** | PostgreSQL username |
| `DB_PASSWORD` | **Yes** | PostgreSQL password |
| `DB_NAME` | **Yes** | Database name |
| `SESSION_SECRET` | **Yes** | Session encryption secret (change from default) |
| `JWT_SECRET` | **Yes** | JWT token secret (change from default) |
| `APP_PORT` | No | External port (default: `8080`) |
| `CORS_ORIGIN` | No | Allowed CORS origins (default: `*`) |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: `http://localhost:8080`) |
| `NODE_ENV` | No | Node environment (default: `production`) |
| `PORT` | No | Internal port (default: `3001`, don't change) |

## Security Best Practices

1. **Change all default secrets** before production deployment
2. **Use strong passwords** for database
3. **Restrict CORS_ORIGIN** to your actual domain(s) in production
4. **Set up firewall rules** to limit access
5. **Enable SSL/HTTPS** for production
6. **Regular backups** of the database
7. **Keep containers updated** with security patches

## Support

For issues or questions:
- Check container logs in Portainer
- Verify all environment variables are set correctly
- Ensure the service is healthy (check health status in Portainer)
- Review the troubleshooting section above
