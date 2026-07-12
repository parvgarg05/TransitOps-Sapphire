/**
 * Dispatch eligibility functions for TransitOps
 * 
 * This module defines pure functions for determining which vehicles and drivers
 * are eligible for trip dispatch assignment.
 * 
 * Eligibility rules (fail-closed):
 * - Vehicles: ONLY status === "Available" are eligible
 * - Drivers: ONLY status === "Available" AND license not expired are eligible
 * 
 * Requirements: 5.2, 5.3, 5.4, 7.2
 */

import { Vehicle, Driver } from "./types";
import { isLicenseExpired } from "./license";

/**
 * Returns the subset of vehicles eligible for trip dispatch assignment.
 * 
 * A vehicle is eligible ONLY if its status is "Available".
 * Vehicles with status "On Trip", "In Shop", or "Retired" are excluded.
 * 
 * This fail-closed formulation ensures that any new vehicle status added
 * in the future will be automatically excluded by default.
 * 
 * **Validates: Requirements 5.2, 5.3, 7.2**
 * 
 * @param vehicles - The complete list of vehicles to filter
 * @returns Array of vehicles with status === "Available"
 * 
 * @example
 * const vehicles = [
 *   { id: "v1", status: "Available", ... },
 *   { id: "v2", status: "On Trip", ... },
 *   { id: "v3", status: "In Shop", ... },
 *   { id: "v4", status: "Retired", ... },
 *   { id: "v5", status: "Available", ... }
 * ];
 * 
 * const eligible = eligibleVehicles(vehicles);
 * // Returns [v1, v5] - only Available vehicles
 */
export function eligibleVehicles(vehicles: Vehicle[]): Vehicle[] {
  // Requirement 5.2: Include ONLY vehicles with status === "Available"
  // Requirement 5.3: Exclude vehicles with status Retired or In Shop
  // Requirement 7.2: Vehicles with active maintenance are In Shop, thus excluded
  return vehicles.filter(v => v.status === "Available");
}

/**
 * Returns the subset of drivers eligible for trip dispatch assignment.
 * 
 * A driver is eligible ONLY if:
 * 1. Their status is "Available", AND
 * 2. Their license is not expired (expiry date >= today)
 * 
 * Drivers with status "On Trip", "Off Duty", or "Suspended" are excluded.
 * Drivers with expired licenses are excluded even if their status is Available.
 * 
 * This fail-closed formulation ensures that any new driver status added
 * in the future will be automatically excluded by default.
 * 
 * **Validates: Requirements 5.4**
 * 
 * @param drivers - The complete list of drivers to filter
 * @param today - The current date to check license expiry against
 * @returns Array of drivers with status === "Available" and valid (non-expired) license
 * 
 * @example
 * const today = new Date('2024-06-15');
 * const drivers = [
 *   { id: "d1", status: "Available", licenseExpiryDate: new Date('2025-01-01'), ... },
 *   { id: "d2", status: "On Trip", licenseExpiryDate: new Date('2025-01-01'), ... },
 *   { id: "d3", status: "Available", licenseExpiryDate: new Date('2024-06-14'), ... }, // expired
 *   { id: "d4", status: "Off Duty", licenseExpiryDate: new Date('2025-01-01'), ... },
 *   { id: "d5", status: "Suspended", licenseExpiryDate: new Date('2025-01-01'), ... },
 *   { id: "d6", status: "Available", licenseExpiryDate: new Date('2024-06-15'), ... }
 * ];
 * 
 * const eligible = eligibleDrivers(drivers, today);
 * // Returns [d1, d6] - only Available drivers with valid licenses
 */
export function eligibleDrivers(drivers: Driver[], today: Date): Driver[] {
  // Requirement 5.4: Exclude drivers whose license is expired OR whose status is
  // On Trip, Off Duty, or Suspended
  return drivers.filter(
    d => d.status === "Available" && !isLicenseExpired(d.licenseExpiryDate, today)
  );
}
