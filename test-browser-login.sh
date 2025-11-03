#!/bin/bash

echo "Testing actual login from browser perspective..."
echo ""

# Test the exact flow the browser would use
echo "1. Testing fetch from browser origin..."
response=$(curl -s -X POST "http://localhost:3001/auth/login" \
    -H "Content-Type: application/json" \
    -H "Origin: http://localhost:5173" \
    -H "X-Request-ID: browser-test-$(date +%s)" \
    -d '{"email":"test@example.com","password":"password123"}' \
    -w "\nHTTP_CODE:%{http_code}\nCORS_ORIGIN:%{header_access-control-allow-origin}\n")

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
cors_origin=$(echo "$response" | grep "CORS_ORIGIN:" | cut -d: -f2-)
body=$(echo "$response" | grep -v "HTTP_CODE:" | grep -v "CORS_ORIGIN:")

echo "HTTP Status: $http_code"
echo "CORS Origin: $cors_origin"
echo ""

if [ "$http_code" = "200" ] && [ "$cors_origin" = "http://localhost:5173" ]; then
    echo "✓ Login API is accessible from Student Portal origin"
    echo "✓ CORS headers are properly set"
    echo ""
    
    # Check response structure
    access_token=$(echo "$body" | jq -r '.tokens.accessToken' 2>/dev/null)
    if [ ! -z "$access_token" ] && [ "$access_token" != "null" ]; then
        echo "✓ Access token received"
        echo ""
        echo "========================================="
        echo "SUCCESS! Login flow is working correctly"
        echo "========================================="
        echo ""
        echo "You can now test in the browser:"
        echo "1. Open: http://localhost:5173"
        echo "2. Login with:"
        echo "   Email: test@example.com"
        echo "   Password: password123"
        echo ""
        echo "The login should work without CORS errors!"
        exit 0
    fi
fi

echo "✗ Login flow has issues"
echo "Response: $body"
exit 1
