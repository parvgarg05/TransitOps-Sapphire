/**
 * Capacity and conflict checks for trip dispatch
 * 
 * This module implements:
 * - capacityOk: Validates cargo weight against vehicle capacity
 * - assignmentConflict: Detects if a vehicle or driver is already On Trip
 * 
 * Requirements: 5.5, 5.6, 5.7
 */

import type { Vehicle, Driver } from "./types";

/**
 * Validates that cargo weight does not exceed vehicle's maximum load capacity.
 * 
 * Requirement 5.6: Reject trips whose cargo weight exceeds vehicle capacity
 * Requirement 5.7: Allow trips where cargo weight ≤ vehicle capacity
 * 
 * @param cargoWeight - Cargo weight in kilograms
 * @param vehicle - The vehicle to check capacity against
 * @returns true if cargo weight ≤ maxLoadCapacity, false otherwise
 * 
 * @example
 * const vehicle = { maxLoadCapacity: 5000, ... };
 * capacityOk(4500, vehicle);  // true - within capacity
 * capacityOk(5000, vehicle);  // true - exactly at capacity (Req 5.7)
 * capacityOk(5001, vehicle);  // false - exceeds capacity
 */
export function capacityOk(cargoWeight: number, vehicle: Vehicle): boolean {
  return cargoWeight <= vehicle.maxLoadCapacity;
}

/**
 * Result type for assignment conflict check.
 * - { conflict: false } means both vehicle and driver are available
 * - { conflict: true, resource: "vehicle" | "driver" } identifies the conflicting resource
 */
export type AssignmentConflictResult =
  | { conflict: false }
  | { conflict: true; resource: "vehicle" | "driver" };

/**
 * Checks if a vehicle or driver is already assigned to an active trip.
 * 
 * Requirement 5.5: Detect and reject attempts to assign resources that are already On Trip.
 * The check identifies which specific resource (vehicle or driver) is in conflict.
 * 
 * @param vehicle - The vehicle to check
 * @param driver - The driver to check
 * @returns Conflict result identifying the conflicting resource, or no conflict
 * 
 * @example
 * const vehicleOnTrip = { status: "On Trip", ... };
 * const vehicleAvailable = { status: "Available", ... };
 * const driverOnTrip = { status: "On Trip", ... };
 * const driverAvailable = { status: "Available", ... };
 * 
 * assignmentConflict(vehicleOnTrip, driverAvailable);
 * // { conflict: true, resource: "vehicle" }
 * 
 * assignmentConflict(vehicleAvailable, driverOnTrip);
 * // { conflict: true, resource: "driver" }
 * 
 * assignmentConflict(vehicleAvailable, driverAvailable);
 * // { conflict: false }
 * 
 * // Vehicle checked first, so vehicle conflict takes precedence if both are On Trip
 * assignmentConflict(vehicleOnTrip, driverOnTrip);
 * // { conflict: true, resource: "vehicle" }
 */
export function assignmentConflict(
  vehicle: Vehicle,
  driver: Driver
): AssignmentConflictResult {
  if (vehicle.status === "On Trip") {
    return { conflict: true, resource: "vehicle" };
  }
  if (driver.status === "On Trip") {
    return { conflict: true, resource: "driver" };
  }
  return { conflict: false };
}
