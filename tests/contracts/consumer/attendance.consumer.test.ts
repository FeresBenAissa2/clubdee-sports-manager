/**
 * Attendance API Consumer Contract Tests
 * 
 * Defines frontend expectations for attendance tracking endpoints
 * **Validates: Requirements 20.10**
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  createConsumerPact,
  commonMatchers,
  authenticatedHeaders,
  setupConsumerTest,
  cleanupConsumerTest,
  verifyConsumerTest,
  like,
  eachLike,
} from '../helpers/pact-setup';

describe('Attendance API Consumer Contracts', () => {
  const pact = createConsumerPact('Frontend', 'Attendance API');

  beforeAll(async () => {
    await setupConsumerTest(pact);
  });

  afterAll(async () => {
    await cleanupConsumerTest(pact);
  });

  describe('POST /api/athlete/check-in/:sessionId', () => {
    it('checks in athlete to session', async () => {
      await pact.addInteraction({
        state: 'athlete can check in to session',
        uponReceiving: 'a check-in request',
        withRequest: {
          method: 'POST',
          path: like('/api/athlete/check-in/550e8400-e29b-41d4-a716-446655440000'),
          headers: authenticatedHeaders,
          body: {
            checkInMethod: like('manual'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            attendanceId: commonMatchers.uuid,
            sessionId: commonMatchers.uuid,
            athleteId: commonMatchers.uuid,
            status: like('present'),
            checkInTime: commonMatchers.timestamp,
            checkInMethod: like('manual'),
          }),
        },
      });

      const response = await fetch(
        'http://localhost:8080/api/athlete/check-in/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
            'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
          },
          body: JSON.stringify({
            checkInMethod: 'manual',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('present');

      await verifyConsumerTest(pact);
    });

    it('rejects duplicate check-in', async () => {
      await pact.addInteraction({
        state: 'athlete already checked in',
        uponReceiving: 'a duplicate check-in request',
        withRequest: {
          method: 'POST',
          path: like('/api/athlete/check-in/550e8400-e29b-41d4-a716-446655440000'),
          headers: authenticatedHeaders,
          body: {
            checkInMethod: like('manual'),
          },
        },
        willRespondWith: {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.errorResponse(
            'CONFLICT',
            'Already checked in to this session'
          ),
        },
      });

      const response = await fetch(
        'http://localhost:8080/api/athlete/check-in/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
            'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
          },
          body: JSON.stringify({
            checkInMethod: 'manual',
          }),
        }
      );

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONFLICT');

      await verifyConsumerTest(pact);
    });

    it('rejects check-in outside time window', async () => {
      await pact.addInteraction({
        state: 'session outside check-in window',
        uponReceiving: 'a check-in request outside time window',
        withRequest: {
          method: 'POST',
          path: like('/api/athlete/check-in/550e8400-e29b-41d4-a716-446655440000'),
          headers: authenticatedHeaders,
          body: {
            checkInMethod: like('manual'),
          },
        },
        willRespondWith: {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.errorResponse(
            'VALIDATION_ERROR',
            'Check-in window has closed'
          ),
        },
      });

      const response = await fetch(
        'http://localhost:8080/api/athlete/check-in/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
            'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
          },
          body: JSON.stringify({
            checkInMethod: 'manual',
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');

      await verifyConsumerTest(pact);
    });
  });

  describe('POST /api/coach/attendance', () => {
    it('marks attendance for multiple athletes', async () => {
      await pact.addInteraction({
        state: 'coach has session with athletes',
        uponReceiving: 'a bulk attendance marking request',
        withRequest: {
          method: 'POST',
          path: '/api/coach/attendance',
          headers: authenticatedHeaders,
          body: {
            sessionId: commonMatchers.uuid,
            attendance: eachLike({
              athleteId: commonMatchers.uuid,
              status: like('present'),
              notes: like('On time'),
            }),
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            sessionId: commonMatchers.uuid,
            markedCount: like(5),
            updatedAt: commonMatchers.timestamp,
          }),
        },
      });

      const response = await fetch('http://localhost:8080/api/coach/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
        },
        body: JSON.stringify({
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          attendance: [
            {
              athleteId: '550e8400-e29b-41d4-a716-446655440001',
              status: 'present',
              notes: 'On time',
            },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.markedCount).toBeDefined();

      await verifyConsumerTest(pact);
    });
  });

  describe('GET /api/coach/attendance/:sessionId', () => {
    it('retrieves session attendance', async () => {
      await pact.addInteraction({
        state: 'coach has session with attendance',
        uponReceiving: 'a request for session attendance',
        withRequest: {
          method: 'GET',
          path: like('/api/coach/attendance/550e8400-e29b-41d4-a716-446655440000'),
          headers: authenticatedHeaders,
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            sessionId: commonMatchers.uuid,
            attendance: eachLike({
              id: commonMatchers.uuid,
              athleteId: commonMatchers.uuid,
              athleteName: like('John Doe'),
              status: like('present'),
              checkInTime: commonMatchers.timestamp,
              checkInMethod: like('manual'),
              notes: like('On time'),
            }),
            summary: like({
              total: 20,
              present: 17,
              absent: 2,
              late: 1,
              excused: 0,
            }),
          }),
        },
      });

      const response = await fetch(
        'http://localhost:8080/api/coach/attendance/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
            'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.attendance)).toBe(true);
      expect(data.data.summary).toBeDefined();

      await verifyConsumerTest(pact);
    });
  });

  describe('GET /api/athlete/attendance', () => {
    it('retrieves athlete attendance history', async () => {
      await pact.addInteraction({
        state: 'athlete has attendance records',
        uponReceiving: 'a request for attendance history',
        withRequest: {
          method: 'GET',
          path: '/api/athlete/attendance',
          headers: authenticatedHeaders,
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            attendance: eachLike({
              id: commonMatchers.uuid,
              sessionId: commonMatchers.uuid,
              sessionTitle: like('Morning Practice'),
              sessionDate: commonMatchers.timestamp,
              status: like('present'),
              checkInTime: commonMatchers.timestamp,
              checkInMethod: like('manual'),
            }),
          }),
        },
      });

      const response = await fetch('http://localhost:8080/api/athlete/attendance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.attendance)).toBe(true);

      await verifyConsumerTest(pact);
    });
  });

  describe('GET /api/athlete/attendance/stats', () => {
    it('retrieves attendance statistics', async () => {
      await pact.addInteraction({
        state: 'athlete has attendance records',
        uponReceiving: 'a request for attendance statistics',
        withRequest: {
          method: 'GET',
          path: '/api/athlete/attendance/stats',
          headers: authenticatedHeaders,
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            totalSessions: like(20),
            attended: like(17),
            absent: like(2),
            late: like(1),
            excused: like(0),
            attendanceRate: like(85),
            currentStreak: like(5),
            longestStreak: like(12),
          }),
        },
      });

      const response = await fetch('http://localhost:8080/api/athlete/attendance/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.attendanceRate).toBeDefined();
      expect(data.data.totalSessions).toBeDefined();

      await verifyConsumerTest(pact);
    });
  });
});
