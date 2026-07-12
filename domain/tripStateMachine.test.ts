/**
 * Tests for Trip State Machine
 * 
 * Validates all trip lifecycle transitions and guards per Requirements 6.2-6.7
 */

import { describe, it, expect } from "vitest";
import { dispatchTrip, completeTrip, cancelTrip } from "./tripStateMachine";
import { Trip, Vehicle } from "./types";

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
