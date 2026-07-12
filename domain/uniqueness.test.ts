/**
 * Unit tests for Uniqueness Check Helper
 * 
 * Tests the pure uniqueness check functions for registration numbers
 * and license numbers.
 * 
 * Requirements: 3.2, 4.8
 */

import { describe, it, expect } from "vitest";
import {
  checkRegistrationNumberUniqueness,
  checkLicenseNumberUniqueness,
  checkUniqueness,
  DUPLICATE_REGISTRATION_ERROR,
  DUPLICATE_LICENSE_ERROR,
} from "./uniqueness";

describe("checkRegistrationNumberUniqueness", () => {
  it("should return ok: true when registration number is unique", () => {
    const existing = new Set(["ABC123", "DEF456", "GHI789"]);
    const result = checkRegistrationNumberUniqueness("XYZ999", existing);
    
    expect(result.ok).toBe(true);
  });

  it("should return ok: false when registration number already exists", () => {
    const existing = new Set(["ABC123", "DEF456", "GHI789"]);
    const result = checkRegistrationNumberUniqueness("ABC123", existing);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(DUPLICATE_REGISTRATION_ERROR);
    }
  });

  it("should handle empty existing set", () => {
    const existing = new Set<string>();
    const result = checkRegistrationNumberUniqueness("ABC123", existing);
    
    expect(result.ok).toBe(true);
  });

  it("should be case-sensitive", () => {
    const existing = new Set(["ABC123"]);
    const result = checkRegistrationNumberUniqueness("abc123", existing);
    
    expect(result.ok).toBe(true);
  });
});

describe("checkLicenseNumberUniqueness", () => {
  it("should return ok: true when license number is unique", () => {
    const existing = new Set(["LIC001", "LIC002", "LIC003"]);
    const result = checkLicenseNumberUniqueness("LIC999", existing);
    
    expect(result.ok).toBe(true);
  });

  it("should return ok: false when license number already exists", () => {
    const existing = new Set(["LIC001", "LIC002", "LIC003"]);
    const result = checkLicenseNumberUniqueness("LIC002", existing);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(DUPLICATE_LICENSE_ERROR);
    }
  });

  it("should handle empty existing set", () => {
    const existing = new Set<string>();
    const result = checkLicenseNumberUniqueness("LIC001", existing);
    
    expect(result.ok).toBe(true);
  });

  it("should be case-sensitive", () => {
    const existing = new Set(["LIC001"]);
    const result = checkLicenseNumberUniqueness("lic001", existing);
    
    expect(result.ok).toBe(true);
  });
});

describe("checkUniqueness (generic)", () => {
  it("should return ok: true when identifier is unique", () => {
    const existing = new Set(["ID1", "ID2", "ID3"]);
    const result = checkUniqueness("ID4", existing, "Custom error");
    
    expect(result.ok).toBe(true);
  });

  it("should return ok: false with custom error when identifier exists", () => {
    const existing = new Set(["ID1", "ID2", "ID3"]);
    const customError = "This identifier is already in use";
    const result = checkUniqueness("ID2", existing, customError);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(customError);
    }
  });

  it("should work with any string identifiers", () => {
    const existing = new Set(["email@example.com", "another@test.com"]);
    const result = checkUniqueness("new@example.com", existing, "Email already exists");
    
    expect(result.ok).toBe(true);
  });
});
