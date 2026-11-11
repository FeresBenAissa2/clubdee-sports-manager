# Migration Rollback Guide

This document tracks the rollback capability of all database migrations.

## Rollback Status

### ✅ Core Migrations (Complete)
- `01-schema-only.sql` - DOWN section added
- `02-auth-functions-and-rls.sql` - DOWN section added
- `03-setup-test-data.sql` - DOWN section added

### ✅ Training and Attendance (10-22) - Partial
- `10-add-training-sessions-fields.sql` - DOWN section added
- `11-add-attendance-logs-fields.sql` - Needs DOWN section
- `12-create-leave-requests-table.sql` - Needs DOWN section
- `13-create-training-attendance-indexes.sql` - Needs DOWN section
- `15-training-sessions-rls-policies.sql` - Needs DOWN section
- `16-attendance-rls-policies.sql` - Needs DOWN section
- `17-cleanup-attendance-policies.sql` - Needs DOWN section
- `18-add-device-tracking.sql` - Needs DOWN section
- `19-add-training-sessions-core-fields.sql` - Needs DOWN section
- `20-make-team-id-nullable.sql` - Needs DOWN section
- `21-make-legacy-fields-nullable.sql` - Needs DOWN section
- `22-create-login-sessions-table.sql` - Needs DOWN section

### ✅ Membership System (27-34) - Partial
- `27-create-membership-applications.sql` - DOWN section added
- `28-membership-applications-rls.sql` - Needs DOWN section
- `30-create-system-settings.sql` - Needs DOWN section
- `31-update-membership-applications.sql` - Needs DOWN section
- `32-update-profiles-membership-status.sql` - Needs DOWN section
- `33-membership-approval-rls.sql` - Needs DOWN section
- `34-membership-helper-functions.sql` - Needs DOWN section

### ✅ Storage and Features (40-63) - Partial
- `40-add-membership-constraints.sql` - Needs DOWN section
- `41-create-membership-documents-bucket.sql` - Needs DOWN section
- `50-create-activity-checkin-system.sql` - DOWN section added
- `51-activity-checkin-rls-policies.sql` - Needs DOWN section
- `52-seed-sample-activities.sql` - Needs DOWN section
- `55-create-announcements-table.sql` - Needs DOWN section
- `60-create-error-logs-table.sql` - Needs DOWN section
- `61-add-feedback-and-goals.sql` - Needs DOWN section
- `62-create-profile-pictures-bucket.sql` - Needs DOWN section
- `63-add-profile-picture-field.sql` - Needs DOWN section

### ✅ Advanced Features (70-105) - Partial
- `70-create-notifications-system.sql` - DOWN section added
- `80-create-tournaments-system.sql` - Needs DOWN section
- `90-create-progress-reports-system.sql` - DOWN section added
- `91-create-parent-notification-system.sql` - Needs DOWN section
- `92-create-parent-dashboard-system.sql` - Needs DOWN section
- `93-create-demo-parent-accounts.sql` - Needs DOWN section
- `100-create-home-training-system.sql` - Needs DOWN section
- `101-create-home-training-storage.sql` - Needs DOWN section
- `103-add-clubs-sport-type.sql` - Needs DOWN section
- `104-create-idempotency-keys-table.sql` - ✅ DOWN section exists
- `105-create-feature-flags-table.sql` - Needs DOWN section

## How to Use Rollback Scripts

### Single Migration Rollback

1. Open the migration file (e.g., `01-schema-only.sql`)
2. Scroll to the `DOWN MIGRATION` section at the bottom
3. Uncomment the rollback code (remove `/*` and `*/`)
4. Execute via API:
   ```bash
   ./scripts/run-sql-via-api.sh scripts/01-schema-only.sql
   ```

### Important Notes

- **Data Loss Warning**: DOWN migrations will delete data. Always backup first.
- **Order Matters**: Rollback migrations in reverse order (newest first)
- **Dependencies**: Some migrations depend on others. Check foreign keys.
- **Test Data**: Migration 03 includes test data. Rolling back will remove test users.
- **Storage Buckets**: Storage buckets are NOT automatically deleted in rollbacks

## Rollback Testing Procedure

See `scripts/test-rollback.sh` for automated rollback testing.

## Data Loss Scenarios

### Critical Data Loss
- Rolling back core migrations (01-03) will delete ALL data
- Rolling back membership migrations will delete all applications
- Rolling back training migrations will delete all sessions and attendance

### Recoverable Data Loss
- Test data (migration 03) can be recreated
- System settings can be reconfigured
- Feature flags can be recreated

## Emergency Rollback Procedure

If you need to rollback in production:

1. **Stop all traffic** to the affected endpoints
2. **Backup the database** using Supabase dashboard
3. **Test rollback** on a staging environment first
4. **Execute rollback** migrations in reverse order
5. **Verify data integrity** after rollback
6. **Restore traffic** once verified

## Future Improvements

- [ ] Add automated rollback testing to CI/CD
- [ ] Create rollback verification queries
- [ ] Document data retention policies
- [ ] Add rollback time estimates
- [ ] Create rollback playbooks for each migration group
