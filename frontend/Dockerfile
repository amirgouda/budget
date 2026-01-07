# Multi-stage build for React frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Set build-time environment variable (default if not provided)
ARG REACT_APP_API_URL=http://localhost:3001/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the React app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

