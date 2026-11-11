# Performance Baselines

## Overview

This document defines performance baselines for the Sports Club Management System. These baselines serve as targets for performance testing and monitoring.

## Response Time Targets

### Critical Endpoints (P95 < 200ms)

**Authentication:**
- POST /api/auth/signin: < 200ms
- POST /api/auth/signup: < 300ms
- POST /api/auth/signout: < 100ms

**Check-in (High Frequency):**
- POST /api/athlete/check-in/:sessionId: < 150ms
- GET /api/coach/attendance/:sessionId: < 200ms

### Important Endpoints (P95 < 500ms)

**Membership:**
- POST /api/membership/apply: < 500ms
- PUT /api/membership/applications/:id: < 400ms
- GET /api/membership/applications: < 300ms

**Training Sessions:**
- POST /api/coach/sessions: < 400ms
- GET /api/coach/sessions: < 300ms
- GET /api/athlete/sessions: < 300ms

**Dashboard Queries:**
- GET /api/athlete/attendance/stats: < 400ms
- GET /api/coach/dashboard: < 500ms
- GET /api/admin/statistics: < 600ms

### Standard Endpoints (P95 < 1000ms)

**Reports and Analytics:**
- GET /api/coach/performance/trends: < 800ms
- GET /api/admin/reports: < 1000ms
- GET /api/athlete/progress-reports: < 600ms

## Database Query Performance

### Query Time Targets

**Simple Queries (Single table, indexed):**
- SELECT with primary key: < 5ms
- SELECT with indexed foreign key: < 10ms
- SELECT with composite index: < 15ms

**Complex Queries (Joins, aggregations):**
- 2-table join with indexes: < 30ms
- 3-table join with indexes: < 50ms
- Aggregation queries: < 100ms

**Bulk Operations:**
- Batch insert (10 records): < 50ms
- Batch update (10 records): < 60ms
- Bulk delete with cascade: < 100ms

### Index Performance Requirements

All queries MUST use indexes. Full table scans are NOT acceptable for:
- Tables with > 1000 rows
- Queries in critical paths
- Frequently executed queries

## Throughput Targets

### Concurrent Users

**Normal Load:**
- 50 concurrent users
- 500 requests/minute
- < 1% error rate

**Peak Load:**
- 100 concurrent users
- 1000 requests/minute
- < 2% error rate

**Stress Test:**
- 200 concurrent users
- 2000 requests/minute
- < 5% error rate

### Endpoint-Specific Throughput

**Check-in (Peak Usage):**
- 100 check-ins/minute
- 0% duplicate check-ins
- < 1% timeout errors

**Session Creation:**
- 50 sessions/minute
- 100% data integrity
- < 1% validation errors

**Dashboard Queries:**
- 200 queries/minute
- < 500ms average response
- 95% cache hit rate (after warmup)

## Resource Utilization

### Database Connections

**Connection Pool:**
- Max connections: 100
- Idle timeout: 60s
- Connection reuse: > 90%

**Connection Usage:**
- Normal load: < 30 connections
- Peak load: < 60 connections
- Never exceed: 80 connections

### Memory Usage

**Application:**
- Baseline: < 512MB
- Normal load: < 1GB
- Peak load: < 2GB

**Database:**
- Cache hit ratio: > 95%
- Buffer pool usage: < 80%
- Temp space usage: < 100MB

### CPU Usage

**Application:**
- Baseline: < 10%
- Normal load: < 40%
- Peak load: < 70%

**Database:**
- Baseline: < 20%
- Normal load: < 50%
- Peak load: < 80%

## Scalability Targets

### Horizontal Scaling

**Application Servers:**
- Scale out at: 70% CPU
- Scale in at: 30% CPU
- Min instances: 2
- Max instances: 10

**Database:**
- Read replicas: 2
- Connection pooling: Enabled
- Query caching: Enabled

### Data Volume

**Current Capacity:**
- Users: 10,000
- Sessions: 100,000
- Attendance records: 1,000,000

**Growth Capacity:**
- Users: 50,000
- Sessions: 500,000
- Attendance records: 5,000,000

## Performance Degradation Thresholds

### Warning Thresholds (Alert)

- Response time > 2x baseline
- Error rate > 1%
- CPU usage > 70%
- Memory usage > 80%
- Database connections > 70

### Critical Thresholds (Incident)

- Response time > 5x baseline
- Error rate > 5%
- CPU usage > 90%
- Memory usage > 95%
- Database connections > 90

## Testing Methodology

### Load Testing Approach

1. **Baseline Test**: Single user, measure baseline performance
2. **Ramp-up Test**: Gradually increase from 1 to 100 users over 10 minutes
3. **Sustained Load**: Maintain 100 users for 30 minutes
4. **Spike Test**: Sudden increase from 50 to 200 users
5. **Stress Test**: Increase until system breaks, identify limits

### Test Scenarios

**Scenario 1: Morning Check-in Rush**
- 100 athletes checking in simultaneously
- 10 coaches viewing attendance
- 5 admins monitoring system

**Scenario 2: Session Creation Peak**
- 20 coaches creating sessions
- 50 athletes viewing schedules
- 10 parents checking athlete progress

**Scenario 3: Dashboard Heavy Load**
- 50 athletes viewing dashboards
- 20 coaches viewing analytics
- 10 admins generating reports

## Monitoring and Alerting

### Key Metrics to Monitor

**Application Metrics:**
- Request rate (requests/second)
- Response time (P50, P95, P99)
- Error rate (%)
- Active connections

**Database Metrics:**
- Query execution time
- Connection pool usage
- Cache hit ratio
- Slow query count

**Infrastructure Metrics:**
- CPU utilization (%)
- Memory utilization (%)
- Network I/O (MB/s)
- Disk I/O (IOPS)

### Alert Configuration

**Critical Alerts (Immediate Response):**
- Error rate > 5%
- Response time > 5s
- Database connections > 90
- CPU > 90%

**Warning Alerts (Investigation Required):**
- Error rate > 1%
- Response time > 2s
- Database connections > 70
- CPU > 70%

## Performance Testing Schedule

### Regular Testing

**Weekly:**
- Smoke tests on critical paths
- Database query performance checks
- Cache hit ratio verification

**Monthly:**
- Full load testing suite
- Stress testing
- Capacity planning review

**Quarterly:**
- Comprehensive performance audit
- Baseline updates
- Scalability testing

## Success Criteria

Performance testing is considered successful when:

1. ✅ All critical endpoints meet P95 targets
2. ✅ System handles 100 concurrent users with < 2% error rate
3. ✅ Database queries use indexes (no full table scans)
4. ✅ Resource utilization stays within limits
5. ✅ No performance degradation over 30-minute sustained load
6. ✅ System recovers gracefully from spike tests
7. ✅ Monitoring and alerting configured correctly

## Revision History

- 2025-11-27: Initial baseline definition
