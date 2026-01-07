#!/bin/sh
# Docker entrypoint script to inject API URL at runtime

# Get API URL from environment variable or use default
API_URL="${REACT_APP_API_URL:-http://192.168.0.100:8081/api}"

# Find and replace the API URL in all JavaScript files
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://localhost:8081/api|${API_URL}|g" {} \;
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://192.168.0.100:8081/api|${API_URL}|g" {} \;

# Also replace in any HTML files
find /usr/share/nginx/html -type f -name "*.html" -exec sed -i "s|http://localhost:8081/api|${API_URL}|g" {} \;
find /usr/share/nginx/html -type f -name "*.html" -exec sed -i "s|http://192.168.0.100:8081/api|${API_URL}|g" {} \;

echo "API URL set to: ${API_URL}"

# Start nginx
exec nginx -g "daemon off;"

