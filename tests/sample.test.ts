import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Sample Tests', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should pass a property-based test', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a; // Commutative property
      })
    );
  });
});
