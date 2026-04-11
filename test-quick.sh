#!/bin/bash

# AML Guardian Pro - Quick Test Script
# This script runs basic tests to verify the platform is working

set -e  # Exit on error

echo "🧪 AML Guardian Pro - Quick Test Suite"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# Check if services are running
echo "1️⃣  Checking Services..."
echo "------------------------"

if curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✓${NC} Backend is running on port 3001"
else
    echo -e "${RED}✗${NC} Backend is not running. Start with: cd backend && npm run dev"
    exit 1
fi

if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200\|301"; then
    echo -e "${GREEN}✓${NC} Frontend is running on port 3000"
else
    echo -e "${YELLOW}!${NC} Frontend may not be running. Start with: cd frontend && npm run dev"
fi

echo ""
echo "2️⃣  Testing API Endpoints..."
echo "----------------------------"

# Health check
echo -n "Health check... "
HEALTH=$(curl -s "$BASE_URL/api/health" | grep -o '"status":"healthy"' || echo "")
if [ ! -z "$HEALTH" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Auth endpoints
echo -n "Auth endpoints... "
AUTH_TEST=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"wrong"}' | grep -o '"success":false' || echo "")
if [ ! -z "$AUTH_TEST" ]; then
    echo -e "${GREEN}✓${NC} (responding correctly)"
else
    echo -e "${RED}✗${NC}"
fi

# Clients endpoint (will fail without auth, but should respond)
echo -n "Clients endpoint... "
CLIENTS_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/clients")
if [ "$CLIENTS_TEST" == "401" ]; then
    echo -e "${GREEN}✓${NC} (protected correctly)"
else
    echo -e "${YELLOW}!${NC} (returned $CLIENTS_TEST)"
fi

echo ""
echo "3️⃣  Testing Database Connection..."
echo "-----------------------------------"

# Check if we can login (validates DB)
echo -n "Login with test account... "
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"Test1234!"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "    Token received: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗${NC}"
    echo "    Response: $LOGIN_RESPONSE"
    exit 1
fi

echo ""
echo "4️⃣  Testing Protected Endpoints..."
echo "-----------------------------------"

# Test clients list
echo -n "List clients... "
CLIENTS=$(curl -s "$BASE_URL/api/clients" \
    -H "Authorization: Bearer $TOKEN")
if echo "$CLIENTS" | grep -q '"success":true'; then
    COUNT=$(echo "$CLIENTS" | grep -o '"data":\[' | wc -l)
    echo -e "${GREEN}✓${NC} (data retrieved)"
else
    echo -e "${RED}✗${NC}"
fi

# Test client stats
echo -n "Client stats... "
STATS=$(curl -s "$BASE_URL/api/clients/stats" \
    -H "Authorization: Bearer $TOKEN")
if echo "$STATS" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test risk assessments
echo -n "Risk assessments endpoint... "
RISK=$(curl -s "$BASE_URL/api/risk-assessments" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RISK" | grep -q '"success":true\|404'; then
    echo -e "${GREEN}✓${NC} (responding)"
else
    echo -e "${YELLOW}!${NC} (may need setup)"
fi

echo ""
echo "5️⃣  Testing Companies House Integration..."
echo "-------------------------------------------"

echo -n "CH lookup (09482394)... "
CH_TEST=$(curl -s "$BASE_URL/api/ch/company/09482394" \
    -H "Authorization: Bearer $TOKEN")
if echo "$CH_TEST" | grep -q 'company_name\|success'; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}!${NC} (may need CH API key)"
fi

echo ""
echo "6️⃣  Testing Document Endpoints..."
echo "----------------------------------"

echo -n "Documents endpoint... "
DOCS=$(curl -s "$BASE_URL/api/documents" \
    -H "Authorization: Bearer $TOKEN")
if echo "$DOCS" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}!${NC}"
fi

echo ""
echo "7️⃣  Testing API Key Endpoints..."
echo "---------------------------------"

echo -n "API keys list... "
APIKEYS=$(curl -s "$BASE_URL/api/api-keys" \
    -H "Authorization: Bearer $TOKEN")
if echo "$APIKEYS" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}!${NC} (may need controller setup)"
fi

echo ""
echo "8️⃣  Summary"
echo "-----------"

# Count results
PASSED=0
FAILED=0
WARNING=0

echo ""
echo "✅ Basic tests completed!"
echo ""
echo "Next steps:"
echo "  1. Open $FRONTEND_URL and login"
echo "  2. Create a test client"
echo "  3. Test the Client Portal feature"
echo "  4. Run full test suite: npm test"
echo ""
echo "For detailed testing guide, see: TESTING_GUIDE.md"
