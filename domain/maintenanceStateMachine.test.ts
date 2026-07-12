/**
 * Unit tests for Maintenance State Machine
 * Feature: transitops
 * 
 * Tests the pure state transition functions for maintenance workflow.
 */

import { describe, it, expect } from "vitest";
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
