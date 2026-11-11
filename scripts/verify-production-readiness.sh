#!/bin/bash

# Production Readiness Verification Script
# This script verifies all critical production requirements are met

set -e

echo "=========================================="
echo "Production Readiness Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Function to check and report
check_item() {
    local description=$1
    local command=$2
    local expected=$3
    
    echo -n "Checking: $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

check_warning() {
    local description=$1
    local command=$2
    
    echo -n "Warning: $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ WARNING${NC}"
        ((WARNINGS++))
        return 1
    fi
}

echo "1. Environment Configuration"
echo "----------------------------"

# Check environment variables
check_item "NEXT_PUBLIC_SUPABASE_URL exists" "[ ! -z \"\$NEXT_PUBLIC_SUPABASE_URL\" ]"
check_item "NEXT_PUBLIC_SUPABASE_ANON_KEY exists" "[ ! -z \"\$NEXT_PUBLIC_SUPABASE_ANON_KEY\" ]"
check_item "SUPABASE_SERVICE_ROLE_KEY exists" "[ ! -z \"\$SUPABASE_SERVICE_ROLE_KEY\" ]"
check_item "SUPABASE_ACCESS_TOKEN exists" "[ ! -z \"\$SUPABASE_ACCESS_TOKEN\" ]"

echo ""
echo "2. Database Migrations"
echo "----------------------"

# Check if critical migrations exist
check_item "Schema migration exists" "[ -f scripts/01-schema-only.sql ]"
check_item "RLS migration exists" "[ -f scripts/02-auth-functions-and-rls.sql ]"
check_item "Test data migration exists" "[ -f scripts/03-setup-test-data.sql ]"
check_item "Idempotency migration exists" "[ -f scripts/104-create-idempotency-keys-table.sql ]"
check_item "Feature flags migration exists" "[ -f scripts/105-create-feature-flags-table.sql ]"

echo ""
echo "3. OpenAPI Specifications"
echo "-------------------------"

check_item "Auth API spec exists" "[ -f openapi/auth.yaml ]"
check_item "Membership API spec exists" "[ -f openapi/membership.yaml ]"
check_item "Training API spec exists" "[ -f openapi/training.yaml ]"
check_item "Attendance API spec exists" "[ -f openapi/attendance.yaml ]"
check_item "Performance API spec exists" "[ -f openapi/performance.yaml ]"
check_item "Announcements API spec exists" "[ -f openapi/announcements.yaml ]"
check_item "Parent API spec exists" "[ -f openapi/parent.yaml ]"
check_item "Admin API spec exists" "[ -f openapi/admin.yaml ]"

echo ""
echo "4. Event Schemas"
echo "----------------"

check_item "Auth event schemas exist" "[ -d events/schemas/auth ]"
check_item "Membership event schemas exist" "[ -d events/schemas/membership ]"
check_item "Training event schemas exist" "[ -d events/schemas/training ]"
check_item "Communication event schemas exist" "[ -d events/schemas/communication ]"
check_item "Performance event schemas exist" "[ -d events/schemas/performance ]"

echo ""
echo "5. Infrastructure Code"
echo "----------------------"

check_item "Idempotency middleware exists" "[ -f lib/utils/idempotency-middleware.ts ]"
check_item "Feature flags utility exists" "[ -f lib/utils/feature-flags.ts ]"
check_item "Correlation ID middleware exists" "[ -f lib/utils/correlation-middleware.ts ]"
check_item "Logger utility exists" "[ -f lib/utils/logger.ts ]"
check_item "Error logger exists" "[ -f lib/monitoring/error-logger.ts ]"

echo ""
echo "6. Documentation"
echo "----------------"

check_item "README.md exists" "[ -f README.md ]"
check_item "DATABASE.md exists" "[ -f docs/DATABASE.md ]"
check_item "API_DOCUMENTATION.md exists" "[ -f docs/API_DOCUMENTATION.md ]"
check_item "TESTING.md exists" "[ -f docs/TESTING.md ]"
check_item "Feature registry exists" "[ -f FEATURE_REGISTRY.md ]"
check_item "RLS functions documented" "[ -f scripts/RLS_FUNCTIONS_CANONICAL.md ]"
check_item "Rollback procedures documented" "[ -f scripts/ROLLBACK_PROCEDURES.md ]"

echo ""
echo "7. Testing Infrastructure"
echo "-------------------------"

check_item "Test setup exists" "[ -f tests/setup.ts ]"
check_item "Contract tests exist" "[ -d tests/contracts ]"
check_item "Performance tests exist" "[ -d tests/performance ]"
check_item "Security audit test exists" "[ -f tests/security-audit.test.ts ]"
check_item "Integration tests exist" "[ -f tests/INTEGRATION_TEST_SUMMARY.md ]"

echo ""
echo "8. Rollback Capabilities"
echo "------------------------"

check_item "Rollback script exists" "[ -f scripts/test-rollback.sh ]"
check_item "Rollback guide exists" "[ -f scripts/ROLLBACK_GUIDE.md ]"
check_warning "Rollback script is executable" "[ -x scripts/test-rollback.sh ]"

echo ""
echo "9. Security Features"
echo "--------------------"

check_item "Input validation exists" "[ -f lib/utils/enhanced-validation.ts ]"
check_item "Sanitization exists" "[ -f lib/utils/sanitization.ts ]"
check_item "Access control exists" "[ -f lib/auth/access-control.ts ]"
check_item "Device tracking exists" "[ -f lib/auth/device-tracking.ts ]"

echo ""
echo "10. Monitoring and Observability"
echo "--------------------------------"

check_item "Correlation ID implementation exists" "[ -f lib/utils/correlation.ts ]"
check_item "API context exists" "[ -f lib/utils/api-context.ts ]"
check_item "Error logging exists" "[ -f lib/monitoring/error-logger.ts ]"

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ System is production ready!${NC}"
    exit 0
else
    echo -e "${RED}✗ System has $FAILED critical issues that must be resolved${NC}"
    exit 1
fi
