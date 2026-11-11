#!/bin/bash

# ============================================================================
# Migration Rollback Testing Script
# ============================================================================
# Description: Tests UP then DOWN for each migration to verify rollback works
# Usage: ./scripts/test-rollback.sh [migration_number]
# Example: ./scripts/test-rollback.sh 01  # Test only migration 01
#          ./scripts/test-rollback.sh     # Test all migrations
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

# Load environment variables
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    echo "Please create .env.local with SUPABASE_ACCESS_TOKEN"
    exit 1
fi

source "$ENV_FILE"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: SUPABASE_ACCESS_TOKEN not set in .env.local${NC}"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_URL not set in .env.local${NC}"
    exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Execute SQL via Supabase API
execute_sql() {
    local sql_content="$1"
    local description="$2"
    
    log_info "Executing: $description"
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
        -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$sql_content" | jq -Rs .)}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        log_success "$description completed"
        return 0
    else
        log_error "$description failed (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Extract UP migration from file
extract_up_migration() {
    local file="$1"
    
    # Extract everything before DOWN MIGRATION section
    awk '/^-- ============================================================================$/,/^-- DOWN MIGRATION$/ {
        if (/^-- DOWN MIGRATION$/) exit;
        print
    }' "$file"
}

# Extract DOWN migration from file
extract_down_migration() {
    local file="$1"
    
    # Extract DOWN section and uncomment it
    awk '/^-- DOWN MIGRATION$/,0' "$file" | \
    sed 's/^\/\*//' | \
    sed 's/^\*\///' | \
    grep -v "^-- Uncomment and run" | \
    grep -v "^-- WARNING:"
}

# Check if migration has DOWN section
has_down_section() {
    local file="$1"
    grep -q "^-- DOWN MIGRATION" "$file"
}

# Get database state snapshot
get_db_snapshot() {
    local snapshot_name="$1"
    
    # Query to get table counts and structure
    local query="
    SELECT 
        schemaname,
        tablename,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = schemaname AND table_name = tablename) as column_count
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
    "
    
    execute_sql "$query" "Getting database snapshot: $snapshot_name" > "/tmp/db_snapshot_${snapshot_name}.txt"
}

# Compare database snapshots
compare_snapshots() {
    local before="$1"
    local after="$2"
    
    if diff "/tmp/db_snapshot_${before}.txt" "/tmp/db_snapshot_${after}.txt" > /dev/null; then
        log_success "Database state matches: rollback successful"
        return 0
    else
        log_warning "Database state differs after rollback"
        diff "/tmp/db_snapshot_${before}.txt" "/tmp/db_snapshot_${after}.txt" || true
        return 1
    fi
}

# Test single migration rollback
test_migration_rollback() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    
    echo ""
    echo "========================================================================"
    log_info "Testing migration: $migration_name"
    echo "========================================================================"
    
    # Check if DOWN section exists
    if ! has_down_section "$migration_file"; then
        log_warning "No DOWN section found in $migration_name - SKIPPING"
        return 2
    fi
    
    # Get initial state
    log_info "Capturing initial database state..."
    get_db_snapshot "before_${migration_name}"
    
    # Extract and execute UP migration
    log_info "Executing UP migration..."
    up_sql=$(extract_up_migration "$migration_file")
    if ! execute_sql "$up_sql" "UP migration for $migration_name"; then
        log_error "UP migration failed for $migration_name"
        return 1
    fi
    
    # Get state after UP
    log_info "Capturing state after UP migration..."
    get_db_snapshot "after_up_${migration_name}"
    
    # Extract and execute DOWN migration
    log_info "Executing DOWN migration (rollback)..."
    down_sql=$(extract_down_migration "$migration_file")
    if ! execute_sql "$down_sql" "DOWN migration for $migration_name"; then
        log_error "DOWN migration failed for $migration_name"
        return 1
    fi
    
    # Get state after DOWN
    log_info "Capturing state after DOWN migration..."
    get_db_snapshot "after_down_${migration_name}"
    
    # Compare states
    log_info "Comparing database states..."
    if compare_snapshots "before_${migration_name}" "after_down_${migration_name}"; then
        log_success "✓ Migration $migration_name rollback test PASSED"
        return 0
    else
        log_error "✗ Migration $migration_name rollback test FAILED"
        return 1
    fi
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    local specific_migration="$1"
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local skipped_tests=0
    
    echo "========================================================================"
    echo "Migration Rollback Testing"
    echo "========================================================================"
    echo "Project: $PROJECT_REF"
    echo "Testing: ${specific_migration:-All migrations}"
    echo ""
    
    # Confirm before proceeding
    log_warning "This will execute migrations and rollbacks on your database"
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Aborted by user"
        exit 0
    fi
    
    # Find migrations to test
    if [ -n "$specific_migration" ]; then
        # Test specific migration
        migration_files=("$SCRIPT_DIR/${specific_migration}"*.sql)
    else
        # Test all migrations with DOWN sections
        migration_files=("$SCRIPT_DIR"/[0-9]*.sql)
    fi
    
    # Test each migration
    for migration_file in "${migration_files[@]}"; do
        if [ ! -f "$migration_file" ]; then
            continue
        fi
        
        total_tests=$((total_tests + 1))
        
        if test_migration_rollback "$migration_file"; then
            passed_tests=$((passed_tests + 1))
        elif [ $? -eq 2 ]; then
            skipped_tests=$((skipped_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    done
    
    # Summary
    echo ""
    echo "========================================================================"
    echo "Test Summary"
    echo "========================================================================"
    echo "Total migrations tested: $total_tests"
    echo -e "${GREEN}Passed: $passed_tests${NC}"
    echo -e "${RED}Failed: $failed_tests${NC}"
    echo -e "${YELLOW}Skipped: $skipped_tests${NC}"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        log_success "All rollback tests passed!"
        exit 0
    else
        log_error "Some rollback tests failed"
        exit 1
    fi
}

# Run main function
main "$@"
