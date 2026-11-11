/**
 * Training API Consumer Contract Tests
 * 
 * Defines frontend expectations for training session endpoints
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

describe('Training API Consumer Contracts', () => {
  const pact = createConsumerPact('Frontend', 'Training API');

  beforeAll(async () => {
    await setupConsumerTest(pact);
  });

  afterAll(async () => {
    await cleanupConsumerTest(pact);
  });

  describe('POST /api/coach/sessions', () => {
    it('creates training session', async () => {
      await pact.addInteraction({
        state: 'coach has club assigned',
        uponReceiving: 'a session creation request',
        withRequest: {
          method: 'POST',
          path: '/api/coach/sessions',
          headers: authenticatedHeaders,
          body: {
            title: like('Morning Practice'),
            description: like('Regular training session'),
            sessionType: like('practice'),
            scheduledAt: commonMatchers.timestamp,
            durationMinutes: like(90),
            location: like('Main Field'),
            maxParticipants: like(20),
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            sessionId: commonMatchers.uuid,
            title: like('Morning Practice'),
            status: like('scheduled'),
            scheduledAt: commonMatchers.timestamp,
            qrCode: like('qr-code-string'),
          }),
        },
      });

      const response = await fetch('http://localhost:8080/api/coach/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
        },
        body: JSON.stringify({
          title: 'Morning Practice',
          description: 'Regular training session',
          sessionType: 'practice',
          scheduledAt: '2025-12-01T09:00:00Z',
          durationMinutes: 90,
          location: 'Main Field',
          maxParticipants: 20,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.sessionId).toBeDefined();
      expect(data.data.status).toBe('scheduled');

      await verifyConsumerTest(pact);
    });

    it('rejects session with past date', async () => {
      await pact.addInteraction({
        state: 'coach has club assigned',
        uponReceiving: 'a session creation with past date',
        withRequest: {
          method: 'POST',
          path: '/api/coach/sessions',
          headers: authenticatedHeaders,
          body: {
            title: like('Past Session'),
            scheduledAt: like('2020-01-01T09:00:00Z'),
            durationMinutes: like(90),
            location: like('Main Field'),
          },
        },
        willRespondWith: {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.errorResponse(
            'VALIDATION_ERROR',
            'Session date cannot be in the past'
          ),
        },
      });

      const response = await fetch('http://localhost:8080/api/coach/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
        },
        body: JSON.stringify({
          title: 'Past Session',
          scheduledAt: '2020-01-01T09:00:00Z',
          durationMinutes: 90,
          location: 'Main Field',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');

      await verifyConsumerTest(pact);
    });
  });

  describe('GET /api/coach/sessions', () => {
    it('retrieves coach sessions', async () => {
      await pact.addInteraction({
        state: 'coach has sessions',
        uponReceiving: 'a request for sessions list',
        withRequest: {
          method: 'GET',
          path: '/api/coach/sessions',
          headers: authenticatedHeaders,
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            sessions: eachLike({
              id: commonMatchers.uuid,
              title: like('Morning Practice'),
              sessionType: like('practice'),
              scheduledAt: commonMatchers.timestamp,
              durationMinutes: like(90),
              location: like('Main Field'),
              status: like('scheduled'),
              attendanceCount: like(15),
            }),
          }),
        },
      });

      const response = await fetch('http://localhost:8080/api/coach/sessions', {
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
      expect(Array.isArray(data.data.sessions)).toBe(true);

      await verifyConsumerTest(pact);
    });
  });

  describe('GET /api/athlete/sessions', () => {
    it('retrieves athlete club sessions', async () => {
      await pact.addInteraction({
        state: 'athlete has club membership',
        uponReceiving: 'a request for club sessions',
        withRequest: {
          method: 'GET',
          path: '/api/athlete/sessions',
          headers: authenticatedHeaders,
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            sessions: eachLike({
              id: commonMatchers.uuid,
              title: like('Morning Practice'),
              sessionType: like('practice'),
              scheduledAt: commonMatchers.timestamp,
              durationMinutes: like(90),
              location: like('Main Field'),
              status: like('scheduled'),
              coachName: like('Coach John'),
              canCheckIn: like(true),
            }),
          }),
        },
      });

      const response = await fetch('http://localhost:8080/api/athlete/sessions', {
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
      expect(Array.isArray(data.data.sessions)).toBe(true);

      await verifyConsumerTest(pact);
    });
  });

  describe('PUT /api/coach/sessions/:id', () => {
    it('updates session details', async () => {
      await pact.addInteraction({
        state: 'coach owns session',
        uponReceiving: 'a session update request',
        withRequest: {
          method: 'PUT',
          path: like('/api/coach/sessions/550e8400-e29b-41d4-a716-446655440000'),
          headers: authenticatedHeaders,
          body: {
            title: like('Updated Practice'),
            location: like('Secondary Field'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            sessionId: commonMatchers.uuid,
            title: like('Updated Practice'),
            location: like('Secondary Field'),
            updatedAt: commonMatchers.timestamp,
          }),
        },
      });

      const response = await fetch(
        'http://localhost:8080/api/coach/sessions/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
            'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
          },
          body: JSON.stringify({
            title: 'Updated Practice',
            location: 'Secondary Field',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      await verifyConsumerTest(pact);
    });
  });

  describe('DELETE /api/coach/sessions/:id', () => {
    it('cancels session', async () => {
      await pact.addInteraction({
        state: 'coach owns session',
        uponReceiving: 'a session cancellation request',
        withRequest: {
          method: 'DELETE',
          path: like('/api/coach/sessions/550e8400-e29b-41d4-a716-446655440000'),
          headers: authenticatedHeaders,
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            sessionId: commonMatchers.uuid,
            status: like('cancelled'),
            cancelledAt: commonMatchers.timestamp,
          }),
        },
      });

      const response = await fetch(
        'http://localhost:8080/api/coach/sessions/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'DELETE',
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
      expect(data.data.status).toBe('cancelled');

      await verifyConsumerTest(pact);
    });
  });
});
