#!/bin/bash

# Auto Migration Script - รัน SQL ทั้งหมดอัตโนมัติ
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Supabase Auto Migration                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root${NC}"
    exit 1
fi

cd sports-club-management 2>/dev/null || true

# Check dependencies
echo -e "${CYAN}[1/4] Checking dependencies...${NC}"

if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ jq is not installed${NC}"
    echo -e "${YELLOW}Install with: brew install jq${NC}"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}✗ curl is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies OK${NC}"
echo ""

# Load environment
echo -e "${CYAN}[2/4] Loading environment...${NC}"

if [ ! -f ".env.local" ]; then
    echo -e "${RED}Error: .env.local not found${NC}"
    exit 1
fi

source .env.local

PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')
echo -e "${GREEN}✓ Project: $PROJECT_REF${NC}"
echo ""

# Get access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}⚠ SUPABASE_ACCESS_TOKEN not found${NC}"
    echo ""
    echo -e "${CYAN}Get your token at: https://supabase.com/dashboard/account/tokens${NC}"
    echo -e "${YELLOW}Enter access token:${NC}"
    read -s SUPABASE_ACCESS_TOKEN
    echo ""
    
    if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        echo -e "${RED}Error: Access token required${NC}"
        exit 1
    fi
fi

# Function to execute SQL
execute_sql() {
    local FILE=$1
    local NAME=$2
    
    echo -e "${CYAN}Running: $NAME${NC}"
    
    if [ ! -f "$FILE" ]; then
        echo -e "${RED}✗ File not found: $FILE${NC}"
        return 1
    fi
    
    SQL_CONTENT=$(cat "$FILE")
    SQL_ESCAPED=$(echo "$SQL_CONTENT" | jq -Rs .)
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X POST \
      "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
      -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"query\": ${SQL_ESCAPED}}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✓ $NAME completed${NC}"
        return 0
    else
        echo -e "${RED}✗ $NAME failed (HTTP $HTTP_CODE)${NC}"
        BODY=$(echo "$RESPONSE" | sed '$d')
        echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
        return 1
    fi
}

# Run migrations
echo -e "${CYAN}[3/5] Running migrations...${NC}"
echo ""

execute_sql "scripts/01-schema-only.sql" "Schema & Tables"
echo ""

execute_sql "scripts/02-auth-functions-and-rls.sql" "Auth Functions & RLS"
echo ""

# Ask about test data
echo -e "${CYAN}[4/5] Test Users${NC}"
echo -e "${YELLOW}Create test users and sample data? (y/n):${NC}"
read -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    execute_sql "scripts/create-simple-test-users.sql" "Test Users"
    echo ""
    
    echo -e "${CYAN}[5/5] Setting up test data...${NC}"
    execute_sql "scripts/03-setup-test-data.sql" "Test Data (Clubs, Roles, Profiles)"
    echo ""
else
    echo -e "${YELLOW}Skipped test data creation${NC}"
    echo ""
fi

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Migration Complete!                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify in Supabase Dashboard"
echo "2. Start your app: npm run dev"
echo ""
