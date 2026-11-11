/**
 * Auth API Consumer Contract Tests
 * 
 * Defines frontend expectations for authentication endpoints
 * **Validates: Requirements 20.10**
 */

import { describe, it, expect } from 'vitest';
import {
  createConsumerPact,
  commonMatchers,
  commonHeaders,
  like,
  string,
} from '../helpers/pact-setup';

describe('Auth API Consumer Contracts', () => {
  const pact = createConsumerPact('Frontend', 'Auth API');

  describe('POST /api/auth/signup', () => {
    it('creates new user account', async () => {
      await pact
        .given('user does not exist')
        .uponReceiving('a signup request with valid data')
        .withRequest({
          method: 'POST',
          path: '/api/auth/signup',
          headers: commonHeaders,
          body: {
            email: string('newuser@example.com'),
            password: string('ValidPassword123!'),
            fullName: string('John Doe'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: commonHeaders,
          body: commonMatchers.apiResponse({
            user: {
              id: commonMatchers.uuid,
              email: commonMatchers.email,
            },
          }),
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/auth/signup`, {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
              email: 'newuser@example.com',
              password: 'ValidPassword123!',
              fullName: 'John Doe',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data.user).toBeDefined();
        });
    });

    it('rejects invalid email format', async () => {
      await pact
        .given('any state')
        .uponReceiving('a signup request with invalid email')
        .withRequest({
          method: 'POST',
          path: '/api/auth/signup',
          headers: commonHeaders,
          body: {
            email: string('invalid-email'),
            password: string('ValidPassword123!'),
            fullName: string('John Doe'),
          },
        })
        .willRespondWith({
          status: 400,
          headers: commonHeaders,
          body: commonMatchers.errorResponse('VALIDATION_ERROR', 'Invalid email format'),
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/auth/signup`, {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
              email: 'invalid-email',
              password: 'ValidPassword123!',
              fullName: 'John Doe',
            }),
          });

          expect(response.status).toBe(400);
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error.code).toBe('VALIDATION_ERROR');
        });
    });
  });

  describe('POST /api/auth/signin', () => {
    it('authenticates user with valid credentials', async () => {
      await pact
        .given('user exists with valid credentials')
        .uponReceiving('a signin request')
        .withRequest({
          method: 'POST',
          path: '/api/auth/signin',
          headers: commonHeaders,
          body: {
            email: string('user@example.com'),
            password: string('ValidPassword123!'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: commonHeaders,
          body: commonMatchers.apiResponse({
            user: {
              id: commonMatchers.uuid,
              email: commonMatchers.email,
              role: string('athlete'),
            },
            session: {
              access_token: string('jwt-token-string'),
              expires_at: commonMatchers.timestamp,
            },
          }),
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/auth/signin`, {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
              email: 'user@example.com',
              password: 'ValidPassword123!',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data.session.access_token).toBeDefined();
        });
    });
  });
});
