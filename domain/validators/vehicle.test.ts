/**
 * Unit tests for vehicle field validators
 * 
 * Requirements: 3.1, 3.8
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateVehicleCreation,
  validateVehicleUpdate,
  CreateVehicleInput,
  UpdateVehicleInput,
} from "./vehicle";

describe("Vehicle Validators", () => {
  describe("validateVehicleCreation", () => {
    const validInput: CreateVehicleInput = {
      registrationNumber: "ABC123",
      name: "Truck Model X",
      type: "Heavy Duty",
      maxLoadCapacity: 5000,
      odometer: 10000,
      acquisitionCost: 50000,
    };

    it("should accept valid vehicle input and set status to Available", () => {
      const result = validateVehicleCreation(validInput);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("Available");
        expect(result.value.registrationNumber).toBe("ABC123");
        expect(result.value.name).toBe("Truck Model X");
        expect(result.value.type).toBe("Heavy Duty");
        expect(result.value.maxLoadCapacity).toBe(5000);
        expect(result.value.odometer).toBe(10000);
        expect(result.value.acquisitionCost).toBe(50000);
        expect(result.value.revenue).toBe(0);
      }
    });

    it("should set revenue to provided value if given", () => {
      const result = validateVehicleCreation({ ...validInput, revenue: 15000 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.revenue).toBe(15000);
      }
    });

    it("should trim whitespace from registration number", () => {
      const result = validateVehicleCreation({
        ...validInput,
        registrationNumber: "  ABC123  ",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.registrationNumber).toBe("ABC123");
      }
    });

    it("should trim whitespace from name", () => {
      const result = validateVehicleCreation({
        ...validInput,
        name: "  Truck Model X  ",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe("Truck Model X");
      }
    });

    it("should trim whitespace from type", () => {
      const result = validateVehicleCreation({
        ...validInput,
        type: "  Heavy Duty  ",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("Heavy Duty");
      }
    });

    describe("Registration Number Validation", () => {
      it("should reject empty registration number", () => {
        const result = validateVehicleCreation({
          ...validInput,
          registrationNumber: "",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Registration number is required");
        }
      });

      it("should reject whitespace-only registration number", () => {
        const result = validateVehicleCreation({
          ...validInput,
          registrationNumber: "   ",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Registration number is required");
        }
      });
    });

    describe("Name Validation", () => {
      it("should reject empty name", () => {
        const result = validateVehicleCreation({
          ...validInput,
          name: "",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Vehicle name is required");
        }
      });

      it("should reject whitespace-only name", () => {
        const result = validateVehicleCreation({
          ...validInput,
          name: "   ",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Vehicle name is required");
        }
      });
    });

    describe("Type Validation", () => {
      it("should reject empty type", () => {
        const result = validateVehicleCreation({
          ...validInput,
          type: "",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Vehicle type is required");
        }
      });

      it("should reject whitespace-only type", () => {
        const result = validateVehicleCreation({
          ...validInput,
          type: "   ",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Vehicle type is required");
        }
      });
    });

    describe("Max Load Capacity Validation", () => {
      it("should accept capacity of 1 (minimum valid)", () => {
        const result = validateVehicleCreation({
          ...validInput,
          maxLoadCapacity: 1,
        });
        expect(result.ok).toBe(true);
      });

      it("should accept capacity of 100,000 (maximum valid)", () => {
        const result = validateVehicleCreation({
          ...validInput,
          maxLoadCapacity: 100_000,
        });
        expect(result.ok).toBe(true);
      });

      it("should reject capacity of 0", () => {
        const result = validateVehicleCreation({
          ...validInput,
          maxLoadCapacity: 0,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Maximum load capacity must be greater than 0");
        }
      });

      it("should reject negative capacity", () => {
        const result = validateVehicleCreation({
          ...validInput,
          maxLoadCapacity: -100,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Maximum load capacity must be greater than 0");
        }
      });

      it("should reject capacity exceeding 100,000", () => {
        const result = validateVehicleCreation({
          ...validInput,
          maxLoadCapacity: 100_001,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Maximum load capacity must not exceed 100,000 kg");
        }
      });
    });

    describe("Odometer Validation", () => {
      it("should accept odometer of 0 (minimum valid)", () => {
        const result = validateVehicleCreation({
          ...validInput,
          odometer: 0,
        });
        expect(result.ok).toBe(true);
      });

      it("should accept odometer of 10,000,000 (maximum valid)", () => {
        const result = validateVehicleCreation({
          ...validInput,
          odometer: 10_000_000,
        });
        expect(result.ok).toBe(true);
      });

      it("should reject negative odometer", () => {
        const result = validateVehicleCreation({
          ...validInput,
          odometer: -1,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Odometer must be greater than or equal to 0");
        }
      });

      it("should reject odometer exceeding 10,000,000", () => {
        const result = validateVehicleCreation({
          ...validInput,
          odometer: 10_000_001,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Odometer must not exceed 10,000,000 km");
        }
      });
    });

    describe("Acquisition Cost Validation", () => {
      it("should accept acquisition cost of 0 (minimum valid)", () => {
        const result = validateVehicleCreation({
          ...validInput,
          acquisitionCost: 0,
        });
        expect(result.ok).toBe(true);
      });

      it("should accept large acquisition cost", () => {
        const result = validateVehicleCreation({
          ...validInput,
          acquisitionCost: 1_000_000,
        });
        expect(result.ok).toBe(true);
      });

      it("should reject negative acquisition cost", () => {
        const result = validateVehicleCreation({
          ...validInput,
          acquisitionCost: -100,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Acquisition cost must be greater than or equal to 0");
        }
      });
    });

    describe("Field-Specific Error Messages", () => {
      it("should return first field error encountered in validation order", () => {
        // Missing registration number should be caught first
        const result = validateVehicleCreation({
          registrationNumber: "",
          name: "",
          type: "",
          maxLoadCapacity: -1,
          odometer: -1,
          acquisitionCost: -1,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Registration number is required");
        }
      });
    });
  });

  describe("validateVehicleUpdate", () => {
    it("should accept empty update (no fields to update)", () => {
      const result = validateVehicleUpdate({});
      expect(result.ok).toBe(true);
    });

    it("should accept valid name update", () => {
      const result = validateVehicleUpdate({ name: "New Name" });
      expect(result.ok).toBe(true);
    });

    it("should accept valid type update", () => {
      const result = validateVehicleUpdate({ type: "New Type" });
      expect(result.ok).toBe(true);
    });

    it("should accept valid capacity update", () => {
      const result = validateVehicleUpdate({ maxLoadCapacity: 5000 });
      expect(result.ok).toBe(true);
    });

    it("should accept valid odometer update", () => {
      const result = validateVehicleUpdate({ odometer: 20000 });
      expect(result.ok).toBe(true);
    });

    it("should accept valid acquisition cost update", () => {
      const result = validateVehicleUpdate({ acquisitionCost: 60000 });
      expect(result.ok).toBe(true);
    });

    it("should accept multiple valid field updates", () => {
      const result = validateVehicleUpdate({
        name: "Updated Truck",
        maxLoadCapacity: 8000,
        odometer: 15000,
      });
      expect(result.ok).toBe(true);
    });

    it("should reject invalid name update", () => {
      const result = validateVehicleUpdate({ name: "   " });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Vehicle name is required");
      }
    });

    it("should reject invalid type update", () => {
      const result = validateVehicleUpdate({ type: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Vehicle type is required");
      }
    });

    it("should reject invalid capacity update", () => {
      const result = validateVehicleUpdate({ maxLoadCapacity: 0 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Maximum load capacity must be greater than 0");
      }
    });

    it("should reject invalid odometer update", () => {
      const result = validateVehicleUpdate({ odometer: -100 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Odometer must be greater than or equal to 0");
      }
    });

    it("should reject invalid acquisition cost update", () => {
      const result = validateVehicleUpdate({ acquisitionCost: -50 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Acquisition cost must be greater than or equal to 0");
      }
    });

    it("should return first invalid field error when multiple fields are invalid", () => {
      const result = validateVehicleUpdate({
        name: "",
        maxLoadCapacity: -1,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Vehicle name is required");
      }
    });
  });

  // ============================================================================
  // Property-Based Tests (fast-check)
  // Feature: transitops, Property 7: Valid vehicle input creates an Available vehicle; invalid input is rejected by field
  // ============================================================================

  describe("Property 7: Vehicle Validator Properties", () => {
    // Arbitraries for valid vehicle fields
    const validRegistrationNumberArb = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0);
    
    const validNameArb = fc.string({ minLength: 1, maxLength: 100 })
      .filter(s => s.trim().length > 0);
    
    const validTypeArb = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0);
    
    const validCapacityArb = fc.integer({ min: 1, max: 100_000 });
    
    const validOdometerArb = fc.integer({ min: 0, max: 10_000_000 });
    
    const validAcquisitionCostArb = fc.double({ min: 0, max: 10_000_000, noNaN: true });
    
    const validRevenueArb = fc.double({ min: 0, max: 10_000_000, noNaN: true });

    // Arbitrary for valid vehicle input
    const validVehicleInputArb = fc.record({
      registrationNumber: validRegistrationNumberArb,
      name: validNameArb,
      type: validTypeArb,
      maxLoadCapacity: validCapacityArb,
      odometer: validOdometerArb,
      acquisitionCost: validAcquisitionCostArb,
      revenue: fc.option(validRevenueArb, { nil: undefined }),
    });

    it("Property: Valid input always creates an Available vehicle", () => {
      // **Validates: Requirements 3.1**
      fc.assert(
        fc.property(validVehicleInputArb, (input) => {
          const result = validateVehicleCreation(input);
          
          // Valid input must always succeed
          if (!result.ok) {
            return false;
          }
          
          // Status must be Available
          if (result.value.status !== "Available") {
            return false;
          }
          
          // All fields must be preserved correctly
          return (
            result.value.registrationNumber === input.registrationNumber.trim() &&
            result.value.name === input.name.trim() &&
            result.value.type === input.type.trim() &&
            result.value.maxLoadCapacity === input.maxLoadCapacity &&
            result.value.odometer === input.odometer &&
            result.value.acquisitionCost === input.acquisitionCost &&
            result.value.revenue === (input.revenue ?? 0)
          );
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Validation is deterministic - same input yields same result", () => {
      // **Validates: Requirements 3.1, 3.8**
      fc.assert(
        fc.property(validVehicleInputArb, (input) => {
          const result1 = validateVehicleCreation(input);
          const result2 = validateVehicleCreation(input);
          
          // Both results must have same ok status
          if (result1.ok !== result2.ok) {
            return false;
          }
          
          if (result1.ok && result2.ok) {
            // Both should produce identical validated vehicles
            return JSON.stringify(result1.value) === JSON.stringify(result2.value);
          }
          
          if (!result1.ok && !result2.ok) {
            // Both should have same error message
            return result1.error === result2.error;
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Empty or whitespace-only registration number is always rejected", () => {
      // **Validates: Requirements 3.8**
      const emptyRegNoArb = fc.oneof(
        fc.constant(""),
        fc.string().filter(s => s.trim().length === 0 && s.length > 0)
      );
      
      fc.assert(
        fc.property(
          emptyRegNoArb,
          validNameArb,
          validTypeArb,
          validCapacityArb,
          validOdometerArb,
          validAcquisitionCostArb,
          (regNo, name, type, capacity, odometer, cost) => {
            const result = validateVehicleCreation({
              registrationNumber: regNo,
              name,
              type,
              maxLoadCapacity: capacity,
              odometer,
              acquisitionCost: cost,
            });
            
            return !result.ok && result.error === "Registration number is required";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Empty or whitespace-only name is always rejected", () => {
      // **Validates: Requirements 3.8**
      const emptyNameArb = fc.oneof(
        fc.constant(""),
        fc.string().filter(s => s.trim().length === 0 && s.length > 0)
      );
      
      fc.assert(
        fc.property(
          validRegistrationNumberArb,
          emptyNameArb,
          validTypeArb,
          validCapacityArb,
          validOdometerArb,
          validAcquisitionCostArb,
          (regNo, name, type, capacity, odometer, cost) => {
            const result = validateVehicleCreation({
              registrationNumber: regNo,
              name,
              type,
              maxLoadCapacity: capacity,
              odometer,
              acquisitionCost: cost,
            });
            
            return !result.ok && result.error === "Vehicle name is required";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Empty or whitespace-only type is always rejected", () => {
      // **Validates: Requirements 3.8**
      const emptyTypeArb = fc.oneof(
        fc.constant(""),
        fc.string().filter(s => s.trim().length === 0 && s.length > 0)
      );
      
      fc.assert(
        fc.property(
          validRegistrationNumberArb,
          validNameArb,
          emptyTypeArb,
          validCapacityArb,
          validOdometerArb,
          validAcquisitionCostArb,
          (regNo, name, type, capacity, odometer, cost) => {
            const result = validateVehicleCreation({
              registrationNumber: regNo,
              name,
              type,
              maxLoadCapacity: capacity,
              odometer,
              acquisitionCost: cost,
            });
            
            return !result.ok && result.error === "Vehicle type is required";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Capacity must be in range (0, 100000] - boundary enforcement", () => {
      // **Validates: Requirements 3.1, 3.8**
      const invalidCapacityArb = fc.oneof(
        fc.integer({ max: 0 }),
        fc.integer({ min: 100_001, max: 1_000_000 })
      );
      
      fc.assert(
        fc.property(
          validRegistrationNumberArb,
          validNameArb,
          validTypeArb,
          invalidCapacityArb,
          validOdometerArb,
          validAcquisitionCostArb,
          (regNo, name, type, capacity, odometer, cost) => {
            const result = validateVehicleCreation({
              registrationNumber: regNo,
              name,
              type,
              maxLoadCapacity: capacity,
              odometer,
              acquisitionCost: cost,
            });
            
            if (result.ok) {
              return false; // Should have failed
            }
            
            // Check correct error message based on value
            if (capacity <= 0) {
              return result.error === "Maximum load capacity must be greater than 0";
            } else {
              return result.error === "Maximum load capacity must not exceed 100,000 kg";
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Odometer must be in range [0, 10000000] - boundary enforcement", () => {
      // **Validates: Requirements 3.1, 3.8**
      const invalidOdometerArb = fc.oneof(
        fc.integer({ max: -1, min: -1_000_000 }),
        fc.integer({ min: 10_000_001, max: 20_000_000 })
      );
      
      fc.assert(
        fc.property(
          validRegistrationNumberArb,
          validNameArb,
          validTypeArb,
          validCapacityArb,
          invalidOdometerArb,
          validAcquisitionCostArb,
          (regNo, name, type, capacity, odometer, cost) => {
            const result = validateVehicleCreation({
              registrationNumber: regNo,
              name,
              type,
              maxLoadCapacity: capacity,
              odometer,
              acquisitionCost: cost,
            });
            
            if (result.ok) {
              return false; // Should have failed
            }
            
            // Check correct error message based on value
            if (odometer < 0) {
              return result.error === "Odometer must be greater than or equal to 0";
            } else {
              return result.error === "Odometer must not exceed 10,000,000 km";
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Acquisition cost must be >= 0 - boundary enforcement", () => {
      // **Validates: Requirements 3.1, 3.8**
      const invalidCostArb = fc.double({ max: -0.01, min: -1_000_000, noNaN: true });
      
      fc.assert(
        fc.property(
          validRegistrationNumberArb,
          validNameArb,
          validTypeArb,
          validCapacityArb,
          validOdometerArb,
          invalidCostArb,
          (regNo, name, type, capacity, odometer, cost) => {
            const result = validateVehicleCreation({
              registrationNumber: regNo,
              name,
              type,
              maxLoadCapacity: capacity,
              odometer,
              acquisitionCost: cost,
            });
            
            return !result.ok && result.error === "Acquisition cost must be greater than or equal to 0";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Whitespace trimming is consistent for string fields", () => {
      // **Validates: Requirements 3.1**
      const whitespaceArb = fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 5 })
        .map(arr => arr.join(''));
      
      fc.assert(
        fc.property(
          validRegistrationNumberArb,
          validNameArb,
          validTypeArb,
          whitespaceArb,
          whitespaceArb,
          validCapacityArb,
          validOdometerArb,
          validAcquisitionCostArb,
          (regNo, name, type, prefixWs, suffixWs, capacity, odometer, cost) => {
            const paddedInput = {
              registrationNumber: prefixWs + regNo + suffixWs,
              name: prefixWs + name + suffixWs,
              type: prefixWs + type + suffixWs,
              maxLoadCapacity: capacity,
              odometer,
              acquisitionCost: cost,
            };
            
            const result = validateVehicleCreation(paddedInput);
            
            if (!result.ok) {
              return false;
            }
            
            // Verify trimming was applied
            return (
              result.value.registrationNumber === regNo.trim() &&
              result.value.name === name.trim() &&
              result.value.type === type.trim()
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Default revenue is 0 when not provided", () => {
      // **Validates: Requirements 3.1**
      fc.assert(
        fc.property(validVehicleInputArb, (input) => {
          const inputWithoutRevenue = { ...input };
          delete inputWithoutRevenue.revenue;
          
          const result = validateVehicleCreation(inputWithoutRevenue);
          
          return result.ok && result.value.revenue === 0;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Boundary values at exact limits are always accepted", () => {
      // **Validates: Requirements 3.1**
      fc.assert(
        fc.property(
          validRegistrationNumberArb,
          validNameArb,
          validTypeArb,
          fc.constantFrom(1, 100_000), // Min and max capacity
          fc.constantFrom(0, 10_000_000), // Min and max odometer
          fc.constantFrom(0), // Min acquisition cost
          (regNo, name, type, capacity, odometer, cost) => {
            const result = validateVehicleCreation({
              registrationNumber: regNo,
              name,
              type,
              maxLoadCapacity: capacity,
              odometer,
              acquisitionCost: cost,
            });
            
            return result.ok === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7: Vehicle Update Validator Properties", () => {
    it("Property: Empty update is always valid", () => {
      // **Validates: Requirements 3.5**
      fc.assert(
        fc.property(fc.constant({}), () => {
          const result = validateVehicleUpdate({});
          return result.ok === true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Update validation is deterministic", () => {
      // **Validates: Requirements 3.5, 3.8**
      const updateInputArb = fc.record(
        {
          name: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
          type: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
          maxLoadCapacity: fc.option(fc.integer({ min: 1, max: 100_000 }), { nil: undefined }),
          odometer: fc.option(fc.integer({ min: 0, max: 10_000_000 }), { nil: undefined }),
          acquisitionCost: fc.option(fc.double({ min: 0, max: 10_000_000, noNaN: true }), { nil: undefined }),
        },
        { requiredKeys: [] }
      );
      
      fc.assert(
        fc.property(updateInputArb, (input) => {
          const result1 = validateVehicleUpdate(input);
          const result2 = validateVehicleUpdate(input);
          
          // Both must have same ok status
          if (result1.ok !== result2.ok) {
            return false;
          }
          
          if (!result1.ok && !result2.ok) {
            return result1.error === result2.error;
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Invalid individual field updates are rejected with correct error", () => {
      // **Validates: Requirements 3.8**
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({ name: fc.constant("") }),
            fc.record({ type: fc.constant("   ") }),
            fc.record({ maxLoadCapacity: fc.integer({ max: 0 }) }),
            fc.record({ odometer: fc.integer({ max: -1, min: -1000 }) }),
            fc.record({ acquisitionCost: fc.double({ max: -0.01, min: -1000, noNaN: true }) })
          ),
          (input) => {
            const result = validateVehicleUpdate(input);
            return !result.ok && typeof result.error === "string" && result.error.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Partial valid updates always succeed", () => {
      // **Validates: Requirements 3.5**
      const validPartialUpdateArb = fc.record(
        {
          name: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
          maxLoadCapacity: fc.option(fc.integer({ min: 1, max: 100_000 }), { nil: undefined }),
        },
        { requiredKeys: [] }
      );
      
      fc.assert(
        fc.property(validPartialUpdateArb, (input) => {
          const result = validateVehicleUpdate(input);
          return result.ok === true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Update validation does not include registration number", () => {
      // **Validates: Requirements 3.5**
      // This property ensures the update validator never accepts or checks registrationNumber
      const updateWithRegNoArb = fc.record({
        name: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
        // TypeScript won't allow registrationNumber in UpdateVehicleInput, but we verify the validator handles it
      });
      
      fc.assert(
        fc.property(updateWithRegNoArb, (input) => {
          // Attempt to add registrationNumber to input (this would be a type error in TS but we test runtime)
          const sneakyInput = { ...input, registrationNumber: "SHOULD_BE_IGNORED" } as any;
          const result = validateVehicleUpdate(sneakyInput);
          
          // Validation should succeed (ignoring the extra field)
          // The actual service layer would prevent this, but validator shouldn't care
          return result.ok === true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7: Input Sanitization Properties", () => {
    it("Property: String fields are consistently sanitized (trimmed)", () => {
      // **Validates: Requirements 3.1**
      const whitespaceArb = fc.array(fc.constantFrom(' ', '\t'), { minLength: 1, maxLength: 3 })
        .map(arr => arr.join(''));
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          whitespaceArb,
          (core, ws) => {
            const paddedName = ws + core + ws;
            const input: CreateVehicleInput = {
              registrationNumber: "TEST123",
              name: paddedName,
              type: "Truck",
              maxLoadCapacity: 5000,
              odometer: 1000,
              acquisitionCost: 50000,
            };
            
            const result = validateVehicleCreation(input);
            
            // If valid, trimmed value should match core
            return result.ok && result.value.name === core.trim();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Numeric fields are not modified (no rounding or truncation)", () => {
      // **Validates: Requirements 3.1**
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100_000 }),
          fc.integer({ min: 0, max: 10_000_000 }),
          fc.double({ min: 0, max: 1_000_000, noNaN: true }),
          (capacity, odometer, cost) => {
            const input: CreateVehicleInput = {
              registrationNumber: "TEST123",
              name: "Test Vehicle",
              type: "Truck",
              maxLoadCapacity: capacity,
              odometer: odometer,
              acquisitionCost: cost,
            };
            
            const result = validateVehicleCreation(input);
            
            // Numeric values must be preserved exactly
            return (
              result.ok &&
              result.value.maxLoadCapacity === capacity &&
              result.value.odometer === odometer &&
              result.value.acquisitionCost === cost
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Validation never throws exceptions", () => {
      // **Validates: Requirements 3.1, 3.8**
      const anyInputArb = fc.record({
        registrationNumber: fc.oneof(fc.string(), fc.constant(""), fc.constant("   ")),
        name: fc.oneof(fc.string(), fc.constant(""), fc.constant("   ")),
        type: fc.oneof(fc.string(), fc.constant(""), fc.constant("   ")),
        maxLoadCapacity: fc.oneof(fc.integer(), fc.double()),
        odometer: fc.oneof(fc.integer(), fc.double()),
        acquisitionCost: fc.oneof(fc.integer(), fc.double({ noNaN: true })),
      });
      
      fc.assert(
        fc.property(anyInputArb, (input) => {
          try {
            const result = validateVehicleCreation(input);
            // Should always return a Result, never throw
            return result.ok === true || result.ok === false;
          } catch {
            return false; // Should never throw
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7: Edge Case Coverage", () => {
    it("Property: Special characters in string fields are preserved", () => {
      // **Validates: Requirements 3.1**
      const specialCharArb = fc.array(
        fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+'),
        { minLength: 1, maxLength: 10 }
      ).map(arr => arr.join(''));
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
          specialCharArb,
          (base, special) => {
            const nameWithSpecial = base + special;
            const input: CreateVehicleInput = {
              registrationNumber: "TEST-" + special,
              name: nameWithSpecial,
              type: "Type@" + special,
              maxLoadCapacity: 5000,
              odometer: 1000,
              acquisitionCost: 50000,
            };
            
            const result = validateVehicleCreation(input);
            
            // Special characters should be preserved in valid strings
            return (
              result.ok &&
              result.value.registrationNumber.includes(special) &&
              result.value.name.includes(special) &&
              result.value.type.includes(special)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Very long valid strings are handled correctly", () => {
      // **Validates: Requirements 3.1**
      const longStringArb = fc.string({ minLength: 100, maxLength: 500 }).filter(s => s.trim().length > 0);
      
      fc.assert(
        fc.property(longStringArb, (longStr) => {
          const input: CreateVehicleInput = {
            registrationNumber: longStr.substring(0, 100),
            name: longStr.substring(0, 200),
            type: longStr.substring(0, 100),
            maxLoadCapacity: 5000,
            odometer: 1000,
            acquisitionCost: 50000,
          };
          
          const result = validateVehicleCreation(input);
          
          // Long strings should still be valid
          return result.ok === true;
        }),
        { numRuns: 50 }
      );
    });

    it("Property: Floating point precision is preserved for costs", () => {
      // **Validates: Requirements 3.1**
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
          fc.double({ min: 0, max: 999999.99, noNaN: true }),
          (cost, revenue) => {
            const input: CreateVehicleInput = {
              registrationNumber: "TEST123",
              name: "Test Vehicle",
              type: "Truck",
              maxLoadCapacity: 5000,
              odometer: 1000,
              acquisitionCost: cost,
              revenue: revenue,
            };
            
            const result = validateVehicleCreation(input);
            
            // Floating point values should be preserved
            return (
              result.ok &&
              Math.abs(result.value.acquisitionCost - cost) < 0.0001 &&
              Math.abs(result.value.revenue - revenue) < 0.0001
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
