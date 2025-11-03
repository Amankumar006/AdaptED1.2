#!/bin/bash

# Comprehensive Login and Portal Test Script
# Tests the complete authentication flow

echo "========================================="
echo "Educational Platform - Login Flow Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=$4
    local expected_status=${5:-200}
    
    echo -n "Testing $name... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" -H "Origin: http://localhost:5173")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -H "Origin: http://localhost:5173" \
            -H "X-Request-ID: test-$(date +%s)" \
            -d "$data")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        echo "  Response: $body"
        ((FAILED++))
        return 1
    fi
}

# Function to test CORS
test_cors() {
    local url=$1
    echo -n "Testing CORS preflight for $url... "
    
    response=$(curl -s -w "\n%{http_code}" -X OPTIONS "$url" \
        -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type,X-Request-ID")
    
    status_code=$(echo "$response" | tail -n1)
    headers=$(echo "$response" | sed '$d')
    
    if [ "$status_code" -eq "204" ] && echo "$headers" | grep -q "Access-Control-Allow-Headers.*X-Request-ID"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Status: $status_code"
        echo "  Headers: $headers"
        ((FAILED++))
        return 1
    fi
}

echo "1. Infrastructure Health Checks"
echo "--------------------------------"

test_endpoint "Auth Service Health" "http://localhost:3001/health"
test_endpoint "Auth Service Ready" "http://localhost:3001/ready"
test_endpoint "Student Portal" "http://localhost:5173"

echo ""
echo "2. CORS Configuration Tests"
echo "----------------------------"

test_cors "http://localhost:3001/auth/login"

echo ""
echo "3. Authentication API Tests"
echo "---------------------------"

# Test login
LOGIN_DATA='{"email":"test@example.com","password":"password123"}'
if test_endpoint "Login API" "http://localhost:3001/auth/login" "POST" "$LOGIN_DATA"; then
    # Extract token for subsequent tests
    TOKEN=$(curl -s -X POST "http://localhost:3001/auth/login" \
        -H "Content-Type: application/json" \
        -H "X-Request-ID: test-token-extract" \
        -d "$LOGIN_DATA" | jq -r '.tokens.accessToken')
    
    if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo -e "  ${GREEN}✓${NC} Token extracted successfully"
        
        # Test profile endpoint with token
        echo -n "Testing Get Profile... "
        profile_response=$(curl -s -w "\n%{http_code}" \
            "http://localhost:3001/auth/profile" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Request-ID: test-profile")
        
        profile_status=$(echo "$profile_response" | tail -n1)
        if [ "$profile_status" -eq "200" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAILED${NC} (Status: $profile_status)"
            ((FAILED++))
        fi
    else
        echo -e "  ${RED}✗${NC} Failed to extract token"
        ((FAILED++))
    fi
fi

# Test invalid credentials
INVALID_DATA='{"email":"test@example.com","password":"wrongpassword"}'
test_endpoint "Login with Invalid Password" "http://localhost:3001/auth/login" "POST" "$INVALID_DATA" "401"

# Test missing email
MISSING_EMAIL='{"password":"password123"}'
test_endpoint "Login with Missing Email" "http://localhost:3001/auth/login" "POST" "$MISSING_EMAIL" "400"

echo ""
echo "4. Response Structure Validation"
echo "---------------------------------"

echo -n "Validating Login Response Structure... "
login_response=$(curl -s -X POST "http://localhost:3001/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Request-ID: test-structure" \
    -d "$LOGIN_DATA")

# Check for required fields
has_message=$(echo "$login_response" | jq -e '.message' > /dev/null 2>&1 && echo "yes" || echo "no")
has_user=$(echo "$login_response" | jq -e '.user' > /dev/null 2>&1 && echo "yes" || echo "no")
has_tokens=$(echo "$login_response" | jq -e '.tokens' > /dev/null 2>&1 && echo "yes" || echo "no")
has_access_token=$(echo "$login_response" | jq -e '.tokens.accessToken' > /dev/null 2>&1 && echo "yes" || echo "no")
has_refresh_token=$(echo "$login_response" | jq -e '.tokens.refreshToken' > /dev/null 2>&1 && echo "yes" || echo "no")

if [ "$has_message" = "yes" ] && [ "$has_user" = "yes" ] && [ "$has_tokens" = "yes" ] && [ "$has_access_token" = "yes" ] && [ "$has_refresh_token" = "yes" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
    echo "  ✓ message field present"
    echo "  ✓ user field present"
    echo "  ✓ tokens field present"
    echo "  ✓ accessToken present"
    echo "  ✓ refreshToken present"
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
    [ "$has_message" = "no" ] && echo "  ✗ message field missing"
    [ "$has_user" = "no" ] && echo "  ✗ user field missing"
    [ "$has_tokens" = "no" ] && echo "  ✗ tokens field missing"
    [ "$has_access_token" = "no" ] && echo "  ✗ accessToken missing"
    [ "$has_refresh_token" = "no" ] && echo "  ✗ refreshToken missing"
fi

echo ""
echo "5. Portal Accessibility Tests"
echo "------------------------------"

# Test PWA manifest
test_endpoint "PWA Manifest" "http://localhost:5173/manifest.json"

# Test PWA icons
test_endpoint "PWA Icon (192x192)" "http://localhost:5173/pwa-192x192.png"
test_endpoint "PWA Icon (512x512)" "http://localhost:5173/pwa-512x512.png"

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! The system is ready for use.${NC}"
    echo ""
    echo "You can now login to the Student Portal at:"
    echo "  URL: http://localhost:5173"
    echo "  Email: test@example.com"
    echo "  Password: password123"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
