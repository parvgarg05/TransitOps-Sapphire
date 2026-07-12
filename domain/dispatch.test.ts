/**
 * Unit tests for dispatch eligibility functions
 * 
 * Tests verify that eligibleVehicles and eligibleDrivers correctly filter
 * the dispatch pool according to Requirements 5.2, 5.3, 5.4, 7.2
 */

import { describe, it, expect } from "vitest";
import { eligibleVehicles, eligibleDrivers } from "./dispatch";
import { Vehicle, Driver, VehicleStatus, DriverStatus } from "./types";

describe("eligibleVehicles", () => {
  it("should include vehicles with status Available", () => {
    const vehicles: Vehicle[] = [
      createVehicle("v1", "Available"),
      createVehicle("v2", "Available"),
    ];

    const result = eligibleVehicles(vehicles);

    expect(result).toHaveLength(2);
    expect(result.map(v => v.id)).toEqual(["v1", "v2"]);
  });

  it("should exclude vehicles with status On Trip", () => {
    const vehicles: Vehicle[] = [
      createVehicle("v1", "Available"),
      createVehicle("v2", "On Trip"),
    ];

    const result = eligibleVehicles(vehicles);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("v1");
  });

  it("should exclude vehicles with status In Shop (Requirement 5.3, 7.2)", () => {
    const vehicles: Vehicle[] = [
      createVehicle("v1", "Available"),
      createVehicle("v2", "In Shop"),
    ];

    const result = eligibleVehicles(vehicles);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("v1");
  });

  it("should exclude vehicles with status Retired (Requirement 5.3)", () => {
    const vehicles: Vehicle[] = [
      createVehicle("v1", "Available"),
      createVehicle("v2", "Retired"),
    ];

    const result = eligibleVehicles(vehicles);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("v1");
  });

  it("should return empty array when no vehicles are Available", () => {
    const vehicles: Vehicle[] = [
      createVehicle("v1", "On Trip"),
      createVehicle("v2", "In Shop"),
      createVehicle("v3", "Retired"),
    ];

    const result = eligibleVehicles(vehicles);

    expect(result).toHaveLength(0);
  });

  it("should return empty array for empty input", () => {
    const result = eligibleVehicles([]);
    expect(result).toHaveLength(0);
  });
});

describe("eligibleDrivers", () => {
  const today = new Date("2024-06-15");

  it("should include drivers with status Available and valid license", () => {
    const drivers: Driver[] = [
      createDriver("d1", "Available", new Date("2025-01-01")),
      createDriver("d2", "Available", new Date("2024-12-31")),
    ];

    const result = eligibleDrivers(drivers, today);

    expect(result).toHaveLength(2);
    expect(result.map(d => d.id)).toEqual(["d1", "d2"]);
  });

  it("should exclude drivers with status On Trip (Requirement 5.4)", () => {
    const drivers: Driver[] = [
      createDriver("d1", "Available", new Date("2025-01-01")),
      createDriver("d2", "On Trip", new Date("2025-01-01")),
    ];

    const result = eligibleDrivers(drivers, today);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("should exclude drivers with status Off Duty (Requirement 5.4)", () => {
    const drivers: Driver[] = [
      createDriver("d1", "Available", new Date("2025-01-01")),
      createDriver("d2", "Off Duty", new Date("2025-01-01")),
    ];

    const result = eligibleDrivers(drivers, today);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("should exclude drivers with status Suspended (Requirement 5.4)", () => {
    const drivers: Driver[] = [
      createDriver("d1", "Available", new Date("2025-01-01")),
      createDriver("d2", "Suspended", new Date("2025-01-01")),
    ];

    const result = eligibleDrivers(drivers, today);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("should exclude drivers with expired license even if Available (Requirement 5.4)", () => {
    const drivers: Driver[] = [
      createDriver("d1", "Available", new Date("2025-01-01")),
      createDriver("d2", "Available", new Date("2024-06-14")), // expired yesterday
    ];

    const result = eligibleDrivers(drivers, today);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("should include drivers whose license expires today (not yet expired)", () => {
    const drivers: Driver[] = [
      createDriver("d1", "Available", new Date("2024-06-15")), // expires today
    ];

    const result = eligibleDrivers(drivers, today);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("should return empty array when no drivers meet criteria", () => {
    const drivers: Driver[] = [
      createDriver("d1", "On Trip", new Date("2025-01-01")),
      createDriver("d2", "Available", new Date("2024-06-14")), // expired
      createDriver("d3", "Suspended", new Date("2025-01-01")),
    ];

    const result = eligibleDrivers(drivers, today);

    expect(result).toHaveLength(0);
  });

  it("should return empty array for empty input", () => {
    const result = eligibleDrivers([], today);
    expect(result).toHaveLength(0);
  });

  it("should handle multiple eligible drivers correctly", () => {
    const drivers: Driver[] = [
      createDriver("d1", "Available", new Date("2025-01-01")),
      createDriver("d2", "On Trip", new Date("2025-01-01")),
      createDriver("d3", "Available", new Date("2024-06-14")), // expired
      createDriver("d4", "Available", new Date("2024-12-31")),
      createDriver("d5", "Off Duty", new Date("2025-01-01")),
    ];

    const result = eligibleDrivers(drivers, today);

    expect(result).toHaveLength(2);
    expect(result.map(d => d.id)).toEqual(["d1", "d4"]);
  });
});

// Helper functions to create test entities

function createVehicle(id: string, status: VehicleStatus): Vehicle {
  return {
    id,
    registrationNumber: `REG-${id}`,
    name: `Vehicle ${id}`,
    type: "Truck",
    region: null,
    maxLoadCapacity: 10000,
    odometer: 50000,
    acquisitionCost: 100000,
    revenue: 0,
    status,
    createdAt: new Date("2024-01-01"),
  };
}

function createDriver(id: string, status: DriverStatus, licenseExpiryDate: Date): Driver {
  return {
    id,
    name: `Driver ${id}`,
    licenseNumber: `LIC-${id}`,
    licenseCategory: "Commercial",
    licenseExpiryDate,
    contactNumber: "555-0100",
    safetyScore: 85,
    status,
    createdAt: new Date("2024-01-01"),
  };
}
