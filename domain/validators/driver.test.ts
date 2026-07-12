/**
 * Tests for Driver field validators
 * 
 * These tests verify that the driver validation functions correctly:
 * - Accept valid driver input and set initial status to Available
 * - Reject invalid input with field-specific error messages
 * 
 * Requirements: 4.1, 4.7
 */

import { describe, it, expect } from "vitest";
import {
  validateDriverCreation,
  validateDriverUpdate,
  type CreateDriverInput,
  type UpdateDriverInput,
} from "./driver";

describe("validateDriverCreation", () => {
  const validInput: CreateDriverInput = {
    name: "John Doe",
    licenseNumber: "DL12345",
    licenseCategory: "B",
    licenseExpiryDate: new Date("2025-12-31"),
    contactNumber: "+1234567890",
    safetyScore: 85,
  };

  it("should accept valid driver input and set status to Available", () => {
    const result = validateDriverCreation(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("John Doe");
      expect(result.value.licenseNumber).toBe("DL12345");
      expect(result.value.licenseCategory).toBe("B");
      expect(result.value.licenseExpiryDate).toEqual(new Date("2025-12-31"));
      expect(result.value.contactNumber).toBe("+1234567890");
      expect(result.value.safetyScore).toBe(85);
      expect(result.value.status).toBe("Available");
    }
  });

  it("should reject empty name", () => {
    const result = validateDriverCreation({ ...validInput, name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Driver name is required");
    }
  });

  it("should reject whitespace-only name", () => {
    const result = validateDriverCreation({ ...validInput, name: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Driver name is required");
    }
  });

  it("should reject empty license number", () => {
    const result = validateDriverCreation({ ...validInput, licenseNumber: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("License number is required");
    }
  });

  it("should reject whitespace-only license number", () => {
    const result = validateDriverCreation({ ...validInput, licenseNumber: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("License number is required");
    }
  });

  it("should reject empty license category", () => {
    const result = validateDriverCreation({ ...validInput, licenseCategory: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("License category is required");
    }
  });

  it("should reject whitespace-only license category", () => {
    const result = validateDriverCreation({ ...validInput, licenseCategory: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("License category is required");
    }
  });

  it("should reject invalid date", () => {
    const result = validateDriverCreation({
      ...validInput,
      licenseExpiryDate: new Date("invalid"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("License expiry date must be a valid date");
    }
  });

  it("should reject empty contact number", () => {
    const result = validateDriverCreation({ ...validInput, contactNumber: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Contact number is required");
    }
  });

  it("should reject whitespace-only contact number", () => {
    const result = validateDriverCreation({ ...validInput, contactNumber: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Contact number is required");
    }
  });

  it("should reject safety score less than 0", () => {
    const result = validateDriverCreation({ ...validInput, safetyScore: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Safety score must be greater than or equal to 0");
    }
  });

  it("should reject safety score greater than 100", () => {
    const result = validateDriverCreation({ ...validInput, safetyScore: 101 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Safety score must not exceed 100");
    }
  });

  it("should accept safety score of 0", () => {
    const result = validateDriverCreation({ ...validInput, safetyScore: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.safetyScore).toBe(0);
    }
  });

  it("should accept safety score of 100", () => {
    const result = validateDriverCreation({ ...validInput, safetyScore: 100 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.safetyScore).toBe(100);
    }
  });

  it("should trim whitespace from string fields", () => {
    const result = validateDriverCreation({
      ...validInput,
      name: "  John Doe  ",
      licenseNumber: "  DL12345  ",
      licenseCategory: "  B  ",
      contactNumber: "  +1234567890  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("John Doe");
      expect(result.value.licenseNumber).toBe("DL12345");
      expect(result.value.licenseCategory).toBe("B");
      expect(result.value.contactNumber).toBe("+1234567890");
    }
  });
});

describe("validateDriverUpdate", () => {
  it("should accept empty update", () => {
    const result = validateDriverUpdate({});
    expect(result.ok).toBe(true);
  });

  it("should accept valid partial update", () => {
    const update: UpdateDriverInput = {
      name: "Jane Doe",
      safetyScore: 90,
    };
    const result = validateDriverUpdate(update);
    expect(result.ok).toBe(true);
  });

  it("should reject invalid name in update", () => {
    const result = validateDriverUpdate({ name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Driver name is required");
    }
  });

  it("should reject invalid license number in update", () => {
    const result = validateDriverUpdate({ licenseNumber: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("License number is required");
    }
  });

  it("should reject invalid license category in update", () => {
    const result = validateDriverUpdate({ licenseCategory: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("License category is required");
    }
  });

  it("should reject invalid date in update", () => {
    const result = validateDriverUpdate({
      licenseExpiryDate: new Date("invalid"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("License expiry date must be a valid date");
    }
  });

  it("should reject invalid contact number in update", () => {
    const result = validateDriverUpdate({ contactNumber: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Contact number is required");
    }
  });

  it("should reject safety score less than 0 in update", () => {
    const result = validateDriverUpdate({ safetyScore: -5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Safety score must be greater than or equal to 0");
    }
  });

  it("should reject safety score greater than 100 in update", () => {
    const result = validateDriverUpdate({ safetyScore: 105 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Safety score must not exceed 100");
    }
  });

  it("should accept valid safety score boundaries in update", () => {
    const result0 = validateDriverUpdate({ safetyScore: 0 });
    expect(result0.ok).toBe(true);

    const result100 = validateDriverUpdate({ safetyScore: 100 });
    expect(result100.ok).toBe(true);
  });
});
