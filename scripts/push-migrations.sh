#!/bin/bash

# Script to push all migrations to Supabase REMOTE database
# This will apply all pending migrations to your remote database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Supabase Remote Migration Push ===${NC}"

# Check if supabase is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Check if we have a project linked
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${RED}Error: No remote project linked!${NC}"
    echo ""
    echo -e "${YELLOW}Please link your remote Supabase project first:${NC}"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your project"
    echo "3. Copy the Project Reference ID from Settings > General"
    echo "4. Run: supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    exit 1
fi

# Show current migrations
echo -e "${YELLOW}Current migrations:${NC}"
ls -1 supabase/migrations/

echo ""
echo -e "${YELLOW}Pushing migrations to REMOTE database...${NC}"

# Push migrations to remote
supabase db push

echo ""
echo -e "${GREEN}✓ All migrations pushed to REMOTE successfully!${NC}"
echo -e "${BLUE}Verify at: Supabase Dashboard > Database > Migrations${NC}"
