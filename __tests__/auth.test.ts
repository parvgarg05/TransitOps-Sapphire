/**
 * Authentication Tests
 * 
 * Tests for the Auth.js configuration and authentication flow.
 * This verifies the integration of domain logic (password, lockout, loginPolicy)
 * with the Auth.js Credentials provider.
 * 
 * Requirements: 1.1, 1.2, 1.5, 1.6
 */

import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/domain/password";
import { validateCredentials, GENERIC_AUTH_ERROR } from "@/domain/loginPolicy";
import { computeLockoutState, LOCKOUT_CONFIG } from "@/domain/lockout";

describe("Authentication System", () => {
  const testEmail = "auth-test@example.com";
  const testPassword = "SecurePassword123!";

  describe("Credential Validation (Req 1.2, 1.8)", () => {
    it("should accept valid credentials", () => {
      const result = validateCredentials("user@example.com", "password123");
      expect(result.ok).toBe(true);
    });

    it("should reject email longer than 254 characters", () => {
      const longEmail = "a".repeat(255) + "@example.com";
      const result = validateCredentials(longEmail, "password123");
      expect(result.ok).toBe(false);
      expect(result.error).toBe(GENERIC_AUTH_ERROR);
    });

    it("should reject password longer than 128 characters", () => {
      const longPassword = "a".repeat(129);
      const result = validateCredentials("user@example.com", longPassword);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(GENERIC_AUTH_ERROR);
    });
  });

  describe("Lockout Logic (Req 1.6)", () => {
    it("should not lock account with fewer than 5 failures", () => {
      const now = new Date();
      const attempts = [
        { email: testEmail, timestamp: new Date(now.getTime() - 1000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - 2000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - 3000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - 4000), success: false },
      ];

      const lockoutState = computeLockoutState(attempts, now);
      expect(lockoutState.isLocked).toBe(false);
      expect(lockoutState.consecutiveFailures).toBe(4);
    });

    it("should lock account after 5 consecutive failures", () => {
      const now = new Date();
      const attempts = [
        { email: testEmail, timestamp: new Date(now.getTime() - 1000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - 2000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - 3000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - 4000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - 5000), success: false },
      ];

      const lockoutState = computeLockoutState(attempts, now);
      expect(lockoutState.isLocked).toBe(true);
      expect(lockoutState.lockedUntil).not.toBeNull();
      expect(lockoutState.consecutiveFailures).toBe(5);
    });

    it("should unlock account after lockout duration expires", () => {
      const now = new Date();
      const lockoutDuration = LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000;
      
      // Failures occurred more than 15 minutes ago
      const attempts = [
        { email: testEmail, timestamp: new Date(now.getTime() - lockoutDuration - 10000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - lockoutDuration - 11000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - lockoutDuration - 12000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - lockoutDuration - 13000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - lockoutDuration - 14000), success: false },
      ];

      const lockoutState = computeLockoutState(attempts, now);
      expect(lockoutState.isLocked).toBe(false);
    });

    it("should reset consecutive failures after a successful login", () => {
      const now = new Date();
      const attempts = [
        { email: testEmail, timestamp: new Date(now.getTime() - 1000), success: true },
        { email: testEmail, timestamp: new Date(now.getTime() - 2000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - 3000), success: false },
        { email: testEmail, timestamp: new Date(now.getTime() - 4000), success: false },
      ];

      const lockoutState = computeLockoutState(attempts, now);
      expect(lockoutState.isLocked).toBe(false);
      expect(lockoutState.consecutiveFailures).toBe(0);
    });
  });

  describe("Generic Error Messages (Req 1.2)", () => {
    it("should return generic error for invalid email format", () => {
      const result = validateCredentials("a".repeat(255), "password");
      expect(result.ok).toBe(false);
      expect(result.error).toBe(GENERIC_AUTH_ERROR);
      // The error message is generic - it doesn't specifically identify which field is wrong
      expect(result.error).toBe("Invalid email or password");
    });

    it("should return generic error for invalid password format", () => {
      const result = validateCredentials("user@example.com", "a".repeat(129));
      expect(result.ok).toBe(false);
      expect(result.error).toBe(GENERIC_AUTH_ERROR);
      // The error message is generic - it doesn't specifically identify which field is wrong
      expect(result.error).toBe("Invalid email or password");
    });
  });

  describe("Password Hashing and Verification (Req 1.4)", () => {
    it("should hash and verify passwords correctly", async () => {
      const plainPassword = "SecurePassword123!";
      const hash = await hashPassword(plainPassword);
      
      expect(hash).not.toBe(plainPassword);
      expect(hash.length).toBeGreaterThan(0);
      
      const isValid = await verifyPassword(plainPassword, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect passwords", async () => {
      const plainPassword = "SecurePassword123!";
      const hash = await hashPassword(plainPassword);
      
      const isValid = await verifyPassword("WrongPassword456!", hash);
      expect(isValid).toBe(false);
    });

    it("should generate different hashes for same password", async () => {
      const plainPassword = "SecurePassword123!";
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);
      
      expect(hash1).not.toBe(hash2);
      
      // But both should verify correctly
      expect(await verifyPassword(plainPassword, hash1)).toBe(true);
      expect(await verifyPassword(plainPassword, hash2)).toBe(true);
    });
  });
});
