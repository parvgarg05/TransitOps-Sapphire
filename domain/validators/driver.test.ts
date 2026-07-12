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
import * as fc from "fast-check";
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


// ============================================================================
// Property-Based Tests using fast-check
// ============================================================================

describe("Driver Validators - Property-Based Tests", () => {
  // Feature: transitops, Property 11: Valid driver input creates an Available driver; invalid input is rejected by field
  // **Validates: Requirements 4.1, 4.7**
  
  /**
   * Arbitrary for generating valid driver names
   */
  const validDriverName = fc.stringMatching(/^[A-Za-z][A-Za-z\s]{1,50}$/);

  /**
   * Arbitrary for generating valid license numbers
   */
  const validLicenseNumber = fc.stringMatching(/^[A-Z0-9]{5,20}$/);

  /**
   * Arbitrary for generating valid license categories
   */
  const validLicenseCategory = fc.constantFrom("A", "B", "C", "D", "E");

  /**
   * Arbitrary for generating valid future dates for license expiry
   * Using integers to construct dates to avoid invalid Date objects
   */
  const validLicenseExpiryDate = fc
    .integer({ min: 2024, max: 2050 })
    .chain((year) =>
      fc
        .integer({ min: 0, max: 11 })
        .chain((month) =>
          fc.integer({ min: 1, max: 28 }).map((day) => new Date(year, month, day))
        )
    );

  /**
   * Arbitrary for generating valid contact numbers
   */
  const validContactNumber = fc.stringMatching(/^\+?[0-9]{10,15}$/);

  /**
   * Arbitrary for generating valid safety scores (0-100)
   */
  const validSafetyScore = fc.integer({ min: 0, max: 100 });

  /**
   * Arbitrary for generating complete valid driver input
   */
  const validDriverInput = fc.record({
    name: validDriverName,
    licenseNumber: validLicenseNumber,
    licenseCategory: validLicenseCategory,
    licenseExpiryDate: validLicenseExpiryDate,
    contactNumber: validContactNumber,
    safetyScore: validSafetyScore,
  });

  describe("Property: Validation Consistency", () => {
    it("should produce consistent results for the same input", () => {
      fc.assert(
        fc.property(validDriverInput, (input) => {
          const result1 = validateDriverCreation(input);
          const result2 = validateDriverCreation(input);
          
          // Same input should produce the same outcome
          expect(result1.ok).toBe(result2.ok);
          
          if (result1.ok && result2.ok) {
            expect(result1.value).toEqual(result2.value);
          } else if (!result1.ok && !result2.ok) {
            expect(result1.error).toBe(result2.error);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Valid Input Creates Available Driver", () => {
    it("should always create a driver with Available status for valid input", () => {
      fc.assert(
        fc.property(validDriverInput, (input) => {
          const result = validateDriverCreation(input);
          
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.value.status).toBe("Available");
            expect(result.value.name.trim()).toBe(result.value.name);
            expect(result.value.licenseNumber.trim()).toBe(result.value.licenseNumber);
            expect(result.value.licenseCategory.trim()).toBe(result.value.licenseCategory);
            expect(result.value.contactNumber.trim()).toBe(result.value.contactNumber);
            expect(result.value.safetyScore).toBeGreaterThanOrEqual(0);
            expect(result.value.safetyScore).toBeLessThanOrEqual(100);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Input Sanitization (Whitespace Trimming)", () => {
    it("should trim leading and trailing whitespace from string fields", () => {
      fc.assert(
        fc.property(
          validDriverInput,
          fc.stringMatching(/^\s+$/), // leading whitespace
          fc.stringMatching(/^\s+$/), // trailing whitespace
          (input, leadingWs, trailingWs) => {
            const inputWithWhitespace: CreateDriverInput = {
              ...input,
              name: leadingWs + input.name + trailingWs,
              licenseNumber: leadingWs + input.licenseNumber + trailingWs,
              licenseCategory: leadingWs + input.licenseCategory + trailingWs,
              contactNumber: leadingWs + input.contactNumber + trailingWs,
            };
            
            const result = validateDriverCreation(inputWithWhitespace);
            
            expect(result.ok).toBe(true);
            if (result.ok) {
              // Trimmed values should match original trimmed values
              expect(result.value.name).toBe(input.name.trim());
              expect(result.value.licenseNumber).toBe(input.licenseNumber.trim());
              expect(result.value.licenseCategory).toBe(input.licenseCategory.trim());
              expect(result.value.contactNumber).toBe(input.contactNumber.trim());
              // No leading/trailing whitespace in result
              expect(result.value.name.trim()).toBe(result.value.name);
              expect(result.value.licenseNumber.trim()).toBe(result.value.licenseNumber);
              expect(result.value.licenseCategory.trim()).toBe(result.value.licenseCategory);
              expect(result.value.contactNumber.trim()).toBe(result.value.contactNumber);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Safety Score Boundaries", () => {
    it("should accept any safety score in the range [0, 100]", () => {
      fc.assert(
        fc.property(
          validDriverInput,
          fc.integer({ min: 0, max: 100 }),
          (input, score) => {
            const testInput = { ...input, safetyScore: score };
            const result = validateDriverCreation(testInput);
            
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(result.value.safetyScore).toBe(score);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject any safety score below 0", () => {
      fc.assert(
        fc.property(
          validDriverInput,
          fc.integer({ max: -1 }),
          (input, invalidScore) => {
            const testInput = { 
              ...input, 
              safetyScore: invalidScore,
              // Ensure date is valid so we don't get date validation error first
              licenseExpiryDate: new Date("2025-12-31")
            };
            const result = validateDriverCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toContain("Safety score must be greater than or equal to 0");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject any safety score above 100", () => {
      fc.assert(
        fc.property(
          validDriverInput,
          fc.integer({ min: 101 }),
          (input, invalidScore) => {
            const testInput = { ...input, safetyScore: invalidScore };
            const result = validateDriverCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toContain("Safety score must not exceed 100");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Field-Specific Rejection for Invalid Input", () => {
    it("should reject empty name with field-specific error", () => {
      fc.assert(
        fc.property(
          validDriverInput,
          fc.constantFrom("", "   ", "\t", "\n"),
          (input, emptyName) => {
            const testInput = { ...input, name: emptyName };
            const result = validateDriverCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("Driver name is required");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject empty license number with field-specific error", () => {
      fc.assert(
        fc.property(
          validDriverInput,
          fc.constantFrom("", "   ", "\t"),
          (input, emptyLicense) => {
            const testInput = { ...input, licenseNumber: emptyLicense };
            const result = validateDriverCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("License number is required");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject empty license category with field-specific error", () => {
      fc.assert(
        fc.property(
          validDriverInput,
          fc.constantFrom("", "   "),
          (input, emptyCategory) => {
            const testInput = { ...input, licenseCategory: emptyCategory };
            const result = validateDriverCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("License category is required");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject empty contact number with field-specific error", () => {
      fc.assert(
        fc.property(
          validDriverInput,
          fc.constantFrom("", "   "),
          (input, emptyContact) => {
            // Ensure all other fields are valid first
            const testInput = { 
              ...input, 
              contactNumber: emptyContact,
              // Ensure date is valid so we don't get date validation error first
              licenseExpiryDate: new Date("2025-12-31")
            };
            const result = validateDriverCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("Contact number is required");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject invalid date with field-specific error", () => {
      fc.assert(
        fc.property(validDriverInput, (input) => {
          const testInput = { ...input, licenseExpiryDate: new Date("invalid") };
          const result = validateDriverCreation(testInput);
          
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error).toBe("License expiry date must be a valid date");
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Update Validation", () => {
    it("should validate only provided fields in updates", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.option(validDriverName, { nil: undefined }),
            safetyScore: fc.option(validSafetyScore, { nil: undefined }),
          }),
          (update) => {
            const result = validateDriverUpdate(update);
            expect(result.ok).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject invalid fields in partial updates", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 101 }),
          (invalidScore) => {
            const update = { safetyScore: invalidScore };
            const result = validateDriverUpdate(update);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toContain("Safety score must not exceed 100");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
