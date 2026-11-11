# Feature Registry

## Overview

The `features.json` file serves as the comprehensive registry of all features in the Sports Club Management System. It documents feature ownership, dependencies, API endpoints, events, database migrations, and test coverage.

## Purpose

The feature registry provides:

1. **Single Source of Truth**: Centralized documentation of all system features
2. **Dependency Mapping**: Clear understanding of feature interdependencies
3. **API Discovery**: Complete list of endpoints and OpenAPI specifications
4. **Event Catalog**: Event-driven architecture documentation
5. **Migration Tracking**: Database changes associated with each feature
6. **Test Coverage**: Test files validating each feature
7. **Component Mapping**: Frontend and backend code organization

## Structure

Each feature entry contains:

```json
{
  "feature-name": {
    "name": "Human-readable feature name",
    "category": "core|communication|advanced|infrastructure|admin",
    "status": "production|beta|development",
    "owner": "Team responsible for the feature",
    "description": "Brief description of feature functionality",
    "requirements": ["List of requirement IDs from requirements.md"],
    "dependencies": ["List of other features this depends on"],
    "endpoints": {
      "http": ["List of HTTP endpoints"],
      "openapi": "Path to OpenAPI specification"
    },
    "events": {
      "produces": ["Events this feature publishes"],
      "consumes": ["Events this feature subscribes to"]
    },
    "migrations": ["Database migration files"],
    "database": {
      "tables": ["Database tables"],
      "functions": ["Database functions"],
      "policies": ["RLS policies"],
      "storage": ["Storage buckets"]
    },
    "components": {
      "frontend": ["React components"],
      "backend": ["Server-side modules"]
    },
    "tests": ["Test files"]
  }
}
```

## Feature Categories

### Core Features
Essential features required for basic system operation:
- **auth-database-integration**: Authentication and user management
- **membership-approval-system**: Club membership workflow
- **training-attendance**: Session management and attendance tracking
- **performance-tracking**: Athlete performance recording and analytics

### Communication Features
Features for user communication and notifications:
- **announcement-system**: Club and system-wide announcements
- **notification-system**: Real-time notifications
- **parent-portal**: Parent monitoring and engagement

### Advanced Features
Enhanced functionality beyond core operations:
- **home-training**: Self-directed training logs
- **tournaments**: Competition management
- **activity-checkin**: QR code-based activity tracking
- **progress-reports**: Formal assessments and feedback
- **coach-goals-feedback**: Goal setting and feedback system

### Infrastructure Features
System-level capabilities and cross-cutting concerns:
- **idempotency-system**: Duplicate operation prevention
- **feature-flags**: Gradual rollout and kill-switch
- **correlation-ids**: Request tracing and debugging
- **error-monitoring**: Error logging and alerting
- **audit-logging**: Compliance and change tracking
- **validation-sanitization**: Input security
- **rate-limiting**: Abuse prevention
- **storage-management**: File uploads and storage
- **database-migrations**: Schema management

### Admin Features
Administrative and oversight capabilities:
- **admin-management**: System administration dashboard

## Usage Examples

### Finding Feature Dependencies

To understand what features a new feature depends on:

```bash
# Example: Check dependencies for progress-reports
cat features.json | jq '.features["progress-reports"].dependencies'
# Output: ["auth-database-integration", "membership-approval-system", "parent-portal"]
```

### Listing All Endpoints for a Feature

```bash
# Example: Get all training-attendance endpoints
cat features.json | jq '.features["training-attendance"].endpoints.http[]'
```

### Finding Events Produced by a Feature

```bash
# Example: Check what events membership system produces
cat features.json | jq '.features["membership-approval-system"].events.produces[]'
```

### Identifying Migrations for a Feature

```bash
# Example: List all migrations for a feature
cat features.json | jq '.features["training-attendance"].migrations[]'
```

### Finding Test Coverage

```bash
# Example: Check test files for authentication
cat features.json | jq '.features["auth-database-integration"].tests[]'
```

### Listing All Features by Category

```bash
# Example: Get all core features
cat features.json | jq '.features | to_entries | map(select(.value.category == "core")) | map(.key)'
```

## Maintenance

### Adding a New Feature

When adding a new feature:

1. Create a new entry in `features.json` with all required fields
2. Document all dependencies
3. List all HTTP endpoints and reference OpenAPI spec
4. Document events produced and consumed
5. List all database migrations
6. Map all components (frontend and backend)
7. List all test files
8. Update this README if new categories are added

### Updating an Existing Feature

When modifying a feature:

1. Update the relevant fields in `features.json`
2. Add new endpoints, events, migrations, or components
3. Update dependencies if they change
4. Add new test files as they are created
5. Update status if moving between development/beta/production

### Deprecating a Feature

When deprecating a feature:

1. Change status to "deprecated"
2. Add deprecation notes to description
3. Document migration path to replacement feature
4. Keep entry in registry for historical reference

## Integration with Development Workflow

### Before Starting Development

1. Check feature dependencies in registry
2. Review required migrations
3. Identify related OpenAPI specs
4. Understand event contracts

### During Development

1. Update registry as new endpoints are added
2. Document new events produced/consumed
3. Add migration files to feature entry
4. Map new components to feature

### Before Deployment

1. Verify all migrations are listed
2. Confirm OpenAPI specs are up to date
3. Validate event schemas are documented
4. Ensure test coverage is recorded

### Code Review Checklist

- [ ] Feature registry updated with new endpoints
- [ ] Events documented in registry
- [ ] Migrations added to feature entry
- [ ] Components mapped correctly
- [ ] Test files listed
- [ ] Dependencies updated if changed

## Querying the Registry

### Common Queries

**Find all features owned by a team:**
```bash
jq '.features | to_entries | map(select(.value.owner == "Platform Team")) | map(.key)' features.json
```

**List all production features:**
```bash
jq '.features | to_entries | map(select(.value.status == "production")) | map(.key)' features.json
```

**Find features with no tests:**
```bash
jq '.features | to_entries | map(select(.value.tests | length == 0)) | map(.key)' features.json
```

**Get all OpenAPI specs:**
```bash
jq '.features | to_entries | map(.value.endpoints.openapi) | unique' features.json
```

**List all event types:**
```bash
jq '[.features | to_entries | map(.value.events.produces[]) | unique]' features.json
```

**Find features consuming a specific event:**
```bash
jq '.features | to_entries | map(select(.value.events.consumes | contains(["org.club.membership.application.approved.v1"]))) | map(.key)' features.json
```

## Validation

The feature registry should be validated regularly:

1. **Completeness**: All features documented
2. **Accuracy**: Endpoints, events, and migrations match actual code
3. **Dependencies**: Dependency graph is acyclic
4. **Coverage**: All components and tests are mapped
5. **Consistency**: Naming conventions followed

## Related Documentation

- **Requirements**: `.kiro/specs/system-view-master/requirements.md`
- **Design**: `.kiro/specs/system-view-master/design.md`
- **OpenAPI Specs**: `sports-club-management/openapi/*.yaml`
- **Event Schemas**: `sports-club-management/events/schemas/**/*.json`
- **Database Schema**: `sports-club-management/docs/DATABASE.md`
- **Testing Guide**: `sports-club-management/docs/TESTING.md`

## Version History

- **1.0.0** (2025-11-27): Initial feature registry creation
  - Documented 16 features across 5 categories
  - Mapped all endpoints, events, migrations, and components
  - Established registry structure and maintenance procedures
