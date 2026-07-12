/**
 * Dashboard KPI count computations (pure domain logic)
 * 
 * This module implements the pure KPI counting functions for the TransitOps dashboard.
 * All KPIs are computed over optionally filtered vehicle and trip sets.
 * Empty matching sets yield 0.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8
 */

import type { Vehicle, Driver, Trip, VehicleStatus, DriverStatus, TripStatus } from "./types";

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters that can be applied to vehicles before computing KPIs.
 * All filters are optional; if omitted, no filtering is applied.
 */
export interface VehicleFilters {
  type?: string;
  status?: VehicleStatus;
  region?: string;
}

// ============================================================================
// KPI Computation Functions
// ============================================================================

/**
 * Applies optional filters to a vehicle set.
 * 
 * @param vehicles - The complete vehicle set
 * @param filters - Optional filters to apply
 * @returns Filtered vehicle set
 */
function applyVehicleFilters(vehicles: Vehicle[], filters?: VehicleFilters): Vehicle[] {
  if (!filters) return vehicles;

  return vehicles.filter((vehicle) => {
    // Apply type filter if specified
    if (filters.type !== undefined && vehicle.type !== filters.type) {
      return false;
    }

    // Apply status filter if specified
    if (filters.status !== undefined && vehicle.status !== filters.status) {
      return false;
    }

    // Apply region filter if specified
    if (filters.region !== undefined && vehicle.region !== filters.region) {
      return false;
    }

    return true;
  });
}

/**
 * Computes Active Vehicles: count of vehicles whose status is not Retired.
 * Requirement 10.7
 * 
 * @param vehicles - The vehicle set (optionally filtered)
 * @returns Count of active vehicles
 */
export function countActiveVehicles(vehicles: Vehicle[]): number {
  return vehicles.filter((v) => v.status !== "Retired").length;
}

/**
 * Computes Available Vehicles: count of vehicles with status Available.
 * Requirement 10.2
 * 
 * @param vehicles - The vehicle set (optionally filtered)
 * @returns Count of available vehicles
 */
export function countAvailableVehicles(vehicles: Vehicle[]): number {
  return vehicles.filter((v) => v.status === "Available").length;
}

/**
 * Computes Vehicles in Maintenance: count of vehicles with status In Shop.
 * Requirement 10.3
 * 
 * @param vehicles - The vehicle set (optionally filtered)
 * @returns Count of vehicles in maintenance
 */
export function countVehiclesInMaintenance(vehicles: Vehicle[]): number {
  return vehicles.filter((v) => v.status === "In Shop").length;
}

/**
 * Computes Active Trips: count of trips with status Dispatched.
 * Requirement 10.4
 * 
 * @param trips - The trip set
 * @returns Count of active trips
 */
export function countActiveTrips(trips: Trip[]): number {
  return trips.filter((t) => t.status === "Dispatched").length;
}

/**
 * Computes Pending Trips: count of trips with status Draft.
 * Requirement 10.4
 * 
 * @param trips - The trip set
 * @returns Count of pending trips
 */
export function countPendingTrips(trips: Trip[]): number {
  return trips.filter((t) => t.status === "Draft").length;
}

/**
 * Computes Drivers On Duty: count of drivers whose status is Available or On Trip.
 * Requirement 10.8
 * 
 * @param drivers - The driver set
 * @returns Count of drivers on duty
 */
export function countDriversOnDuty(drivers: Driver[]): number {
  return drivers.filter((d) => d.status === "Available" || d.status === "On Trip").length;
}

/**
 * Computes all dashboard KPIs with optional filtering.
 * Requirement 10.1, 10.5
 * 
 * When filters are applied, KPIs are computed from only the matching vehicles and trips.
 * Empty matching sets yield 0 for each KPI.
 * 
 * @param vehicles - The complete vehicle set
 * @param drivers - The complete driver set
 * @param trips - The complete trip set
 * @param filters - Optional filters to apply to vehicles
 * @returns Object containing all KPI counts
 */
export function computeDashboardKpis(
  vehicles: Vehicle[],
  drivers: Driver[],
  trips: Trip[],
  filters?: VehicleFilters
) {
  // Apply filters to vehicles first
  const filteredVehicles = applyVehicleFilters(vehicles, filters);

  // When filters are applied, only count trips associated with filtered vehicles
  let filteredTrips = trips;
  if (filters) {
    const filteredVehicleIds = new Set(filteredVehicles.map((v) => v.id));
    filteredTrips = trips.filter((t) => filteredVehicleIds.has(t.vehicleId));
  }

  return {
    activeVehicles: countActiveVehicles(filteredVehicles),
    availableVehicles: countAvailableVehicles(filteredVehicles),
    vehiclesInMaintenance: countVehiclesInMaintenance(filteredVehicles),
    activeTrips: countActiveTrips(filteredTrips),
    pendingTrips: countPendingTrips(filteredTrips),
    driversOnDuty: countDriversOnDuty(drivers), // Drivers are not filtered by vehicle filters
  };
}
