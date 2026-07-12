/**
 * Unit tests for dispatch eligibility functions
 * 
 * Tests verify that eligibleVehicles and eligibleDrivers correctly filter
 * the dispatch pool according to Requirements 5.2, 5.3, 5.4, 7.2
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
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

describe("Property-Based Tests", () => {
  // Custom arbitraries for generating test data
  
  /**
   * Arbitrary for VehicleStatus
   */
  const arbVehicleStatus = fc.constantFrom<VehicleStatus>(
    "Available",
    "On Trip",
    "In Shop",
    "Retired"
  );

  /**
   * Arbitrary for DriverStatus
   */
  const arbDriverStatus = fc.constantFrom<DriverStatus>(
    "Available",
    "On Trip",
    "Off Duty",
    "Suspended"
  );

  /**
   * Arbitrary for Vehicle domain entity
   */
  const arbVehicle = fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    registrationNumber: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    type: fc.constantFrom("Truck", "Van", "Bus", "Car"),
    region: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)),
    maxLoadCapacity: fc.integer({ min: 100, max: 100000 }),
    odometer: fc.integer({ min: 0, max: 10000000 }),
    acquisitionCost: fc.integer({ min: 0, max: 1000000 }),
    revenue: fc.integer({ min: 0, max: 1000000 }),
    status: arbVehicleStatus,
    createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date() }),
  }) as fc.Arbitrary<Vehicle>;

  /**
   * Arbitrary for Driver domain entity
   */
  const arbDriver = fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    licenseNumber: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    licenseCategory: fc.constantFrom("Commercial", "Private", "Heavy", "Light"),
    licenseExpiryDate: fc.date({ 
      min: new Date("2020-01-01"), 
      max: new Date("2030-12-31") 
    }),
    contactNumber: fc.string({ minLength: 7, maxLength: 15 }).filter(s => s.trim().length > 0),
    safetyScore: fc.integer({ min: 0, max: 100 }),
    status: arbDriverStatus,
    createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date() }),
  }) as fc.Arbitrary<Driver>;

  /**
   * Arbitrary for a current date (used for license expiry checks)
   */
  const arbToday = fc.date({ 
    min: new Date("2024-01-01"), 
    max: new Date("2025-12-31") 
  });

  // Feature: transitops, Property 13: The dispatch vehicle pool contains exactly the Available vehicles
  // **Validates: Requirements 5.2, 5.3, 7.2**
  it("Property 13: The dispatch vehicle pool contains exactly the Available vehicles", () => {
    fc.assert(
      fc.property(
        fc.array(arbVehicle, { minLength: 0, maxLength: 50 }),
        (vehicles) => {
          const eligible = eligibleVehicles(vehicles);
          const availableVehicles = vehicles.filter(v => v.status === "Available");

          // The eligible pool must contain exactly the Available vehicles
          expect(eligible).toHaveLength(availableVehicles.length);

          // Every eligible vehicle must be Available
          eligible.forEach(v => {
            expect(v.status).toBe("Available");
          });

          // Every Available vehicle must be in the eligible pool
          availableVehicles.forEach(av => {
            expect(eligible.find(e => e.id === av.id)).toBeDefined();
          });

          // No non-Available vehicle should be in the eligible pool
          const nonAvailableVehicles = vehicles.filter(v => v.status !== "Available");
          nonAvailableVehicles.forEach(nav => {
            expect(eligible.find(e => e.id === nav.id)).toBeUndefined();
          });

          // The eligible pool should contain exactly the same vehicles as Available (bijection)
          expect(new Set(eligible.map(v => v.id))).toEqual(
            new Set(availableVehicles.map(v => v.id))
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 13: Fail-closed - unknown status never appears in pool
  // **Validates: Requirements 5.2, 5.3, 7.2**
  it("Property 13: Fail-closed behavior - only Available status is eligible", () => {
    fc.assert(
      fc.property(
        fc.array(arbVehicle, { minLength: 1, maxLength: 50 }),
        (vehicles) => {
          const eligible = eligibleVehicles(vehicles);

          // FAIL-CLOSED: Only vehicles with status === "Available" should appear
          // This ensures that any new status added in the future is excluded by default
          const hasOnlyAvailable = eligible.every(v => v.status === "Available");
          expect(hasOnlyAvailable).toBe(true);

          // Double-check: count of eligible must equal count of Available
          const availableCount = vehicles.filter(v => v.status === "Available").length;
          expect(eligible).toHaveLength(availableCount);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 13: Specific exclusions - On Trip, In Shop, Retired
  // **Validates: Requirements 5.3, 7.2**
  it("Property 13: On Trip, In Shop, and Retired vehicles are excluded", () => {
    fc.assert(
      fc.property(
        fc.array(arbVehicle, { minLength: 0, maxLength: 50 }),
        (vehicles) => {
          const eligible = eligibleVehicles(vehicles);

          // Requirement 5.3: Exclude vehicles with status Retired or In Shop
          // Requirement 7.2: Vehicles with active maintenance are In Shop, thus excluded
          const onTripVehicles = vehicles.filter(v => v.status === "On Trip");
          const inShopVehicles = vehicles.filter(v => v.status === "In Shop");
          const retiredVehicles = vehicles.filter(v => v.status === "Retired");

          // None of these should appear in the eligible pool
          onTripVehicles.forEach(v => {
            expect(eligible.find(e => e.id === v.id)).toBeUndefined();
          });

          inShopVehicles.forEach(v => {
            expect(eligible.find(e => e.id === v.id)).toBeUndefined();
          });

          retiredVehicles.forEach(v => {
            expect(eligible.find(e => e.id === v.id)).toBeUndefined();
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 13: Empty input yields empty pool
  // **Validates: Requirements 5.2, 5.3, 7.2**
  it("Property 13: Empty vehicle list yields empty eligible pool", () => {
    const result = eligibleVehicles([]);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  // Feature: transitops, Property 14: The dispatch driver pool contains exactly the Available, valid-license drivers
  // **Validates: Requirements 5.4**
  it("Property 14: The dispatch driver pool contains exactly the Available, valid-license drivers", () => {
    fc.assert(
      fc.property(
        fc.array(arbDriver, { minLength: 0, maxLength: 50 }),
        arbToday,
        (drivers, today) => {
          // Skip invalid dates
          fc.pre(!isNaN(today.getTime()));
          
          const eligible = eligibleDrivers(drivers, today);

          // A driver is eligible IFF status === "Available" AND license not expired
          const expectedEligible = drivers.filter(d => {
            const expiryStart = new Date(d.licenseExpiryDate);
            expiryStart.setHours(0, 0, 0, 0);
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            
            const isExpired = expiryStart < todayStart;
            return d.status === "Available" && !isExpired;
          });

          // The eligible pool must match the expected eligible drivers
          expect(eligible).toHaveLength(expectedEligible.length);

          // Every eligible driver must be Available and have valid license
          eligible.forEach(d => {
            expect(d.status).toBe("Available");
            
            const expiryStart = new Date(d.licenseExpiryDate);
            expiryStart.setHours(0, 0, 0, 0);
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            
            expect(expiryStart >= todayStart).toBe(true);
          });

          // Every expected eligible driver must be in the eligible pool
          expectedEligible.forEach(ed => {
            expect(eligible.find(e => e.id === ed.id)).toBeDefined();
          });

          // The sets must be identical (bijection)
          expect(new Set(eligible.map(d => d.id))).toEqual(
            new Set(expectedEligible.map(d => d.id))
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 14: Fail-closed - only Available status is considered
  // **Validates: Requirements 5.4**
  it("Property 14: Fail-closed behavior - only Available status is eligible", () => {
    fc.assert(
      fc.property(
        fc.array(arbDriver, { minLength: 1, maxLength: 50 }),
        arbToday,
        (drivers, today) => {
          // Skip invalid dates
          fc.pre(!isNaN(today.getTime()));
          
          const eligible = eligibleDrivers(drivers, today);

          // FAIL-CLOSED: Only drivers with status === "Available" should appear
          const hasOnlyAvailable = eligible.every(d => d.status === "Available");
          expect(hasOnlyAvailable).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 14: Expired license exclusion
  // **Validates: Requirements 5.4**
  it("Property 14: Drivers with expired licenses are excluded even if Available", () => {
    fc.assert(
      fc.property(
        fc.array(arbDriver, { minLength: 0, maxLength: 50 }),
        arbToday,
        (drivers, today) => {
          // Skip invalid dates
          fc.pre(!isNaN(today.getTime()));
          
          const eligible = eligibleDrivers(drivers, today);

          // Filter drivers with expired licenses
          const expiredDrivers = drivers.filter(d => {
            const expiryStart = new Date(d.licenseExpiryDate);
            expiryStart.setHours(0, 0, 0, 0);
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            
            return expiryStart < todayStart;
          });

          // None of the expired drivers should be in the eligible pool
          // Even if they have status "Available"
          expiredDrivers.forEach(d => {
            expect(eligible.find(e => e.id === d.id)).toBeUndefined();
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 14: Status exclusions - On Trip, Off Duty, Suspended
  // **Validates: Requirements 5.4**
  it("Property 14: On Trip, Off Duty, and Suspended drivers are excluded", () => {
    fc.assert(
      fc.property(
        fc.array(arbDriver, { minLength: 0, maxLength: 50 }),
        arbToday,
        (drivers, today) => {
          // Skip invalid dates
          fc.pre(!isNaN(today.getTime()));
          
          const eligible = eligibleDrivers(drivers, today);

          // Requirement 5.4: Exclude drivers whose status is On Trip, Off Duty, or Suspended
          const onTripDrivers = drivers.filter(d => d.status === "On Trip");
          const offDutyDrivers = drivers.filter(d => d.status === "Off Duty");
          const suspendedDrivers = drivers.filter(d => d.status === "Suspended");

          // None of these should appear in the eligible pool
          // Even if their licenses are valid
          onTripDrivers.forEach(d => {
            expect(eligible.find(e => e.id === d.id)).toBeUndefined();
          });

          offDutyDrivers.forEach(d => {
            expect(eligible.find(e => e.id === d.id)).toBeUndefined();
          });

          suspendedDrivers.forEach(d => {
            expect(eligible.find(e => e.id === d.id)).toBeUndefined();
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 14: License expiring today is still valid
  // **Validates: Requirements 5.4**
  it("Property 14: Drivers whose license expires today are eligible", () => {
    fc.assert(
      fc.property(
        arbToday,
        (today) => {
          // Skip invalid dates
          fc.pre(!isNaN(today.getTime()));
          
          // Create a driver whose license expires exactly today
          const driver = createDriver("d1", "Available", today);
          
          const eligible = eligibleDrivers([driver], today);

          // License expiring today is NOT expired, so driver should be eligible
          expect(eligible).toHaveLength(1);
          expect(eligible[0].id).toBe("d1");

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 14: License expired yesterday is not eligible
  // **Validates: Requirements 5.4**
  it("Property 14: Drivers whose license expired yesterday are not eligible", () => {
    fc.assert(
      fc.property(
        arbToday,
        (today) => {
          // Skip invalid dates
          fc.pre(!isNaN(today.getTime()));
          
          // Create a driver whose license expired yesterday
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          const driver = createDriver("d1", "Available", yesterday);
          
          const eligible = eligibleDrivers([driver], today);

          // License expired yesterday, so driver should NOT be eligible
          expect(eligible).toHaveLength(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 14: Empty input yields empty pool
  // **Validates: Requirements 5.4**
  it("Property 14: Empty driver list yields empty eligible pool", () => {
    fc.assert(
      fc.property(
        arbToday,
        (today) => {
          // Skip invalid dates
          fc.pre(!isNaN(today.getTime()));
          
          const result = eligibleDrivers([], today);
          expect(result).toHaveLength(0);
          expect(result).toEqual([]);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property 14: Conjunction of conditions - both status AND license must be valid
  // **Validates: Requirements 5.4**
  it("Property 14: Both Available status AND valid license are required", () => {
    fc.assert(
      fc.property(
        fc.array(arbDriver, { minLength: 0, maxLength: 50 }),
        arbToday,
        (drivers, today) => {
          // Skip invalid dates
          fc.pre(!isNaN(today.getTime()));
          
          const eligible = eligibleDrivers(drivers, today);

          // Every eligible driver must satisfy BOTH conditions
          eligible.forEach(d => {
            // Condition 1: status === "Available"
            expect(d.status).toBe("Available");

            // Condition 2: license not expired
            const expiryStart = new Date(d.licenseExpiryDate);
            expiryStart.setHours(0, 0, 0, 0);
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            
            expect(expiryStart >= todayStart).toBe(true);
          });

          // Conversely: if a driver has Available status but expired license, they should NOT be eligible
          const availableButExpired = drivers.filter(d => {
            const expiryStart = new Date(d.licenseExpiryDate);
            expiryStart.setHours(0, 0, 0, 0);
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            
            const isExpired = expiryStart < todayStart;
            return d.status === "Available" && isExpired;
          });

          availableButExpired.forEach(d => {
            expect(eligible.find(e => e.id === d.id)).toBeUndefined();
          });

          // And if a driver has valid license but non-Available status, they should NOT be eligible
          const validLicenseButNotAvailable = drivers.filter(d => {
            const expiryStart = new Date(d.licenseExpiryDate);
            expiryStart.setHours(0, 0, 0, 0);
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            
            const isExpired = expiryStart < todayStart;
            return d.status !== "Available" && !isExpired;
          });

          validLicenseButNotAvailable.forEach(d => {
            expect(eligible.find(e => e.id === d.id)).toBeUndefined();
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: transitops, Property: Consistency - eligibility is deterministic
  // **Validates: Requirements 5.2, 5.3, 5.4, 7.2**
  it("Property: Eligibility checks are deterministic and consistent", () => {
    fc.assert(
      fc.property(
        fc.array(arbVehicle, { minLength: 0, maxLength: 20 }),
        fc.array(arbDriver, { minLength: 0, maxLength: 20 }),
        arbToday,
        (vehicles, drivers, today) => {
          // Skip invalid dates
          fc.pre(!isNaN(today.getTime()));
          
          // Running the same eligibility check multiple times should yield identical results
          const vehicleResult1 = eligibleVehicles(vehicles);
          const vehicleResult2 = eligibleVehicles(vehicles);
          const vehicleResult3 = eligibleVehicles(vehicles);

          expect(vehicleResult1.map(v => v.id)).toEqual(vehicleResult2.map(v => v.id));
          expect(vehicleResult2.map(v => v.id)).toEqual(vehicleResult3.map(v => v.id));

          const driverResult1 = eligibleDrivers(drivers, today);
          const driverResult2 = eligibleDrivers(drivers, today);
          const driverResult3 = eligibleDrivers(drivers, today);

          expect(driverResult1.map(d => d.id)).toEqual(driverResult2.map(d => d.id));
          expect(driverResult2.map(d => d.id)).toEqual(driverResult3.map(d => d.id));

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
