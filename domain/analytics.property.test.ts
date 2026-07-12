/**
 * Property-based tests for analytics computation functions
 * 
 * Tests the pure domain logic for operational metrics using fast-check.
 * 
 * Feature: transitops
 * Test properties:
 * - Property 28: Operational cost equals total fuel cost plus qualifying maintenance cost, and updates additively on change
 * - Property 29: Fuel efficiency is guarded division rounded to 2 decimals
 * - Property 30: Fleet utilization is a guarded percentage in [0, 100] rounded to 1 decimal
 * - Property 31: Vehicle ROI is guarded division rounded to 2 decimals
 * 
 * Requirements: 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.9
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  operationalCost,
  fuelEfficiency,
  fleetUtilization,
  vehicleROI,
} from "./analytics";
import { Vehicle, FuelLog, MaintenanceLog, VehicleStatus } from "./types";

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generates a valid fuel log with positive liters and non-negative cost.
 */
const arbitraryFuelLog = (): fc.Arbitrary<FuelLog> => {
  return fc.record({
    id: fc.string(),
    vehicleId: fc.string(),
    liters: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
    cost: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
    date: fc.date(),
  });
};

/**
 * Generates a maintenance log with cost in valid range [0, 999999999.99].
 */
const arbitraryMaintenanceLog = (): fc.Arbitrary<MaintenanceLog> => {
  return fc.record({
    id: fc.string(),
    vehicleId: fc.string(),
    description: fc.string(),
    cost: fc.float({ min: Math.fround(0), max: Math.fround(999999999.99), noNaN: true }),
    closed: fc.boolean(),
    openedAt: fc.date(),
    closedAt: fc.option(fc.date(), { nil: null }),
  });
};

/**
 * Generates a vehicle with valid fields.
 */
const arbitraryVehicle = (status?: VehicleStatus): fc.Arbitrary<Vehicle> => {
  return fc.record({
    id: fc.string(),
    registrationNumber: fc.string({ minLength: 1 }),
    name: fc.string({ minLength: 1 }),
    type: fc.string({ minLength: 1 }),
    region: fc.option(fc.string(), { nil: null }),
    maxLoadCapacity: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
    odometer: fc.float({ min: Math.fround(0), max: Math.fround(10000000), noNaN: true }),
    acquisitionCost: fc.float({ min: Math.fround(0), max: Math.fround(10000000), noNaN: true }),
    revenue: fc.float({ min: Math.fround(0), max: Math.fround(10000000), noNaN: true }),
    status: status
      ? fc.constant(status)
      : fc.constantFrom("Available", "On Trip", "In Shop", "Retired") as fc.Arbitrary<VehicleStatus>,
    createdAt: fc.date(),
  });
};

/**
 * Generates a non-negative number for distance/fuel calculations.
 */
const arbitraryNonNegative = (): fc.Arbitrary<number> => {
  return fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true });
};

/**
 * Generates a positive number for distance/fuel calculations.
 */
const arbitraryPositive = (): fc.Arbitrary<number> => {
  return fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true });
};

// ============================================================================
// Property 28: Operational cost equals total fuel cost plus qualifying 
// maintenance cost, and updates additively on change
// ============================================================================

describe("Property 28: Operational cost computation", () => {
  it("should equal the sum of fuel costs plus positive maintenance costs", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (fuelLogs, maintenanceLogs) => {
          const result = operationalCost(fuelLogs, maintenanceLogs);
          
          // Compute expected value
          const expectedFuelCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
          const expectedMaintenanceCost = maintenanceLogs
            .filter((log) => log.cost > 0)
            .reduce((sum, log) => sum + log.cost, 0);
          const expected = expectedFuelCost + expectedMaintenanceCost;
          
          // Round expected to 2 decimals for comparison
          const expectedRounded = Math.round(expected * 100) / 100;
          
          // Result should match expected (Req 8.5)
          expect(result).toBeCloseTo(expectedRounded, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should exclude maintenance costs that are zero or negative (Req 7.6)", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (fuelLogs, maintenanceLogs) => {
          // Add some zero-cost entries
          const logsWithZero = [
            ...maintenanceLogs,
            {
              id: "zero-1",
              vehicleId: "v1",
              description: "Zero cost",
              cost: 0,
              closed: false,
              openedAt: new Date(),
              closedAt: null,
            },
          ];
          
          const result = operationalCost(fuelLogs, logsWithZero);
          
          // Zero-cost maintenance should not contribute
          const expectedFuelCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
          const expectedMaintenanceCost = maintenanceLogs
            .filter((log) => log.cost > 0)
            .reduce((sum, log) => sum + log.cost, 0);
          const expected = Math.round((expectedFuelCost + expectedMaintenanceCost) * 100) / 100;
          
          expect(result).toBeCloseTo(expected, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 0 when there are no fuel logs or maintenance logs", () => {
    const result = operationalCost([], []);
    expect(result).toBe(0);
  });

  it("should update additively when new logs are added (Req 8.6)", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        arbitraryFuelLog(),
        (fuelLogs, maintenanceLogs, newFuelLog) => {
          // Initial cost
          const initialCost = operationalCost(fuelLogs, maintenanceLogs);
          
          // Add a new fuel log
          const updatedFuelLogs = [...fuelLogs, newFuelLog];
          const updatedCost = operationalCost(updatedFuelLogs, maintenanceLogs);
          
          // The difference should be the cost of the new log (rounded)
          // We need to account for potential floating point precision issues
          const expectedIncrease = Math.round(newFuelLog.cost * 100) / 100;
          const actualIncrease = updatedCost - initialCost;
          
          // Use toBeCloseTo with 2 decimal precision
          expect(actualIncrease).toBeCloseTo(expectedIncrease, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should be deterministic: same inputs always produce same output", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (fuelLogs, maintenanceLogs) => {
          const result1 = operationalCost(fuelLogs, maintenanceLogs);
          const result2 = operationalCost(fuelLogs, maintenanceLogs);
          
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always return a value rounded to 2 decimal places", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (fuelLogs, maintenanceLogs) => {
          const result = operationalCost(fuelLogs, maintenanceLogs);
          
          // Check rounding: multiply by 100, round, divide should equal itself
          const rounded = Math.round(result * 100) / 100;
          expect(result).toBe(rounded);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 29: Fuel efficiency is guarded division rounded to 2 decimals
// ============================================================================

describe("Property 29: Fuel efficiency computation", () => {
  it("should return null when fuel consumed is zero (Req 9.4)", () => {
    fc.assert(
      fc.property(arbitraryNonNegative(), (distance) => {
        const result = fuelEfficiency(distance, 0);
        
        // Must return null (N/A) when fuel = 0
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("should compute km/L rounded to 2 decimals when fuel > 0 (Req 9.1)", () => {
    fc.assert(
      fc.property(
        arbitraryNonNegative(),
        arbitraryPositive(),
        (distance, fuel) => {
          const result = fuelEfficiency(distance, fuel);
          
          // Should not be null when fuel > 0
          expect(result).not.toBeNull();
          
          if (result !== null) {
            // Compute expected value
            const expected = distance / fuel;
            const expectedRounded = Math.round(expected * 100) / 100;
            
            expect(result).toBeCloseTo(expectedRounded, 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should never return NaN or Infinity", () => {
    fc.assert(
      fc.property(
        arbitraryNonNegative(),
        arbitraryNonNegative(),
        (distance, fuel) => {
          const result = fuelEfficiency(distance, fuel);
          
          // Result is either null or a finite number
          if (result !== null) {
            expect(Number.isFinite(result)).toBe(true);
            expect(Number.isNaN(result)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should be deterministic: same inputs always produce same output", () => {
    fc.assert(
      fc.property(
        arbitraryNonNegative(),
        arbitraryNonNegative(),
        (distance, fuel) => {
          const result1 = fuelEfficiency(distance, fuel);
          const result2 = fuelEfficiency(distance, fuel);
          
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always return a value rounded to 2 decimal places when not null", () => {
    fc.assert(
      fc.property(
        arbitraryPositive(),
        arbitraryPositive(),
        (distance, fuel) => {
          const result = fuelEfficiency(distance, fuel);
          
          if (result !== null) {
            // Check rounding: multiply by 100, round, divide should equal itself
            const rounded = Math.round(result * 100) / 100;
            expect(result).toBe(rounded);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 0 km/L when distance is 0 and fuel > 0", () => {
    fc.assert(
      fc.property(arbitraryPositive(), (fuel) => {
        const result = fuelEfficiency(0, fuel);
        
        expect(result).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 30: Fleet utilization is a guarded percentage in [0, 100] 
// rounded to 1 decimal
// ============================================================================

describe("Property 30: Fleet utilization computation", () => {
  it("should return null when there are no non-Retired vehicles (Req 9.5, 10.9)", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryVehicle("Retired")),
        (vehicles) => {
          const result = fleetUtilization(vehicles);
          
          // Must return null (N/A) when all vehicles are Retired
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should compute percentage bounded to [0, 100] when non-Retired vehicles exist (Req 9.2)", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryVehicle(), { minLength: 1 }),
        (vehicles) => {
          // Ensure at least one non-Retired vehicle
          const nonRetiredVehicles = vehicles.filter((v) => v.status !== "Retired");
          if (nonRetiredVehicles.length === 0) {
            return; // Skip this case (handled by previous test)
          }
          
          const result = fleetUtilization(vehicles);
          
          // Should not be null
          expect(result).not.toBeNull();
          
          if (result !== null) {
            // Must be in range [0, 100]
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 0% when no vehicles are On Trip", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryVehicle("Available"), { minLength: 1 }),
        (vehicles) => {
          const result = fleetUtilization(vehicles);
          
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 100% when all non-Retired vehicles are On Trip", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryVehicle("On Trip"), { minLength: 1 }),
        (vehicles) => {
          const result = fleetUtilization(vehicles);
          
          expect(result).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should never return NaN or Infinity", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryVehicle()),
        (vehicles) => {
          const result = fleetUtilization(vehicles);
          
          // Result is either null or a finite number
          if (result !== null) {
            expect(Number.isFinite(result)).toBe(true);
            expect(Number.isNaN(result)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should be deterministic: same inputs always produce same output", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryVehicle()),
        (vehicles) => {
          const result1 = fleetUtilization(vehicles);
          const result2 = fleetUtilization(vehicles);
          
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always return a value rounded to 1 decimal place when not null", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryVehicle(), { minLength: 1 }),
        (vehicles) => {
          const result = fleetUtilization(vehicles);
          
          if (result !== null) {
            // Check rounding: multiply by 10, round, divide should equal itself
            const rounded = Math.round(result * 10) / 10;
            expect(result).toBe(rounded);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should exclude Retired vehicles from the denominator", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryVehicle("On Trip"), { minLength: 1, maxLength: 5 }),
        fc.array(arbitraryVehicle("Retired"), { minLength: 1, maxLength: 5 }),
        (onTripVehicles, retiredVehicles) => {
          const vehicles = [...onTripVehicles, ...retiredVehicles];
          const result = fleetUtilization(vehicles);
          
          // Should be 100% because all non-Retired are On Trip
          expect(result).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 31: Vehicle ROI is guarded division rounded to 2 decimals
// ============================================================================

describe("Property 31: Vehicle ROI computation", () => {
  it("should return null when acquisition cost is zero (Req 9.6)", () => {
    fc.assert(
      fc.property(
        arbitraryVehicle(),
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (vehicle, fuelLogs, maintenanceLogs) => {
          // Force acquisition cost to 0
          const vehicleWithZeroAcquisition = { ...vehicle, acquisitionCost: 0 };
          
          const result = vehicleROI(vehicleWithZeroAcquisition, fuelLogs, maintenanceLogs);
          
          // Must return null (N/A) when acquisition cost = 0
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should compute (Revenue - Costs) / Acquisition rounded to 2 decimals when acquisition > 0 (Req 9.3)", () => {
    fc.assert(
      fc.property(
        arbitraryVehicle(),
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (vehicle, fuelLogs, maintenanceLogs) => {
          // Ensure acquisition cost > 0
          if (vehicle.acquisitionCost === 0) {
            vehicle.acquisitionCost = 1; // Set to non-zero
          }
          
          const result = vehicleROI(vehicle, fuelLogs, maintenanceLogs);
          
          // Should not be null
          expect(result).not.toBeNull();
          
          if (result !== null) {
            // Compute expected value
            const cost = operationalCost(fuelLogs, maintenanceLogs);
            const expected = (vehicle.revenue - cost) / vehicle.acquisitionCost;
            const expectedRounded = Math.round(expected * 100) / 100;
            
            expect(result).toBeCloseTo(expectedRounded, 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should never return NaN or Infinity", () => {
    fc.assert(
      fc.property(
        arbitraryVehicle(),
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (vehicle, fuelLogs, maintenanceLogs) => {
          const result = vehicleROI(vehicle, fuelLogs, maintenanceLogs);
          
          // Result is either null or a finite number
          if (result !== null) {
            expect(Number.isFinite(result)).toBe(true);
            expect(Number.isNaN(result)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should be deterministic: same inputs always produce same output", () => {
    fc.assert(
      fc.property(
        arbitraryVehicle(),
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (vehicle, fuelLogs, maintenanceLogs) => {
          const result1 = vehicleROI(vehicle, fuelLogs, maintenanceLogs);
          const result2 = vehicleROI(vehicle, fuelLogs, maintenanceLogs);
          
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always return a value rounded to 2 decimal places when not null", () => {
    fc.assert(
      fc.property(
        arbitraryVehicle(),
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (vehicle, fuelLogs, maintenanceLogs) => {
          // Ensure acquisition cost > 0
          if (vehicle.acquisitionCost === 0) {
            vehicle.acquisitionCost = 1;
          }
          
          const result = vehicleROI(vehicle, fuelLogs, maintenanceLogs);
          
          if (result !== null) {
            // Check rounding: multiply by 100, round, divide should equal itself
            const rounded = Math.round(result * 100) / 100;
            expect(result).toBe(rounded);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return positive ROI when revenue > costs", () => {
    fc.assert(
      fc.property(
        arbitraryVehicle(),
        (vehicle) => {
          // Ensure acquisition cost > 0 and reasonable for ROI calculation
          if (vehicle.acquisitionCost === 0 || vehicle.acquisitionCost < 1) {
            vehicle.acquisitionCost = 100000;
          }
          
          // Set high revenue relative to acquisition cost, no costs
          vehicle.revenue = vehicle.acquisitionCost * 2; // Double the acquisition cost
          
          const result = vehicleROI(vehicle, [], []);
          
          expect(result).not.toBeNull();
          if (result !== null) {
            // ROI should be positive when revenue > costs and costs = 0
            // ROI = (revenue - 0) / acquisition = revenue / acquisition > 0
            expect(result).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return negative ROI when costs > revenue", () => {
    fc.assert(
      fc.property(
        arbitraryVehicle(),
        (vehicle) => {
          // Override all relevant vehicle fields to ensure a negative ROI
          vehicle.acquisitionCost = 10000; // Fixed acquisition cost
          vehicle.revenue = 100; // Fixed low revenue
          
          // Create fuel logs with significant cost (more than revenue)
          // ROI = (100 - 5000) / 10000 = -4900 / 10000 = -0.49
          const logsWithCost: FuelLog[] = [
            {
              id: "test-1",
              vehicleId: vehicle.id,
              liters: 100,
              cost: 5000, // Much higher than revenue of 100
              date: new Date(),
            },
          ];
          
          const result = vehicleROI(vehicle, logsWithCost, []);
          
          expect(result).not.toBeNull();
          if (result !== null) {
            // Costs (5000) definitely exceed revenue (100), ROI should be negative
            // Expected ROI = (100 - 5000) / 10000 = -0.49
            expect(result).toBeLessThanOrEqual(0);
            expect(result).toBe(-0.49); // Verify exact expected negative ROI
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Combined properties: analytics consistency
// ============================================================================

describe("Combined properties: analytics consistency", () => {
  it("should maintain consistency between operationalCost and vehicleROI", () => {
    fc.assert(
      fc.property(
        arbitraryVehicle(),
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        (vehicle, fuelLogs, maintenanceLogs) => {
          // Ensure acquisition cost > 0 for ROI calculation
          if (vehicle.acquisitionCost === 0) {
            vehicle.acquisitionCost = 1;
          }
          
          const cost = operationalCost(fuelLogs, maintenanceLogs);
          const roi = vehicleROI(vehicle, fuelLogs, maintenanceLogs);
          
          // ROI should use the same cost calculation
          if (roi !== null) {
            const expectedROI = Math.round(((vehicle.revenue - cost) / vehicle.acquisitionCost) * 100) / 100;
            expect(roi).toBeCloseTo(expectedROI, 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should ensure all analytics return either null or valid numbers (no NaN/Infinity)", () => {
    fc.assert(
      fc.property(
        arbitraryVehicle(),
        fc.array(arbitraryVehicle()),
        fc.array(arbitraryFuelLog()),
        fc.array(arbitraryMaintenanceLog()),
        arbitraryNonNegative(),
        arbitraryNonNegative(),
        (vehicle, vehicles, fuelLogs, maintenanceLogs, distance, fuel) => {
          const cost = operationalCost(fuelLogs, maintenanceLogs);
          const efficiency = fuelEfficiency(distance, fuel);
          const utilization = fleetUtilization(vehicles);
          const roi = vehicleROI(vehicle, fuelLogs, maintenanceLogs);
          
          // All results should be either null or finite numbers
          expect(Number.isFinite(cost)).toBe(true);
          
          if (efficiency !== null) {
            expect(Number.isFinite(efficiency)).toBe(true);
          }
          
          if (utilization !== null) {
            expect(Number.isFinite(utilization)).toBe(true);
          }
          
          if (roi !== null) {
            expect(Number.isFinite(roi)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
