/**
 * Unit tests for password hashing utilities
 * 
 * These tests verify that password hashing and verification work correctly
 * and that plaintext passwords are never stored or returned.
 * 
 * Requirements: 1.4
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { hashPassword, verifyPassword } from "./password";

describe("Password Hashing Utilities", () => {
  describe("hashPassword", () => {
    it("should hash a plaintext password", async () => {
      const plaintext = "mySecurePassword123";
      const hash = await hashPassword(plaintext);

      // Hash should be a non-empty string
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce a bcrypt hash format", async () => {
      const plaintext = "testPassword";
      const hash = await hashPassword(plaintext);

      // Bcrypt hash starts with $2a$ or $2b$ (bcrypt version identifier)
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it("should never return the plaintext password", async () => {
      const plaintext = "myPassword123";
      const hash = await hashPassword(plaintext);

      // The hash should NOT contain the plaintext password
      expect(hash).not.toBe(plaintext);
      expect(hash).not.toContain(plaintext);
    });

    it("should produce different hashes for the same password (salt is random)", async () => {
      const plaintext = "samePassword";
      const hash1 = await hashPassword(plaintext);
      const hash2 = await hashPassword(plaintext);

      // Due to random salt, hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", async () => {
      const plaintext = "";
      const hash = await hashPassword(plaintext);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle long passwords", async () => {
      const plaintext = "a".repeat(200); // Very long password
      const hash = await hashPassword(plaintext);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it("should handle special characters", async () => {
      const plaintext = "p@ssw0rd!#$%^&*()_+{}[]|:;<>?,./~`";
      const hash = await hashPassword(plaintext);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe("verifyPassword", () => {
    it("should return true for correct password", async () => {
      const plaintext = "correctPassword123";
      const hash = await hashPassword(plaintext);

      const isValid = await verifyPassword(plaintext, hash);

      expect(isValid).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      const correctPassword = "correctPassword123";
      const incorrectPassword = "wrongPassword456";
      const hash = await hashPassword(correctPassword);

      const isValid = await verifyPassword(incorrectPassword, hash);

      expect(isValid).toBe(false);
    });

    it("should be case-sensitive", async () => {
      const plaintext = "MyPassword";
      const hash = await hashPassword(plaintext);

      // Different case should fail
      const isValidLower = await verifyPassword("mypassword", hash);
      const isValidUpper = await verifyPassword("MYPASSWORD", hash);

      expect(isValidLower).toBe(false);
      expect(isValidUpper).toBe(false);
    });

    it("should handle empty string verification", async () => {
      const plaintext = "";
      const hash = await hashPassword(plaintext);

      const isValidEmpty = await verifyPassword("", hash);
      const isValidNonEmpty = await verifyPassword("something", hash);

      expect(isValidEmpty).toBe(true);
      expect(isValidNonEmpty).toBe(false);
    });

    it("should return false for malformed hash", async () => {
      const plaintext = "password123";
      const malformedHash = "not-a-valid-bcrypt-hash";

      // bcrypt returns false for malformed hashes rather than throwing
      const isValid = await verifyPassword(plaintext, malformedHash);
      expect(isValid).toBe(false);
    });

    it("should verify password with special characters", async () => {
      const plaintext = "p@ssw0rd!#$%^&*()";
      const hash = await hashPassword(plaintext);

      const isValid = await verifyPassword(plaintext, hash);

      expect(isValid).toBe(true);
    });

    it("should verify long passwords", async () => {
      const plaintext = "a".repeat(200);
      const hash = await hashPassword(plaintext);

      const isValid = await verifyPassword(plaintext, hash);

      expect(isValid).toBe(true);
    });
  });

  describe("Integration: hash and verify workflow", () => {
    it("should successfully hash and verify a password", async () => {
      // Simulate user registration
      const userPassword = "newUserPassword123!";
      const storedHash = await hashPassword(userPassword);

      // Simulate user login - correct password
      const loginAttempt1 = await verifyPassword("newUserPassword123!", storedHash);
      expect(loginAttempt1).toBe(true);

      // Simulate user login - incorrect password
      const loginAttempt2 = await verifyPassword("wrongPassword", storedHash);
      expect(loginAttempt2).toBe(false);
    });

    it("should never expose plaintext password", async () => {
      const plaintext = "secretPassword456";
      const hash = await hashPassword(plaintext);

      // Verify that the hash doesn't contain the plaintext
      expect(hash).not.toContain(plaintext);
      
      // Verify that the plaintext can still be validated
      const isValid = await verifyPassword(plaintext, hash);
      expect(isValid).toBe(true);
    });

    it("should handle multiple users with same password (different hashes)", async () => {
      const commonPassword = "commonPassword123";
      
      const user1Hash = await hashPassword(commonPassword);
      const user2Hash = await hashPassword(commonPassword);

      // Hashes should be different due to random salt
      expect(user1Hash).not.toBe(user2Hash);

      // Both should verify correctly
      const user1Valid = await verifyPassword(commonPassword, user1Hash);
      const user2Valid = await verifyPassword(commonPassword, user2Hash);

      expect(user1Valid).toBe(true);
      expect(user2Valid).toBe(true);
    });
  });

  describe("Requirement 1.4 Compliance", () => {
    it("should never store plaintext password", async () => {
      const plaintext = "userPassword789";
      const hash = await hashPassword(plaintext);

      // Requirement 1.4: SHALL NOT store or return the plaintext password
      expect(hash).not.toBe(plaintext);
      expect(hash).not.toContain(plaintext);
    });

    it("should use one-way cryptographic hash (bcrypt)", async () => {
      const plaintext = "testPassword456";
      const hash = await hashPassword(plaintext);

      // Requirement 1.4: SHALL store using a one-way cryptographic hash
      // Bcrypt is one-way; verify the format
      expect(hash).toMatch(/^\$2[ab]\$\d+\$/);
    });

    it("should successfully verify correct password against hash", async () => {
      const plaintext = "verificationTest123";
      const hash = await hashPassword(plaintext);

      // Requirement 1.4: System must be able to verify passwords
      const isValid = await verifyPassword(plaintext, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password against hash", async () => {
      const correctPassword = "correctOne";
      const incorrectPassword = "incorrectOne";
      const hash = await hashPassword(correctPassword);

      // Requirement 1.4: System must reject incorrect passwords
      const isValid = await verifyPassword(incorrectPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe("Property-Based Tests", () => {
    // Feature: transitops, Property 1: Passwords are stored hashed and verifiable, never as plaintext
    // **Validates: Requirements 1.4**
    it("Property 1: Passwords are stored hashed and verifiable, never as plaintext", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 128 }), // Generate passwords up to the max allowed length
          async (password) => {
            const hash = await hashPassword(password);

            // The hash must not be the plaintext password
            expect(hash).not.toBe(password);
            
            // The hash must not contain the plaintext password (for multi-char passwords)
            // Skip this check for single-char passwords as bcrypt format may contain single chars like "/"
            if (password.length > 1) {
              expect(hash).not.toContain(password);
            }

            // The hash must be in bcrypt format
            expect(hash).toMatch(/^\$2[ab]\$/);

            // The original password must verify against the hash (verifiable)
            const isValid = await verifyPassword(password, hash);
            expect(isValid).toBe(true);

            // A different password must not verify against the hash
            const differentPassword = password + "x";
            const isInvalid = await verifyPassword(differentPassword, hash);
            expect(isInvalid).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for bcrypt operations

    // Feature: transitops, Property: Hash determinism - same password always verifies
    // **Validates: Requirements 1.4**
    it("Property: Hash determinism - same password always verifies", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 128 }),
          async (password) => {
            const hash = await hashPassword(password);

            // The same password should always verify correctly
            const verify1 = await verifyPassword(password, hash);
            const verify2 = await verifyPassword(password, hash);
            const verify3 = await verifyPassword(password, hash);

            expect(verify1).toBe(true);
            expect(verify2).toBe(true);
            expect(verify3).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for bcrypt operations

    // Feature: transitops, Property: Salt uniqueness - same password produces different hashes
    // **Validates: Requirements 1.4**
    it("Property: Salt uniqueness - same password produces different hashes", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 128 }),
          async (password) => {
            // Hash the same password multiple times
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);
            const hash3 = await hashPassword(password);

            // Due to random salt, all hashes should be different
            expect(hash1).not.toBe(hash2);
            expect(hash2).not.toBe(hash3);
            expect(hash1).not.toBe(hash3);

            // But all should still verify the original password
            expect(await verifyPassword(password, hash1)).toBe(true);
            expect(await verifyPassword(password, hash2)).toBe(true);
            expect(await verifyPassword(password, hash3)).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for bcrypt operations

    // Feature: transitops, Property: Incorrect passwords never verify
    // **Validates: Requirements 1.4**
    it("Property: Incorrect passwords never verify", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 128 }),
          fc.string({ minLength: 1, maxLength: 128 }),
          async (password1, password2) => {
            // Only test when passwords are different
            fc.pre(password1 !== password2);

            const hash = await hashPassword(password1);

            // A different password should never verify
            const isValid = await verifyPassword(password2, hash);
            expect(isValid).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for bcrypt operations

    // Feature: transitops, Property: Hash format consistency
    // **Validates: Requirements 1.4**
    it("Property: Hash format consistency - all hashes follow bcrypt format", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 128 }),
          async (password) => {
            const hash = await hashPassword(password);

            // All hashes must be non-empty strings
            expect(typeof hash).toBe("string");
            expect(hash.length).toBeGreaterThan(0);

            // All hashes must follow bcrypt format
            expect(hash).toMatch(/^\$2[ab]\$\d+\$/);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for bcrypt operations

    // Feature: transitops, Property: Password special characters handling
    // **Validates: Requirements 1.4**
    it("Property: Handles passwords with special characters correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 128 }),
          async (password) => {
            const hash = await hashPassword(password);

            // Must hash and verify regardless of special characters
            expect(hash).toBeDefined();
            expect(hash).toMatch(/^\$2[ab]\$/);

            const isValid = await verifyPassword(password, hash);
            expect(isValid).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for bcrypt operations
  });
});
