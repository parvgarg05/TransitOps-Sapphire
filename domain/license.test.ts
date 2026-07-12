/**
 * Unit tests for license derivation functions
 * 
 * Tests isLicenseExpired and isLicenseSoonToExpire functions
 * 
 * Requirements: 4.5, 4.6, 10.12
 */

import { describe, it, expect } from "vitest";
import { isLicenseExpired, isLicenseSoonToExpire } from "./license";

describe("isLicenseExpired", () => {
  const today = new Date("2024-06-15");

  it("should return true when license expiry date is before today", () => {
    const expiredDate = new Date("2024-06-14");
    expect(isLicenseExpired(expiredDate, today)).toBe(true);
  });

  it("should return false when license expiry date is today", () => {
    const sameDay = new Date("2024-06-15");
    expect(isLicenseExpired(sameDay, today)).toBe(false);
  });

  it("should return false when license expiry date is in the future", () => {
    const futureDate = new Date("2024-06-16");
    expect(isLicenseExpired(futureDate, today)).toBe(false);
  });

  it("should return true when license expired many days ago", () => {
    const longExpired = new Date("2024-01-01");
    expect(isLicenseExpired(longExpired, today)).toBe(true);
  });

  it("should handle dates with time components correctly", () => {
    const expiredWithTime = new Date("2024-06-14T23:59:59");
    const todayWithTime = new Date("2024-06-15T00:00:01");
    expect(isLicenseExpired(expiredWithTime, todayWithTime)).toBe(true);
  });
});

describe("isLicenseSoonToExpire", () => {
  const today = new Date("2024-06-15");

  it("should return false when license is already expired", () => {
    const expiredDate = new Date("2024-06-14");
    expect(isLicenseSoonToExpire(expiredDate, today)).toBe(false);
  });

  it("should return true when license expires today", () => {
    const sameDay = new Date("2024-06-15");
    expect(isLicenseSoonToExpire(sameDay, today)).toBe(true);
  });

  it("should return true when license expires in 15 days", () => {
    const in15Days = new Date("2024-06-30");
    expect(isLicenseSoonToExpire(in15Days, today)).toBe(true);
  });

  it("should return true when license expires in exactly 30 days", () => {
    const in30Days = new Date("2024-07-15");
    expect(isLicenseSoonToExpire(in30Days, today)).toBe(true);
  });

  it("should return false when license expires in 31 days", () => {
    const in31Days = new Date("2024-07-16");
    expect(isLicenseSoonToExpire(in31Days, today)).toBe(false);
  });

  it("should return false when license expires in 60 days", () => {
    const in60Days = new Date("2024-08-14");
    expect(isLicenseSoonToExpire(in60Days, today)).toBe(false);
  });

  it("should return true when license expires in 1 day", () => {
    const tomorrow = new Date("2024-06-16");
    expect(isLicenseSoonToExpire(tomorrow, today)).toBe(true);
  });

  it("should handle dates with time components correctly", () => {
    const expiresIn30DaysWithTime = new Date("2024-07-15T23:59:59");
    const todayWithTime = new Date("2024-06-15T00:00:01");
    expect(isLicenseSoonToExpire(expiresIn30DaysWithTime, todayWithTime)).toBe(true);
  });
});

describe("isLicenseExpired and isLicenseSoonToExpire boundary cases", () => {
  const today = new Date("2024-06-15");

  it("should correctly categorize expired license", () => {
    const expiredDate = new Date("2024-06-14");
    expect(isLicenseExpired(expiredDate, today)).toBe(true);
    expect(isLicenseSoonToExpire(expiredDate, today)).toBe(false);
  });

  it("should correctly categorize license expiring today", () => {
    const todayDate = new Date("2024-06-15");
    expect(isLicenseExpired(todayDate, today)).toBe(false);
    expect(isLicenseSoonToExpire(todayDate, today)).toBe(true);
  });

  it("should correctly categorize license in the 30-day window", () => {
    const in15Days = new Date("2024-06-30");
    expect(isLicenseExpired(in15Days, today)).toBe(false);
    expect(isLicenseSoonToExpire(in15Days, today)).toBe(true);
  });

  it("should correctly categorize license exactly at 30-day boundary", () => {
    const in30Days = new Date("2024-07-15");
    expect(isLicenseExpired(in30Days, today)).toBe(false);
    expect(isLicenseSoonToExpire(in30Days, today)).toBe(true);
  });

  it("should correctly categorize license beyond 30-day window", () => {
    const in31Days = new Date("2024-07-16");
    expect(isLicenseExpired(in31Days, today)).toBe(false);
    expect(isLicenseSoonToExpire(in31Days, today)).toBe(false);
  });
});
