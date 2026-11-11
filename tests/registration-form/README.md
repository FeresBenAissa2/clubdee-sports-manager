# Registration Form Test Infrastructure

This directory contains the test infrastructure and utilities for testing the multi-step membership registration form.

## Directory Structure

```
tests/registration-form/
├── README.md           # This file
├── test-utils.ts       # Common test utilities and helpers
├── mocks.ts           # Mock factories for Supabase, actions, and router
├── generators.ts      # Test data generators (valid/invalid inputs)
└── [test files]       # Individual test files will be added here
```

## Files Overview

### `test-utils.ts`

Provides common utilities for testing:

- **Mock Factories**: Create mock Supabase clients, server actions, and routers
- **Test Data Generators**: Generate valid/invalid form data
- **Test Helpers**: Utility functions for async operations, delays, and assertions

**Key Functions:**
- `createMockSupabaseClient()` - Creates a configurable Supabase client mock
- `createMockAuthActions()` - Creates mock authentication actions
- `createMockMembershipActions()` - Creates mock membership actions
- `generateValidAccountData()` - Generates valid account creation data
- `generateValidPersonalInfo()` - Generates valid personal information
- `generateValidDocuments()` - Generates all three required documents
- `generateValidFile()` - Creates mock File objects for upload testing

### `mocks.ts`

Centralized mock setup and configuration:

- **Mock Objects**: Pre-configured mocks for Supabase, actions, and router
- **Setup Functions**: Functions to initialize mocks in `beforeEach`
- **Reset Functions**: Functions to clean up mocks in `afterEach`
- **Response Helpers**: Quick configuration for common mock responses

**Key Functions:**
- `setupAllMocks()` - Initialize all mocks at once
- `resetAllMocks()` - Clean up all mocks at once
- `mockSignUpSuccess()` - Configure signUp to succeed
- `mockSignUpFailure()` - Configure signUp to fail
- `mockSubmitApplicationSuccess()` - Configure submission to succeed
- `mockAuthenticatedUser()` - Mock an authenticated user session
- `mockUnauthenticatedUser()` - Mock no user session

### `generators.ts`

Comprehensive test data generation:

- **Property-Based Arbitraries**: For use with fast-check
- **Valid Data Examples**: Common valid inputs
- **Invalid Data Examples**: Common invalid inputs
- **Edge Cases**: Boundary conditions and special cases

**Key Exports:**
- `validEmailArbitrary` - Generates valid emails (property-based)
- `invalidEmailArbitrary` - Generates invalid emails (property-based)
- `validPasswords` - Array of valid password examples
- `invalidPasswords` - Array of invalid password examples
- `validPhoneNumbers` - Array of valid Thai phone numbers
- `generateMockFile()` - Creates File objects for upload testing
- `edgeCases` - Object containing edge case test data

## Usage Examples

### Basic Unit Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupAllMocks, resetAllMocks, mockSignUpSuccess } from './mocks';
import { generateValidAccountData } from './test-utils';

describe('Account Creation', () => {
  beforeEach(() => {
    setupAllMocks();
    mockSignUpSuccess('test-user-id');
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should create account with valid data', async () => {
    const accountData = generateValidAccountData();
    // ... test implementation
  });
});
```

### Component Test with React Testing Library

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupAllMocks, resetAllMocks } from './mocks';
import { generateValidAccountData } from './test-utils';
import AccountCreationForm from '@/components/membership/AccountCreationForm';

describe('AccountCreationForm', () => {
  beforeEach(() => {
    setupAllMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should render form fields', () => {
    const mockOnChange = vi.fn();
    const data = generateValidAccountData();
    
    render(
      <AccountCreationForm 
        value={data} 
        onChange={mockOnChange} 
        errors={{}} 
      />
    );

    expect(screen.getByLabelText(/อีเมล/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/รหัสผ่าน/i)).toBeInTheDocument();
  });
});
```

### Property-Based Test

```typescript
import * as fc from 'fast-check';
import { validEmailArbitrary, validPasswordArbitrary } from './generators';
import { validateEmail, validatePassword } from '@/lib/auth/validation';

describe('Validation Properties', () => {
  it('Property: Valid emails pass validation', () => {
    fc.assert(
      fc.property(validEmailArbitrary, (email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property: Valid passwords pass validation', () => {
    fc.assert(
      fc.property(validPasswordArbitrary, (password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
```

### Integration Test

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  setupAllMocks, 
  resetAllMocks, 
  mockSignUpSuccess,
  mockSubmitApplicationSuccess 
} from './mocks';
import { generateCompleteFormData } from './test-utils';
import RegistrationForm from '@/components/membership/RegistrationForm';

describe('RegistrationForm Integration', () => {
  beforeEach(() => {
    setupAllMocks();
    mockSignUpSuccess('test-user-id');
    mockSubmitApplicationSuccess('test-app-id');
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should complete full registration flow', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    const formData = generateCompleteFormData();

    render(<RegistrationForm onSuccess={mockOnSuccess} />);

    // Step 1: Account Creation
    await user.type(screen.getByLabelText(/อีเมล/i), formData.account.email);
    await user.type(screen.getByLabelText(/รหัสผ่าน/i), formData.account.password);
    await user.click(screen.getByRole('button', { name: /ถัดไป/i }));

    // Wait for step 2
    await waitFor(() => {
      expect(screen.getByText(/ข้อมูลส่วนตัว/i)).toBeInTheDocument();
    });

    // ... continue with other steps
  });
});
```

## Testing Guidelines

### Mock Setup Pattern

Always use this pattern in your tests:

```typescript
beforeEach(() => {
  setupAllMocks();
  // Configure specific mock behaviors
  mockSignUpSuccess();
});

afterEach(() => {
  resetAllMocks();
});
```

### Test Data Generation

- Use **generators** for property-based tests
- Use **test-utils** for unit and component tests
- Use **edge cases** from generators for boundary testing

### Assertion Patterns

```typescript
// Check validation results
expect(result.isValid).toBe(true);
expect(result.errors).toHaveLength(0);

// Check error messages
expect(screen.getByText(/error message/i)).toBeInTheDocument();

// Check mock calls
expect(mockAuthActions.signUp).toHaveBeenCalledWith(
  expect.any(String),
  expect.any(String)
);

// Check async operations
await waitFor(() => {
  expect(mockOnSuccess).toHaveBeenCalled();
});
```

## Dependencies

- **vitest**: Test framework
- **@testing-library/react**: Component testing
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: DOM matchers
- **fast-check**: Property-based testing

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- registration-form/validation.test.ts

# Run tests with UI
npm run test:ui
```

## Coverage Goals

- **Validation Functions**: 80%+ coverage
- **Components**: 70%+ coverage
- **Critical Paths**: 100% coverage (account creation, submission)

## Next Steps

After setting up this infrastructure, implement tests in this order:

1. **Validation Unit Tests** - Test validation functions in isolation
2. **Component Tests** - Test individual form components
3. **Integration Tests** - Test complete registration flow
4. **Property-Based Tests** - Test universal properties across many inputs

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [fast-check Documentation](https://fast-check.dev/)
- Design Document: `.kiro/specs/demologin/design.md`
- Requirements: `.kiro/specs/demologin/requirements.md`
