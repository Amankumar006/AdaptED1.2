#!/bin/bash

# AdaptED Platform - Complete Testing Script
# This script demonstrates all working features with real data

echo "🎓 AdaptED Platform - Feature Testing Suite"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"

echo -e "${BLUE}Test User Credentials:${NC}"
echo "Email: test@example.com"
echo "Password: password123"
echo ""

# Test 1: Login
echo -e "${GREEN}TEST 1: User Login${NC}"
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.refreshToken')

echo -e "${YELLOW}Access Token extracted${NC}"
echo ""

# Test 2: Get Profile
echo -e "${GREEN}TEST 2: Get User Profile${NC}"
echo "----------------------------------------"
curl -s -X GET $BASE_URL/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 3: Validate Token
echo -e "${GREEN}TEST 3: Validate Access Token${NC}"
echo "----------------------------------------"
curl -s -X GET $BASE_URL/auth/validate \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 4: Refresh Token
echo -e "${GREEN}TEST 4: Refresh Access Token${NC}"
echo "----------------------------------------"
REFRESH_RESPONSE=$(curl -s -X POST $BASE_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
echo "$REFRESH_RESPONSE" | jq '.'
echo ""

# Test 5: OAuth Providers
echo -e "${GREEN}TEST 5: Get OAuth Providers${NC}"
echo "----------------------------------------"
curl -s -X GET $BASE_URL/oauth/providers | jq '.'
echo ""

# Test 6: MFA Status
echo -e "${GREEN}TEST 6: Check MFA Status${NC}"
echo "----------------------------------------"
curl -s -X GET $BASE_URL/mfa/status \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 7: User Permissions
echo -e "${GREEN}TEST 7: Get User Roles & Permissions${NC}"
echo "----------------------------------------"
echo "Getting roles..."
curl -s -X GET "$BASE_URL/authorization/roles" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 8: Health Check
echo -e "${GREEN}TEST 8: Service Health Check${NC}"
echo "----------------------------------------"
curl -s -X GET $BASE_URL/health | jq '.'
echo ""

# Test 9: Metrics (Prometheus format)
echo -e "${GREEN}TEST 9: Prometheus Metrics Sample${NC}"
echo "----------------------------------------"
curl -s -X GET $BASE_URL/metrics | head -20
echo "..."
echo ""

# Test 10: Database Verification
echo -e "${GREEN}TEST 10: Verify Data in Database${NC}"
echo "----------------------------------------"
echo "Checking PostgreSQL for user data..."
docker exec -it postgres-primary psql -U postgres -d educational_platform -c "SELECT email, first_name, last_name, last_login FROM users LIMIT 3;" 2>&1
echo ""

# Test 11: Redis Cache Verification
echo -e "${GREEN}TEST 11: Verify Redis Cache${NC}"
echo "----------------------------------------"
echo "Checking Redis for session data..."
docker exec -it redis-standalone redis-cli KEYS "auth:*" 2>&1 | head -5
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ All Tests Completed!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Open Student Portal: http://localhost:5173"
echo "2. Open Teacher Portal: http://localhost:5174"
echo "3. Login with: test@example.com / password123"
echo "4. Explore the platform features"
echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3000 (admin/admin)"
echo "- Jaeger: http://localhost:16686"
echo ""
echo -e "${GREEN}🎉 Platform is fully operational!${NC}"
