/**
 * Tests for Trip field validators
 * 
 * Requirements: 5.1, 5.8
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateTripCreation, type CreateTripInput } from "./trip";

describe("Trip Validators", () => {
  describe("validateTripCreation", () => {
    const validInput: CreateTripInput = {
      source: "Warehouse A",
      destination: "Customer Site B",
      vehicleId: "vehicle-123",
      driverId: "driver-456",
      cargoWeight: 1000,
      plannedDistance: 150,
    };

    describe("Valid inputs", () => {
      it("should accept valid trip input and return status Draft", () => {
        const result = validateTripCreation(validInput);
        
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.source).toBe("Warehouse A");
          expect(result.value.destination).toBe("Customer Site B");
          expect(result.value.vehicleId).toBe("vehicle-123");
          expect(result.value.driverId).toBe("driver-456");
          expect(result.value.cargoWeight).toBe(1000);
          expect(result.value.plannedDistance).toBe(150);
          expect(result.value.status).toBe("Draft"); // Requirement 5.1
        }
      });

      it("should trim whitespace from string fields", () => {
        const result = validateTripCreation({
          ...validInput,
          source: "  Warehouse A  ",
          destination: "  Customer Site B  ",
          vehicleId: "  vehicle-123  ",
          driverId: "  driver-456  ",
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.source).toBe("Warehouse A");
          expect(result.value.destination).toBe("Customer Site B");
          expect(result.value.vehicleId).toBe("vehicle-123");
          expect(result.value.driverId).toBe("driver-456");
        }
      });

      it("should accept minimum valid cargo weight (just above 0)", () => {
        const result = validateTripCreation({
          ...validInput,
          cargoWeight: 0.001,
        });

        expect(result.ok).toBe(true);
      });

      it("should accept minimum valid planned distance (just above 0)", () => {
        const result = validateTripCreation({
          ...validInput,
          plannedDistance: 0.001,
        });

        expect(result.ok).toBe(true);
      });

      it("should accept large cargo weight", () => {
        const result = validateTripCreation({
          ...validInput,
          cargoWeight: 50000,
        });

        expect(result.ok).toBe(true);
      });

      it("should accept large planned distance", () => {
        const result = validateTripCreation({
          ...validInput,
          plannedDistance: 10000,
        });

        expect(result.ok).toBe(true);
      });
    });

    describe("Source validation", () => {
      it("should reject empty source", () => {
        const result = validateTripCreation({
          ...validInput,
          source: "",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Source is required");
        }
      });

      it("should reject whitespace-only source", () => {
        const result = validateTripCreation({
          ...validInput,
          source: "   ",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Source is required");
        }
      });
    });

    describe("Destination validation", () => {
      it("should reject empty destination", () => {
        const result = validateTripCreation({
          ...validInput,
          destination: "",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Destination is required");
        }
      });

      it("should reject whitespace-only destination", () => {
        const result = validateTripCreation({
          ...validInput,
          destination: "   ",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Destination is required");
        }
      });
    });

    describe("Vehicle ID validation", () => {
      it("should reject empty vehicle ID", () => {
        const result = validateTripCreation({
          ...validInput,
          vehicleId: "",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Vehicle ID is required");
        }
      });

      it("should reject whitespace-only vehicle ID", () => {
        const result = validateTripCreation({
          ...validInput,
          vehicleId: "   ",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Vehicle ID is required");
        }
      });
    });

    describe("Driver ID validation", () => {
      it("should reject empty driver ID", () => {
        const result = validateTripCreation({
          ...validInput,
          driverId: "",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Driver ID is required");
        }
      });

      it("should reject whitespace-only driver ID", () => {
        const result = validateTripCreation({
          ...validInput,
          driverId: "   ",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Driver ID is required");
        }
      });
    });

    describe("Cargo weight validation - Requirement 5.8", () => {
      it("should reject cargo weight of 0", () => {
        const result = validateTripCreation({
          ...validInput,
          cargoWeight: 0,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Cargo weight must be greater than 0");
        }
      });

      it("should reject negative cargo weight", () => {
        const result = validateTripCreation({
          ...validInput,
          cargoWeight: -100,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Cargo weight must be greater than 0");
        }
      });

      it("should reject very small negative cargo weight", () => {
        const result = validateTripCreation({
          ...validInput,
          cargoWeight: -0.001,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Cargo weight must be greater than 0");
        }
      });
    });

    describe("Planned distance validation - Requirement 5.8", () => {
      it("should reject planned distance of 0", () => {
        const result = validateTripCreation({
          ...validInput,
          plannedDistance: 0,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Planned distance must be greater than 0");
        }
      });

      it("should reject negative planned distance", () => {
        const result = validateTripCreation({
          ...validInput,
          plannedDistance: -50,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Planned distance must be greater than 0");
        }
      });

      it("should reject very small negative planned distance", () => {
        const result = validateTripCreation({
          ...validInput,
          plannedDistance: -0.001,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Planned distance must be greater than 0");
        }
      });
    });

    describe("Field-specific error messages - Requirement 5.8", () => {
      it("should return first validation error encountered", () => {
        // Multiple invalid fields - should return error for first field validated (source)
        const result = validateTripCreation({
          source: "",
          destination: "",
          vehicleId: "",
          driverId: "",
          cargoWeight: -10,
          plannedDistance: -5,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Source is required");
        }
      });

      it("should validate fields in order and stop at first error", () => {
        // Valid source, invalid destination
        const result = validateTripCreation({
          source: "Valid Source",
          destination: "",
          vehicleId: "valid-id",
          driverId: "valid-id",
          cargoWeight: 100,
          plannedDistance: 50,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Destination is required");
        }
      });
    });
  });
});


// ============================================================================
// Property-Based Tests using fast-check
// ============================================================================

describe("Trip Validators - Property-Based Tests", () => {
  // Feature: transitops, Property 17: Trip creation accepts complete valid input as Draft and rejects invalid input by field
  // **Validates: Requirements 5.1, 5.8**
  
  /**
   * Arbitrary for generating valid source locations
   */
  const validSource = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9\s,.-]{2,100}$/);

  /**
   * Arbitrary for generating valid destination locations
   */
  const validDestination = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9\s,.-]{2,100}$/);

  /**
   * Arbitrary for generating valid vehicle IDs
   */
  const validVehicleId = fc.stringMatching(/^[a-z0-9-]{5,50}$/);

  /**
   * Arbitrary for generating valid driver IDs
   */
  const validDriverId = fc.stringMatching(/^[a-z0-9-]{5,50}$/);

  /**
   * Arbitrary for generating valid cargo weights (> 0 kg)
   */
  const validCargoWeight = fc.double({ min: 0.001, max: 100000, noNaN: true });

  /**
   * Arbitrary for generating valid planned distances (> 0 km)
   */
  const validPlannedDistance = fc.double({ min: 0.001, max: 100000, noNaN: true });

  /**
   * Arbitrary for generating complete valid trip input
   */
  const validTripInput = fc.record({
    source: validSource,
    destination: validDestination,
    vehicleId: validVehicleId,
    driverId: validDriverId,
    cargoWeight: validCargoWeight,
    plannedDistance: validPlannedDistance,
  });

  describe("Property: Validation Consistency", () => {
    it("should produce consistent results for the same input", () => {
      fc.assert(
        fc.property(validTripInput, (input) => {
          const result1 = validateTripCreation(input);
          const result2 = validateTripCreation(input);
          
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

  describe("Property: Valid Input Creates Draft Trip", () => {
    it("should always create a trip with Draft status for valid input", () => {
      fc.assert(
        fc.property(validTripInput, (input) => {
          const result = validateTripCreation(input);
          
          expect(result.ok).toBe(true);
          if (result.ok) {
            // Requirement 5.1: Status must be set to Draft
            expect(result.value.status).toBe("Draft");
            
            // All fields should be present and trimmed
            expect(result.value.source.trim()).toBe(result.value.source);
            expect(result.value.destination.trim()).toBe(result.value.destination);
            expect(result.value.vehicleId.trim()).toBe(result.value.vehicleId);
            expect(result.value.driverId.trim()).toBe(result.value.driverId);
            
            // Requirement 5.8: Cargo weight and planned distance must be > 0
            expect(result.value.cargoWeight).toBeGreaterThan(0);
            expect(result.value.plannedDistance).toBeGreaterThan(0);
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
          validTripInput,
          fc.stringMatching(/^\s+$/), // leading whitespace
          fc.stringMatching(/^\s+$/), // trailing whitespace
          (input, leadingWs, trailingWs) => {
            const inputWithWhitespace: CreateTripInput = {
              ...input,
              source: leadingWs + input.source + trailingWs,
              destination: leadingWs + input.destination + trailingWs,
              vehicleId: leadingWs + input.vehicleId + trailingWs,
              driverId: leadingWs + input.driverId + trailingWs,
            };
            
            const result = validateTripCreation(inputWithWhitespace);
            
            expect(result.ok).toBe(true);
            if (result.ok) {
              // Trimmed values should match original trimmed values
              expect(result.value.source).toBe(input.source.trim());
              expect(result.value.destination).toBe(input.destination.trim());
              expect(result.value.vehicleId).toBe(input.vehicleId.trim());
              expect(result.value.driverId).toBe(input.driverId.trim());
              
              // No leading/trailing whitespace in result
              expect(result.value.source.trim()).toBe(result.value.source);
              expect(result.value.destination.trim()).toBe(result.value.destination);
              expect(result.value.vehicleId.trim()).toBe(result.value.vehicleId);
              expect(result.value.driverId.trim()).toBe(result.value.driverId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Cargo Weight Edge Cases", () => {
    it("should accept any cargo weight greater than 0", () => {
      fc.assert(
        fc.property(
          validTripInput,
          fc.double({ min: 0.001, max: 1000000, noNaN: true }),
          (input, weight) => {
            const testInput = { ...input, cargoWeight: weight };
            const result = validateTripCreation(testInput);
            
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(result.value.cargoWeight).toBe(weight);
              expect(result.value.cargoWeight).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject cargo weight of exactly 0", () => {
      fc.assert(
        fc.property(validTripInput, (input) => {
          const testInput = { ...input, cargoWeight: 0 };
          const result = validateTripCreation(testInput);
          
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error).toBe("Cargo weight must be greater than 0");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should reject any negative cargo weight", () => {
      fc.assert(
        fc.property(
          validTripInput,
          fc.double({ max: -0.001, noNaN: true }),
          (input, negativeWeight) => {
            const testInput = { ...input, cargoWeight: negativeWeight };
            const result = validateTripCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("Cargo weight must be greater than 0");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Planned Distance Edge Cases", () => {
    it("should accept any planned distance greater than 0", () => {
      fc.assert(
        fc.property(
          validTripInput,
          fc.double({ min: 0.001, max: 1000000, noNaN: true }),
          (input, distance) => {
            const testInput = { ...input, plannedDistance: distance };
            const result = validateTripCreation(testInput);
            
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(result.value.plannedDistance).toBe(distance);
              expect(result.value.plannedDistance).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject planned distance of exactly 0", () => {
      fc.assert(
        fc.property(validTripInput, (input) => {
          const testInput = { ...input, plannedDistance: 0 };
          const result = validateTripCreation(testInput);
          
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error).toBe("Planned distance must be greater than 0");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should reject any negative planned distance", () => {
      fc.assert(
        fc.property(
          validTripInput,
          fc.double({ max: -0.001, noNaN: true }),
          (input, negativeDistance) => {
            const testInput = { ...input, plannedDistance: negativeDistance };
            const result = validateTripCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("Planned distance must be greater than 0");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Field-Specific Rejection for Invalid Input", () => {
    it("should reject empty source with field-specific error", () => {
      fc.assert(
        fc.property(
          validTripInput,
          fc.constantFrom("", "   ", "\t", "\n"),
          (input, emptySource) => {
            const testInput = { ...input, source: emptySource };
            const result = validateTripCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("Source is required");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject empty destination with field-specific error", () => {
      fc.assert(
        fc.property(
          validTripInput,
          fc.constantFrom("", "   ", "\t"),
          (input, emptyDestination) => {
            const testInput = { ...input, destination: emptyDestination };
            const result = validateTripCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("Destination is required");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject empty vehicle ID with field-specific error", () => {
      fc.assert(
        fc.property(
          validTripInput,
          fc.constantFrom("", "   "),
          (input, emptyVehicleId) => {
            const testInput = { ...input, vehicleId: emptyVehicleId };
            const result = validateTripCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("Vehicle ID is required");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject empty driver ID with field-specific error", () => {
      fc.assert(
        fc.property(
          validTripInput,
          fc.constantFrom("", "   "),
          (input, emptyDriverId) => {
            const testInput = { ...input, driverId: emptyDriverId };
            const result = validateTripCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("Driver ID is required");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Validation Order and Error Priority", () => {
    it("should return the first validation error in order", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("", "   "),
          (emptyValue) => {
            // All fields invalid - should get first field error (source)
            const testInput: CreateTripInput = {
              source: emptyValue,
              destination: emptyValue,
              vehicleId: emptyValue,
              driverId: emptyValue,
              cargoWeight: -1,
              plannedDistance: -1,
            };
            const result = validateTripCreation(testInput);
            
            expect(result.ok).toBe(false);
            if (!result.ok) {
              // First field validated is source
              expect(result.error).toBe("Source is required");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Complete Valid Trip Has All Required Fields", () => {
    it("should preserve all input fields in valid output", () => {
      fc.assert(
        fc.property(validTripInput, (input) => {
          const result = validateTripCreation(input);
          
          expect(result.ok).toBe(true);
          if (result.ok) {
            // All fields should be present
            expect(result.value).toHaveProperty("source");
            expect(result.value).toHaveProperty("destination");
            expect(result.value).toHaveProperty("vehicleId");
            expect(result.value).toHaveProperty("driverId");
            expect(result.value).toHaveProperty("cargoWeight");
            expect(result.value).toHaveProperty("plannedDistance");
            expect(result.value).toHaveProperty("status");
            
            // Fields should match input (after trimming)
            expect(result.value.source).toBe(input.source.trim());
            expect(result.value.destination).toBe(input.destination.trim());
            expect(result.value.vehicleId).toBe(input.vehicleId.trim());
            expect(result.value.driverId).toBe(input.driverId.trim());
            expect(result.value.cargoWeight).toBe(input.cargoWeight);
            expect(result.value.plannedDistance).toBe(input.plannedDistance);
            expect(result.value.status).toBe("Draft");
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
