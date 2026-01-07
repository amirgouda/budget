# Multi-stage build for React frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies
# Using npm install instead of npm ci for better compatibility
RUN npm install --no-audit --prefer-offline || \
    npm install --no-audit

# Copy source files
COPY . .

# Set build-time environment variable (default if not provided)
ARG REACT_APP_API_URL=http://localhost:8081/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the React app
RUN npm run build

# Production stage
FROM nginx:alpine

# Install sed for runtime replacement
RUN apk add --no-cache sed

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Use entrypoint script to inject API URL at runtime
ENTRYPOINT ["/docker-entrypoint.sh"]

