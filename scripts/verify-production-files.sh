#!/bin/bash

# Production Readiness File Verification Script
# Verifies all required files and documentation exist

set -e

echo "=========================================="
echo "Production Readiness File Verification"
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

# Function to check file exists
check_file() {
    local description=$1
    local filepath=$2
    
    echo -n "Checking: $description... "
    
    if [ -f "$filepath" ]; then
        echo -e "${GREEN}✓ EXISTS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ MISSING${NC}"
        echo "  Expected: $filepath"
        ((FAILED++))
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    local description=$1
    local dirpath=$2
    
    echo -n "Checking: $description... "
    
    if [ -d "$dirpath" ]; then
        echo -e "${GREEN}✓ EXISTS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ MISSING${NC}"
        echo "  Expected: $dirpath"
        ((FAILED++))
        return 1
    fi
}

echo "1. Critical Database Migrations"
echo "--------------------------------"

check_file "Schema migration" "scripts/01-schema-only.sql"
check_file "RLS migration" "scripts/02-auth-functions-and-rls.sql"
check_file "Test data migration" "scripts/03-setup-test-data.sql"
check_file "Idempotency migration" "scripts/104-create-idempotency-keys-table.sql"
check_file "Feature flags migration" "scripts/105-create-feature-flags-table.sql"

echo ""
echo "2. OpenAPI Specifications"
echo "-------------------------"

check_file "Auth API spec" "openapi/auth.yaml"
check_file "Membership API spec" "openapi/membership.yaml"
check_file "Training API spec" "openapi/training.yaml"
check_file "Attendance API spec" "openapi/attendance.yaml"
check_file "Performance API spec" "openapi/performance.yaml"
check_file "Announcements API spec" "openapi/announcements.yaml"
check_file "Parent API spec" "openapi/parent.yaml"
check_file "Admin API spec" "openapi/admin.yaml"

echo ""
echo "3. Event Schemas"
echo "----------------"

check_dir "Auth event schemas" "events/schemas/auth"
check_dir "Membership event schemas" "events/schemas/membership"
check_dir "Training event schemas" "events/schemas/training"
check_dir "Communication event schemas" "events/schemas/communication"
check_dir "Performance event schemas" "events/schemas/performance"

check_file "Event registry" "events/EVENT_SCHEMA_REGISTRY.md"
check_file "Event implementation summary" "events/IMPLEMENTATION_SUMMARY.md"

echo ""
echo "4. Infrastructure Code"
echo "----------------------"

check_file "Idempotency utility" "lib/utils/idempotency.ts"
check_file "Idempotency middleware" "lib/utils/idempotency-middleware.ts"
check_file "Feature flags utility" "lib/utils/feature-flags.ts"
check_file "Correlation utility" "lib/utils/correlation.ts"
check_file "Correlation middleware" "lib/utils/correlation-middleware.ts"
check_file "Logger utility" "lib/utils/logger.ts"
check_file "API context" "lib/utils/api-context.ts"
check_file "Error logger" "lib/monitoring/error-logger.ts"

echo ""
echo "5. Core Documentation"
echo "---------------------"

check_file "README" "README.md"
check_file "Project structure" "PROJECT_STRUCTURE.md"
check_file "Database docs" "docs/DATABASE.md"
check_file "API documentation" "docs/API_DOCUMENTATION.md"
check_file "Testing docs" "docs/TESTING.md"
check_file "Feature registry" "FEATURE_REGISTRY.md"
check_file "Feature registry JSON" "features.json"

echo ""
echo "6. Technical Documentation"
echo "--------------------------"

check_file "RLS functions canonical" "scripts/RLS_FUNCTIONS_CANONICAL.md"
check_file "Rollback procedures" "scripts/ROLLBACK_PROCEDURES.md"
check_file "Rollback guide" "scripts/ROLLBACK_GUIDE.md"
check_file "Migration guide" "scripts/MIGRATION_GUIDE.md"
check_file "Security audit report" "docs/SECURITY_AUDIT_REPORT.md"
check_file "Performance testing docs" "docs/PERFORMANCE_TESTING.md"
check_file "Feature flags docs" "docs/FEATURE_FLAGS.md"
check_file "Idempotency docs" "docs/IDEMPOTENCY_SYSTEM.md"
check_file "Correlation IDs docs" "docs/CORRELATION_IDS.md"

echo ""
echo "7. Testing Infrastructure"
echo "-------------------------"

check_file "Test setup" "tests/setup.ts"
check_dir "Contract tests" "tests/contracts"
check_dir "Performance tests" "tests/performance"
check_file "Security audit test" "tests/security-audit.test.ts"
check_file "Integration test summary" "tests/INTEGRATION_TEST_SUMMARY.md"

echo ""
echo "8. Contract Testing"
echo "-------------------"

check_file "Pact setup docs" "tests/contracts/PACT_SETUP.md"
check_file "Contract implementation summary" "tests/contracts/IMPLEMENTATION_SUMMARY.md"
check_file "Auth consumer test" "tests/contracts/consumer/auth.consumer.test.ts"
check_file "Auth provider test" "tests/contracts/provider/auth.provider.test.ts"

echo ""
echo "9. Rollback Capabilities"
echo "------------------------"

check_file "Rollback test script" "scripts/test-rollback.sh"
check_file "Rollback implementation summary" "scripts/ROLLBACK_IMPLEMENTATION_SUMMARY.md"

echo ""
echo "10. Security Features"
echo "---------------------"

check_file "Enhanced validation" "lib/utils/enhanced-validation.ts"
check_file "Sanitization" "lib/utils/sanitization.ts"
check_file "Access control" "lib/auth/access-control.ts"
check_file "Device tracking" "lib/auth/device-tracking.ts"
check_file "Input validation docs" "docs/INPUT_VALIDATION_SANITIZATION.md"

echo ""
echo "11. Monitoring and Observability"
echo "---------------------------------"

check_file "User monitoring guide" "docs/USER_MONITORING_GUIDE.md"
check_file "Audit actions" "lib/audit/actions.ts"

echo ""
echo "12. Production Readiness"
echo "------------------------"

check_file "Production readiness checklist" "docs/PRODUCTION_READINESS_CHECKLIST.md"
check_file "Production verification script" "scripts/verify-production-readiness.sh"

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "${GREEN}Files Found: $PASSED${NC}"
echo -e "${RED}Files Missing: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All required files present - System is production ready!${NC}"
    exit 0
else
    echo -e "${RED}✗ System has $FAILED missing files that must be created${NC}"
    exit 1
fi
