/**
 * License derivation functions for TransitOps
 * 
 * This module defines pure functions for determining license validity states:
 * - isLicenseExpired: checks if a license expiry date is before today
 * - isLicenseSoonToExpire: checks if a license expires within the next 30 days (inclusive)
 * 
 * Requirements: 4.5, 4.6, 10.12
 */

import { startOfDay, addDays } from "./types";

/**
 * Determines if a driver's license has expired.
 * 
 * A license is expired if its expiry date is earlier than the current date.
 * 
 * **Validates: Requirements 4.5, 4.6**
 * 
 * @param licenseExpiryDate - The driver's license expiry date
 * @param today - The current date to compare against
 * @returns true if the license is expired (expiry < today), false otherwise
 * 
 * @example
 * const today = new Date('2024-06-15');
 * const expiredDate = new Date('2024-06-14');
 * const validDate = new Date('2024-06-15');
 * 
 * isLicenseExpired(expiredDate, today); // true
 * isLicenseExpired(validDate, today);   // false
 */
export function isLicenseExpired(licenseExpiryDate: Date, today: Date): boolean {
  // Normalize both dates to start of day for consistent comparison
  const expiryStart = startOfDay(licenseExpiryDate);
  const todayStart = startOfDay(today);
  
  // License is expired if expiry date is before today (Req 4.5)
  return expiryStart < todayStart;
}

/**
 * Determines if a driver's license will expire soon.
 * 
 * A license is soon-to-expire if:
 * - Its expiry date is on or after the current date (not yet expired), AND
 * - Its expiry date is no more than 30 days after the current date (inclusive)
 * 
 * **Validates: Requirement 10.12**
 * 
 * @param licenseExpiryDate - The driver's license expiry date
 * @param today - The current date to compare against
 * @returns true if the license expires within 30 days (inclusive), false otherwise
 * 
 * @example
 * const today = new Date('2024-06-15');
 * const expiredDate = new Date('2024-06-14');      // expired, not soon-to-expire
 * const sameDay = new Date('2024-06-15');          // today, soon-to-expire
 * const in30Days = new Date('2024-07-15');         // exactly 30 days, soon-to-expire
 * const in31Days = new Date('2024-07-16');         // 31 days, not soon-to-expire
 * const in15Days = new Date('2024-06-30');         // 15 days, soon-to-expire
 * 
 * isLicenseSoonToExpire(expiredDate, today); // false (already expired)
 * isLicenseSoonToExpire(sameDay, today);     // true (expires today)
 * isLicenseSoonToExpire(in30Days, today);    // true (30 days)
 * isLicenseSoonToExpire(in31Days, today);    // false (31 days)
 * isLicenseSoonToExpire(in15Days, today);    // true (15 days)
 */
export function isLicenseSoonToExpire(licenseExpiryDate: Date, today: Date): boolean {
  // Normalize dates to start of day for consistent comparison
  const expiryStart = startOfDay(licenseExpiryDate);
  const todayStart = startOfDay(today);
  
  // Calculate the date 30 days from today
  const thirtyDaysFromToday = addDays(todayStart, 30);
  
  // License is soon-to-expire if:
  // 1. Expiry date >= today (not yet expired), AND
  // 2. Expiry date <= today + 30 days (within the 30-day window)
  return expiryStart >= todayStart && expiryStart <= thirtyDaysFromToday;
}
