/**
 * Unit tests for vehicle field validators
 * 
 * Requirements: 3.1, 3.8
 */

import { describe, it, expect } from "vitest";
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
});
