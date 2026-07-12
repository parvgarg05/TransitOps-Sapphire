/**
 * Account lockout logic for authentication
 * 
 * This module provides pure functions to compute account lockout state
 * based on failed login attempts.
 * 
 * Requirement 1.6: If a User submits an incorrect password for the same
 * registered email 5 consecutive times within a 15-minute window, THEN
 * THE Auth_Service SHALL lock that account for 15 minutes, reject further
 * login attempts during the lock period, and display an error message
 * indicating the account is temporarily locked.
 */

import { Result } from "./types";

/**
 * Represents a single login attempt with timestamp
 */
export interface LoginAttempt {
  email: string;
  timestamp: Date;
  success: boolean;
}

/**
 * Represents the lockout state for an account
 */
export interface LockoutState {
  isLocked: boolean;
  lockedUntil: Date | null;
  consecutiveFailures: number;
}

/**
 * Configuration constants for lockout policy
 */
export const LOCKOUT_CONFIG = {
  MAX_CONSECUTIVE_FAILURES: 5,
  FAILURE_WINDOW_MINUTES: 15,
  LOCKOUT_DURATION_MINUTES: 15,
} as const;

/**
 * Computes the lockout state for an account based on its attempt timeline.
 * 
 * This is a pure function that takes:
 * - A timeline of login attempts (ordered by timestamp, newest first)
 * - The current time
 * 
 * And returns the lockout state:
 * - isLocked: true if account is currently locked
 * - lockedUntil: timestamp when lock expires (null if not locked)
 * - consecutiveFailures: count of recent consecutive failures
 * 
 * Algorithm:
 * 1. Check if account is currently locked (lockedUntil > now)
 * 2. Count consecutive failures within the failure window
 * 3. If >= 5 consecutive failures within 15 minutes, lock for 15 minutes
 * 
 * @param attempts - Array of login attempts, ordered newest first
 * @param now - Current timestamp
 * @returns LockoutState indicating if account is locked
 * 
 * Requirement 1.6: Account lockout for 5 consecutive failures within 15 minutes
 */
export function computeLockoutState(
  attempts: LoginAttempt[],
  now: Date
): LockoutState {
  // If no attempts, account is not locked
  if (attempts.length === 0) {
    return {
      isLocked: false,
      lockedUntil: null,
      consecutiveFailures: 0,
    };
  }

  // Find the most recent attempt to check if it resulted in a lockout
  const mostRecentAttempt = attempts[0];
  
  // Calculate the failure window start time (15 minutes before now)
  const failureWindowStart = new Date(now.getTime() - LOCKOUT_CONFIG.FAILURE_WINDOW_MINUTES * 60 * 1000);
  
  // Count consecutive failures and track all failure timestamps within the window
  let consecutiveFailures = 0;
  const recentFailures: Date[] = [];
  
  for (const attempt of attempts) {
    // Stop if we encounter a successful attempt (breaks the consecutive chain)
    if (attempt.success) {
      break;
    }
    
    // Only count failures within the failure window
    if (attempt.timestamp >= failureWindowStart) {
      consecutiveFailures++;
      recentFailures.push(attempt.timestamp);
    }
  }
  
  // If we have 5+ consecutive failures within the window, compute lock expiry
  if (consecutiveFailures >= LOCKOUT_CONFIG.MAX_CONSECUTIVE_FAILURES) {
    // Lock starts from the most recent (first) failure
    const mostRecentFailure = recentFailures[0];
    const lockedUntil = new Date(
      mostRecentFailure.getTime() + LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
    );
    
    // Account is locked if lockedUntil is in the future
    const isLocked = lockedUntil > now;
    
    return {
      isLocked,
      lockedUntil: isLocked ? lockedUntil : null,
      consecutiveFailures,
    };
  }
  
  // Not enough consecutive failures to trigger lockout
  return {
    isLocked: false,
    lockedUntil: null,
    consecutiveFailures,
  };
}

/**
 * Checks if an account is currently locked based on the attempt timeline.
 * 
 * Convenience wrapper around computeLockoutState that returns a boolean.
 * 
 * @param attempts - Array of login attempts, ordered newest first
 * @param now - Current timestamp
 * @returns true if account is locked, false otherwise
 * 
 * Requirement 1.6
 */
export function isAccountLocked(attempts: LoginAttempt[], now: Date): boolean {
  return computeLockoutState(attempts, now).isLocked;
}

/**
 * Validates a login attempt against the lockout policy.
 * 
 * Returns an error if the account is locked, or success if login may proceed.
 * 
 * @param attempts - Array of login attempts, ordered newest first
 * @param now - Current timestamp
 * @returns Result indicating if login is allowed
 * 
 * Requirement 1.6: Display error message indicating account is temporarily locked
 */
export function validateLoginAttempt(
  attempts: LoginAttempt[],
  now: Date
): Result<{ allowed: true }> {
  const lockoutState = computeLockoutState(attempts, now);
  
  if (lockoutState.isLocked && lockoutState.lockedUntil) {
    const minutesRemaining = Math.ceil(
      (lockoutState.lockedUntil.getTime() - now.getTime()) / (60 * 1000)
    );
    
    return {
      ok: false,
      error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
    };
  }
  
  return { ok: true, value: { allowed: true } };
}
