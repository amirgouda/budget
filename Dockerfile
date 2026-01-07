# Multi-stage build for unified frontend + backend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json ./
COPY frontend/package-lock.json* ./

# Install frontend dependencies
RUN npm install --no-audit --prefer-offline || \
    npm install --no-audit

# Copy frontend source files
COPY frontend/ ./

# Build the React app (API URL will be relative, so no build-time env var needed)
RUN npm run build

# Production stage - Backend with frontend build
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY package.json ./
COPY package-lock.json* ./

# Install backend dependencies (production only)
RUN npm install --only=production --no-audit --prefer-offline || \
    npm install --only=production --no-audit

# Copy backend application files
COPY . .

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Expose port (default 3001, can be overridden)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.js"]
