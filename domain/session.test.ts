/**
 * Tests for session domain logic
 * 
 * **Validates: Requirements 1.7**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isSessionExpired } from './session';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

describe('isSessionExpired (unit tests)', () => {
  it('returns false when session is active (less than 30 minutes)', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T12:29:59Z'); // 29 minutes 59 seconds
    
    expect(isSessionExpired(lastActivity, now)).toBe(false);
  });

  it('returns false when session is exactly at 30 minutes', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T12:30:00Z'); // exactly 30 minutes
    
    expect(isSessionExpired(lastActivity, now)).toBe(false);
  });

  it('returns true when session exceeds 30 minutes', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T12:30:01Z'); // 30 minutes 1 second
    
    expect(isSessionExpired(lastActivity, now)).toBe(true);
  });

  it('returns true when session is significantly expired', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T13:00:00Z'); // 1 hour
    
    expect(isSessionExpired(lastActivity, now)).toBe(true);
  });

  it('handles edge case with zero elapsed time', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T12:00:00Z'); // same time
    
    expect(isSessionExpired(lastActivity, now)).toBe(false);
  });

  it('handles dates with milliseconds precision', () => {
    const lastActivity = new Date('2024-01-01T12:00:00.000Z');
    const now = new Date('2024-01-01T12:30:00.001Z'); // 30 minutes and 1 millisecond
    
    expect(isSessionExpired(lastActivity, now)).toBe(true);
  });
});

describe('isSessionExpired (property-based tests)', () => {
  // Feature: transitops, Property 4: Idle sessions expire after 30 minutes
  it('Property 4: session is not expired when elapsed time is <= 30 minutes', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.integer({ min: 0, max: THIRTY_MINUTES_MS }),
        (lastActivityAt, elapsedMs) => {
          const now = new Date(lastActivityAt.getTime() + elapsedMs);
          return !isSessionExpired(lastActivityAt, now);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 4: Idle sessions expire after 30 minutes
  it('Property 4: session is expired when elapsed time is > 30 minutes', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.integer({ min: THIRTY_MINUTES_MS + 1, max: THIRTY_MINUTES_MS * 10 }),
        (lastActivityAt, elapsedMs) => {
          const now = new Date(lastActivityAt.getTime() + elapsedMs);
          return isSessionExpired(lastActivityAt, now);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 4: Idle sessions expire after 30 minutes
  it('Property 4: expiry is deterministic for the same time pair', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.integer({ min: 0, max: THIRTY_MINUTES_MS * 5 }),
        (lastActivityAt, elapsedMs) => {
          const now = new Date(lastActivityAt.getTime() + elapsedMs);
          const result1 = isSessionExpired(lastActivityAt, now);
          const result2 = isSessionExpired(lastActivityAt, now);
          return result1 === result2;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 4: Idle sessions expire after 30 minutes
  it('Property 4: expiry threshold is exactly at 30 minutes (boundary test)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        (lastActivityAt) => {
          const exactlyThirtyMinutes = new Date(lastActivityAt.getTime() + THIRTY_MINUTES_MS);
          const justBeforeThirtyMinutes = new Date(lastActivityAt.getTime() + THIRTY_MINUTES_MS - 1);
          const justAfterThirtyMinutes = new Date(lastActivityAt.getTime() + THIRTY_MINUTES_MS + 1);
          
          return (
            !isSessionExpired(lastActivityAt, exactlyThirtyMinutes) &&
            !isSessionExpired(lastActivityAt, justBeforeThirtyMinutes) &&
            isSessionExpired(lastActivityAt, justAfterThirtyMinutes)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 4: Idle sessions expire after 30 minutes
  it('Property 4: expiry is monotonic (once expired, stays expired for future times)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.integer({ min: THIRTY_MINUTES_MS + 1, max: THIRTY_MINUTES_MS * 3 }),
        fc.integer({ min: 1, max: THIRTY_MINUTES_MS * 2 }),
        (lastActivityAt, firstElapsedMs, additionalMs) => {
          const firstCheckTime = new Date(lastActivityAt.getTime() + firstElapsedMs);
          const laterCheckTime = new Date(firstCheckTime.getTime() + additionalMs);
          
          // If expired at firstCheckTime, must be expired at laterCheckTime
          const firstCheck = isSessionExpired(lastActivityAt, firstCheckTime);
          const laterCheck = isSessionExpired(lastActivityAt, laterCheckTime);
          
          return !firstCheck || laterCheck;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 4: Idle sessions expire after 30 minutes
  it('Property 4: session validity is independent of absolute time, only elapsed matters', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.integer({ min: 0, max: THIRTY_MINUTES_MS * 5 }),
        fc.integer({ min: -365 * 24 * 60 * 60 * 1000, max: 365 * 24 * 60 * 60 * 1000 }),
        (baseDate, elapsedMs, timeShiftMs) => {
          // Shift both dates by the same amount
          const lastActivity1 = baseDate;
          const now1 = new Date(baseDate.getTime() + elapsedMs);
          
          const lastActivity2 = new Date(baseDate.getTime() + timeShiftMs);
          const now2 = new Date(baseDate.getTime() + timeShiftMs + elapsedMs);
          
          // Should have same expiry status
          return isSessionExpired(lastActivity1, now1) === isSessionExpired(lastActivity2, now2);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 4: Idle sessions expire after 30 minutes
  it('Property 4: handles millisecond precision correctly', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.integer({ min: 0, max: 999 }),
        (lastActivityAt, milliseconds) => {
          // Test millisecond precision at the 30-minute boundary
          const baseTime = lastActivityAt.getTime();
          const exactBoundary = new Date(baseTime + THIRTY_MINUTES_MS + milliseconds);
          
          if (milliseconds === 0) {
            // Exactly at boundary should not be expired
            return !isSessionExpired(lastActivityAt, exactBoundary);
          } else {
            // Any millisecond over should be expired
            return isSessionExpired(lastActivityAt, exactBoundary);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
