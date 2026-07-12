/**
 * Tests for Trip State Machine
 * 
 * Validates all trip lifecycle transitions and guards per Requirements 6.2-6.7
 * 
 * Feature: transitops
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { dispatchTrip, completeTrip, cancelTrip } from "./tripStateMachine";
import { Trip, Vehicle, TripStatus } from "./types";

// Test fixtures
const createDraftTrip = (): Trip => ({
  id: "trip-1",
  source: "City A",
  destination: "City B",
  vehicleId: "vehicle-1",
  driverId: "driver-1",
  createdByUserId: "user-1",
  cargoWeight: 1000,
  plannedDistance: 100,
  status: "Draft",
  createdAt: new Date(),
});

const createDispatchedTrip = (): Trip => ({
  ...createDraftTrip(),
  status: "Dispatched",
});

const createCompletedTrip = (): Trip => ({
  ...createDraftTrip(),
  status: "Completed",
  finalOdometer: 1100,
  fuelConsumed: 50,
});

const createCancelledTrip = (): Trip => ({
  ...createDraftTrip(),
  status: "Cancelled",
});

const createVehicle = (odometer: number = 1000): Vehicle => ({
  id: "vehicle-1",
  registrationNumber: "ABC123",
  name: "Truck 1",
  type: "Heavy Duty",
  region: "North",
  maxLoadCapacity: 5000,
  odometer,
  acquisitionCost: 50000,
  revenue: 0,
  status: "Available",
  createdAt: new Date(),
});

describe("dispatchTrip", () => {
  describe("Requirement 6.2: Dispatch Draft trip", () => {
    it("should transition Draft trip to Dispatched and set vehicle and driver to On Trip", () => {
      const trip = createDraftTrip();
      const result = dispatchTrip(trip);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.trip).toBe("Dispatched");
        expect(result.vehicle).toBe("On Trip");
        expect(result.driver).toBe("On Trip");
        expect(result.newOdometer).toBeUndefined();
      }
    });
  });

  describe("Requirement 6.6: Reject non-Draft trips", () => {
    it("should reject dispatching a Dispatched trip", () => {
      const trip = createDispatchedTrip();
      const result = dispatchTrip(trip);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Draft");
      }
    });

    it("should reject dispatching a Completed trip", () => {
      const trip = createCompletedTrip();
      const result = dispatchTrip(trip);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Draft");
      }
    });

    it("should reject dispatching a Cancelled trip", () => {
      const trip = createCancelledTrip();
      const result = dispatchTrip(trip);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Draft");
      }
    });
  });
});

describe("completeTrip", () => {
  describe("Requirement 6.3: Complete Dispatched trip with valid data", () => {
    it("should transition Dispatched trip to Completed with valid odometer and fuel", () => {
      const trip = createDispatchedTrip();
      const vehicle = createVehicle(1000);
      const result = completeTrip(trip, vehicle, 1100, 50);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.trip).toBe("Completed");
        expect(result.vehicle).toBe("Available");
        expect(result.driver).toBe("Available");
        expect(result.newOdometer).toBe(1100);
      }
    });

    it("should allow final odometer equal to current odometer", () => {
      const trip = createDispatchedTrip();
      const vehicle = createVehicle(1000);
      const result = completeTrip(trip, vehicle, 1000, 50);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.newOdometer).toBe(1000);
      }
    });

    it("should allow zero fuel consumed", () => {
      const trip = createDispatchedTrip();
      const vehicle = createVehicle(1000);
      const result = completeTrip(trip, vehicle, 1100, 0);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.trip).toBe("Completed");
      }
    });
  });

  describe("Requirement 6.5: Update vehicle odometer on completion", () => {
    it("should return the new odometer value", () => {
      const trip = createDispatchedTrip();
      const vehicle = createVehicle(5000);
      const result = completeTrip(trip, vehicle, 5250, 30);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.newOdometer).toBe(5250);
      }
    });
  });

  describe("Requirement 6.6: Reject non-Dispatched trips", () => {
    it("should reject completing a Draft trip", () => {
      const trip = createDraftTrip();
      const vehicle = createVehicle(1000);
      const result = completeTrip(trip, vehicle, 1100, 50);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Dispatched");
      }
    });

    it("should reject completing a Completed trip", () => {
      const trip = createCompletedTrip();
      const vehicle = createVehicle(1000);
      const result = completeTrip(trip, vehicle, 1200, 50);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Dispatched");
      }
    });

    it("should reject completing a Cancelled trip", () => {
      const trip = createCancelledTrip();
      const vehicle = createVehicle(1000);
      const result = completeTrip(trip, vehicle, 1100, 50);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Dispatched");
      }
    });
  });

  describe("Requirement 6.7: Validate odometer and fuel", () => {
    it("should reject final odometer less than current odometer", () => {
      const trip = createDispatchedTrip();
      const vehicle = createVehicle(1000);
      const result = completeTrip(trip, vehicle, 999, 50);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("odometer");
      }
    });

    it("should reject negative fuel consumed", () => {
      const trip = createDispatchedTrip();
      const vehicle = createVehicle(1000);
      const result = completeTrip(trip, vehicle, 1100, -1);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("negative");
      }
    });

    it("should reject both invalid odometer and negative fuel", () => {
      const trip = createDispatchedTrip();
      const vehicle = createVehicle(1000);
      const result = completeTrip(trip, vehicle, 900, -10);

      expect(result.ok).toBe(false);
      // Should fail on the first check (odometer in this case)
      if (!result.ok) {
        expect(result.error).toBeTruthy();
      }
    });
  });
});

describe("cancelTrip", () => {
  describe("Requirement 6.4: Cancel Dispatched trip", () => {
    it("should transition Dispatched trip to Cancelled and free vehicle and driver", () => {
      const trip = createDispatchedTrip();
      const result = cancelTrip(trip);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.trip).toBe("Cancelled");
        expect(result.vehicle).toBe("Available");
        expect(result.driver).toBe("Available");
        expect(result.newOdometer).toBeUndefined();
      }
    });
  });

  describe("Requirement 6.6: Reject non-Dispatched trips", () => {
    it("should reject cancelling a Draft trip", () => {
      const trip = createDraftTrip();
      const result = cancelTrip(trip);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Dispatched");
      }
    });

    it("should reject cancelling a Completed trip", () => {
      const trip = createCompletedTrip();
      const result = cancelTrip(trip);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Dispatched");
      }
    });

    it("should reject cancelling a Cancelled trip", () => {
      const trip = createCancelledTrip();
      const result = cancelTrip(trip);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Dispatched");
      }
    });
  });
});

describe("State machine invariants", () => {
  it("should maintain deterministic transitions (same input = same output)", () => {
    const trip = createDraftTrip();
    const result1 = dispatchTrip(trip);
    const result2 = dispatchTrip(trip);

    expect(result1).toEqual(result2);
  });

  it("should be pure (no side effects on input)", () => {
    const trip = createDraftTrip();
    const originalStatus = trip.status;

    dispatchTrip(trip);

    expect(trip.status).toBe(originalStatus);
  });

  it("should handle the full lifecycle: Draft -> Dispatched -> Completed", () => {
    const trip = createDraftTrip();
    const vehicle = createVehicle(1000);

    // Step 1: Dispatch
    const dispatchResult = dispatchTrip(trip);
    expect(dispatchResult.ok).toBe(true);

    // Step 2: Complete (simulate trip with new status)
    const dispatchedTrip = { ...trip, status: "Dispatched" as const };
    const completeResult = completeTrip(dispatchedTrip, vehicle, 1100, 50);
    expect(completeResult.ok).toBe(true);
  });

  it("should handle the full lifecycle: Draft -> Dispatched -> Cancelled", () => {
    const trip = createDraftTrip();

    // Step 1: Dispatch
    const dispatchResult = dispatchTrip(trip);
    expect(dispatchResult.ok).toBe(true);

    // Step 2: Cancel (simulate trip with new status)
    const dispatchedTrip = { ...trip, status: "Dispatched" as const };
    const cancelResult = cancelTrip(dispatchedTrip);
    expect(cancelResult.ok).toBe(true);
  });
});


// ============================================================================
// Property-Based Tests (fast-check)
// ============================================================================

describe("Property-Based Tests", () => {
  // Arbitrary generators for property tests
  const arbTripStatus = fc.constantFrom<TripStatus>("Draft", "Dispatched", "Completed", "Cancelled");

  const arbTrip = fc.record({
    id: fc.string(),
    source: fc.string(),
    destination: fc.string(),
    vehicleId: fc.string(),
    driverId: fc.string(),
    createdByUserId: fc.string(),
    cargoWeight: fc.double({ min: 0.1, max: 100000, noNaN: true }),
    plannedDistance: fc.double({ min: 0.1, max: 10000, noNaN: true }),
    status: arbTripStatus,
    createdAt: fc.date(),
  }) as fc.Arbitrary<Trip>;

  const arbVehicle = fc.record({
    id: fc.string(),
    registrationNumber: fc.string(),
    name: fc.string(),
    type: fc.string(),
    region: fc.option(fc.string(), { nil: null }),
    maxLoadCapacity: fc.double({ min: 1, max: 100000, noNaN: true }),
    odometer: fc.double({ min: 0, max: 10000000, noNaN: true }),
    acquisitionCost: fc.double({ min: 0, max: 1000000, noNaN: true }),
    revenue: fc.double({ min: 0, max: 1000000, noNaN: true }),
    status: fc.constantFrom("Available", "On Trip", "In Shop", "Retired"),
    createdAt: fc.date(),
  }) as fc.Arbitrary<Vehicle>;

  // Property 18: Dispatching a Draft trip moves all three entities to On Trip
  // **Validates: Requirements 6.2**
  describe("Property 18: Dispatching a Draft trip moves all three entities to On Trip", () => {
    it("should transition Draft trips to Dispatched with vehicle and driver On Trip", () => {
      // Feature: transitops, Property 18: Dispatching a Draft trip moves all three entities to On Trip
      fc.assert(
        fc.property(arbTrip, (trip) => {
          const draftTrip = { ...trip, status: "Draft" as const };
          const result = dispatchTrip(draftTrip);

          // When dispatching a Draft trip, it should always succeed
          expect(result.ok).toBe(true);

          if (result.ok) {
            // All three entities must transition to their "on trip" states
            expect(result.trip).toBe("Dispatched");
            expect(result.vehicle).toBe("On Trip");
            expect(result.driver).toBe("On Trip");
            // No odometer update on dispatch
            expect(result.newOdometer).toBeUndefined();
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should reject dispatching non-Draft trips", () => {
      // Feature: transitops, Property 18: Dispatching a Draft trip moves all three entities to On Trip (rejection case)
      fc.assert(
        fc.property(
          arbTrip,
          fc.constantFrom<Exclude<TripStatus, "Draft">>("Dispatched", "Completed", "Cancelled"),
          (trip, nonDraftStatus) => {
            const nonDraftTrip = { ...trip, status: nonDraftStatus };
            const result = dispatchTrip(nonDraftTrip);

            // Non-Draft trips should always be rejected
            expect(result.ok).toBe(false);

            if (!result.ok) {
              expect(result.error).toBeTruthy();
              expect(result.error.toLowerCase()).toContain("draft");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 19: Valid completion completes the trip, frees resources, and updates the odometer
  // **Validates: Requirements 6.3, 6.5**
  describe("Property 19: Valid completion completes the trip, frees resources, and updates the odometer", () => {
    it("should complete Dispatched trips with valid odometer and fuel", () => {
      // Feature: transitops, Property 19: Valid completion completes the trip, frees resources, and updates the odometer
      fc.assert(
        fc.property(
          arbTrip,
          arbVehicle,
          fc.double({ min: 0, max: 10000000, noNaN: true }), // finalOdometer
          fc.double({ min: 0, max: 10000, noNaN: true }),    // fuelConsumed
          (trip, vehicle, finalOdometer, fuelConsumed) => {
            // Ensure finalOdometer >= vehicle.odometer (valid case)
            const validFinalOdometer = Math.max(finalOdometer, vehicle.odometer);
            const dispatchedTrip = { ...trip, status: "Dispatched" as const };

            const result = completeTrip(dispatchedTrip, vehicle, validFinalOdometer, fuelConsumed);

            // Valid completion should always succeed
            expect(result.ok).toBe(true);

            if (result.ok) {
              // Trip should be completed
              expect(result.trip).toBe("Completed");
              // Vehicle and driver should be freed
              expect(result.vehicle).toBe("Available");
              expect(result.driver).toBe("Available");
              // Odometer should be updated to the final reading
              expect(result.newOdometer).toBe(validFinalOdometer);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject completion with odometer less than current odometer", () => {
      // Feature: transitops, Property 19: Valid completion completes the trip, frees resources, and updates the odometer (invalid odometer)
      fc.assert(
        fc.property(
          arbTrip,
          arbVehicle,
          fc.double({ min: 0, max: 10000, noNaN: true }),
          (trip, vehicle, fuelConsumed) => {
            // Ensure vehicle has a positive odometer so we can go below it
            const vehicleWithOdometer = { ...vehicle, odometer: Math.max(vehicle.odometer, 100) };
            const invalidOdometer = vehicleWithOdometer.odometer - 1;
            const dispatchedTrip = { ...trip, status: "Dispatched" as const };

            const result = completeTrip(dispatchedTrip, vehicleWithOdometer, invalidOdometer, fuelConsumed);

            // Should reject with invalid odometer
            expect(result.ok).toBe(false);

            if (!result.ok) {
              expect(result.error).toBeTruthy();
              expect(result.error.toLowerCase()).toContain("odometer");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject completion with negative fuel consumed", () => {
      // Feature: transitops, Property 19: Valid completion completes the trip, frees resources, and updates the odometer (negative fuel)
      fc.assert(
        fc.property(
          arbTrip,
          arbVehicle,
          fc.double({ min: -10000, max: -0.01, noNaN: true }), // negative fuel
          (trip, vehicle, negativeFuel) => {
            const validOdometer = vehicle.odometer + 100;
            const dispatchedTrip = { ...trip, status: "Dispatched" as const };

            const result = completeTrip(dispatchedTrip, vehicle, validOdometer, negativeFuel);

            // Should reject with negative fuel
            expect(result.ok).toBe(false);

            if (!result.ok) {
              expect(result.error).toBeTruthy();
              expect(result.error.toLowerCase()).toMatch(/negative|fuel/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 20: Cancelling a Dispatched trip frees resources
  // **Validates: Requirements 6.4**
  describe("Property 20: Cancelling a Dispatched trip frees resources", () => {
    it("should cancel Dispatched trips and free vehicle and driver", () => {
      // Feature: transitops, Property 20: Cancelling a Dispatched trip frees resources
      fc.assert(
        fc.property(arbTrip, (trip) => {
          const dispatchedTrip = { ...trip, status: "Dispatched" as const };
          const result = cancelTrip(dispatchedTrip);

          // Cancelling a Dispatched trip should always succeed
          expect(result.ok).toBe(true);

          if (result.ok) {
            // Trip should be cancelled
            expect(result.trip).toBe("Cancelled");
            // Vehicle and driver should be freed
            expect(result.vehicle).toBe("Available");
            expect(result.driver).toBe("Available");
            // No odometer update on cancel
            expect(result.newOdometer).toBeUndefined();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // Property 21: Complete and cancel are rejected when the trip is not Dispatched
  // **Validates: Requirements 6.6**
  describe("Property 21: Complete and cancel are rejected when the trip is not Dispatched", () => {
    it("should reject completing non-Dispatched trips", () => {
      // Feature: transitops, Property 21: Complete and cancel are rejected when the trip is not Dispatched (completion)
      fc.assert(
        fc.property(
          arbTrip,
          arbVehicle,
          fc.constantFrom<Exclude<TripStatus, "Dispatched">>("Draft", "Completed", "Cancelled"),
          fc.double({ min: 0, max: 10000000, noNaN: true }),
          fc.double({ min: 0, max: 10000, noNaN: true }),
          (trip, vehicle, nonDispatchedStatus, finalOdometer, fuelConsumed) => {
            const nonDispatchedTrip = { ...trip, status: nonDispatchedStatus };
            const validOdometer = Math.max(finalOdometer, vehicle.odometer);

            const result = completeTrip(nonDispatchedTrip, vehicle, validOdometer, fuelConsumed);

            // Non-Dispatched trips should always be rejected
            expect(result.ok).toBe(false);

            if (!result.ok) {
              expect(result.error).toBeTruthy();
              expect(result.error.toLowerCase()).toContain("dispatched");
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject cancelling non-Dispatched trips", () => {
      // Feature: transitops, Property 21: Complete and cancel are rejected when the trip is not Dispatched (cancellation)
      fc.assert(
        fc.property(
          arbTrip,
          fc.constantFrom<Exclude<TripStatus, "Dispatched">>("Draft", "Completed", "Cancelled"),
          (trip, nonDispatchedStatus) => {
            const nonDispatchedTrip = { ...trip, status: nonDispatchedStatus };
            const result = cancelTrip(nonDispatchedTrip);

            // Non-Dispatched trips should always be rejected
            expect(result.ok).toBe(false);

            if (!result.ok) {
              expect(result.error).toBeTruthy();
              expect(result.error.toLowerCase()).toContain("dispatched");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 22: Completion with an invalid odometer or fuel value is rejected without side effects
  // **Validates: Requirements 6.7**
  describe("Property 22: Completion with an invalid odometer or fuel value is rejected without side effects", () => {
    it("should reject and preserve state when odometer is invalid", () => {
      // Feature: transitops, Property 22: Completion with an invalid odometer or fuel value is rejected without side effects (invalid odometer)
      fc.assert(
        fc.property(
          arbTrip,
          arbVehicle,
          fc.double({ min: 0, max: 10000, noNaN: true }),
          (trip, vehicle, fuelConsumed) => {
            const vehicleWithOdometer = { ...vehicle, odometer: Math.max(vehicle.odometer, 100) };
            const invalidOdometer = vehicleWithOdometer.odometer - 1;
            const dispatchedTrip = { ...trip, status: "Dispatched" as const };
            
            // Capture original state
            const originalTripStatus = dispatchedTrip.status;
            const originalVehicleOdometer = vehicleWithOdometer.odometer;

            const result = completeTrip(dispatchedTrip, vehicleWithOdometer, invalidOdometer, fuelConsumed);

            // Should reject
            expect(result.ok).toBe(false);

            // Verify no side effects (inputs unchanged - purity check)
            expect(dispatchedTrip.status).toBe(originalTripStatus);
            expect(vehicleWithOdometer.odometer).toBe(originalVehicleOdometer);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject and preserve state when fuel is negative", () => {
      // Feature: transitops, Property 22: Completion with an invalid odometer or fuel value is rejected without side effects (negative fuel)
      fc.assert(
        fc.property(
          arbTrip,
          arbVehicle,
          fc.double({ min: -10000, max: -0.01, noNaN: true }),
          (trip, vehicle, negativeFuel) => {
            const validOdometer = vehicle.odometer + 100;
            const dispatchedTrip = { ...trip, status: "Dispatched" as const };
            
            // Capture original state
            const originalTripStatus = dispatchedTrip.status;
            const originalVehicleOdometer = vehicle.odometer;

            const result = completeTrip(dispatchedTrip, vehicle, validOdometer, negativeFuel);

            // Should reject
            expect(result.ok).toBe(false);

            // Verify no side effects (inputs unchanged - purity check)
            expect(dispatchedTrip.status).toBe(originalTripStatus);
            expect(vehicle.odometer).toBe(originalVehicleOdometer);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject when both odometer and fuel are invalid", () => {
      // Feature: transitops, Property 22: Completion with an invalid odometer or fuel value is rejected without side effects (both invalid)
      fc.assert(
        fc.property(
          arbTrip,
          arbVehicle,
          fc.double({ min: -10000, max: -0.01, noNaN: true }),
          (trip, vehicle, negativeFuel) => {
            const vehicleWithOdometer = { ...vehicle, odometer: Math.max(vehicle.odometer, 100) };
            const invalidOdometer = vehicleWithOdometer.odometer - 1;
            const dispatchedTrip = { ...trip, status: "Dispatched" as const };

            const result = completeTrip(dispatchedTrip, vehicleWithOdometer, invalidOdometer, negativeFuel);

            // Should reject (fails on first guard)
            expect(result.ok).toBe(false);

            if (!result.ok) {
              expect(result.error).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional property: State machine is deterministic and pure
  describe("Additional Property: State machine is pure and deterministic", () => {
    it("should produce identical results for identical inputs", () => {
      fc.assert(
        fc.property(arbTrip, (trip) => {
          const draftTrip = { ...trip, status: "Draft" as const };
          
          const result1 = dispatchTrip(draftTrip);
          const result2 = dispatchTrip(draftTrip);

          // Same input should produce same output
          expect(result1).toEqual(result2);
        }),
        { numRuns: 100 }
      );
    });

    it("should not mutate input objects", () => {
      fc.assert(
        fc.property(
          arbTrip,
          arbVehicle,
          fc.double({ min: 0, max: 10000000, noNaN: true }),
          fc.double({ min: 0, max: 10000, noNaN: true }),
          (trip, vehicle, finalOdometer, fuelConsumed) => {
            // Create snapshots of key properties to detect mutation
            const tripSnapshot = {
              status: trip.status,
              cargoWeight: trip.cargoWeight,
              plannedDistance: trip.plannedDistance,
            };
            const vehicleSnapshot = {
              odometer: vehicle.odometer,
              status: vehicle.status,
            };

            // Exercise all functions
            dispatchTrip(trip);
            completeTrip(trip, vehicle, finalOdometer, fuelConsumed);
            cancelTrip(trip);

            // Verify no mutation of key properties
            expect(trip.status).toBe(tripSnapshot.status);
            expect(trip.cargoWeight).toBe(tripSnapshot.cargoWeight);
            expect(trip.plannedDistance).toBe(tripSnapshot.plannedDistance);
            expect(vehicle.odometer).toBe(vehicleSnapshot.odometer);
            expect(vehicle.status).toBe(vehicleSnapshot.status);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
