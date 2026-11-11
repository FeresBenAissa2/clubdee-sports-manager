#!/bin/bash

# Script to execute SQL using Supabase Management API
# This bypasses the permission issues with psql
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SQL_FILE="${1}"

if [ -z "$SQL_FILE" ]; then
    echo -e "${RED}Usage: $0 <sql-file>${NC}"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 scripts/01-schema-only.sql"
    echo "  $0 scripts/02-auth-functions-and-rls.sql"
    echo "  $0 scripts/create-simple-test-users.sql"
    exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Error: SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Supabase SQL Executor (via Management API)        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}File: $SQL_FILE${NC}"
echo ""

# Load environment variables
if [ ! -f ".env.local" ]; then
    echo -e "${RED}Error: .env.local not found${NC}"
    exit 1
fi

source .env.local

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')

echo -e "${YELLOW}Project: $PROJECT_REF${NC}"
echo ""

# Check if we have access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}⚠ SUPABASE_ACCESS_TOKEN not found in .env.local${NC}"
    echo ""
    echo -e "${CYAN}To get your access token:${NC}"
    echo "1. Go to https://supabase.com/dashboard/account/tokens"
    echo "2. Generate a new token"
    echo "3. Add to .env.local:"
    echo "   SUPABASE_ACCESS_TOKEN=your_token_here"
    echo ""
    echo -e "${YELLOW}Or enter it now (will not be saved):${NC}"
    read -s SUPABASE_ACCESS_TOKEN
    echo ""
    
    if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        echo -e "${RED}Error: Access token required${NC}"
        exit 1
    fi
fi

# Read SQL file
SQL_CONTENT=$(cat "$SQL_FILE")

# Escape SQL for JSON
SQL_ESCAPED=$(echo "$SQL_CONTENT" | jq -Rs .)

echo -e "${YELLOW}Executing SQL via Management API...${NC}"
echo ""

# Execute SQL via Management API
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": ${SQL_ESCAPED}}")

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ SQL Executed Successfully!                         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Response:${NC}"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""
else
    echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ Failed to Execute SQL                              ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}HTTP Status: $HTTP_CODE${NC}"
    echo -e "${RED}Error:${NC}"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""
    exit 1
fi
