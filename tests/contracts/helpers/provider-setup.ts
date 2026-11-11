/**
 * Provider Test Setup Utilities
 * 
 * Provides configuration for verifying provider honors consumer contracts
 */

import { Verifier, VerifierOptions } from '@pact-foundation/pact';
import path from 'path';

/**
 * Base configuration for provider verification
 */
export const baseProviderConfig: Partial<VerifierOptions> = {
  logLevel: 'warn',
  providerBaseUrl: process.env.PROVIDER_BASE_URL || 'http://localhost:3000',
  
  // Use file-based pacts (for local development)
  pactUrls: [
    path.resolve(process.cwd(), 'tests/contracts/pacts'),
  ],
  
  // Provider version (from git commit or environment)
  providerVersion: process.env.GIT_COMMIT || '1.0.0',
  
  // Enable pending pacts (don't fail on new contracts)
  enablePending: true,
  
  // Include WIP pacts (work in progress)
  includeWipPactsSince: undefined,
  
  // Timeout for provider requests
  timeout: 30000,
};

/**
 * Create provider verifier with custom configuration
 */
export function createProviderVerifier(
  provider: string,
  customConfig: Partial<VerifierOptions> = {}
): Verifier {
  const config: VerifierOptions = {
    ...baseProviderConfig,
    provider,
    ...customConfig,
  } as VerifierOptions;
  
  return new Verifier(config);
}

/**
 * State handlers for provider tests
 * These set up the provider state before verification
 */
export const stateHandlers = {
  'user is authenticated': async () => {
    // Set up authenticated user state
    // In real implementation, create test user and return auth token
    return {
      description: 'User authenticated',
      token: 'test-auth-token',
    };
  },
  
  'user is not authenticated': async () => {
    // Set up unauthenticated state
    return {
      description: 'User not authenticated',
    };
  },
  
  'athlete has pending application': async () => {
    // Create test athlete with pending application
    return {
      description: 'Athlete with pending application created',
      athleteId: 'test-athlete-id',
      applicationId: 'test-application-id',
    };
  },
  
  'coach has club assigned': async () => {
    // Create test coach with club
    return {
      description: 'Coach with club created',
      coachId: 'test-coach-id',
      clubId: 'test-club-id',
    };
  },
  
  'training session exists': async () => {
    // Create test training session
    return {
      description: 'Training session created',
      sessionId: 'test-session-id',
    };
  },
  
  'athlete can check in': async () => {
    // Set up state where athlete can check in
    return {
      description: 'Athlete eligible for check-in',
      athleteId: 'test-athlete-id',
      sessionId: 'test-session-id',
    };
  },
};

/**
 * Request filter to add authentication headers
 */
export function requestFilter(req: any, res: any, next: any) {
  // Add authentication token if needed
  if (req.headers.authorization) {
    // Validate or mock authentication
    req.headers['x-test-auth'] = 'true';
  }
  
  // Add correlation ID if not present
  if (!req.headers['x-correlation-id']) {
    req.headers['x-correlation-id'] = 'test-correlation-id';
  }
  
  next();
}

/**
 * Verify provider honors all consumer contracts
 */
export async function verifyProvider(
  provider: string,
  customConfig: Partial<VerifierOptions> = {}
): Promise<void> {
  const verifier = createProviderVerifier(provider, customConfig);
  
  try {
    const output = await verifier.verifyProvider();
    console.log('Provider verification successful:', output);
  } catch (error) {
    console.error('Provider verification failed:', error);
    throw error;
  }
}
