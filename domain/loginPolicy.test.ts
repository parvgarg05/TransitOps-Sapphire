/**
 * Unit tests for Login Policy
 * Feature: transitops
 * 
 * Tests credential validation and generic rejection logic.
 * Requirements: 1.2, 1.8
 */

import { describe, it, expect } from "vitest";
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
});
