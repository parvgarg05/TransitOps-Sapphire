/**
 * Unit tests for account lockout logic
 * Feature: transitops
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
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

  // Property-Based Tests
  describe("Property-Based Tests", () => {
    /**
     * Feature: transitops, Property 3: Account lockout triggers on 5 consecutive failures within 15 minutes
     * 
     * **Validates: Requirements 1.6**
     * 
     * This property test verifies that:
     * 1. Account lockout is triggered exactly when there are 5+ consecutive failures within a 15-minute window
     * 2. Lockout threshold accuracy: lockout happens at exactly 5 failures, not before or after
     * 3. Timer behavior: lockout expires exactly 15 minutes after the most recent failure
     * 4. Unlock conditions: account unlocks when lockout period expires or success breaks the failure chain
     */
    describe("Property 3: Account lockout threshold accuracy, timer behavior, unlock conditions", () => {
      // Test lockout threshold: exactly 5 failures triggers lock
      it("should lock account if and only if there are >= 5 consecutive failures within 15 minutes", () => {
        fc.assert(
          fc.property(
            // Generate a number of consecutive failures (0-10)
            fc.integer({ min: 0, max: 10 }),
            // Generate a base timestamp
            fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
            (numFailures, baseTime) => {
              const now = new Date(baseTime.getTime() + 20 * 60 * 1000); // 20 minutes after base
              
              // Create consecutive failures all within the last 14 minutes (well within 15-minute window)
              const attempts: LoginAttempt[] = [];
              for (let i = 0; i < numFailures; i++) {
                attempts.push({
                  email: "test@example.com",
                  timestamp: new Date(now.getTime() - (i + 1) * 60 * 1000), // Each 1 minute apart
                  success: false,
                });
              }
              
              const state = computeLockoutState(attempts, now);
              
              // Property: Account should be locked if and only if numFailures >= 5
              if (numFailures >= LOCKOUT_CONFIG.MAX_CONSECUTIVE_FAILURES) {
                expect(state.isLocked).toBe(true);
                expect(state.lockedUntil).not.toBe(null);
                expect(state.consecutiveFailures).toBe(numFailures);
              } else {
                expect(state.isLocked).toBe(false);
                expect(state.lockedUntil).toBe(null);
                expect(state.consecutiveFailures).toBe(numFailures);
              }
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      // Test timer behavior: lockout expires exactly 15 minutes after most recent failure
      it("should expire lockout exactly 15 minutes after the most recent failure", () => {
        fc.assert(
          fc.property(
            fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
            fc.integer({ min: 0, max: 20 }), // Additional minutes offset (0-20)
            (failureTime, additionalMinutes) => {
              // Create 5 failures to trigger lockout, all within a short time window
              const attempts: LoginAttempt[] = [];
              const mostRecentFailure = failureTime;
              
              // All failures within 1 minute of each other (well within 15-minute window)
              for (let i = 0; i < 5; i++) {
                attempts.push({
                  email: "test@example.com",
                  timestamp: new Date(mostRecentFailure.getTime() - i * 10 * 1000), // 10 seconds apart
                  success: false,
                });
              }
              
              // Test at a specific point in time based on additionalMinutes
              const nowAfterFailure = new Date(
                mostRecentFailure.getTime() + additionalMinutes * 60 * 1000
              );
              
              const state = computeLockoutState(attempts, nowAfterFailure);
              
              // Property: Account is locked before 15 minutes, unlocked at or after 15 minutes
              // Note: The implementation uses lockedUntil > now, so at exactly lockedUntil, it's unlocked
              const lockExpiryTime = new Date(
                mostRecentFailure.getTime() + LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
              );
              
              if (nowAfterFailure.getTime() < lockExpiryTime.getTime()) {
                // Before expiry: should be locked
                expect(state.isLocked).toBe(true);
                expect(state.lockedUntil).not.toBe(null);
              } else {
                // At or after expiry: should be unlocked
                expect(state.isLocked).toBe(false);
                expect(state.lockedUntil).toBe(null);
              }
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      // Test failure window: failures outside the 15-minute window don't count
      it("should only count failures within the 15-minute failure window", () => {
        fc.assert(
          fc.property(
            fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
            fc.integer({ min: 1, max: 10 }), // Failures within window (1-10)
            fc.integer({ min: 0, max: 10 }), // Failures outside window (0-10)
            (baseTime, failuresInWindow, failuresOutsideWindow) => {
              const now = baseTime;
              const failureWindowStart = new Date(
                now.getTime() - LOCKOUT_CONFIG.FAILURE_WINDOW_MINUTES * 60 * 1000
              );
              
              const attempts: LoginAttempt[] = [];
              
              // Add failures within the window (recent)
              for (let i = 0; i < failuresInWindow; i++) {
                attempts.push({
                  email: "test@example.com",
                  timestamp: new Date(now.getTime() - i * 60 * 1000), // Within last 15 minutes
                  success: false,
                });
              }
              
              // Add failures outside the window (old)
              for (let i = 0; i < failuresOutsideWindow; i++) {
                attempts.push({
                  email: "test@example.com",
                  timestamp: new Date(
                    failureWindowStart.getTime() - (i + 1) * 60 * 1000
                  ), // More than 15 minutes ago
                  success: false,
                });
              }
              
              const state = computeLockoutState(attempts, now);
              
              // Property: Only failures within the window should count
              expect(state.consecutiveFailures).toBe(failuresInWindow);
              
              // Lock should only trigger if in-window failures >= 5
              if (failuresInWindow >= LOCKOUT_CONFIG.MAX_CONSECUTIVE_FAILURES) {
                expect(state.isLocked).toBe(true);
              } else {
                expect(state.isLocked).toBe(false);
              }
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      // Test unlock condition: successful login breaks the consecutive failure chain
      it("should reset consecutive failures when a successful login occurs", () => {
        fc.assert(
          fc.property(
            fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
            fc.integer({ min: 0, max: 10 }), // Failures before success
            fc.integer({ min: 0, max: 10 }), // Failures after success
            (baseTime, failuresBeforeSuccess, failuresAfterSuccess) => {
              // Skip if baseTime is invalid
              if (isNaN(baseTime.getTime())) {
                return true;
              }
              
              const now = baseTime;
              const attempts: LoginAttempt[] = [];
              
              // Add recent failures (after the success)
              for (let i = 0; i < failuresAfterSuccess; i++) {
                attempts.push({
                  email: "test@example.com",
                  timestamp: new Date(now.getTime() - i * 30 * 1000), // 30 seconds apart
                  success: false,
                });
              }
              
              // Add a successful login
              attempts.push({
                email: "test@example.com",
                timestamp: new Date(now.getTime() - failuresAfterSuccess * 30 * 1000 - 60 * 1000),
                success: true,
              });
              
              // Add older failures (before the success)
              for (let i = 0; i < failuresBeforeSuccess; i++) {
                attempts.push({
                  email: "test@example.com",
                  timestamp: new Date(
                    now.getTime() - failuresAfterSuccess * 30 * 1000 - (i + 2) * 60 * 1000
                  ),
                  success: false,
                });
              }
              
              const state = computeLockoutState(attempts, now);
              
              // Property: Only failures after the most recent success should count
              expect(state.consecutiveFailures).toBe(failuresAfterSuccess);
              
              // Lock should only trigger based on failures after success
              if (failuresAfterSuccess >= LOCKOUT_CONFIG.MAX_CONSECUTIVE_FAILURES) {
                expect(state.isLocked).toBe(true);
              } else {
                expect(state.isLocked).toBe(false);
              }
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      // Test lockout duration consistency
      it("should maintain consistent lockout duration from the most recent failure", () => {
        fc.assert(
          fc.property(
            fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
            fc.integer({ min: 5, max: 20 }), // Number of failures (always >= 5 to trigger lock)
            (baseTime, numFailures) => {
              const now = new Date(baseTime.getTime() + 20 * 60 * 1000);
              
              // Create failures
              const attempts: LoginAttempt[] = [];
              const mostRecentFailure = new Date(now.getTime() - 1 * 60 * 1000); // 1 minute ago
              
              for (let i = 0; i < numFailures; i++) {
                attempts.push({
                  email: "test@example.com",
                  timestamp: new Date(mostRecentFailure.getTime() - i * 30 * 1000), // 30 seconds apart
                  success: false,
                });
              }
              
              const state = computeLockoutState(attempts, now);
              
              // Property: Lock expiry should always be 15 minutes from most recent failure
              if (state.isLocked && state.lockedUntil) {
                const expectedExpiry = new Date(
                  mostRecentFailure.getTime() + LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
                );
                expect(state.lockedUntil.getTime()).toBe(expectedExpiry.getTime());
              }
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      // Test edge case: exactly at boundaries
      it("should handle boundary conditions correctly", () => {
        fc.assert(
          fc.property(
            fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
            (baseTime) => {
              // Skip if baseTime is invalid
              if (isNaN(baseTime.getTime())) {
                return true;
              }
              
              const now = baseTime;
              
              // Test 1: Exactly 5 failures should trigger lock
              const attempts5: LoginAttempt[] = Array.from({ length: 5 }, (_, i) => ({
                email: "test@example.com",
                timestamp: new Date(now.getTime() - i * 60 * 1000),
                success: false,
              }));
              
              const state5 = computeLockoutState(attempts5, now);
              expect(state5.isLocked).toBe(true);
              expect(state5.consecutiveFailures).toBe(5);
              
              // Test 2: Exactly 4 failures should NOT trigger lock
              const attempts4: LoginAttempt[] = Array.from({ length: 4 }, (_, i) => ({
                email: "test@example.com",
                timestamp: new Date(now.getTime() - i * 60 * 1000),
                success: false,
              }));
              
              const state4 = computeLockoutState(attempts4, now);
              expect(state4.isLocked).toBe(false);
              expect(state4.consecutiveFailures).toBe(4);
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
