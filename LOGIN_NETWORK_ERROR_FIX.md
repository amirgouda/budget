# Fix: Network Error on Login

## Problem
When accessing the app at `http://192.168.0.100:8080/login`, you get a network error when trying to login.

## Root Cause
The frontend was built with the wrong API URL (defaulting to `localhost`), so it can't reach the backend API.

## Solution

### Option 1: Quick Fix - Rebuild with Correct API URL (Recommended)

1. **In Portainer, go to your stack → Editor**

2. **Add/Update this environment variable:**
   ```env
   REACT_APP_API_URL=http://192.168.0.100:8081/api
   ```

3. **Rebuild the frontend container:**
   - Go to **Containers** → `budget-frontend`
   - Click **Recreate**
   - Or delete the container and redeploy the stack

### Option 2: Use Runtime Configuration (Already Implemented)

The latest code includes a runtime configuration script that automatically injects the API URL when the container starts.

**To use this:**

1. **Pull the latest code** (or it's already in your repo)

2. **In Portainer, add this environment variable:**
   ```env
   REACT_APP_API_URL=http://192.168.0.100:8081/api
   ```

3. **Rebuild the frontend container** - the entrypoint script will automatically replace the API URL in the built files

### Option 3: Manual Fix (If above don't work)

1. **Check backend is running:**
   - Go to **Containers** → `budget-backend`
   - Check it's running and healthy
   - Test: `http://192.168.0.100:8081/health`

2. **Check CORS settings:**
   - In Portainer, verify `CORS_ORIGIN` environment variable
   - Should be `*` or `http://192.168.0.100:8080`

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Go to **Console** tab
   - Look for the exact error message
   - Go to **Network** tab to see failed requests

## Verification

After applying the fix:

1. **Test backend directly:**
   ```bash
   curl http://192.168.0.100:8081/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test login endpoint:**
   ```bash
   curl -X POST http://192.168.0.100:8081/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"your_username","password":"your_password"}'
   ```

3. **Check browser console:**
   - Open `http://192.168.0.100:8080/login`
   - Open DevTools → Network tab
   - Try to login
   - Check if request goes to `http://192.168.0.100:8081/api/auth/login`

## Common Issues

### CORS Error
If you see CORS errors in the browser console:
- Update `CORS_ORIGIN` in backend environment variables to: `http://192.168.0.100:8080`
- Or keep it as `*` for development

### Connection Refused
If you see "Connection refused":
- Verify backend container is running on port 8081
- Check firewall rules allow port 8081
- Verify backend is accessible: `curl http://192.168.0.100:8081/health`

### 404 Not Found
If you see 404 errors:
- Verify the API endpoint is correct: `/api/auth/login`
- Check backend logs for routing issues

## Environment Variables Checklist

Make sure you have these set in Portainer:

```env
# Database
DB_HOST=am.lan
DB_USER=appuser
DB_PASSWORD=P0stGress
DB_NAME=budget_app

# API URL (IMPORTANT - must match your server IP)
REACT_APP_API_URL=http://192.168.0.100:8081/api

# CORS (allow requests from frontend)
CORS_ORIGIN=*
# OR
CORS_ORIGIN=http://192.168.0.100:8080

# Frontend URL
FRONTEND_URL=http://192.168.0.100:8080
```

## Still Having Issues?

1. **Check backend logs:**
   - Portainer → Containers → `budget-backend` → Logs
   - Look for errors when login is attempted

2. **Check frontend logs:**
   - Portainer → Containers → `budget-frontend` → Logs
   - Look for API URL replacement messages

3. **Test from container:**
   - Go to `budget-backend` container → Console
   - Run: `curl http://localhost:3001/health`
   - Should work from inside the container

4. **Check network connectivity:**
   - From your computer: `ping 192.168.0.100`
   - From browser: `http://192.168.0.100:8081/health`

