/**
 * Property-based tests for license derivation functions
 * 
 * Tests the pure domain logic for license validity determination using fast-check.
 * 
 * Feature: transitops
 * Test properties:
 * - Property 12: License validity is determined by the expiry-date boundary
 * - Property 35: Soon-To-Expire License is exactly the inclusive today..today+30 window
 * 
 * Requirements: 4.5, 4.6, 10.12
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { isLicenseExpired, isLicenseSoonToExpire } from "./license";
import { startOfDay, addDays } from "./types";

/**
 * Arbitrary that generates a valid Date object.
 * Constrains dates to a reasonable range to avoid overflow issues.
 */
const arbitraryDate = (): fc.Arbitrary<Date> => {
  return fc.integer({ min: 0, max: 365 * 100 }).map((daysOffset) => {
    const baseDate = new Date(2000, 0, 1); // Jan 1, 2000
    return addDays(baseDate, daysOffset);
  });
};

/**
 * Arbitrary that generates a tuple of [expiryDate, today] where expiry is before today.
 */
const arbitraryExpiredLicense = (): fc.Arbitrary<[Date, Date]> => {
  return fc
    .tuple(arbitraryDate(), fc.integer({ min: 1, max: 1000 }))
    .map(([today, daysBefore]) => {
      const expiry = addDays(today, -daysBefore);
      return [expiry, today];
    });
};

/**
 * Arbitrary that generates a tuple of [expiryDate, today] where expiry is on or after today.
 */
const arbitraryValidLicense = (): fc.Arbitrary<[Date, Date]> => {
  return fc
    .tuple(arbitraryDate(), fc.integer({ min: 0, max: 1000 }))
    .map(([today, daysAfter]) => {
      const expiry = addDays(today, daysAfter);
      return [expiry, today];
    });
};

/**
 * Arbitrary that generates a tuple of [expiryDate, today] where expiry is exactly N days from today.
 */
const arbitraryLicenseExpiringInNDays = (n: number): fc.Arbitrary<[Date, Date]> => {
  return arbitraryDate().map((today) => {
    const expiry = addDays(today, n);
    return [expiry, today];
  });
};

/**
 * Arbitrary that generates a tuple of [expiryDate, today] where expiry is in the range [0, 30] days.
 */
const arbitrarySoonToExpireLicense = (): fc.Arbitrary<[Date, Date]> => {
  return fc
    .tuple(arbitraryDate(), fc.integer({ min: 0, max: 30 }))
    .map(([today, daysUntilExpiry]) => {
      const expiry = addDays(today, daysUntilExpiry);
      return [expiry, today];
    });
};

/**
 * Arbitrary that generates a tuple of [expiryDate, today] where expiry is beyond 30 days.
 */
const arbitraryNotSoonToExpireLicense = (): fc.Arbitrary<[Date, Date]> => {
  return fc
    .tuple(arbitraryDate(), fc.integer({ min: 31, max: 1000 }))
    .map(([today, daysUntilExpiry]) => {
      const expiry = addDays(today, daysUntilExpiry);
      return [expiry, today];
    });
};

describe("Property-based tests for license derivations", () => {
  describe("Property 12: License validity is determined by the expiry-date boundary", () => {
    it("should always return true for licenses that expired before today", () => {
      fc.assert(
        fc.property(arbitraryExpiredLicense(), ([expiry, today]) => {
          const result = isLicenseExpired(expiry, today);
          
          // License must be expired when expiry < today
          expect(result).toBe(true);
          
          // Verify the expiry is actually before today (normalized)
          const expiryNorm = startOfDay(expiry);
          const todayNorm = startOfDay(today);
          expect(expiryNorm < todayNorm).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should always return false for licenses that expire on or after today", () => {
      fc.assert(
        fc.property(arbitraryValidLicense(), ([expiry, today]) => {
          const result = isLicenseExpired(expiry, today);
          
          // License must NOT be expired when expiry >= today
          expect(result).toBe(false);
          
          // Verify the expiry is actually on or after today (normalized)
          const expiryNorm = startOfDay(expiry);
          const todayNorm = startOfDay(today);
          expect(expiryNorm >= todayNorm).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should be deterministic: same inputs always produce same output", () => {
      fc.assert(
        fc.property(
          arbitraryDate(),
          arbitraryDate(),
          (expiry, today) => {
            const result1 = isLicenseExpired(expiry, today);
            const result2 = isLicenseExpired(expiry, today);
            
            // Determinism: calling twice with same inputs yields same result
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle the boundary case: expiry === today is NOT expired", () => {
      fc.assert(
        fc.property(arbitraryDate(), (today) => {
          const expiry = new Date(today.getTime()); // Same date
          const result = isLicenseExpired(expiry, today);
          
          // License expiring today is NOT expired (Req 4.6: >= today is valid)
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("should ignore time components and only compare dates", () => {
      fc.assert(
        fc.property(
          arbitraryDate(),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 0, max: 59 }),
          (baseDate, hours, minutes, seconds) => {
            const today = new Date(baseDate);
            today.setHours(hours, minutes, seconds, 0);
            
            const expiry = addDays(baseDate, -1);
            expiry.setHours((hours + 12) % 24, (minutes + 30) % 60, (seconds + 30) % 60, 0);
            
            const result = isLicenseExpired(expiry, today);
            
            // Time components should not affect the result
            expect(result).toBe(true); // expiry is 1 day before today
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should satisfy inverse relationship: if not expired, then expiry >= today", () => {
      fc.assert(
        fc.property(
          arbitraryDate(),
          arbitraryDate(),
          (expiry, today) => {
            const isExpired = isLicenseExpired(expiry, today);
            const expiryNorm = startOfDay(expiry);
            const todayNorm = startOfDay(today);
            
            // If NOT expired, then expiry >= today (inverse of expired condition)
            if (!isExpired) {
              expect(expiryNorm >= todayNorm).toBe(true);
            } else {
              expect(expiryNorm < todayNorm).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 35: Soon-To-Expire License is exactly the inclusive today..today+30 window", () => {
    it("should always return true for licenses expiring within [0, 30] days (inclusive)", () => {
      fc.assert(
        fc.property(arbitrarySoonToExpireLicense(), ([expiry, today]) => {
          const result = isLicenseSoonToExpire(expiry, today);
          
          // License must be soon-to-expire when 0 <= days <= 30
          expect(result).toBe(true);
          
          // Verify expiry is in the window [today, today+30]
          const expiryNorm = startOfDay(expiry);
          const todayNorm = startOfDay(today);
          const thirtyDaysFromToday = addDays(todayNorm, 30);
          
          expect(expiryNorm >= todayNorm).toBe(true);
          expect(expiryNorm <= thirtyDaysFromToday).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should always return false for licenses expiring beyond 30 days", () => {
      fc.assert(
        fc.property(arbitraryNotSoonToExpireLicense(), ([expiry, today]) => {
          const result = isLicenseSoonToExpire(expiry, today);
          
          // License must NOT be soon-to-expire when days > 30
          expect(result).toBe(false);
          
          // Verify expiry is beyond the window
          const expiryNorm = startOfDay(expiry);
          const todayNorm = startOfDay(today);
          const thirtyDaysFromToday = addDays(todayNorm, 30);
          
          expect(expiryNorm > thirtyDaysFromToday).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should always return false for expired licenses (before today)", () => {
      fc.assert(
        fc.property(arbitraryExpiredLicense(), ([expiry, today]) => {
          const result = isLicenseSoonToExpire(expiry, today);
          
          // Expired licenses are NOT soon-to-expire (they're already expired)
          expect(result).toBe(false);
          
          // Verify expiry is before today
          const expiryNorm = startOfDay(expiry);
          const todayNorm = startOfDay(today);
          expect(expiryNorm < todayNorm).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should be deterministic: same inputs always produce same output", () => {
      fc.assert(
        fc.property(
          arbitraryDate(),
          arbitraryDate(),
          (expiry, today) => {
            const result1 = isLicenseSoonToExpire(expiry, today);
            const result2 = isLicenseSoonToExpire(expiry, today);
            
            // Determinism: calling twice with same inputs yields same result
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle the boundary case: expiry === today is soon-to-expire", () => {
      fc.assert(
        fc.property(arbitraryDate(), (today) => {
          const expiry = new Date(today.getTime()); // Same date
          const result = isLicenseSoonToExpire(expiry, today);
          
          // License expiring today IS soon-to-expire (day 0 of the window)
          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should handle the boundary case: expiry === today+30 is soon-to-expire", () => {
      fc.assert(
        fc.property(arbitraryLicenseExpiringInNDays(30), ([expiry, today]) => {
          const result = isLicenseSoonToExpire(expiry, today);
          
          // License expiring in exactly 30 days IS soon-to-expire (inclusive bound)
          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should handle the boundary case: expiry === today+31 is NOT soon-to-expire", () => {
      fc.assert(
        fc.property(arbitraryLicenseExpiringInNDays(31), ([expiry, today]) => {
          const result = isLicenseSoonToExpire(expiry, today);
          
          // License expiring in 31 days is NOT soon-to-expire (beyond window)
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("should ensure mutually exclusive states: expired OR soon-to-expire OR distant", () => {
      fc.assert(
        fc.property(
          arbitraryDate(),
          arbitraryDate(),
          (expiry, today) => {
            const isExpired = isLicenseExpired(expiry, today);
            const isSoonToExpire = isLicenseSoonToExpire(expiry, today);
            
            const expiryNorm = startOfDay(expiry);
            const todayNorm = startOfDay(today);
            const thirtyDaysFromToday = addDays(todayNorm, 30);
            
            // Categorize the license state
            if (expiryNorm < todayNorm) {
              // Expired: should be expired, not soon-to-expire
              expect(isExpired).toBe(true);
              expect(isSoonToExpire).toBe(false);
            } else if (expiryNorm >= todayNorm && expiryNorm <= thirtyDaysFromToday) {
              // In window: should be soon-to-expire, not expired
              expect(isExpired).toBe(false);
              expect(isSoonToExpire).toBe(true);
            } else {
              // Beyond window: neither expired nor soon-to-expire
              expect(isExpired).toBe(false);
              expect(isSoonToExpire).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should ignore time components and only compare dates", () => {
      fc.assert(
        fc.property(
          arbitraryDate(),
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          (baseDate, daysOffset, hours, minutes) => {
            const today = new Date(baseDate);
            today.setHours(hours, minutes, 0, 0);
            
            const expiry = addDays(baseDate, daysOffset);
            expiry.setHours((hours + 12) % 24, (minutes + 30) % 60, 0, 0);
            
            const result = isLicenseSoonToExpire(expiry, today);
            
            // Time components should not affect the result
            // Should be soon-to-expire since daysOffset is in [0, 30]
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Combined properties: license state transitions", () => {
    it("should maintain consistency: a license transitions from future → soon-to-expire → expired as time advances", () => {
      fc.assert(
        fc.property(
          arbitraryDate(),
          fc.integer({ min: 50, max: 100 }),
          (baseToday, initialDaysAhead) => {
            const expiry = addDays(baseToday, initialDaysAhead);
            
            // Initially: distant future (not soon-to-expire, not expired)
            let today = baseToday;
            expect(isLicenseExpired(expiry, today)).toBe(false);
            expect(isLicenseSoonToExpire(expiry, today)).toBe(false);
            
            // Advance to 30 days before expiry: should be soon-to-expire
            today = addDays(expiry, -30);
            expect(isLicenseExpired(expiry, today)).toBe(false);
            expect(isLicenseSoonToExpire(expiry, today)).toBe(true);
            
            // Advance to expiry day: should be soon-to-expire (not expired)
            today = new Date(expiry.getTime());
            expect(isLicenseExpired(expiry, today)).toBe(false);
            expect(isLicenseSoonToExpire(expiry, today)).toBe(true);
            
            // Advance to 1 day after expiry: should be expired (not soon-to-expire)
            today = addDays(expiry, 1);
            expect(isLicenseExpired(expiry, today)).toBe(true);
            expect(isLicenseSoonToExpire(expiry, today)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should ensure the 30-day window is exactly 31 days long (day 0 to day 30 inclusive)", () => {
      fc.assert(
        fc.property(arbitraryDate(), (today) => {
          // Test each day in the expected window
          for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
            const expiry = addDays(today, dayOffset);
            expect(isLicenseSoonToExpire(expiry, today)).toBe(true);
          }
          
          // Test just before the window (already expired)
          const beforeWindow = addDays(today, -1);
          expect(isLicenseSoonToExpire(beforeWindow, today)).toBe(false);
          
          // Test just after the window
          const afterWindow = addDays(today, 31);
          expect(isLicenseSoonToExpire(afterWindow, today)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Correctness of license mappings", () => {
    it("should correctly map CDL category licenses", () => {
      fc.assert(
        fc.property(
          arbitraryDate(),
          fc.constantFrom("CDL-A", "CDL-B", "CDL-C", "CDL"),
          fc.integer({ min: -100, max: 100 }),
          (today, cdlCategory, daysOffset) => {
            const expiry = addDays(today, daysOffset);
            
            // CDL licenses should follow the same expiry logic as any other license
            const isExpired = isLicenseExpired(expiry, today);
            const isSoonToExpire = isLicenseSoonToExpire(expiry, today);
            
            const expiryNorm = startOfDay(expiry);
            const todayNorm = startOfDay(today);
            
            if (expiryNorm < todayNorm) {
              expect(isExpired).toBe(true);
              expect(isSoonToExpire).toBe(false);
            } else if (daysOffset >= 0 && daysOffset <= 30) {
              expect(isExpired).toBe(false);
              expect(isSoonToExpire).toBe(true);
            }
            
            // License category doesn't affect expiry logic (pure date comparison)
            expect(typeof isExpired).toBe("boolean");
            expect(typeof isSoonToExpire).toBe("boolean");
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
