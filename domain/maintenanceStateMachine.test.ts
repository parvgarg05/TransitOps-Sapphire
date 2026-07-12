/**
 * Unit tests for Maintenance State Machine
 * Feature: transitops
 * 
 * Tests the pure state transition functions for maintenance workflow.
 * Includes property-based tests for Properties 23 and 24.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { openMaintenance, closeMaintenance } from "./maintenanceStateMachine";
import { Vehicle, VehicleStatus } from "./types";

// Helper to create a test vehicle with specified status
function createTestVehicle(status: VehicleStatus): Vehicle {
  return {
    id: "v1",
    registrationNumber: "TEST123",
    name: "Test Vehicle",
    type: "Truck",
    region: "North",
    maxLoadCapacity: 5000,
    odometer: 10000,
    acquisitionCost: 50000,
    revenue: 0,
    status,
    createdAt: new Date(),
  };
}

describe("Maintenance State Machine", () => {
  describe("openMaintenance", () => {
    it("should set Available vehicle to In Shop (Req 7.1)", () => {
      const vehicle = createTestVehicle("Available");
      const result = openMaintenance(vehicle);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("In Shop");
      }
    });

    it("should set On Trip vehicle to In Shop (Req 7.1)", () => {
      const vehicle = createTestVehicle("On Trip");
      const result = openMaintenance(vehicle);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("In Shop");
      }
    });

    it("should set In Shop vehicle to In Shop (idempotent)", () => {
      const vehicle = createTestVehicle("In Shop");
      const result = openMaintenance(vehicle);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("In Shop");
      }
    });

    it("should reject Retired vehicle (Req 7.7)", () => {
      const vehicle = createTestVehicle("Retired");
      const result = openMaintenance(vehicle);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Vehicle is Retired");
      }
    });
  });

  describe("closeMaintenance", () => {
    it("should set In Shop vehicle to Available (Req 7.3)", () => {
      const vehicle = createTestVehicle("In Shop");
      const newStatus = closeMaintenance(vehicle);

      expect(newStatus).toBe("Available");
    });

    it("should set Available vehicle to Available (idempotent)", () => {
      const vehicle = createTestVehicle("Available");
      const newStatus = closeMaintenance(vehicle);

      expect(newStatus).toBe("Available");
    });

    it("should set On Trip vehicle to Available", () => {
      const vehicle = createTestVehicle("On Trip");
      const newStatus = closeMaintenance(vehicle);

      expect(newStatus).toBe("Available");
    });

    it("should preserve Retired status (Req 7.4)", () => {
      const vehicle = createTestVehicle("Retired");
      const newStatus = closeMaintenance(vehicle);

      expect(newStatus).toBe("Retired");
    });
  });

  describe("State Machine Integration", () => {
    it("should transition Available → In Shop → Available", () => {
      const vehicle = createTestVehicle("Available");

      // Open maintenance
      const openResult = openMaintenance(vehicle);
      expect(openResult.ok).toBe(true);
      if (openResult.ok) {
        expect(openResult.value).toBe("In Shop");

        // Close maintenance
        const updatedVehicle = { ...vehicle, status: openResult.value };
        const closeResult = closeMaintenance(updatedVehicle);
        expect(closeResult).toBe("Available");
      }
    });

    it("should reject Retired vehicle and preserve status", () => {
      const vehicle = createTestVehicle("Retired");

      // Attempt to open maintenance
      const openResult = openMaintenance(vehicle);
      expect(openResult.ok).toBe(false);
      
      // Vehicle status unchanged
      expect(vehicle.status).toBe("Retired");

      // Close maintenance still preserves Retired
      const closeResult = closeMaintenance(vehicle);
      expect(closeResult).toBe("Retired");
    });
  });
});


// ============================================================================
// Property-Based Tests
// ============================================================================

/**
 * Arbitraries for generating test data
 */

// Generate a non-Retired vehicle status
const arbitraryNonRetiredStatus = (): fc.Arbitrary<VehicleStatus> => {
  return fc.constantFrom("Available", "On Trip", "In Shop");
};

// Generate any vehicle status
const arbitraryVehicleStatus = (): fc.Arbitrary<VehicleStatus> => {
  return fc.constantFrom("Available", "On Trip", "In Shop", "Retired");
};

// Generate a vehicle with a given status
const arbitraryVehicle = (statusArb: fc.Arbitrary<VehicleStatus>): fc.Arbitrary<Vehicle> => {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    registrationNumber: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    type: fc.constantFrom("Truck", "Van", "Car", "Bus", "Heavy Duty"),
    region: fc.oneof(
      fc.constantFrom("North", "South", "East", "West", "Central"),
      fc.constant(null)
    ),
    maxLoadCapacity: fc.integer({ min: 100, max: 100000 }),
    odometer: fc.integer({ min: 0, max: 10000000 }),
    acquisitionCost: fc.integer({ min: 0, max: 1000000 }),
    revenue: fc.integer({ min: 0, max: 10000000 }),
    status: statusArb,
    createdAt: fc.date({ min: new Date(2020, 0, 1), max: new Date() }),
  });
};

describe("Property-Based Tests for Maintenance State Machine", () => {
  describe("Property 23: Opening maintenance sends a non-Retired vehicle In Shop and rejects a Retired vehicle", () => {
    // **Validates: Requirements 7.1, 7.7**

    it("should always transition non-Retired vehicles to In Shop", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryNonRetiredStatus()),
          (vehicle) => {
            const result = openMaintenance(vehicle);

            // Requirement 7.1: Opening maintenance sets vehicle to In Shop
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(result.value).toBe("In Shop");
            }

            // Ensure vehicle was not Retired
            expect(vehicle.status).not.toBe("Retired");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should always reject Retired vehicles and return an error", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(fc.constant("Retired")),
          (vehicle) => {
            const result = openMaintenance(vehicle);

            // Requirement 7.7: Reject opening maintenance for Retired vehicles
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toBe("Vehicle is Retired");
            }

            // Ensure vehicle was Retired
            expect(vehicle.status).toBe("Retired");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be deterministic: same vehicle always produces same result", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryVehicleStatus()),
          (vehicle) => {
            const result1 = openMaintenance(vehicle);
            const result2 = openMaintenance(vehicle);

            // Determinism: same input yields same output
            expect(result1).toEqual(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be pure: does not mutate the input vehicle", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryVehicleStatus()),
          (vehicle) => {
            const originalStatus = vehicle.status;
            const originalVehicle = { ...vehicle };

            openMaintenance(vehicle);

            // Vehicle object should not be mutated
            expect(vehicle.status).toBe(originalStatus);
            expect(vehicle).toEqual(originalVehicle);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should only depend on vehicle status, not other properties", () => {
      fc.assert(
        fc.property(
          arbitraryVehicleStatus(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 0, max: 10000000 }),
          fc.integer({ min: 0, max: 1000000 }),
          (status, regNum, odometer, cost) => {
            // Create two vehicles with same status but different properties
            const vehicle1 = createTestVehicle(status);
            vehicle1.registrationNumber = regNum;
            vehicle1.odometer = odometer;

            const vehicle2 = createTestVehicle(status);
            vehicle2.registrationNumber = regNum + "_different";
            vehicle2.odometer = odometer + 1000;
            vehicle2.acquisitionCost = cost;

            const result1 = openMaintenance(vehicle1);
            const result2 = openMaintenance(vehicle2);

            // Results should be identical despite different properties
            expect(result1.ok).toBe(result2.ok);
            if (result1.ok && result2.ok) {
              expect(result1.value).toBe(result2.value);
            }
            if (!result1.ok && !result2.ok) {
              expect(result1.error).toBe(result2.error);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should satisfy binary partition: every status is either accepted or rejected", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryVehicleStatus()),
          (vehicle) => {
            const result = openMaintenance(vehicle);

            // Every vehicle either succeeds (non-Retired) or fails (Retired)
            if (vehicle.status === "Retired") {
              expect(result.ok).toBe(false);
            } else {
              expect(result.ok).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 24: Closing maintenance restores Available unless the vehicle is Retired", () => {
    // **Validates: Requirements 7.3, 7.4**

    it("should always transition non-Retired vehicles to Available", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryNonRetiredStatus()),
          (vehicle) => {
            const newStatus = closeMaintenance(vehicle);

            // Requirement 7.3: Closing maintenance sets vehicle to Available
            expect(newStatus).toBe("Available");

            // Ensure vehicle was not Retired
            expect(vehicle.status).not.toBe("Retired");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should always preserve Retired status for Retired vehicles", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(fc.constant("Retired")),
          (vehicle) => {
            const newStatus = closeMaintenance(vehicle);

            // Requirement 7.4: Closing maintenance preserves Retired status
            expect(newStatus).toBe("Retired");

            // Ensure vehicle was Retired
            expect(vehicle.status).toBe("Retired");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be deterministic: same vehicle always produces same result", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryVehicleStatus()),
          (vehicle) => {
            const result1 = closeMaintenance(vehicle);
            const result2 = closeMaintenance(vehicle);

            // Determinism: same input yields same output
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be pure: does not mutate the input vehicle", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryVehicleStatus()),
          (vehicle) => {
            const originalStatus = vehicle.status;
            const originalVehicle = { ...vehicle };

            closeMaintenance(vehicle);

            // Vehicle object should not be mutated
            expect(vehicle.status).toBe(originalStatus);
            expect(vehicle).toEqual(originalVehicle);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should only depend on vehicle status, not other properties", () => {
      fc.assert(
        fc.property(
          arbitraryVehicleStatus(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 0, max: 10000000 }),
          (status, regNum, odometer) => {
            // Create two vehicles with same status but different properties
            const vehicle1 = createTestVehicle(status);
            vehicle1.registrationNumber = regNum;
            vehicle1.odometer = odometer;

            const vehicle2 = createTestVehicle(status);
            vehicle2.registrationNumber = regNum + "_diff";
            vehicle2.odometer = odometer + 5000;

            const result1 = closeMaintenance(vehicle1);
            const result2 = closeMaintenance(vehicle2);

            // Results should be identical despite different properties
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should satisfy binary partition: output is either Available or Retired", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryVehicleStatus()),
          (vehicle) => {
            const newStatus = closeMaintenance(vehicle);

            // Output must be one of the two expected values
            expect(["Available", "Retired"]).toContain(newStatus);

            // Verify the mapping is correct
            if (vehicle.status === "Retired") {
              expect(newStatus).toBe("Retired");
            } else {
              expect(newStatus).toBe("Available");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("State Machine Correctness Properties", () => {
    it("should maintain correct state transitions: Available → In Shop → Available", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(fc.constant("Available")),
          (vehicle) => {
            // Step 1: Open maintenance
            const openResult = openMaintenance(vehicle);
            expect(openResult.ok).toBe(true);

            if (openResult.ok) {
              expect(openResult.value).toBe("In Shop");

              // Step 2: Close maintenance
              const updatedVehicle = { ...vehicle, status: openResult.value };
              const closeResult = closeMaintenance(updatedVehicle);
              expect(closeResult).toBe("Available");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should maintain correct state transitions for all non-Retired statuses", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryNonRetiredStatus()),
          (vehicle) => {
            const originalStatus = vehicle.status;

            // Open maintenance
            const openResult = openMaintenance(vehicle);
            expect(openResult.ok).toBe(true);

            if (openResult.ok) {
              expect(openResult.value).toBe("In Shop");

              // Close maintenance
              const updatedVehicle = { ...vehicle, status: openResult.value };
              const closeResult = closeMaintenance(updatedVehicle);
              expect(closeResult).toBe("Available");

              // Regardless of original status (Available/On Trip/In Shop),
              // the final state after open→close is always Available
              expect(closeResult).toBe("Available");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject Retired vehicles and preserve status through any operation", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(fc.constant("Retired")),
          (vehicle) => {
            // Attempt to open maintenance
            const openResult = openMaintenance(vehicle);
            expect(openResult.ok).toBe(false);
            expect(vehicle.status).toBe("Retired"); // Unchanged

            // Close maintenance still preserves Retired
            const closeResult = closeMaintenance(vehicle);
            expect(closeResult).toBe("Retired");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be idempotent for closeMaintenance: closing an Available vehicle stays Available", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(fc.constant("Available")),
          (vehicle) => {
            const result = closeMaintenance(vehicle);
            expect(result).toBe("Available");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be idempotent for openMaintenance: opening an In Shop vehicle stays In Shop", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(fc.constant("In Shop")),
          (vehicle) => {
            const result = openMaintenance(vehicle);
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(result.value).toBe("In Shop");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should satisfy terminal state property: Retired is never changed by maintenance operations", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(fc.constant("Retired")),
          (vehicle) => {
            // Try opening maintenance
            const openResult = openMaintenance(vehicle);
            expect(openResult.ok).toBe(false);

            // Try closing maintenance
            const closeResult = closeMaintenance(vehicle);
            expect(closeResult).toBe("Retired");

            // Retired status is terminal and immutable through maintenance operations
            expect(vehicle.status).toBe("Retired");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should demonstrate state machine completeness: all transitions are defined", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryVehicleStatus()),
          (vehicle) => {
            // openMaintenance always returns a result (either ok or error)
            const openResult = openMaintenance(vehicle);
            expect(openResult).toBeDefined();
            expect(typeof openResult.ok).toBe("boolean");

            // closeMaintenance always returns a valid status
            const closeResult = closeMaintenance(vehicle);
            expect(closeResult).toBeDefined();
            expect(["Available", "On Trip", "In Shop", "Retired"]).toContain(closeResult);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Illegal State Transitions", () => {
    it("should verify that On Trip vehicles can be sent to In Shop (maintenance doesn't check On Trip)", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(fc.constant("On Trip")),
          (vehicle) => {
            // Even On Trip vehicles can be sent to maintenance (business rules are enforced elsewhere)
            const result = openMaintenance(vehicle);
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(result.value).toBe("In Shop");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should verify the state machine is fail-safe: no undefined behavior", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryVehicleStatus()),
          (vehicle) => {
            // Test both operations never throw or return undefined
            expect(() => openMaintenance(vehicle)).not.toThrow();
            expect(() => closeMaintenance(vehicle)).not.toThrow();

            const openResult = openMaintenance(vehicle);
            const closeResult = closeMaintenance(vehicle);

            expect(openResult).toBeDefined();
            expect(closeResult).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Cross-property verification", () => {
    it("should verify that openMaintenance and closeMaintenance are inverse operations for non-Retired vehicles", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(arbitraryNonRetiredStatus()),
          (vehicle) => {
            // Original status (can be any non-Retired status)
            const originalStatus = vehicle.status;

            // Open maintenance
            const openResult = openMaintenance(vehicle);
            expect(openResult.ok).toBe(true);

            if (openResult.ok) {
              const intermediateVehicle = { ...vehicle, status: openResult.value };

              // Close maintenance
              const finalStatus = closeMaintenance(intermediateVehicle);

              // After open→close, we always end at Available
              // (not necessarily the original status, this is the business rule)
              expect(finalStatus).toBe("Available");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should verify that Retired vehicles are consistently rejected/preserved across both operations", () => {
      fc.assert(
        fc.property(
          arbitraryVehicle(fc.constant("Retired")),
          (vehicle) => {
            // Open should reject
            const openResult = openMaintenance(vehicle);
            expect(openResult.ok).toBe(false);
            if (!openResult.ok) {
              expect(openResult.error).toContain("Retired");
            }

            // Close should preserve
            const closeResult = closeMaintenance(vehicle);
            expect(closeResult).toBe("Retired");

            // Consistency: both operations recognize Retired as terminal
            expect(vehicle.status).toBe("Retired");
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
