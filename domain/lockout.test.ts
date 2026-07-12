/**
 * Unit tests for account lockout logic
 * Feature: transitops
 */

import { describe, it, expect } from "vitest";
import {
  LoginAttempt,
  LockoutState,
  LOCKOUT_CONFIG,
  computeLockoutState,
  isAccountLocked,
  validateLoginAttempt,
} from "./lockout";

describe("Account Lockout Logic", () => {
  describe("computeLockoutState", () => {
    it("should return not locked for empty attempt history", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      const state = computeLockoutState([], now);

      expect(state.isLocked).toBe(false);
      expect(state.lockedUntil).toBe(null);
      expect(state.consecutiveFailures).toBe(0);
    });

    it("should return not locked for fewer than 5 consecutive failures", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:58:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:57:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:56:00.000Z"), success: false },
      ];

      const state = computeLockoutState(attempts, now);

      expect(state.isLocked).toBe(false);
      expect(state.lockedUntil).toBe(null);
      expect(state.consecutiveFailures).toBe(4);
    });

    it("should lock account for 5 consecutive failures within 15 minutes", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      const fifthFailureTime = new Date("2024-01-15T11:59:00.000Z");
      
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: fifthFailureTime, success: false }, // 5th failure
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:58:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:57:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:56:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:55:00.000Z"), success: false }, // 1st failure
      ];

      const state = computeLockoutState(attempts, now);

      expect(state.isLocked).toBe(true);
      expect(state.consecutiveFailures).toBe(5);
      expect(state.lockedUntil).not.toBe(null);
      
      // Verify lockout expires 15 minutes after the 5th failure
      const expectedLockExpiry = new Date(fifthFailureTime.getTime() + 15 * 60 * 1000);
      expect(state.lockedUntil?.getTime()).toBe(expectedLockExpiry.getTime());
    });

    it("should not lock if 5 failures span more than 15 minutes", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:58:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:57:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:56:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:43:00.000Z"), success: false }, // 17 min ago
      ];

      const state = computeLockoutState(attempts, now);

      expect(state.isLocked).toBe(false);
      expect(state.lockedUntil).toBe(null);
      // Only 4 failures within the 15-minute window
      expect(state.consecutiveFailures).toBe(4);
    });

    it("should reset consecutive failures on successful login", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:58:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:57:00.000Z"), success: true }, // Success breaks chain
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:56:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:55:00.000Z"), success: false },
      ];

      const state = computeLockoutState(attempts, now);

      expect(state.isLocked).toBe(false);
      expect(state.lockedUntil).toBe(null);
      // Only 2 consecutive failures since the successful login
      expect(state.consecutiveFailures).toBe(2);
    });

    it("should unlock account after 15 minutes have passed", () => {
      const fifthFailureTime = new Date("2024-01-15T11:30:00.000Z");
      const lockExpiry = new Date(fifthFailureTime.getTime() + 15 * 60 * 1000); // 11:45
      const nowAfterExpiry = new Date("2024-01-15T11:46:00.000Z"); // 1 minute after expiry
      
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: fifthFailureTime, success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:29:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:28:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:27:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:26:00.000Z"), success: false },
      ];

      const state = computeLockoutState(attempts, nowAfterExpiry);

      expect(state.isLocked).toBe(false);
      expect(state.lockedUntil).toBe(null); // Null because lock has expired
      // At 11:46, the failure window is 11:31-11:46, so failures from 11:26-11:30 are outside the window
      expect(state.consecutiveFailures).toBe(0);
    });

    it("should remain locked during the 15-minute lockout period", () => {
      const fifthFailureTime = new Date("2024-01-15T11:30:00.000Z");
      const nowDuringLockout = new Date("2024-01-15T11:35:00.000Z"); // 5 minutes into lockout
      
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: fifthFailureTime, success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:29:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:28:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:27:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:26:00.000Z"), success: false },
      ];

      const state = computeLockoutState(attempts, nowDuringLockout);

      expect(state.isLocked).toBe(true);
      expect(state.consecutiveFailures).toBe(5);
      
      const expectedLockExpiry = new Date(fifthFailureTime.getTime() + 15 * 60 * 1000);
      expect(state.lockedUntil?.getTime()).toBe(expectedLockExpiry.getTime());
    });

    it("should handle exactly 5 failures at the edge of the 15-minute window", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      const exactlyFifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:58:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:57:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:46:00.000Z"), success: false },
        { email: "test@example.com", timestamp: exactlyFifteenMinutesAgo, success: false }, // Exactly at window edge
      ];

      const state = computeLockoutState(attempts, now);

      expect(state.isLocked).toBe(true);
      expect(state.consecutiveFailures).toBe(5);
    });

    it("should handle more than 5 consecutive failures", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      const mostRecentFailure = new Date("2024-01-15T11:59:00.000Z");
      
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: mostRecentFailure, success: false }, // 7th
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:58:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:57:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:56:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:55:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:54:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:53:00.000Z"), success: false }, // 1st
      ];

      const state = computeLockoutState(attempts, now);

      expect(state.isLocked).toBe(true);
      expect(state.consecutiveFailures).toBe(7);
      expect(state.lockedUntil).not.toBe(null);
    });
  });

  describe("isAccountLocked", () => {
    it("should return false when account is not locked", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:00.000Z"), success: false },
      ];

      expect(isAccountLocked(attempts, now)).toBe(false);
    });

    it("should return true when account is locked", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:58:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:57:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:56:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:55:00.000Z"), success: false },
      ];

      expect(isAccountLocked(attempts, now)).toBe(true);
    });
  });

  describe("validateLoginAttempt", () => {
    it("should allow login when account is not locked", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:00.000Z"), success: false },
      ];

      const result = validateLoginAttempt(attempts, now);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.allowed).toBe(true);
      }
    });

    it("should reject login when account is locked with helpful error message", () => {
      const now = new Date("2024-01-15T12:00:00.000Z");
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:58:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:57:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:56:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:55:00.000Z"), success: false },
      ];

      const result = validateLoginAttempt(attempts, now);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Account is temporarily locked");
        expect(result.error).toContain("multiple failed login attempts");
        expect(result.error).toMatch(/\d+ minute/); // Should contain time remaining
      }
    });

    it("should show correct time remaining in error message", () => {
      const fifthFailureTime = new Date("2024-01-15T11:50:00.000Z");
      const now = new Date("2024-01-15T12:00:00.000Z"); // 10 minutes later
      
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: fifthFailureTime, success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:49:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:48:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:47:00.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:46:00.000Z"), success: false },
      ];

      const result = validateLoginAttempt(attempts, now);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Lock expires at 12:05, now is 12:00, so 5 minutes remaining
        expect(result.error).toContain("5 minutes");
      }
    });

    it("should use singular 'minute' when 1 minute remaining", () => {
      // Set up: 5 failures that triggered lock 14 minutes ago
      // Lock expires 15 minutes after the most recent failure
      const mostRecentFailure = new Date("2024-01-15T12:00:00.000Z");
      const now = new Date("2024-01-15T12:14:05.000Z"); // 14 minutes 5 seconds later
      
      const attempts: LoginAttempt[] = [
        { email: "test@example.com", timestamp: mostRecentFailure, success: false }, // Triggers lock, expires at 12:15
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:50.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:40.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:30.000Z"), success: false },
        { email: "test@example.com", timestamp: new Date("2024-01-15T11:59:20.000Z"), success: false },
      ];

      const result = validateLoginAttempt(attempts, now);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Lock expires at 12:15, now is 12:14:05, so 55 seconds = rounds up to 1 minute
        expect(result.error).toContain("1 minute");
        expect(result.error).not.toContain("1 minutes"); // Singular form
      }
    });
  });

  describe("LOCKOUT_CONFIG", () => {
    it("should have correct lockout constants", () => {
      expect(LOCKOUT_CONFIG.MAX_CONSECUTIVE_FAILURES).toBe(5);
      expect(LOCKOUT_CONFIG.FAILURE_WINDOW_MINUTES).toBe(15);
      expect(LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES).toBe(15);
    });
  });
});
