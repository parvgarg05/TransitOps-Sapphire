/**
 * Property-based tests for dashboard KPI count logic
 * 
 * Tests the pure domain logic for dashboard KPI computations using fast-check.
 * 
 * Feature: transitops
 * Test property:
 * - Property 33: Dashboard KPI counts match their status predicates, including under filters
 * 
 * Requirements: 10.2, 10.3, 10.4, 10.5, 10.7, 10.8
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  countActiveVehicles,
  countAvailableVehicles,
  countVehiclesInMaintenance,
  countActiveTrips,
  countPendingTrips,
  countDriversOnDuty,
  computeDashboardKpis,
  type VehicleFilters,
} from "./dashboardKpis";
import type { Vehicle, Driver, Trip, VehicleStatus, DriverStatus, TripStatus } from "./types";

// ============================================================================
// Arbitraries for generating test data
// ============================================================================

/**
 * Generates a random vehicle status.
 */
const arbitraryVehicleStatus = (): fc.Arbitrary<VehicleStatus> =>
  fc.constantFrom("Available", "On Trip", "In Shop", "Retired");

/**
 * Generates a random driver status.
 */
const arbitraryDriverStatus = (): fc.Arbitrary<DriverStatus> =>
  fc.constantFrom("Available", "On Trip", "Off Duty", "Suspended");

/**
 * Generates a random trip status.
 */
const arbitraryTripStatus = (): fc.Arbitrary<TripStatus> =>
  fc.constantFrom("Draft", "Dispatched", "Completed", "Cancelled");

/**
 * Generates a random vehicle type.
 */
const arbitraryVehicleType = (): fc.Arbitrary<string> =>
  fc.constantFrom("Truck", "Van", "Trailer", "Bus", "Sedan");

/**
 * Generates a random region.
 */
const arbitraryRegion = (): fc.Arbitrary<string> =>
  fc.constantFrom("North", "South", "East", "West", "Central");

/**
 * Generates a vehicle with all required properties.
 */
const arbitraryVehicle = (): fc.Arbitrary<Vehicle> =>
  fc.record({
    id: fc.uuid(),
    registrationNumber: fc.string({ minLength: 3, maxLength: 10 }),
    name: fc.string({ minLength: 3, maxLength: 20 }),
    type: arbitraryVehicleType(),
    region: fc.option(arbitraryRegion(), { nil: null }),
    maxLoadCapacity: fc.integer({ min: 100, max: 100000 }),
    odometer: fc.integer({ min: 0, max: 1000000 }),
    acquisitionCost: fc.integer({ min: 0, max: 1000000 }),
    revenue: fc.integer({ min: 0, max: 1000000 }),
    status: arbitraryVehicleStatus(),
    createdAt: fc.date(),
  });

/**
 * Generates a driver with all required properties.
 */
const arbitraryDriver = (): fc.Arbitrary<Driver> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 20 }),
    licenseNumber: fc.string({ minLength: 5, maxLength: 15 }),
    licenseCategory: fc.constantFrom("CDL-A", "CDL-B", "Regular"),
    licenseExpiryDate: fc.date(),
    contactNumber: fc.string({ minLength: 10, maxLength: 15 }),
    safetyScore: fc.integer({ min: 0, max: 100 }),
    status: arbitraryDriverStatus(),
    createdAt: fc.date(),
  });

/**
 * Generates a trip with all required properties.
 */
const arbitraryTrip = (vehicleIds: string[], driverIds: string[]): fc.Arbitrary<Trip> => {
  const vehicleIdArbitrary = vehicleIds.length > 0 
    ? fc.constantFrom(...vehicleIds) 
    : fc.uuid();
  const driverIdArbitrary = driverIds.length > 0 
    ? fc.constantFrom(...driverIds) 
    : fc.uuid();

  return fc.record({
    id: fc.uuid(),
    source: fc.string({ minLength: 3, maxLength: 20 }),
    destination: fc.string({ minLength: 3, maxLength: 20 }),
    vehicleId: vehicleIdArbitrary,
    driverId: driverIdArbitrary,
    createdByUserId: fc.uuid(),
    cargoWeight: fc.integer({ min: 1, max: 50000 }),
    plannedDistance: fc.integer({ min: 1, max: 5000 }),
    finalOdometer: fc.option(fc.integer({ min: 0, max: 1000000 }), { nil: null }),
    fuelConsumed: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: null }),
    status: arbitraryTripStatus(),
    createdAt: fc.date(),
  });
};

/**
 * Generates an array of vehicles.
 */
const arbitraryVehicles = (minLength = 0, maxLength = 50): fc.Arbitrary<Vehicle[]> =>
  fc.array(arbitraryVehicle(), { minLength, maxLength });

/**
 * Generates an array of drivers.
 */
const arbitraryDrivers = (minLength = 0, maxLength = 50): fc.Arbitrary<Driver[]> =>
  fc.array(arbitraryDriver(), { minLength, maxLength });

/**
 * Generates an array of trips that reference the given vehicles and drivers.
 */
const arbitraryTrips = (
  vehicles: Vehicle[],
  drivers: Driver[],
  minLength = 0,
  maxLength = 50
): fc.Arbitrary<Trip[]> => {
  const vehicleIds = vehicles.map((v) => v.id);
  const driverIds = drivers.map((d) => d.id);
  return fc.array(arbitraryTrip(vehicleIds, driverIds), { minLength, maxLength });
};

/**
 * Generates optional vehicle filters.
 */
const arbitraryVehicleFilters = (): fc.Arbitrary<VehicleFilters | undefined> =>
  fc.option(
    fc.record({
      type: fc.option(arbitraryVehicleType()),
      status: fc.option(arbitraryVehicleStatus()),
      region: fc.option(arbitraryRegion()),
    }),
    { nil: undefined }
  );

// ============================================================================
// Property 33: Dashboard KPI counts match their status predicates
// ============================================================================

describe("Property 33: Dashboard KPI counts match their status predicates, including under filters", () => {
  
  it("should count active vehicles correctly (status !== Retired)", () => {
    fc.assert(
      fc.property(arbitraryVehicles(), (vehicles) => {
        const count = countActiveVehicles(vehicles);
        const expected = vehicles.filter((v) => v.status !== "Retired").length;
        
        expect(count).toBe(expected);
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(vehicles.length);
      }),
      { numRuns: 100 }
    );
  });

  it("should count available vehicles correctly (status === Available)", () => {
    fc.assert(
      fc.property(arbitraryVehicles(), (vehicles) => {
        const count = countAvailableVehicles(vehicles);
        const expected = vehicles.filter((v) => v.status === "Available").length;
        
        expect(count).toBe(expected);
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(vehicles.length);
      }),
      { numRuns: 100 }
    );
  });

  it("should count vehicles in maintenance correctly (status === In Shop)", () => {
    fc.assert(
      fc.property(arbitraryVehicles(), (vehicles) => {
        const count = countVehiclesInMaintenance(vehicles);
        const expected = vehicles.filter((v) => v.status === "In Shop").length;
        
        expect(count).toBe(expected);
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(vehicles.length);
      }),
      { numRuns: 100 }
    );
  });

  it("should count active trips correctly (status === Dispatched)", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(), arbitraryDrivers()).chain(([vehicles, drivers]) =>
          arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips }))
        ),
        ({ vehicles, drivers, trips }) => {
          const count = countActiveTrips(trips);
          const expected = trips.filter((t) => t.status === "Dispatched").length;
          
          expect(count).toBe(expected);
          expect(count).toBeGreaterThanOrEqual(0);
          expect(count).toBeLessThanOrEqual(trips.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should count pending trips correctly (status === Draft)", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(), arbitraryDrivers()).chain(([vehicles, drivers]) =>
          arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips }))
        ),
        ({ vehicles, drivers, trips }) => {
          const count = countPendingTrips(trips);
          const expected = trips.filter((t) => t.status === "Draft").length;
          
          expect(count).toBe(expected);
          expect(count).toBeGreaterThanOrEqual(0);
          expect(count).toBeLessThanOrEqual(trips.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should count drivers on duty correctly (status === Available or On Trip)", () => {
    fc.assert(
      fc.property(arbitraryDrivers(), (drivers) => {
        const count = countDriversOnDuty(drivers);
        const expected = drivers.filter(
          (d) => d.status === "Available" || d.status === "On Trip"
        ).length;
        
        expect(count).toBe(expected);
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(drivers.length);
      }),
      { numRuns: 100 }
    );
  });

  it("should return 0 for all counts when given empty arrays", () => {
    const emptyVehicles: Vehicle[] = [];
    const emptyDrivers: Driver[] = [];
    const emptyTrips: Trip[] = [];
    
    expect(countActiveVehicles(emptyVehicles)).toBe(0);
    expect(countAvailableVehicles(emptyVehicles)).toBe(0);
    expect(countVehiclesInMaintenance(emptyVehicles)).toBe(0);
    expect(countActiveTrips(emptyTrips)).toBe(0);
    expect(countPendingTrips(emptyTrips)).toBe(0);
    expect(countDriversOnDuty(emptyDrivers)).toBe(0);
  });

  it("should compute all KPIs correctly in computeDashboardKpis without filters", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(), arbitraryDrivers()).chain(([vehicles, drivers]) =>
          arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips }))
        ),
        ({ vehicles, drivers, trips }) => {
          const kpis = computeDashboardKpis(vehicles, drivers, trips);
          
          // Verify each KPI matches its dedicated counter
          expect(kpis.activeVehicles).toBe(countActiveVehicles(vehicles));
          expect(kpis.availableVehicles).toBe(countAvailableVehicles(vehicles));
          expect(kpis.vehiclesInMaintenance).toBe(countVehiclesInMaintenance(vehicles));
          expect(kpis.activeTrips).toBe(countActiveTrips(trips));
          expect(kpis.pendingTrips).toBe(countPendingTrips(trips));
          expect(kpis.driversOnDuty).toBe(countDriversOnDuty(drivers));
          
          // All counts should be non-negative
          expect(kpis.activeVehicles).toBeGreaterThanOrEqual(0);
          expect(kpis.availableVehicles).toBeGreaterThanOrEqual(0);
          expect(kpis.vehiclesInMaintenance).toBeGreaterThanOrEqual(0);
          expect(kpis.activeTrips).toBeGreaterThanOrEqual(0);
          expect(kpis.pendingTrips).toBeGreaterThanOrEqual(0);
          expect(kpis.driversOnDuty).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should apply filters correctly and compute KPIs from filtered sets", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(1, 50), arbitraryDrivers(), arbitraryVehicleFilters()).chain(
          ([vehicles, drivers, filters]) =>
            arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips, filters }))
        ),
        ({ vehicles, drivers, trips, filters }) => {
          const kpis = computeDashboardKpis(vehicles, drivers, trips, filters);
          
          // Manually compute filtered vehicles
          let filteredVehicles = vehicles;
          if (filters) {
            filteredVehicles = vehicles.filter((v) => {
              if (filters.type !== undefined && v.type !== filters.type) return false;
              if (filters.status !== undefined && v.status !== filters.status) return false;
              if (filters.region !== undefined && v.region !== filters.region) return false;
              return true;
            });
          }
          
          // Manually compute filtered trips (by vehicle association)
          let filteredTrips = trips;
          if (filters) {
            const filteredVehicleIds = new Set(filteredVehicles.map((v) => v.id));
            filteredTrips = trips.filter((t) => filteredVehicleIds.has(t.vehicleId));
          }
          
          // Verify KPIs match filtered counts
          expect(kpis.activeVehicles).toBe(countActiveVehicles(filteredVehicles));
          expect(kpis.availableVehicles).toBe(countAvailableVehicles(filteredVehicles));
          expect(kpis.vehiclesInMaintenance).toBe(countVehiclesInMaintenance(filteredVehicles));
          expect(kpis.activeTrips).toBe(countActiveTrips(filteredTrips));
          expect(kpis.pendingTrips).toBe(countPendingTrips(filteredTrips));
          
          // Drivers are NOT filtered, so count should match unfiltered
          expect(kpis.driversOnDuty).toBe(countDriversOnDuty(drivers));
          
          // Filtered counts should be <= unfiltered counts
          expect(kpis.activeVehicles).toBeLessThanOrEqual(countActiveVehicles(vehicles));
          expect(kpis.availableVehicles).toBeLessThanOrEqual(countAvailableVehicles(vehicles));
          expect(kpis.vehiclesInMaintenance).toBeLessThanOrEqual(countVehiclesInMaintenance(vehicles));
          expect(kpis.activeTrips).toBeLessThanOrEqual(countActiveTrips(trips));
          expect(kpis.pendingTrips).toBeLessThanOrEqual(countPendingTrips(trips));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 0 for all vehicle KPIs when filters match no vehicles (Req 10.5)", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(1, 50), arbitraryDrivers()).chain(([vehicles, drivers]) =>
          arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips }))
        ),
        ({ vehicles, drivers, trips }) => {
          // Create a filter that matches no vehicles (impossible type)
          const impossibleFilter: VehicleFilters = {
            type: "NonExistentType_12345",
          };
          
          const kpis = computeDashboardKpis(vehicles, drivers, trips, impossibleFilter);
          
          // All vehicle-related KPIs should be 0 when no vehicles match
          expect(kpis.activeVehicles).toBe(0);
          expect(kpis.availableVehicles).toBe(0);
          expect(kpis.vehiclesInMaintenance).toBe(0);
          
          // All trip-related KPIs should be 0 when no vehicles match
          // (because trips are filtered by associated vehicle IDs)
          expect(kpis.activeTrips).toBe(0);
          expect(kpis.pendingTrips).toBe(0);
          
          // Driver count is unaffected by vehicle filters
          expect(kpis.driversOnDuty).toBe(countDriversOnDuty(drivers));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should be deterministic: same inputs always produce same outputs", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(), arbitraryDrivers(), arbitraryVehicleFilters()).chain(
          ([vehicles, drivers, filters]) =>
            arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips, filters }))
        ),
        ({ vehicles, drivers, trips, filters }) => {
          const kpis1 = computeDashboardKpis(vehicles, drivers, trips, filters);
          const kpis2 = computeDashboardKpis(vehicles, drivers, trips, filters);
          
          // Both calls should produce identical results
          expect(kpis1).toEqual(kpis2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should satisfy invariant: activeVehicles >= availableVehicles (Req 10.7, 10.2)", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(), arbitraryDrivers(), arbitraryVehicleFilters()).chain(
          ([vehicles, drivers, filters]) =>
            arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips, filters }))
        ),
        ({ vehicles, drivers, trips, filters }) => {
          const kpis = computeDashboardKpis(vehicles, drivers, trips, filters);
          
          // Active vehicles (not Retired) includes Available vehicles
          expect(kpis.activeVehicles).toBeGreaterThanOrEqual(kpis.availableVehicles);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should satisfy invariant: activeVehicles >= vehiclesInMaintenance", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(), arbitraryDrivers(), arbitraryVehicleFilters()).chain(
          ([vehicles, drivers, filters]) =>
            arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips, filters }))
        ),
        ({ vehicles, drivers, trips, filters }) => {
          const kpis = computeDashboardKpis(vehicles, drivers, trips, filters);
          
          // Active vehicles (not Retired) includes In Shop vehicles
          expect(kpis.activeVehicles).toBeGreaterThanOrEqual(kpis.vehiclesInMaintenance);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle status filter correctly: filtering by Available yields availableVehicles count", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(1, 50), arbitraryDrivers()).chain(([vehicles, drivers]) =>
          arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips }))
        ),
        ({ vehicles, drivers, trips }) => {
          const availableFilter: VehicleFilters = { status: "Available" };
          const kpis = computeDashboardKpis(vehicles, drivers, trips, availableFilter);
          
          // When filtering by Available, all filtered vehicles are Available
          // So activeVehicles == availableVehicles == vehicleCount (and vehiclesInMaintenance == 0)
          expect(kpis.availableVehicles).toBe(kpis.activeVehicles);
          expect(kpis.vehiclesInMaintenance).toBe(0); // No In Shop vehicles in Available filter
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle status filter correctly: filtering by In Shop yields only maintenance vehicles", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(1, 50), arbitraryDrivers()).chain(([vehicles, drivers]) =>
          arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips }))
        ),
        ({ vehicles, drivers, trips }) => {
          const maintenanceFilter: VehicleFilters = { status: "In Shop" };
          const kpis = computeDashboardKpis(vehicles, drivers, trips, maintenanceFilter);
          
          // When filtering by In Shop, all filtered vehicles are In Shop
          expect(kpis.vehiclesInMaintenance).toBe(kpis.activeVehicles);
          expect(kpis.availableVehicles).toBe(0); // No Available vehicles in In Shop filter
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle status filter correctly: filtering by Retired yields 0 active vehicles", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(1, 50), arbitraryDrivers()).chain(([vehicles, drivers]) =>
          arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips }))
        ),
        ({ vehicles, drivers, trips }) => {
          const retiredFilter: VehicleFilters = { status: "Retired" };
          const kpis = computeDashboardKpis(vehicles, drivers, trips, retiredFilter);
          
          // When filtering by Retired, active vehicles should be 0 (Req 10.7)
          expect(kpis.activeVehicles).toBe(0);
          expect(kpis.availableVehicles).toBe(0);
          expect(kpis.vehiclesInMaintenance).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle multiple filters correctly: all filters must match", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryVehicles(1, 50), arbitraryDrivers()).chain(([vehicles, drivers]) =>
          arbitraryTrips(vehicles, drivers).map((trips) => ({ vehicles, drivers, trips }))
        ),
        ({ vehicles, drivers, trips }) => {
          // Apply multiple filters
          const multiFilter: VehicleFilters = {
            type: "Truck",
            status: "Available",
            region: "North",
          };
          
          const kpis = computeDashboardKpis(vehicles, drivers, trips, multiFilter);
          
          // Manually count vehicles matching ALL filters
          const matchingVehicles = vehicles.filter(
            (v) => v.type === "Truck" && v.status === "Available" && v.region === "North"
          );
          
          // All vehicle KPIs should be computed from the matching set
          expect(kpis.availableVehicles).toBe(matchingVehicles.length);
          expect(kpis.activeVehicles).toBe(matchingVehicles.length); // All are Available
          expect(kpis.vehiclesInMaintenance).toBe(0); // None are In Shop
        }
      ),
      { numRuns: 100 }
    );
  });
});
