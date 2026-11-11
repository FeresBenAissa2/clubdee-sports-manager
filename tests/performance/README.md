# Performance Testing Suite

## Overview

This directory contains performance testing tools and benchmarks for the Sports Club Management System. The tests verify that the system meets performance baselines under various load conditions.

## Test Files

### performance-baselines.md
Defines performance targets and success criteria:
- Response time targets (P50, P95, P99)
- Throughput requirements
- Resource utilization limits
- Scalability targets

### load-test.ts
Load testing suite that simulates concurrent users:
- Database query performance under load
- Concurrent user scenarios (50-200 users)
- Sustained load testing (30 seconds)
- Spike testing (sudden load increases)
- Resource utilization monitoring

### database-performance.test.ts
Database-specific performance tests:
- Index usage verification
- Complex query performance
- Bulk operation performance
- RLS policy performance
- Connection pool efficiency

## Running Performance Tests

### Prerequisites

1. Ensure environment variables are set in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

2. Ensure test data exists in the database

### Run All Performance Tests

```bash
cd sports-club-management
npm run test:performance
```

### Run Specific Test Suites

```bash
# Load testing only
npx vitest tests/performance/load-test.ts --run

# Database performance only
npx vitest tests/performance/database-performance.test.ts --run
```

### Run with Detailed Output

```bash
npx vitest tests/performance --run --reporter=verbose
```

## Test Scenarios

### 1. Database Query Performance
Tests individual query performance with focus on:
- Index usage
- Query execution time
- Join performance
- Aggregation efficiency

**Success Criteria:**
- Simple queries: < 50ms
- Complex queries: < 200ms
- Joins (2-3 tables): < 300ms

### 2. Concurrent User Load
Simulates multiple users accessing the system simultaneously:
- 50 concurrent users (normal load)
- 100 concurrent users (peak load)
- 200 concurrent users (stress test)

**Success Criteria:**
- Error rate < 2% at 100 users
- Error rate < 5% at 200 users
- P95 response time < 500ms

### 3. Sustained Load
Maintains constant load for extended period:
- 50 concurrent users for 30 seconds
- Continuous requests without degradation

**Success Criteria:**
- No performance degradation over time
- Error rate < 2%
- > 1000 requests in 30 seconds

### 4. Spike Testing
Tests system response to sudden load increases:
- Ramp from 50 to 200 users instantly
- Measure recovery time and error rate

**Success Criteria:**
- Error rate < 5% during spike
- Response time degradation < 3x
- System recovers after spike

## Performance Metrics

### Response Time Metrics
- **Average**: Mean response time across all requests
- **P50 (Median)**: 50% of requests complete faster than this
- **P95**: 95% of requests complete faster than this
- **P99**: 99% of requests complete faster than this
- **Min/Max**: Fastest and slowest requests

### Throughput Metrics
- **Requests/Second**: Total requests processed per second
- **Concurrent Users**: Number of simultaneous users
- **Total Requests**: Total number of requests executed
- **Success Rate**: Percentage of successful requests

### Error Metrics
- **Error Rate**: Percentage of failed requests
- **Error Types**: Categorization of errors
- **Timeout Rate**: Percentage of requests that timeout

## Interpreting Results

### Good Performance
```
✅ Load test completed: Profile Queries
   Total duration: 5234ms
   Successful: 500/500
   Failed: 0/500
   Error rate: 0.00%
   Avg response time: 45.23ms
   P95 response time: 89ms
   P99 response time: 124ms
   Requests/second: 95.53
```

### Performance Issues
```
⚠️  Load test completed: Complex Queries
   Total duration: 15234ms
   Successful: 480/500
   Failed: 20/500
   Error rate: 4.00%
   Avg response time: 245.67ms
   P95 response time: 1250ms  ⚠️ EXCEEDS BASELINE
   P99 response time: 2340ms  ⚠️ EXCEEDS BASELINE
   Requests/second: 32.81
```

## Troubleshooting Performance Issues

### High Response Times

**Possible Causes:**
1. Missing database indexes
2. Inefficient queries (N+1 problem)
3. Large result sets without pagination
4. Network latency

**Solutions:**
1. Check query execution plans
2. Add appropriate indexes
3. Implement pagination
4. Optimize query structure

### High Error Rates

**Possible Causes:**
1. Database connection pool exhaustion
2. Rate limiting triggered
3. Timeout issues
4. RLS policy conflicts

**Solutions:**
1. Increase connection pool size
2. Adjust rate limits
3. Optimize slow queries
4. Review RLS policies

### Resource Exhaustion

**Possible Causes:**
1. Memory leaks
2. Connection leaks
3. Inefficient caching
4. Too many concurrent connections

**Solutions:**
1. Profile memory usage
2. Ensure proper connection cleanup
3. Implement connection pooling
4. Add request queuing

## Performance Optimization Checklist

### Database Optimization
- [ ] All foreign keys have indexes
- [ ] Composite indexes for common query patterns
- [ ] Partial indexes for filtered queries
- [ ] No full table scans on large tables
- [ ] Query results are paginated
- [ ] Aggregations use database functions

### Application Optimization
- [ ] Caching implemented for frequently accessed data
- [ ] Connection pooling configured
- [ ] Batch operations used where possible
- [ ] Lazy loading for heavy components
- [ ] Debouncing for user inputs
- [ ] Optimistic UI updates

### Infrastructure Optimization
- [ ] CDN configured for static assets
- [ ] Image optimization enabled
- [ ] Compression enabled
- [ ] HTTP/2 enabled
- [ ] Database read replicas configured
- [ ] Auto-scaling configured

## Continuous Performance Monitoring

### Regular Testing Schedule

**Weekly:**
- Run smoke tests on critical paths
- Check database query performance
- Verify cache hit ratios

**Monthly:**
- Full load testing suite
- Stress testing
- Capacity planning review

**Quarterly:**
- Comprehensive performance audit
- Baseline updates
- Scalability testing

### Performance Monitoring Tools

**Application Monitoring:**
- Vercel Analytics
- Custom error logging
- Response time tracking

**Database Monitoring:**
- Supabase Dashboard
- Query performance logs
- Connection pool metrics

**Infrastructure Monitoring:**
- CPU/Memory utilization
- Network I/O
- Disk I/O

## Performance Baselines

See `performance-baselines.md` for detailed baseline definitions.

### Quick Reference

**Critical Endpoints (P95 < 200ms):**
- Authentication
- Check-in
- Profile queries

**Important Endpoints (P95 < 500ms):**
- Membership operations
- Training sessions
- Dashboard queries

**Standard Endpoints (P95 < 1000ms):**
- Reports
- Analytics
- Complex aggregations

## Contributing

When adding new features:

1. Define performance baselines
2. Add performance tests
3. Run tests before merging
4. Update baselines if needed
5. Document any performance considerations

## Support

For performance issues or questions:
1. Check this README
2. Review performance-baselines.md
3. Analyze test results
4. Check database query plans
5. Contact system administrator

## Revision History

- 2025-11-27: Initial performance testing suite created
