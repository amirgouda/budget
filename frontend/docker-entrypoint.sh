#!/bin/sh
# Docker entrypoint script to inject API URL at runtime

# Get API URL from environment variable or use default
API_URL="${REACT_APP_API_URL:-http://192.168.0.100:8081/api}"

echo "========================================="
echo "Setting API URL to: ${API_URL}"
echo "========================================="

# Method 1: Replace in index.html script tag (most reliable)
echo "Updating index.html..."
sed -i "s|window.REACT_APP_API_URL = window.REACT_APP_API_URL || 'http://192.168.0.100:8081/api'|window.REACT_APP_API_URL = '${API_URL}'|g" /usr/share/nginx/html/index.html
sed -i "s|window.REACT_APP_API_URL || 'http://192.168.0.100:8081/api'|window.REACT_APP_API_URL = '${API_URL}'|g" /usr/share/nginx/html/index.html

# Also set it directly in the script tag
sed -i "s|'http://192.168.0.100:8081/api'|'${API_URL}'|g" /usr/share/nginx/html/index.html
sed -i "s|http://192.168.0.100:8081/api|${API_URL}|g" /usr/share/nginx/html/index.html

# Method 2: Also try to replace in JavaScript files (backup method)
echo "Replacing API URLs in JavaScript files..."
ESCAPED_API_URL=$(echo "$API_URL" | sed 's/[[\.*^$()+?{|]/\\&/g')

# Replace various patterns
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://localhost:8081/api|${ESCAPED_API_URL}|g" {} \; 2>/dev/null
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://192.168.0.100:8081/api|${ESCAPED_API_URL}|g" {} \; 2>/dev/null

# Verify index.html was updated
echo "Verifying index.html update..."
if grep -q "${API_URL}" /usr/share/nginx/html/index.html; then
  echo "✓ index.html updated successfully"
else
  echo "⚠ Warning: index.html might not have been updated correctly"
fi

echo "========================================="
echo "Starting nginx..."
echo "========================================="

# Start nginx
exec nginx -g "daemon off;"

