/**
 * Unit tests for Login Policy
 * Feature: transitops
 * 
 * Tests credential validation and generic rejection logic.
 * Requirements: 1.2, 1.8
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateCredentials,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  GENERIC_AUTH_ERROR,
} from "./loginPolicy";

describe("Login Policy - Credential Validation", () => {
  describe("validateCredentials", () => {
    describe("Valid credentials", () => {
      it("should accept valid email and password within limits", () => {
        const result = validateCredentials("user@example.com", "password123");
        
        expect(result.ok).toBe(true);
      });

      it("should accept email exactly at 254 character limit", () => {
        // Create an email with exactly 254 characters
        // Format: [242 chars]@example.com (12 chars for @example.com = 254 total)
        const localPart = "a".repeat(242);
        const email = `${localPart}@example.com`;
        expect(email.length).toBe(254);
        
        const result = validateCredentials(email, "password123");
        expect(result.ok).toBe(true);
      });

      it("should accept password exactly at 128 character limit", () => {
        const password = "p".repeat(128);
        expect(password.length).toBe(128);
        
        const result = validateCredentials("user@example.com", password);
        expect(result.ok).toBe(true);
      });

      it("should accept empty email (format validation only, not content)", () => {
        // This function only validates length, not format
        const result = validateCredentials("", "password123");
        expect(result.ok).toBe(true);
      });

      it("should accept empty password (format validation only, not content)", () => {
        // This function only validates length, not format
        const result = validateCredentials("user@example.com", "");
        expect(result.ok).toBe(true);
      });
    });

    describe("Invalid credentials - Email too long (Requirement 1.8)", () => {
      it("should reject email with 255 characters", () => {
        const localPart = "a".repeat(243);
        const email = `${localPart}@example.com`;
        expect(email.length).toBe(255);
        
        const result = validateCredentials(email, "password123");
        
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe(GENERIC_AUTH_ERROR);
        }
      });

      it("should reject email significantly over limit", () => {
        const email = "a".repeat(300) + "@example.com";
        
        const result = validateCredentials(email, "password123");
        
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe(GENERIC_AUTH_ERROR);
        }
      });
    });

    describe("Invalid credentials - Password too long (Requirement 1.8)", () => {
      it("should reject password with 129 characters", () => {
        const password = "p".repeat(129);
        expect(password.length).toBe(129);
        
        const result = validateCredentials("user@example.com", password);
        
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe(GENERIC_AUTH_ERROR);
        }
      });

      it("should reject password significantly over limit", () => {
        const password = "p".repeat(500);
        
        const result = validateCredentials("user@example.com", password);
        
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe(GENERIC_AUTH_ERROR);
        }
      });
    });

    describe("Generic error message (Requirement 1.2)", () => {
      it("should return generic error for email violation", () => {
        const email = "a".repeat(260) + "@example.com";
        const result = validateCredentials(email, "password123");
        
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe(GENERIC_AUTH_ERROR);
          // The message is generic - it doesn't reveal which specific field was invalid
          expect(result.error.toLowerCase()).not.toContain("too long");
          expect(result.error).not.toContain("254");
        }
      });

      it("should return generic error for password violation", () => {
        const password = "p".repeat(150);
        const result = validateCredentials("user@example.com", password);
        
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe(GENERIC_AUTH_ERROR);
          // The message is generic - it doesn't reveal which specific field was invalid
          expect(result.error.toLowerCase()).not.toContain("too long");
          expect(result.error).not.toContain("128");
        }
      });

      it("should return same generic error for both violations", () => {
        const email = "a".repeat(260) + "@example.com";
        const password = "p".repeat(150);
        const result = validateCredentials(email, password);
        
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe(GENERIC_AUTH_ERROR);
        }
      });
    });

    describe("Constants", () => {
      it("should export correct MAX_EMAIL_LENGTH", () => {
        expect(MAX_EMAIL_LENGTH).toBe(254);
      });

      it("should export correct MAX_PASSWORD_LENGTH", () => {
        expect(MAX_PASSWORD_LENGTH).toBe(128);
      });

      it("should export GENERIC_AUTH_ERROR", () => {
        expect(GENERIC_AUTH_ERROR).toBe("Invalid email or password");
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle special characters in email", () => {
      const email = "user+test@example.com";
      const result = validateCredentials(email, "password123");
      expect(result.ok).toBe(true);
    });

    it("should handle special characters in password", () => {
      const password = "p@ssw0rd!#$%^&*()";
      const result = validateCredentials("user@example.com", password);
      expect(result.ok).toBe(true);
    });

    it("should handle unicode characters in email", () => {
      const email = "用户@example.com";
      const result = validateCredentials(email, "password123");
      expect(result.ok).toBe(true);
    });

    it("should handle unicode characters in password", () => {
      const password = "pässwörd123";
      const result = validateCredentials("user@example.com", password);
      expect(result.ok).toBe(true);
    });

    it("should count unicode characters correctly for length", () => {
      // Note: JavaScript's .length counts UTF-16 code units, not characters
      // The emoji "😀" is a surrogate pair (2 code units)
      // So 129 emojis = 258 code units, which exceeds the 128 limit
      const password = "😀".repeat(129); // 129 emojis = 258 code units
      expect(password.length).toBe(258); // JS counts UTF-16 code units
      
      const result = validateCredentials("user@example.com", password);
      expect(result.ok).toBe(false); // Exceeds 128 code unit limit
    });
  });

  // ===== Property-Based Tests =====
  describe("Property-Based Tests", () => {
    // Feature: transitops, Property 2: Login rejection is generic and session-free for all invalid credentials
    // Validates: Requirements 1.2, 1.8
    it("Property 2: Login rejection is generic and session-free for all invalid credentials", () => {
      fc.assert(
        fc.property(
          fc.string(), // arbitrary email
          fc.string(), // arbitrary password
          (email, password) => {
            const result = validateCredentials(email, password);

            // If credentials violate length limits, must be rejected
            if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
              // Must reject
              expect(result.ok).toBe(false);
              
              // Must use generic error (Req 1.2)
              if (!result.ok) {
                expect(result.error).toBe(GENERIC_AUTH_ERROR);
                
                // Error must not reveal which field was invalid
                expect(result.error.toLowerCase()).not.toContain("email");
                expect(result.error.toLowerCase()).not.toContain("password");
                expect(result.error.toLowerCase()).not.toContain("too long");
                expect(result.error.toLowerCase()).not.toContain("exceeds");
                expect(result.error).not.toContain(String(MAX_EMAIL_LENGTH));
                expect(result.error).not.toContain(String(MAX_PASSWORD_LENGTH));
              }
              
              return true;
            }
            
            // If credentials are within limits, must accept
            expect(result.ok).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: transitops, Property 5: Credential length limits are enforced
    // Validates: Requirements 1.8
    it("Property 5: Credential length limits are enforced", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 500 }), // emails with varying lengths
          fc.string({ minLength: 0, maxLength: 500 }), // passwords with varying lengths
          (email, password) => {
            const result = validateCredentials(email, password);

            // Email at or below limit
            if (email.length <= MAX_EMAIL_LENGTH) {
              // Password at or below limit
              if (password.length <= MAX_PASSWORD_LENGTH) {
                // Both valid → must accept
                expect(result.ok).toBe(true);
              } else {
                // Password exceeds limit → must reject
                expect(result.ok).toBe(false);
                if (!result.ok) {
                  expect(result.error).toBe(GENERIC_AUTH_ERROR);
                }
              }
            } else {
              // Email exceeds limit → must reject regardless of password
              expect(result.ok).toBe(false);
              if (!result.ok) {
                expect(result.error).toBe(GENERIC_AUTH_ERROR);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Additional property: Boundary testing for exact limits
    it("Property: Exact boundary behavior for length limits", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 300 }), // email length
          fc.integer({ min: 0, max: 200 }), // password length
          (emailLen, passwordLen) => {
            // Generate strings of exact length
            const email = "a".repeat(emailLen);
            const password = "p".repeat(passwordLen);

            const result = validateCredentials(email, password);

            // Must accept if and only if both are within limits
            const shouldAccept = emailLen <= MAX_EMAIL_LENGTH && passwordLen <= MAX_PASSWORD_LENGTH;
            
            if (shouldAccept) {
              expect(result.ok).toBe(true);
            } else {
              expect(result.ok).toBe(false);
              if (!result.ok) {
                expect(result.error).toBe(GENERIC_AUTH_ERROR);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Consistency - same inputs always produce same outputs
    it("Property: Validation is deterministic and consistent", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          (email, password) => {
            const result1 = validateCredentials(email, password);
            const result2 = validateCredentials(email, password);

            // Same inputs must produce same result
            expect(result1.ok).toBe(result2.ok);
            
            if (!result1.ok && !result2.ok) {
              expect(result1.error).toBe(result2.error);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Input sanitization - no edge case crashes
    it("Property: Input sanitization handles all string inputs without crashing", () => {
      fc.assert(
        fc.property(
          fc.string(), // can include special chars, unicode, etc.
          fc.string(),
          (email, password) => {
            // Should never throw, always return a Result
            expect(() => validateCredentials(email, password)).not.toThrow();
            
            const result = validateCredentials(email, password);
            
            // Result must be either ok: true or ok: false with error
            expect(typeof result.ok).toBe("boolean");
            
            if (!result.ok) {
              expect(typeof result.error).toBe("string");
              expect(result.error.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
