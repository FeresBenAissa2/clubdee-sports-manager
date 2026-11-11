# Database Migration Rollback Procedures

## Overview

This document provides detailed procedures for rolling back database migrations in the Sports Club Management System. All migrations now include DOWN sections that can be executed to reverse changes.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Rollback Testing](#rollback-testing)
3. [Single Migration Rollback](#single-migration-rollback)
4. [Multiple Migration Rollback](#multiple-migration-rollback)
5. [Emergency Rollback](#emergency-rollback)
6. [Data Loss Scenarios](#data-loss-scenarios)
7. [Verification Procedures](#verification-procedures)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before performing any rollback:

1. **Backup the database**
   ```bash
   # Use Supabase Dashboard to create a backup
   # Or use pg_dump if you have direct access
   ```

2. **Verify environment variables**
   ```bash
   # Check .env.local has required variables
   cat sports-club-management/.env.local | grep SUPABASE_ACCESS_TOKEN
   ```

3. **Stop application traffic** (for production rollbacks)
   - Disable API endpoints
   - Put application in maintenance mode
   - Notify users of downtime

4. **Document the reason for rollback**
   - What went wrong?
   - Which migration caused the issue?
   - What is the expected outcome?

## Rollback Testing

### Automated Testing

Use the rollback testing script to verify migrations can be rolled back:

```bash
# Test all migrations
cd sports-club-management
./scripts/test-rollback.sh

# Test specific migration
./scripts/test-rollback.sh 01  # Tests migration 01-*.sql
```

The script will:
1. Capture database state before migration
2. Execute UP migration
3. Execute DOWN migration
4. Compare database states
5. Report success or failure

### Manual Testing

For manual testing of a single migration:

```bash
# 1. Capture initial state
psql -h your-db-host -U postgres -d postgres \
  -c "\dt" > before_state.txt

# 2. Execute UP migration
./scripts/run-sql-via-api.sh scripts/01-schema-only.sql

# 3. Execute DOWN migration (uncomment DOWN section first)
./scripts/run-sql-via-api.sh scripts/01-schema-only.sql

# 4. Capture final state
psql -h your-db-host -U postgres -d postgres \
  -c "\dt" > after_state.txt

# 5. Compare states
diff before_state.txt after_state.txt
```

## Single Migration Rollback

### Step-by-Step Process

1. **Identify the migration to rollback**
   ```bash
   # List all migrations
   ls -la sports-club-management/scripts/[0-9]*.sql
   ```

2. **Open the migration file**
   ```bash
   # Example: Rolling back migration 104
   vim sports-club-management/scripts/104-create-idempotency-keys-table.sql
   ```

3. **Locate the DOWN section**
   - Scroll to the bottom of the file
   - Find the `-- DOWN MIGRATION` section
   - It will be commented out with `/*` and `*/`

4. **Uncomment the DOWN section**
   - Remove the `/*` at the start
   - Remove the `*/` at the end
   - Save the file

5. **Execute the rollback**
   ```bash
   cd sports-club-management
   ./scripts/run-sql-via-api.sh scripts/104-create-idempotency-keys-table.sql
   ```

6. **Verify the rollback**
   ```bash
   # Check that objects were removed
   # Example: Verify idempotency_keys table is gone
   ```

### Example: Rolling Back Idempotency Keys

```bash
# 1. Edit the migration file
vim sports-club-management/scripts/104-create-idempotency-keys-table.sql

# 2. Uncomment the DOWN section at the bottom
# Change from:
#   /*
#   DROP TABLE IF EXISTS idempotency_keys;
#   */
# To:
#   DROP TABLE IF EXISTS idempotency_keys;

# 3. Execute rollback
./scripts/run-sql-via-api.sh scripts/104-create-idempotency-keys-table.sql

# 4. Verify
# Check Supabase dashboard - idempotency_keys table should be gone
```

## Multiple Migration Rollback

When rolling back multiple migrations, **always rollback in reverse order** (newest first).

### Example: Rolling Back Migrations 100-105

```bash
# Rollback order (newest to oldest):
# 105 -> 104 -> 103 -> 101 -> 100

# 1. Rollback 105
./scripts/run-sql-via-api.sh scripts/105-create-feature-flags-table.sql

# 2. Rollback 104
./scripts/run-sql-via-api.sh scripts/104-create-idempotency-keys-table.sql

# 3. Rollback 103
./scripts/run-sql-via-api.sh scripts/103-add-clubs-sport-type.sql

# 4. Rollback 101
./scripts/run-sql-via-api.sh scripts/101-create-home-training-storage.sql

# 5. Rollback 100
./scripts/run-sql-via-api.sh scripts/100-create-home-training-system.sql
```

### Automated Multiple Rollback

Create a script for rolling back a range:

```bash
#!/bin/bash
# rollback-range.sh

START=$1  # e.g., 100
END=$2    # e.g., 105

for i in $(seq $END -1 $START); do
    file=$(ls scripts/${i}-*.sql 2>/dev/null | head -1)
    if [ -f "$file" ]; then
        echo "Rolling back: $file"
        ./scripts/run-sql-via-api.sh "$file"
    fi
done
```

## Emergency Rollback

For critical production issues requiring immediate rollback:

### Emergency Procedure

1. **Activate incident response**
   - Alert team members
   - Start incident log
   - Assign incident commander

2. **Stop all traffic immediately**
   ```bash
   # Put application in maintenance mode
   # Disable API endpoints
   # Block database writes
   ```

3. **Assess the situation**
   - Which migration caused the issue?
   - What is the impact?
   - Can we rollback safely?

4. **Execute rollback**
   ```bash
   # Rollback the problematic migration
   ./scripts/run-sql-via-api.sh scripts/XXX-problematic-migration.sql
   ```

5. **Verify system stability**
   - Check application logs
   - Test critical endpoints
   - Verify data integrity

6. **Restore traffic**
   - Remove maintenance mode
   - Enable API endpoints
   - Monitor for issues

7. **Post-incident review**
   - Document what happened
   - Update rollback procedures
   - Improve migration testing

## Data Loss Scenarios

### Critical Data Loss (Irreversible)

These rollbacks will **permanently delete data**:

| Migration Range | Data Lost | Severity |
|----------------|-----------|----------|
| 01-03 | All tables, all data | CRITICAL |
| 27-34 | All membership applications | HIGH |
| 10-22 | All training sessions, attendance | HIGH |
| 70 | All notifications | MEDIUM |
| 90 | All progress reports | MEDIUM |
| 100-101 | All home training logs | MEDIUM |

### Recoverable Data Loss

These can be recreated or reconfigured:

| Migration | Data Lost | Recovery |
|-----------|-----------|----------|
| 03 | Test data | Re-run migration 03 |
| 30 | System settings | Reconfigure via admin panel |
| 105 | Feature flags | Recreate via admin panel |
| 52 | Sample activities | Re-run migration 52 |

### Data Preservation Strategies

Before rolling back migrations that delete data:

1. **Export data to JSON**
   ```sql
   COPY (SELECT * FROM table_name) TO '/tmp/backup.json';
   ```

2. **Create temporary backup tables**
   ```sql
   CREATE TABLE table_name_backup AS SELECT * FROM table_name;
   ```

3. **Use Supabase backup feature**
   - Go to Supabase Dashboard
   - Database → Backups
   - Create manual backup

## Verification Procedures

### Post-Rollback Verification

After rolling back a migration, verify:

1. **Tables removed**
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   ORDER BY tablename;
   ```

2. **Functions removed**
   ```sql
   SELECT proname FROM pg_proc 
   WHERE pronamespace = 'public'::regnamespace;
   ```

3. **Indexes removed**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE schemaname = 'public';
   ```

4. **RLS policies removed**
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE schemaname = 'public';
   ```

5. **Foreign key constraints intact**
   ```sql
   SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint 
   WHERE contype = 'f';
   ```

### Application Verification

1. **Test critical endpoints**
   ```bash
   # Test authentication
   curl -X POST https://your-app.com/api/auth/signin
   
   # Test data retrieval
   curl https://your-app.com/api/athlete/sessions
   ```

2. **Check error logs**
   ```bash
   # View recent errors
   tail -f /var/log/application.log
   ```

3. **Verify user workflows**
   - Login/logout
   - Data creation
   - Data retrieval
   - Data updates

## Troubleshooting

### Common Issues

#### Issue: "Table does not exist"

**Cause**: Migration was already rolled back or never applied

**Solution**:
```bash
# Check if table exists
psql -c "\dt table_name"

# If it doesn't exist, the rollback is already complete
```

#### Issue: "Cannot drop table due to foreign key constraint"

**Cause**: Other tables reference this table

**Solution**:
```bash
# Use CASCADE to drop dependent objects
DROP TABLE table_name CASCADE;

# Or rollback dependent migrations first
```

#### Issue: "Function does not exist"

**Cause**: Function was already dropped or has different signature

**Solution**:
```sql
-- Drop with IF EXISTS
DROP FUNCTION IF EXISTS function_name(arg_types);

-- Or drop all overloads
DROP FUNCTION IF EXISTS function_name CASCADE;
```

#### Issue: "Rollback leaves orphaned data"

**Cause**: Foreign key constraints not properly handled

**Solution**:
```sql
-- Find orphaned records
SELECT * FROM child_table 
WHERE parent_id NOT IN (SELECT id FROM parent_table);

-- Clean up orphaned records
DELETE FROM child_table 
WHERE parent_id NOT IN (SELECT id FROM parent_table);
```

### Getting Help

If you encounter issues during rollback:

1. **Check the migration file** - Review the DOWN section for errors
2. **Check database logs** - Look for constraint violations
3. **Consult the team** - Don't rollback alone in production
4. **Document the issue** - Help improve future rollbacks

## Best Practices

1. **Always test rollbacks** before deploying migrations
2. **Backup before rollback** - Never rollback without a backup
3. **Rollback in reverse order** - Newest migrations first
4. **Verify after rollback** - Check that everything works
5. **Document everything** - Keep detailed logs
6. **Practice rollbacks** - Regular drills in staging
7. **Monitor after rollback** - Watch for issues
8. **Update documentation** - Improve procedures based on experience

## Rollback Checklist

Use this checklist for every rollback:

- [ ] Backup database created
- [ ] Rollback reason documented
- [ ] Team notified
- [ ] Traffic stopped (if production)
- [ ] Migration file reviewed
- [ ] DOWN section uncommented
- [ ] Rollback executed
- [ ] Verification completed
- [ ] Application tested
- [ ] Traffic restored (if production)
- [ ] Incident log updated
- [ ] Post-mortem scheduled (if needed)

## Additional Resources

- [Migration Guide](./MIGRATION_GUIDE.md)
- [Rollback Guide](./ROLLBACK_GUIDE.md)
- [Database Documentation](../docs/DATABASE.md)
- [Supabase Documentation](https://supabase.com/docs)
