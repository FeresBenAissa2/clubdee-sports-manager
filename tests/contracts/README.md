# Contract Testing with Pact

This directory contains contract tests that verify API consumers (frontend) and providers (backend API) agree on interface contracts.

## Structure

```
tests/contracts/
├── consumer/          # Consumer tests (frontend expectations)
│   ├── auth.consumer.test.ts
│   ├── membership.consumer.test.ts
│   ├── training.consumer.test.ts
│   └── attendance.consumer.test.ts
├── provider/          # Provider tests (API verification)
│   ├── auth.provider.test.ts
│   ├── membership.provider.test.ts
│   ├── training.provider.test.ts
│   └── attendance.provider.test.ts
├── pacts/             # Generated contract files
└── helpers/           # Test utilities

```

## Running Contract Tests

### Consumer Tests
```bash
npm run test:contracts:consumer
```

### Provider Tests
```bash
npm run test:contracts:provider
```

### All Contract Tests
```bash
npm run test:contracts
```

## Contract Testing Workflow

1. **Consumer Tests**: Frontend defines expectations for API responses
2. **Pact Generation**: Consumer tests generate contract files (pacts)
3. **Provider Tests**: Backend verifies it honors the contracts
4. **CI/CD Integration**: Contracts verified on every deployment

## Configuration

Contract tests use file-based contracts stored in `tests/contracts/pacts/`.
For production, consider using a Pact Broker for centralized contract management.

## References

- [Pact Documentation](https://docs.pact.io/)
- [Pact JS](https://github.com/pact-foundation/pact-js)
- OpenAPI specs: `sports-club-management/openapi/`
