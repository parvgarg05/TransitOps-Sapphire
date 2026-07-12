/**
 * Vehicle Service Tests
 * 
 * Tests for vehicle registry service layer functions
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/db";
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  retireVehicle,
} from "./vehicleService";
import { CreateVehicleInput, UpdateVehicleInput } from "../domain/validators/vehicle";

describe("Vehicle Service", () => {
  // Clean up test data before and after tests
  beforeAll(async () => {
    // Delete test vehicles
    await prisma.vehicle.deleteMany({
      where: {
        registrationNumber: {
          startsWith: "TEST-",
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.vehicle.deleteMany({
      where: {
        registrationNumber: {
          startsWith: "TEST-",
        },
      },
    });
    await prisma.$disconnect();
  });

  describe("createVehicle", () => {
    it("should create a vehicle with valid input and status Available", async () => {
      const input: CreateVehicleInput = {
        registrationNumber: "TEST-001",
        name: "Test Van",
        type: "Van",
        region: "North",
        maxLoadCapacity: 1000,
        odometer: 0,
        acquisitionCost: 50000,
        revenue: 0,
      };

      const result = await createVehicle(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.registrationNumber).toBe("TEST-001");
        expect(result.value.name).toBe("Test Van");
        expect(result.value.status).toBe("Available");
      }
    });

    it("should reject duplicate registration number", async () => {
      const input: CreateVehicleInput = {
        registrationNumber: "TEST-001",
        name: "Duplicate Van",
        type: "Van",
        maxLoadCapacity: 1000,
        odometer: 0,
        acquisitionCost: 50000,
      };

      const result = await createVehicle(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("already exists");
      }
    });

    it("should reject invalid max load capacity", async () => {
      const input: CreateVehicleInput = {
        registrationNumber: "TEST-002",
        name: "Invalid Van",
        type: "Van",
        maxLoadCapacity: 0, // Invalid: must be > 0
        odometer: 0,
        acquisitionCost: 50000,
      };

      const result = await createVehicle(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Maximum load capacity");
      }
    });

    it("should reject empty registration number", async () => {
      const input: CreateVehicleInput = {
        registrationNumber: "  ", // Empty after trim
        name: "No Reg Van",
        type: "Van",
        maxLoadCapacity: 1000,
        odometer: 0,
        acquisitionCost: 50000,
      };

      const result = await createVehicle(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Registration number");
      }
    });
  });

  describe("listVehicles", () => {
    it("should list all vehicles", async () => {
      const result = await listVehicles();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value.length).toBeGreaterThan(0);
      }
    });
  });

  describe("updateVehicle", () => {
    it("should update editable fields of a vehicle", async () => {
      // First create a vehicle
      const createInput: CreateVehicleInput = {
        registrationNumber: "TEST-UPDATE-001",
        name: "Original Name",
        type: "Truck",
        maxLoadCapacity: 2000,
        odometer: 100,
        acquisitionCost: 60000,
      };

      const createResult = await createVehicle(createInput);
      expect(createResult.ok).toBe(true);

      if (!createResult.ok) return;

      const vehicleId = createResult.value.id;

      // Update the vehicle
      const updateInput: UpdateVehicleInput = {
        name: "Updated Name",
        odometer: 150,
      };

      const updateResult = await updateVehicle(vehicleId, updateInput);

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.value.name).toBe("Updated Name");
        expect(updateResult.value.odometer).toBe(150);
        expect(updateResult.value.registrationNumber).toBe("TEST-UPDATE-001"); // Immutable
      }
    });

    it("should return error for non-existent vehicle", async () => {
      const updateInput: UpdateVehicleInput = {
        name: "Updated Name",
      };

      const result = await updateVehicle("non-existent-id", updateInput);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Vehicle not found");
      }
    });

    it("should reject invalid update values", async () => {
      // First create a vehicle
      const createInput: CreateVehicleInput = {
        registrationNumber: "TEST-UPDATE-002",
        name: "Test Vehicle",
        type: "Van",
        maxLoadCapacity: 1000,
        odometer: 100,
        acquisitionCost: 50000,
      };

      const createResult = await createVehicle(createInput);
      expect(createResult.ok).toBe(true);

      if (!createResult.ok) return;

      const vehicleId = createResult.value.id;

      // Try to update with invalid odometer
      const updateInput: UpdateVehicleInput = {
        odometer: -100, // Invalid: must be >= 0
      };

      const updateResult = await updateVehicle(vehicleId, updateInput);

      expect(updateResult.ok).toBe(false);
      if (!updateResult.ok) {
        expect(updateResult.error).toContain("Odometer");
      }
    });
  });

  describe("retireVehicle", () => {
    it("should set vehicle status to Retired", async () => {
      // First create a vehicle
      const createInput: CreateVehicleInput = {
        registrationNumber: "TEST-RETIRE-001",
        name: "Vehicle to Retire",
        type: "Truck",
        maxLoadCapacity: 2000,
        odometer: 500000,
        acquisitionCost: 40000,
      };

      const createResult = await createVehicle(createInput);
      expect(createResult.ok).toBe(true);

      if (!createResult.ok) return;

      const vehicleId = createResult.value.id;
      expect(createResult.value.status).toBe("Available");

      // Retire the vehicle
      const retireResult = await retireVehicle(vehicleId);

      expect(retireResult.ok).toBe(true);
      if (retireResult.ok) {
        expect(retireResult.value.status).toBe("Retired");
        expect(retireResult.value.id).toBe(vehicleId);
      }
    });

    it("should return error for non-existent vehicle", async () => {
      const result = await retireVehicle("non-existent-id");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Vehicle not found");
      }
    });
  });
});
