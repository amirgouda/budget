# Build Troubleshooting Guide

## Common Build Errors and Solutions

### Error: "npm ci did not complete successfully: exit code 1"

This error typically occurs when:
1. `package-lock.json` is missing or out of sync
2. Network issues during dependency installation
3. Node version incompatibility

**Solutions:**

1. **Updated Dockerfiles**: The Dockerfiles have been updated to use `npm install` instead of `npm ci` for better compatibility.

2. **Ensure package-lock.json is committed**:
   ```bash
   git add package-lock.json
   git commit -m "Add package-lock.json"
   git push
   ```

3. **If build still fails, try these steps in Portainer**:
   - Go to **Stacks** → Your stack → **Editor**
   - Temporarily modify the Dockerfile to add more verbose output:
   ```dockerfile
   RUN npm install --only=production --no-audit --loglevel=verbose
   ```
   - Check the build logs for specific error messages

4. **Alternative: Use pre-built image** (if available):
   - Build locally and push to a registry
   - Use the image directly instead of building

### Error: "Cannot find module" or missing dependencies

**Solution:**
- Ensure all dependencies are listed in `package.json`
- Run `npm install` locally to regenerate `package-lock.json`
- Commit the updated `package-lock.json`

### Error: Network timeout during npm install

**Solutions:**
1. **Add npm registry configuration** to Dockerfile:
   ```dockerfile
   RUN npm config set registry https://registry.npmjs.org/
   ```

2. **Use build arguments for network settings** in docker-compose.yml:
   ```yaml
   build:
     context: .
     dockerfile: Dockerfile
     args:
       - NPM_REGISTRY=https://registry.npmjs.org/
   ```

3. **Check Portainer's network settings** - ensure containers can access the internet

### Error: "package-lock.json not found"

**Solution:**
- The updated Dockerfiles now handle missing package-lock.json gracefully
- If you see this error, ensure `package-lock.json` is committed to git:
  ```bash
  git add package-lock.json frontend/package-lock.json
  git commit -m "Add package-lock.json files"
  git push
  ```

### Error: Frontend build fails

**Common causes:**
1. Missing environment variable `REACT_APP_API_URL`
2. Build timeout
3. Memory issues

**Solutions:**
1. **Ensure REACT_APP_API_URL is set** in Portainer environment variables
2. **Increase build timeout** in Portainer settings
3. **Check available memory** - React builds can be memory-intensive

### General Build Tips

1. **Check build logs** in Portainer:
   - Go to **Stacks** → Your stack → **Logs**
   - Look for specific error messages

2. **Test build locally first**:
   ```bash
   docker build -t budget-backend .
   docker build -t budget-frontend ./frontend
   ```

3. **Verify Git repository**:
   - Ensure all necessary files are committed
   - Check that `.dockerignore` isn't excluding needed files

4. **Clear Portainer cache** (if available):
   - Some Portainer versions cache builds
   - Try rebuilding without cache

5. **Check Node version compatibility**:
   - Current Dockerfiles use `node:18-alpine`
   - If you need a different version, update the Dockerfile

## Quick Fixes

### If backend build fails:
1. Update Dockerfile to use `npm install` (already done)
2. Ensure `package-lock.json` is in repository
3. Check build logs for specific package errors

### If frontend build fails:
1. Ensure `REACT_APP_API_URL` environment variable is set
2. Check that `frontend/package-lock.json` exists
3. Verify React build has enough memory

### If both fail:
1. Check Portainer's Docker daemon is running
2. Verify network connectivity from Portainer
3. Check available disk space
4. Review Portainer logs for system-level errors

### Error: "port is already allocated" or "Bind for 0.0.0.0:PORT failed"

This means another container or service is using the port.

**Solutions:**

1. **Change the port** in environment variables:
   ```env
   BACKEND_PORT=3002
   FRONTEND_PORT=8080
   ```
   Then update `REACT_APP_API_URL` to match:
   ```env
   REACT_APP_API_URL=http://YOUR_SERVER_IP:3002/api
   ```

2. **Find and stop the conflicting container**:
   - In Portainer, go to **Containers**
   - Look for containers using port 3001
   - Stop or remove them if not needed

3. **Check what's using the port** (on Docker host):
   ```bash
   # On Linux
   sudo netstat -tulpn | grep 3001
   # Or
   sudo ss -tulpn | grep 3001
   
   # On Docker host, check containers
   docker ps | grep 3001
   ```

4. **Use a different port range**:
   - Backend: `3002`, `8080`, `8081`, etc.
   - Frontend: `80`, `8080`, `3000`, etc.

## Still Having Issues?

1. **Check Portainer version** - older versions may have build issues
2. **Try building manually** on the Docker host to isolate the issue
3. **Check Docker daemon logs** on the host system
4. **Verify Git repository** is accessible from Portainer
5. **Test with a simpler Dockerfile** to isolate the problem
6. **Check port conflicts** - use `docker ps` or Portainer's container list

