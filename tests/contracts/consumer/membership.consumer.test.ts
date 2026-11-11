/**
 * Membership API Consumer Contract Tests
 * 
 * Defines frontend expectations for membership application endpoints
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

describe('Membership API Consumer Contracts', () => {
  const pact = createConsumerPact('Frontend', 'Membership API');

  beforeAll(async () => {
    await setupConsumerTest(pact);
  });

  afterAll(async () => {
    await cleanupConsumerTest(pact);
  });

  describe('POST /api/membership/apply', () => {
    it('submits membership application', async () => {
      await pact.addInteraction({
        state: 'user is authenticated as athlete',
        uponReceiving: 'a membership application submission',
        withRequest: {
          method: 'POST',
          path: '/api/membership/apply',
          headers: authenticatedHeaders,
          body: {
            clubId: commonMatchers.uuid,
            personalInfo: like({
              fullName: 'John Doe',
              dateOfBirth: '2000-01-01',
              phoneNumber: '0812345678',
            }),
            documents: like({
              idCardUrl: 'https://storage.example.com/id-card.jpg',
              medicalCertUrl: 'https://storage.example.com/medical.pdf',
            }),
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            applicationId: commonMatchers.uuid,
            status: like('pending'),
            appliedAt: commonMatchers.timestamp,
          }),
        },
      });

      const response = await fetch('http://localhost:8080/api/membership/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
        },
        body: JSON.stringify({
          clubId: '550e8400-e29b-41d4-a716-446655440000',
          personalInfo: {
            fullName: 'John Doe',
            dateOfBirth: '2000-01-01',
            phoneNumber: '0812345678',
          },
          documents: {
            idCardUrl: 'https://storage.example.com/id-card.jpg',
            medicalCertUrl: 'https://storage.example.com/medical.pdf',
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.applicationId).toBeDefined();
      expect(data.data.status).toBe('pending');

      await verifyConsumerTest(pact);
    });

    it('rejects duplicate pending application', async () => {
      await pact.addInteraction({
        state: 'athlete has pending application',
        uponReceiving: 'a duplicate application submission',
        withRequest: {
          method: 'POST',
          path: '/api/membership/apply',
          headers: authenticatedHeaders,
          body: {
            clubId: commonMatchers.uuid,
            personalInfo: like({}),
            documents: like({}),
          },
        },
        willRespondWith: {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.errorResponse(
            'CONFLICT',
            'You already have a pending application'
          ),
        },
      });

      const response = await fetch('http://localhost:8080/api/membership/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
        },
        body: JSON.stringify({
          clubId: '550e8400-e29b-41d4-a716-446655440000',
          personalInfo: {},
          documents: {},
        }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONFLICT');

      await verifyConsumerTest(pact);
    });
  });

  describe('GET /api/membership/applications', () => {
    it('retrieves applications for coach', async () => {
      await pact.addInteraction({
        state: 'coach has club with applications',
        uponReceiving: 'a request for applications list',
        withRequest: {
          method: 'GET',
          path: '/api/membership/applications',
          headers: authenticatedHeaders,
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            applications: eachLike({
              id: commonMatchers.uuid,
              userId: commonMatchers.uuid,
              clubId: commonMatchers.uuid,
              status: like('pending'),
              appliedAt: commonMatchers.timestamp,
              applicantName: like('John Doe'),
              applicantEmail: commonMatchers.email,
            }),
          }),
        },
      });

      const response = await fetch('http://localhost:8080/api/membership/applications', {
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
      expect(Array.isArray(data.data.applications)).toBe(true);

      await verifyConsumerTest(pact);
    });
  });

  describe('PUT /api/membership/applications/:id', () => {
    it('approves application', async () => {
      await pact.addInteraction({
        state: 'coach has pending application to review',
        uponReceiving: 'an application approval request',
        withRequest: {
          method: 'PUT',
          path: like('/api/membership/applications/550e8400-e29b-41d4-a716-446655440000'),
          headers: authenticatedHeaders,
          body: {
            action: like('approve'),
            assignedCoachId: commonMatchers.uuid,
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            applicationId: commonMatchers.uuid,
            status: like('approved'),
            reviewedAt: commonMatchers.timestamp,
            reviewedBy: commonMatchers.uuid,
          }),
        },
      });

      const response = await fetch(
        'http://localhost:8080/api/membership/applications/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
            'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
          },
          body: JSON.stringify({
            action: 'approve',
            assignedCoachId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('approved');

      await verifyConsumerTest(pact);
    });

    it('rejects application with reason', async () => {
      await pact.addInteraction({
        state: 'coach has pending application to review',
        uponReceiving: 'an application rejection request',
        withRequest: {
          method: 'PUT',
          path: like('/api/membership/applications/550e8400-e29b-41d4-a716-446655440000'),
          headers: authenticatedHeaders,
          body: {
            action: like('reject'),
            rejectionReason: like('Incomplete documentation'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: commonMatchers.apiResponse({
            applicationId: commonMatchers.uuid,
            status: like('rejected'),
            reviewedAt: commonMatchers.timestamp,
            rejectionReason: like('Incomplete documentation'),
          }),
        },
      });

      const response = await fetch(
        'http://localhost:8080/api/membership/applications/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
            'X-Correlation-ID': '550e8400-e29b-41d4-a716-446655440000',
          },
          body: JSON.stringify({
            action: 'reject',
            rejectionReason: 'Incomplete documentation',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('rejected');

      await verifyConsumerTest(pact);
    });
  });
});
