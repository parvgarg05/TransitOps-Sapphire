/**
 * Session domain logic (pure functions)
 * 
 * Requirement 1.7: Session idle timeout
 * WHEN an authenticated User's session has been inactive for 30 continuous minutes,
 * THE Auth_Service SHALL terminate that session and require re-authentication on the next request.
 */

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Determines if a session has expired due to inactivity.
 * 
 * A session is expired if the elapsed time since the last activity
 * is greater than 30 minutes.
 * 
 * @param lastActivityAt - The timestamp of the last session activity
 * @param now - The current timestamp
 * @returns true if the session is expired (elapsed > 30 minutes), false otherwise
 * 
 * @example
 * const lastActivity = new Date('2024-01-01T12:00:00Z');
 * const now = new Date('2024-01-01T12:31:00Z');
 * isSessionExpired(lastActivity, now); // true (31 minutes elapsed)
 * 
 * @example
 * const lastActivity = new Date('2024-01-01T12:00:00Z');
 * const now = new Date('2024-01-01T12:29:00Z');
 * isSessionExpired(lastActivity, now); // false (29 minutes elapsed)
 */
export function isSessionExpired(lastActivityAt: Date, now: Date): boolean {
  const elapsedMs = now.getTime() - lastActivityAt.getTime();
  return elapsedMs > IDLE_TIMEOUT_MS;
}
