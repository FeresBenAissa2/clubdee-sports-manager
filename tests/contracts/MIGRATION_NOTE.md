# Pact V3 API Migration Note

## Current Status

The contract testing infrastructure has been set up with @pact-foundation/pact v16.0.2, which uses the PactV3 API. The test files have been created but need to be updated to use the modern PactV3 API syntax.

## What's Complete

✅ Pact framework installed (@pact-foundation/pact v16.0.2)
✅ Directory structure created
✅ Helper utilities created (pact-setup.ts, provider-setup.ts)
✅ npm scripts configured
✅ Documentation written
✅ Test files created for all 4 API domains

## What Needs Update

The consumer test files were initially written for Pact V2 API and need to be migrated to PactV3 API:

### Old API (Pact V2):
```typescript
const pact = new Pact({ consumer, provider, port: 8080 });

await pact.setup();
await pact.addInteraction({ ... });
await pact.verify();
await pact.finalize();
```

### New API (PactV3):
```typescript
const pact = new PactV3({ consumer, provider });

await pact
  .given('state')
  .uponReceiving('description')
  .withRequest({ ... })
  .willRespondWith({ ... })
  .executeTest(async (mockServer) => {
    // Make request to mockServer.url
    // Assert response
  });
```

## Key Differences

1. **No explicit setup/finalize**: PactV3 handles lifecycle automatically
2. **Fluent API**: Chain methods instead of passing objects
3. **executeTest**: Wraps test execution and provides mockServer
4. **Mock server URL**: Dynamic URL provided in executeTest callback
5. **Matchers**: Use MatchersV3 instead of Matchers

## Files to Update

### Consumer Tests (Need Migration):
- `tests/contracts/consumer/auth.consumer.test.ts` - ⚠️ Partially updated
- `tests/contracts/consumer/membership.consumer.test.ts` - ❌ Needs update
- `tests/contracts/consumer/training.consumer.test.ts` - ❌ Needs update
- `tests/contracts/consumer/attendance.consumer.test.ts` - ❌ Needs update

### Provider Tests (Need Update):
- `tests/contracts/provider/auth.provider.test.ts` - ❌ Needs update
- `tests/contracts/provider/membership.provider.test.ts` - ❌ Needs update
- `tests/contracts/provider/training.provider.test.ts` - ❌ Needs update
- `tests/contracts/provider/attendance.provider.test.ts` - ❌ Needs update

## Migration Steps

### For Consumer Tests:

1. Update imports:
```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
const { like, string, regex, iso8601DateTime } = MatchersV3;
```

2. Create pact instance:
```typescript
const pact = new PactV3({ consumer: 'Frontend', provider: 'Auth API' });
```

3. Convert each test:
```typescript
// Old
await pact.addInteraction({ state, uponReceiving, withRequest, willRespondWith });
const response = await fetch('http://localhost:8080/...');
await pact.verify();

// New
await pact
  .given(state)
  .uponReceiving(description)
  .withRequest({ ... })
  .willRespondWith({ ... })
  .executeTest(async (mockServer) => {
    const response = await fetch(`${mockServer.url}/...`);
    // assertions
  });
```

4. Remove beforeAll/afterAll hooks (not needed with PactV3)

### For Provider Tests:

1. Update to use Verifier from PactV3:
```typescript
import { Verifier } from '@pact-foundation/pact';

const verifier = new Verifier({
  provider: 'Auth API',
  providerBaseUrl: 'http://localhost:3000',
  pactUrls: ['path/to/pacts'],
  stateHandlers: { ... },
});

await verifier.verifyProvider();
```

## Example: Complete Auth Signup Test

```typescript
import { describe, it, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, string, regex } = MatchersV3;

describe('Auth API Consumer', () => {
  const pact = new PactV3({
    consumer: 'Frontend',
    provider: 'Auth API',
    dir: './tests/contracts/pacts',
  });

  it('creates new user account', async () => {
    await pact
      .given('user does not exist')
      .uponReceiving('a signup request with valid data')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signup',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: string('user@example.com'),
          password: string('ValidPassword123!'),
          fullName: string('John Doe'),
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          success: true,
          data: {
            user: {
              id: regex('^[0-9a-f-]{36}$', '550e8400-e29b-41d4-a716-446655440000'),
              email: string('user@example.com'),
            },
          },
        },
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@example.com',
            password: 'ValidPassword123!',
            fullName: 'John Doe',
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.user.id).toBeDefined();
      });
  });
});
```

## Testing the Migration

After updating files, test with:

```bash
# Test single file
npx vitest tests/contracts/consumer/auth.consumer.test.ts

# Test all consumer tests
npm run test:contracts:consumer

# Test all provider tests (requires running server)
npm run test:contracts:provider
```

## Resources

- [Pact JS V3 Documentation](https://docs.pact.io/implementation_guides/javascript/readme)
- [Pact JS GitHub](https://github.com/pact-foundation/pact-js)
- [Migration Guide](https://github.com/pact-foundation/pact-js/blob/master/MIGRATION.md)
- [V3 Matchers](https://github.com/pact-foundation/pact-js/tree/master/src/v3/matchers)

## Next Steps

1. Complete migration of auth.consumer.test.ts (partially done)
2. Migrate remaining consumer tests
3. Update provider tests to use Verifier
4. Run tests to verify pact files are generated
5. Test provider verification with running server
6. Add to CI/CD pipeline

## Estimated Effort

- Consumer test migration: ~2-3 hours
- Provider test migration: ~1-2 hours
- Testing and debugging: ~1-2 hours
- Total: ~4-7 hours

## Notes

The infrastructure and architecture are correct. The main work is updating the test syntax to match PactV3 API. The concepts remain the same:
- Consumer defines expectations
- Pact files generated
- Provider verifies contracts

The migration is straightforward but requires careful attention to the new API syntax.
