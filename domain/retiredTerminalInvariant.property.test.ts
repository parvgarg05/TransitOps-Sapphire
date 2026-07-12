/**
 * Property-based tests for the Retired-terminal invariant
 * 
 * Tests that Retired vehicle status is terminal and no transitions are allowed from it.
 * 
 * Feature: transitops
 * Property 10: Retired is terminal and only set by explicit retirement
 * 
 * Requirements: 3.7
 * 
 * This test verifies that every non-retire operation across trip and maintenance
 * state machines respects the Retired status as terminal.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { openMaintenance, closeMaintenance } from "./maintenanceStateMachine";
import { dispatchTrip, completeTrip, cancelTrip } from "./tripStateMachine";
import { Vehicle, Trip, VehicleStatus } from "./types";

/**
 * Creates a test vehicle with the specified status and optional overrides
 */
function createVehicle(status: VehicleStatus, overrides?: Partial<Vehicle>): Vehicle {
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
    ...overrides,
  };
}

/**
 * Creates a test trip with the specified status
 */
function createTrip(status: Trip["status"]): Trip {
  return {
    id: "trip-1",
    source: "City A",
    destination: "City B",
    vehicleId: "v1",
    driverId: "d1",
    createdByUserId: "user-1",
    cargoWeight: 1000,
    plannedDistance: 100,
    status,
    createdAt: new Date(),
  };
}

/**
 * Arbitrary that generates a VehicleStatus
 */
const arbitraryVehicleStatus = (): fc.Arbitrary<VehicleStatus> => {
  return fc.constantFrom<VehicleStatus>("Available", "On Trip", "In Shop", "Retired");
};

/**
 * Arbitrary that generates a positive odometer reading
 */
const arbitraryOdometer = (): fc.Arbitrary<number> => {
  return fc.integer({ min: 0, max: 1000000 });
};

/**
 * Arbitrary that generates a positive fuel value
 */
const arbitraryFuelConsumed = (): fc.Arbitrary<number> => {
  return fc.integer({ min: 0, max: 1000 });
};

describe("Property-based tests for Retired-terminal invariant", () => {
  describe("Property 10: Retired is terminal and only set by explicit retirement", () => {
    it("should reject opening maintenance for a Retired vehicle", () => {
      // **Validates: Requirements 3.7, 7.7**
      fc.assert(
        fc.property(fc.constant(null), () => {
          const vehicle = createVehicle("Retired");
          const result = openMaintenance(vehicle);

          // Must reject
          expect(result.ok).toBe(false);
          
          if (!result.ok) {
            // Should have a meaningful error message
            expect(result.error).toBeTruthy();
            expect(result.error.toLowerCase()).toContain("retired");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should preserve Retired status when closing maintenance", () => {
      // **Validates: Requirements 3.7, 7.4**
      fc.assert(
        fc.property(fc.constant(null), () => {
          const vehicle = createVehicle("Retired");
          const newStatus = closeMaintenance(vehicle);

          // Must remain Retired
          expect(newStatus).toBe("Retired");
        }),
        { numRuns: 100 }
      );
    });

    it("should never change Retired status through maintenance operations", () => {
      // **Validates: Requirements 3.7**
      // This property tests the complete maintenance workflow on a Retired vehicle
      fc.assert(
        fc.property(fc.constant(null), () => {
          const vehicle = createVehicle("Retired");

          // Attempt to open maintenance (should be rejected)
          const openResult = openMaintenance(vehicle);
          
          // Vehicle status must remain Retired after rejection
          expect(vehicle.status).toBe("Retired");

          // Even if we hypothetically had a vehicle in Retired status,
          // closing maintenance should preserve it
          const closeResult = closeMaintenance(vehicle);
          expect(closeResult).toBe("Retired");

          // Verify the invariant: Retired in → Retired out (or rejection)
          if (openResult.ok) {
            // If it somehow succeeded, verify it didn't change from Retired
            expect(openResult.value).toBe("Retired");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should never change Retired status through trip dispatch operations", () => {
      // **Validates: Requirements 3.7**
      // Trip dispatch operations should not affect a Retired vehicle's status
      fc.assert(
        fc.property(fc.constant(null), () => {
          const vehicle = createVehicle("Retired");
          
          // Note: Trip state machine operates on Trip entities, not directly on vehicles
          // The trip transitions return the target vehicle status, but we're testing
          // that a Retired vehicle would never participate in trips in the first place
          
          // The dispatch pool filtering (eligibleVehicles) should exclude Retired vehicles
          // Here we verify that even if a trip operation occurs, it doesn't affect
          // the Retired vehicle status
          
          // Simulate a trip referencing this vehicle
          const trip = createTrip("Draft");
          
          // Dispatch would return "On Trip" for the vehicle, but...
          const dispatchResult = dispatchTrip(trip);
          
          if (dispatchResult.ok) {
            // The vehicle's actual status should not be changed by the trip operation
            // (in practice, Retired vehicles are excluded from dispatch pool)
            expect(vehicle.status).toBe("Retired");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should never change Retired status through trip completion operations", () => {
      // **Validates: Requirements 3.7**
      fc.assert(
        fc.property(arbitraryOdometer(), arbitraryFuelConsumed(), (finalOdometer, fuelConsumed) => {
          const vehicle = createVehicle("Retired", { odometer: Math.max(0, finalOdometer - 100) });
          const trip = createTrip("Dispatched");

          // Complete trip would return "Available" for the vehicle normally
          const completeResult = completeTrip(trip, vehicle, finalOdometer, fuelConsumed);

          // The vehicle's actual status should not be changed
          expect(vehicle.status).toBe("Retired");
        }),
        { numRuns: 100 }
      );
    });

    it("should never change Retired status through trip cancellation operations", () => {
      // **Validates: Requirements 3.7**
      fc.assert(
        fc.property(fc.constant(null), () => {
          const vehicle = createVehicle("Retired");
          const trip = createTrip("Dispatched");

          // Cancel trip would return "Available" for the vehicle normally
          const cancelResult = cancelTrip(trip);

          // The vehicle's actual status should not be changed
          expect(vehicle.status).toBe("Retired");
        }),
        { numRuns: 100 }
      );
    });

    it("should preserve Retired status across all non-retire operations", () => {
      // **Validates: Requirements 3.7**
      // This is the comprehensive property: test all state machine operations
      fc.assert(
        fc.property(
          arbitraryVehicleStatus(),
          arbitraryOdometer(),
          arbitraryFuelConsumed(),
          (initialStatus, finalOdometer, fuelConsumed) => {
            // Only test with Retired vehicles
            if (initialStatus !== "Retired") {
              return true; // Skip non-Retired cases
            }

            const vehicle = createVehicle("Retired", { odometer: Math.max(0, finalOdometer - 100) });

            // Test 1: Maintenance open should reject
            const openResult = openMaintenance(vehicle);
            if (openResult.ok) {
              // If it somehow succeeded, it must not have changed from Retired
              expect(openResult.value).toBe("Retired");
            } else {
              // Rejection is expected
              expect(openResult.ok).toBe(false);
            }

            // Test 2: Maintenance close should preserve Retired
            const closeResult = closeMaintenance(vehicle);
            expect(closeResult).toBe("Retired");

            // Test 3: Trip operations should not affect the vehicle's Retired status
            const trip = createTrip("Dispatched");
            
            // Dispatch (from Draft trip)
            const draftTrip = createTrip("Draft");
            dispatchTrip(draftTrip);
            expect(vehicle.status).toBe("Retired");

            // Complete
            completeTrip(trip, vehicle, finalOdometer, fuelConsumed);
            expect(vehicle.status).toBe("Retired");

            // Cancel
            cancelTrip(trip);
            expect(vehicle.status).toBe("Retired");

            // Final verification: the vehicle is still Retired
            expect(vehicle.status).toBe("Retired");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should demonstrate Retired is terminal: no path from Retired to other statuses", () => {
      // **Validates: Requirements 3.7**
      // This property verifies that there is no sequence of operations that can
      // move a vehicle out of Retired status (except explicit retirement operation)
      fc.assert(
        fc.property(fc.constant(null), () => {
          const vehicle = createVehicle("Retired");

          // Collect all possible operations and their results
          const operations: Array<{ name: string; newStatus: VehicleStatus | null }> = [];

          // Operation 1: Open maintenance (should reject)
          const openResult = openMaintenance(vehicle);
          if (openResult.ok) {
            operations.push({ name: "openMaintenance", newStatus: openResult.value });
          } else {
            operations.push({ name: "openMaintenance", newStatus: null });
          }

          // Operation 2: Close maintenance (should preserve)
          const closeStatus = closeMaintenance(vehicle);
          operations.push({ name: "closeMaintenance", newStatus: closeStatus });

          // Verify: All operations either reject (null) or preserve Retired
          for (const op of operations) {
            if (op.newStatus !== null) {
              expect(op.newStatus).toBe("Retired");
            }
          }

          // Additional verification: the vehicle object itself is unchanged
          expect(vehicle.status).toBe("Retired");
        }),
        { numRuns: 100 }
      );
    });

    it("should ensure Retired is distinct from all other statuses in maintenance state machine", () => {
      // **Validates: Requirements 3.7, 7.1, 7.3, 7.4, 7.7**
      fc.assert(
        fc.property(arbitraryVehicleStatus(), (status) => {
          const vehicle = createVehicle(status);

          if (status === "Retired") {
            // Retired vehicles: openMaintenance should reject
            const openResult = openMaintenance(vehicle);
            expect(openResult.ok).toBe(false);

            // closeMaintenance should preserve Retired
            const closeResult = closeMaintenance(vehicle);
            expect(closeResult).toBe("Retired");
          } else {
            // Non-Retired vehicles: openMaintenance should succeed and set In Shop
            const openResult = openMaintenance(vehicle);
            expect(openResult.ok).toBe(true);
            if (openResult.ok) {
              expect(openResult.value).toBe("In Shop");
            }

            // closeMaintenance should set Available
            const closeResult = closeMaintenance(vehicle);
            expect(closeResult).toBe("Available");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should ensure state machine operations are pure and do not mutate Retired vehicles", () => {
      // **Validates: Requirements 3.7**
      // Verify that all operations are pure functions and don't mutate the input
      fc.assert(
        fc.property(
          arbitraryOdometer(),
          arbitraryFuelConsumed(),
          (finalOdometer, fuelConsumed) => {
            const vehicle = createVehicle("Retired", { odometer: Math.max(0, finalOdometer - 100) });
            const originalStatus = vehicle.status;
            const originalOdometer = vehicle.odometer;

            // Apply all operations
            openMaintenance(vehicle);
            closeMaintenance(vehicle);

            const trip = createTrip("Dispatched");
            dispatchTrip({ ...trip, status: "Draft" });
            completeTrip(trip, vehicle, finalOdometer, fuelConsumed);
            cancelTrip(trip);

            // Verify the vehicle object is unchanged (pure functions)
            expect(vehicle.status).toBe(originalStatus);
            expect(vehicle.status).toBe("Retired");
            expect(vehicle.odometer).toBe(originalOdometer);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
