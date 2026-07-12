/**
 * Tests for Trip field validators
 * 
 * Requirements: 5.1, 5.8
 */

import { describe, it, expect } from "vitest";
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
