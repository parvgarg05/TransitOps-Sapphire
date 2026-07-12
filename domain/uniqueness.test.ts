/**
 * Unit tests for Uniqueness Check Helper
 * 
 * Tests the pure uniqueness check functions for registration numbers
 * and license numbers.
 * 
 * Requirements: 3.2, 4.8
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  checkRegistrationNumberUniqueness,
  checkLicenseNumberUniqueness,
  checkUniqueness,
  DUPLICATE_REGISTRATION_ERROR,
  DUPLICATE_LICENSE_ERROR,
} from "./uniqueness";

describe("checkRegistrationNumberUniqueness", () => {
  it("should return ok: true when registration number is unique", () => {
    const existing = new Set(["ABC123", "DEF456", "GHI789"]);
    const result = checkRegistrationNumberUniqueness("XYZ999", existing);
    
    expect(result.ok).toBe(true);
  });

  it("should return ok: false when registration number already exists", () => {
    const existing = new Set(["ABC123", "DEF456", "GHI789"]);
    const result = checkRegistrationNumberUniqueness("ABC123", existing);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(DUPLICATE_REGISTRATION_ERROR);
    }
  });

  it("should handle empty existing set", () => {
    const existing = new Set<string>();
    const result = checkRegistrationNumberUniqueness("ABC123", existing);
    
    expect(result.ok).toBe(true);
  });

  it("should be case-sensitive", () => {
    const existing = new Set(["ABC123"]);
    const result = checkRegistrationNumberUniqueness("abc123", existing);
    
    expect(result.ok).toBe(true);
  });
});

describe("checkLicenseNumberUniqueness", () => {
  it("should return ok: true when license number is unique", () => {
    const existing = new Set(["LIC001", "LIC002", "LIC003"]);
    const result = checkLicenseNumberUniqueness("LIC999", existing);
    
    expect(result.ok).toBe(true);
  });

  it("should return ok: false when license number already exists", () => {
    const existing = new Set(["LIC001", "LIC002", "LIC003"]);
    const result = checkLicenseNumberUniqueness("LIC002", existing);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(DUPLICATE_LICENSE_ERROR);
    }
  });

  it("should handle empty existing set", () => {
    const existing = new Set<string>();
    const result = checkLicenseNumberUniqueness("LIC001", existing);
    
    expect(result.ok).toBe(true);
  });

  it("should be case-sensitive", () => {
    const existing = new Set(["LIC001"]);
    const result = checkLicenseNumberUniqueness("lic001", existing);
    
    expect(result.ok).toBe(true);
  });
});

describe("checkUniqueness (generic)", () => {
  it("should return ok: true when identifier is unique", () => {
    const existing = new Set(["ID1", "ID2", "ID3"]);
    const result = checkUniqueness("ID4", existing, "Custom error");
    
    expect(result.ok).toBe(true);
  });

  it("should return ok: false with custom error when identifier exists", () => {
    const existing = new Set(["ID1", "ID2", "ID3"]);
    const customError = "This identifier is already in use";
    const result = checkUniqueness("ID2", existing, customError);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(customError);
    }
  });

  it("should work with any string identifiers", () => {
    const existing = new Set(["email@example.com", "another@test.com"]);
    const result = checkUniqueness("new@example.com", existing, "Email already exists");
    
    expect(result.ok).toBe(true);
  });
});

// Feature: transitops, Property 8: Registration numbers and license numbers are unique
// **Validates: Requirements 3.2, 4.8**
describe("Property-Based Tests for Uniqueness", () => {
  describe("Property 8a: Collision detection - duplicates are correctly identified", () => {
    it("should detect collisions for registration numbers", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 50 }),
          (identifiers) => {
            // Build a set from the array (deduplication happens automatically)
            const existingSet = new Set(identifiers);
            
            // Pick a random identifier from the set to test collision
            const existingIdentifier = identifiers[0];
            
            // Test: checking an existing identifier should fail
            const collisionResult = checkRegistrationNumberUniqueness(existingIdentifier, existingSet);
            
            // If the identifier is in the set, collision should be detected
            if (existingSet.has(existingIdentifier)) {
              expect(collisionResult.ok).toBe(false);
              if (!collisionResult.ok) {
                expect(collisionResult.error).toBe(DUPLICATE_REGISTRATION_ERROR);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect collisions for license numbers", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 50 }),
          (identifiers) => {
            const existingSet = new Set(identifiers);
            const existingIdentifier = identifiers[0];
            
            const collisionResult = checkLicenseNumberUniqueness(existingIdentifier, existingSet);
            
            if (existingSet.has(existingIdentifier)) {
              expect(collisionResult.ok).toBe(false);
              if (!collisionResult.ok) {
                expect(collisionResult.error).toBe(DUPLICATE_LICENSE_ERROR);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 8b: Non-collision - unique identifiers are accepted", () => {
    it("should accept unique registration numbers", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (existingIdentifiers, newIdentifier) => {
            const existingSet = new Set(existingIdentifiers);
            
            // Only test when the new identifier is truly unique
            fc.pre(!existingSet.has(newIdentifier));
            
            const result = checkRegistrationNumberUniqueness(newIdentifier, existingSet);
            
            // Should succeed since it's unique
            expect(result.ok).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept unique license numbers", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (existingIdentifiers, newIdentifier) => {
            const existingSet = new Set(existingIdentifiers);
            
            fc.pre(!existingSet.has(newIdentifier));
            
            const result = checkLicenseNumberUniqueness(newIdentifier, existingSet);
            
            expect(result.ok).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 8c: Case sensitivity - different cases are treated as different identifiers", () => {
    it("should treat different cases as unique for registration numbers", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.toLowerCase() !== s.toUpperCase()),
          (identifier) => {
            const lowercase = identifier.toLowerCase();
            const uppercase = identifier.toUpperCase();
            
            // Only test when lowercase and uppercase are actually different
            fc.pre(lowercase !== uppercase);
            
            const existingSet = new Set([lowercase]);
            
            // Uppercase version should be treated as unique (case-sensitive)
            const result = checkRegistrationNumberUniqueness(uppercase, existingSet);
            expect(result.ok).toBe(true);
            
            // And vice versa
            const existingSetUpper = new Set([uppercase]);
            const resultLower = checkRegistrationNumberUniqueness(lowercase, existingSetUpper);
            expect(resultLower.ok).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should treat different cases as unique for license numbers", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.toLowerCase() !== s.toUpperCase()),
          (identifier) => {
            const lowercase = identifier.toLowerCase();
            const uppercase = identifier.toUpperCase();
            
            fc.pre(lowercase !== uppercase);
            
            const existingSet = new Set([lowercase]);
            const result = checkLicenseNumberUniqueness(uppercase, existingSet);
            expect(result.ok).toBe(true);
            
            const existingSetUpper = new Set([uppercase]);
            const resultLower = checkLicenseNumberUniqueness(lowercase, existingSetUpper);
            expect(resultLower.ok).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 8d: Deduplication - Set correctly maintains uniqueness", () => {
    it("should maintain uniqueness through Set deduplication", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 100 }),
          (identifiers) => {
            // Create a set - duplicates are automatically removed
            const uniqueSet = new Set(identifiers);
            
            // Every element in the set should be unique
            const setArray = Array.from(uniqueSet);
            for (let i = 0; i < setArray.length; i++) {
              for (let j = i + 1; j < setArray.length; j++) {
                // No two elements should be equal
                expect(setArray[i]).not.toBe(setArray[j]);
              }
            }
            
            // Every unique identifier should pass the uniqueness check against a set that doesn't contain it
            for (const identifier of setArray) {
              const otherIdentifiers = new Set(setArray.filter(id => id !== identifier));
              const result = checkUniqueness(identifier, otherIdentifiers, "Duplicate");
              expect(result.ok).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 8e: Generic uniqueness check behaves consistently", () => {
    it("should behave consistently with specific check functions", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (existingIdentifiers, newIdentifier) => {
            const existingSet = new Set(existingIdentifiers);
            
            // Test registration number check
            const specificResult = checkRegistrationNumberUniqueness(newIdentifier, existingSet);
            const genericResult = checkUniqueness(newIdentifier, existingSet, DUPLICATE_REGISTRATION_ERROR);
            
            // Both should return the same ok status
            expect(specificResult.ok).toBe(genericResult.ok);
            
            // If both fail, both should have the same error message
            if (!specificResult.ok && !genericResult.ok) {
              expect(specificResult.error).toBe(genericResult.error);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 8f: Empty set - all identifiers are unique against empty set", () => {
    it("should accept any identifier against an empty set", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (identifier) => {
            const emptySet = new Set<string>();
            
            const regResult = checkRegistrationNumberUniqueness(identifier, emptySet);
            expect(regResult.ok).toBe(true);
            
            const licResult = checkLicenseNumberUniqueness(identifier, emptySet);
            expect(licResult.ok).toBe(true);
            
            const genericResult = checkUniqueness(identifier, emptySet, "Error");
            expect(genericResult.ok).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
