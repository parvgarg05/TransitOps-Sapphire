/**
 * Unit tests for capacity and conflict checks
 * 
 * Tests capacityOk and assignmentConflict functions
 * 
 * Requirements: 5.5, 5.6, 5.7
 */

import { describe, it, expect } from "vitest";
import { capacityOk, assignmentConflict } from "./capacityConflict";
import type { Vehicle, Driver } from "./types";

describe("capacityOk", () => {
  const mockVehicle: Vehicle = {
    id: "v1",
    registrationNumber: "ABC-123",
    name: "Truck 1",
    type: "Heavy",
    region: "North",
    maxLoadCapacity: 5000, // 5000 kg capacity
    odometer: 10000,
    acquisitionCost: 50000,
    revenue: 0,
    status: "Available",
    createdAt: new Date(),
  };

  it("should return true when cargo weight is less than capacity", () => {
    expect(capacityOk(4000, mockVehicle)).toBe(true);
    expect(capacityOk(1000, mockVehicle)).toBe(true);
    expect(capacityOk(1, mockVehicle)).toBe(true);
  });

  it("should return true when cargo weight equals capacity (Req 5.7)", () => {
    // Requirement 5.7: cargo weight ≤ capacity should be allowed
    expect(capacityOk(5000, mockVehicle)).toBe(true);
  });

  it("should return false when cargo weight exceeds capacity (Req 5.6)", () => {
    // Requirement 5.6: reject trips with cargo > capacity
    expect(capacityOk(5001, mockVehicle)).toBe(false);
    expect(capacityOk(6000, mockVehicle)).toBe(false);
    expect(capacityOk(10000, mockVehicle)).toBe(false);
  });

  it("should handle edge case with zero cargo weight", () => {
    // Zero cargo is technically valid (though business rules might reject it elsewhere)
    expect(capacityOk(0, mockVehicle)).toBe(true);
  });

  it("should work with different vehicle capacities", () => {
    const smallVehicle: Vehicle = { ...mockVehicle, maxLoadCapacity: 1000 };
    const largeVehicle: Vehicle = { ...mockVehicle, maxLoadCapacity: 20000 };

    expect(capacityOk(999, smallVehicle)).toBe(true);
    expect(capacityOk(1000, smallVehicle)).toBe(true);
    expect(capacityOk(1001, smallVehicle)).toBe(false);

    expect(capacityOk(19999, largeVehicle)).toBe(true);
    expect(capacityOk(20000, largeVehicle)).toBe(true);
    expect(capacityOk(20001, largeVehicle)).toBe(false);
  });

  it("should handle fractional weights correctly", () => {
    expect(capacityOk(4999.99, mockVehicle)).toBe(true);
    expect(capacityOk(5000.0, mockVehicle)).toBe(true);
    expect(capacityOk(5000.01, mockVehicle)).toBe(false);
  });
});

describe("assignmentConflict", () => {
  const mockVehicleAvailable: Vehicle = {
    id: "v1",
    registrationNumber: "ABC-123",
    name: "Truck 1",
    type: "Heavy",
    region: "North",
    maxLoadCapacity: 5000,
    odometer: 10000,
    acquisitionCost: 50000,
    revenue: 0,
    status: "Available",
    createdAt: new Date(),
  };

  const mockVehicleOnTrip: Vehicle = {
    ...mockVehicleAvailable,
    id: "v2",
    registrationNumber: "DEF-456",
    status: "On Trip",
  };

  const mockVehicleInShop: Vehicle = {
    ...mockVehicleAvailable,
    id: "v3",
    registrationNumber: "GHI-789",
    status: "In Shop",
  };

  const mockVehicleRetired: Vehicle = {
    ...mockVehicleAvailable,
    id: "v4",
    registrationNumber: "JKL-012",
    status: "Retired",
  };

  const mockDriverAvailable: Driver = {
    id: "d1",
    name: "John Doe",
    licenseNumber: "DL-12345",
    licenseCategory: "Heavy Vehicle",
    licenseExpiryDate: new Date("2025-12-31"),
    contactNumber: "+1234567890",
    safetyScore: 95,
    status: "Available",
    createdAt: new Date(),
  };

  const mockDriverOnTrip: Driver = {
    ...mockDriverAvailable,
    id: "d2",
    licenseNumber: "DL-67890",
    status: "On Trip",
  };

  const mockDriverOffDuty: Driver = {
    ...mockDriverAvailable,
    id: "d3",
    licenseNumber: "DL-11111",
    status: "Off Duty",
  };

  const mockDriverSuspended: Driver = {
    ...mockDriverAvailable,
    id: "d4",
    licenseNumber: "DL-22222",
    status: "Suspended",
  };

  it("should return no conflict when both vehicle and driver are Available", () => {
    const result = assignmentConflict(mockVehicleAvailable, mockDriverAvailable);
    expect(result).toEqual({ conflict: false });
  });

  it("should detect conflict when vehicle is On Trip (Req 5.5)", () => {
    const result = assignmentConflict(mockVehicleOnTrip, mockDriverAvailable);
    expect(result).toEqual({ conflict: true, resource: "vehicle" });
  });

  it("should detect conflict when driver is On Trip (Req 5.5)", () => {
    const result = assignmentConflict(mockVehicleAvailable, mockDriverOnTrip);
    expect(result).toEqual({ conflict: true, resource: "driver" });
  });

  it("should prioritize vehicle conflict when both are On Trip", () => {
    // When both are On Trip, vehicle is checked first
    const result = assignmentConflict(mockVehicleOnTrip, mockDriverOnTrip);
    expect(result).toEqual({ conflict: true, resource: "vehicle" });
  });

  it("should return no conflict when vehicle is In Shop (eligibility handles this separately)", () => {
    // In Shop vehicles should be filtered out during eligibility check,
    // but assignmentConflict specifically checks for "On Trip" status
    const result = assignmentConflict(mockVehicleInShop, mockDriverAvailable);
    expect(result).toEqual({ conflict: false });
  });

  it("should return no conflict when vehicle is Retired (eligibility handles this separately)", () => {
    // Retired vehicles should be filtered out during eligibility check,
    // but assignmentConflict specifically checks for "On Trip" status
    const result = assignmentConflict(mockVehicleRetired, mockDriverAvailable);
    expect(result).toEqual({ conflict: false });
  });

  it("should return no conflict when driver is Off Duty (eligibility handles this separately)", () => {
    // Off Duty drivers should be filtered out during eligibility check,
    // but assignmentConflict specifically checks for "On Trip" status
    const result = assignmentConflict(mockVehicleAvailable, mockDriverOffDuty);
    expect(result).toEqual({ conflict: false });
  });

  it("should return no conflict when driver is Suspended (eligibility handles this separately)", () => {
    // Suspended drivers should be filtered out during eligibility check,
    // but assignmentConflict specifically checks for "On Trip" status
    const result = assignmentConflict(mockVehicleAvailable, mockDriverSuspended);
    expect(result).toEqual({ conflict: false });
  });

  it("should handle various combinations of non-Available statuses correctly", () => {
    // Vehicle In Shop + Driver Off Duty = no conflict (not On Trip)
    expect(assignmentConflict(mockVehicleInShop, mockDriverOffDuty)).toEqual({ conflict: false });

    // Vehicle Retired + Driver Suspended = no conflict (not On Trip)
    expect(assignmentConflict(mockVehicleRetired, mockDriverSuspended)).toEqual({ conflict: false });

    // Vehicle On Trip + Driver Off Duty = vehicle conflict
    expect(assignmentConflict(mockVehicleOnTrip, mockDriverOffDuty)).toEqual({
      conflict: true,
      resource: "vehicle",
    });

    // Vehicle Retired + Driver On Trip = driver conflict
    expect(assignmentConflict(mockVehicleRetired, mockDriverOnTrip)).toEqual({
      conflict: true,
      resource: "driver",
    });
  });
});

describe("capacityOk and assignmentConflict integration", () => {
  it("should demonstrate typical validation flow", () => {
    const vehicle: Vehicle = {
      id: "v1",
      registrationNumber: "ABC-123",
      name: "Truck 1",
      type: "Heavy",
      region: "North",
      maxLoadCapacity: 5000,
      odometer: 10000,
      acquisitionCost: 50000,
      revenue: 0,
      status: "Available",
      createdAt: new Date(),
    };

    const driver: Driver = {
      id: "d1",
      name: "John Doe",
      licenseNumber: "DL-12345",
      licenseCategory: "Heavy Vehicle",
      licenseExpiryDate: new Date("2025-12-31"),
      contactNumber: "+1234567890",
      safetyScore: 95,
      status: "Available",
      createdAt: new Date(),
    };

    const cargoWeight = 4500;

    // Check capacity
    const hasCapacity = capacityOk(cargoWeight, vehicle);
    expect(hasCapacity).toBe(true);

    // Check conflicts
    const conflict = assignmentConflict(vehicle, driver);
    expect(conflict).toEqual({ conflict: false });

    // Trip would be valid if both checks pass
    expect(hasCapacity && !conflict.conflict).toBe(true);
  });

  it("should demonstrate rejection due to capacity", () => {
    const vehicle: Vehicle = {
      id: "v1",
      registrationNumber: "ABC-123",
      name: "Truck 1",
      type: "Heavy",
      region: "North",
      maxLoadCapacity: 5000,
      odometer: 10000,
      acquisitionCost: 50000,
      revenue: 0,
      status: "Available",
      createdAt: new Date(),
    };

    const driver: Driver = {
      id: "d1",
      name: "John Doe",
      licenseNumber: "DL-12345",
      licenseCategory: "Heavy Vehicle",
      licenseExpiryDate: new Date("2025-12-31"),
      contactNumber: "+1234567890",
      safetyScore: 95,
      status: "Available",
      createdAt: new Date(),
    };

    const cargoWeight = 6000; // Exceeds capacity

    const hasCapacity = capacityOk(cargoWeight, vehicle);
    expect(hasCapacity).toBe(false);

    const conflict = assignmentConflict(vehicle, driver);
    expect(conflict).toEqual({ conflict: false });

    // Trip would be rejected due to capacity
    expect(hasCapacity && !conflict.conflict).toBe(false);
  });

  it("should demonstrate rejection due to conflict", () => {
    const vehicle: Vehicle = {
      id: "v1",
      registrationNumber: "ABC-123",
      name: "Truck 1",
      type: "Heavy",
      region: "North",
      maxLoadCapacity: 5000,
      odometer: 10000,
      acquisitionCost: 50000,
      revenue: 0,
      status: "On Trip", // Already assigned
      createdAt: new Date(),
    };

    const driver: Driver = {
      id: "d1",
      name: "John Doe",
      licenseNumber: "DL-12345",
      licenseCategory: "Heavy Vehicle",
      licenseExpiryDate: new Date("2025-12-31"),
      contactNumber: "+1234567890",
      safetyScore: 95,
      status: "Available",
      createdAt: new Date(),
    };

    const cargoWeight = 4500;

    const hasCapacity = capacityOk(cargoWeight, vehicle);
    expect(hasCapacity).toBe(true);

    const conflict = assignmentConflict(vehicle, driver);
    expect(conflict).toEqual({ conflict: true, resource: "vehicle" });

    // Trip would be rejected due to conflict
    expect(hasCapacity && !conflict.conflict).toBe(false);
  });
});
