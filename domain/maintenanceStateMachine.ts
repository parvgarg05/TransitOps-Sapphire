/**
 * Maintenance State Machine (pure functions)
 * 
 * This module implements the maintenance workflow state transitions for vehicles.
 * 
 * Requirements:
 * - 7.1: Opening maintenance sets vehicle to In Shop (unless Retired)
 * - 7.3: Closing maintenance sets vehicle to Available
 * - 7.4: Closing maintenance preserves Retired status
 * - 7.7: Reject opening maintenance for Retired vehicles
 * 
 * State transitions:
 * - openMaintenance: Any status except Retired → In Shop (Retired → reject)
 * - closeMaintenance: Any status → Available (Retired → Retired)
 */

import { Vehicle, VehicleStatus, Result } from "./types";

/**
 * Opens a maintenance record for a vehicle.
 * 
 * Requirement 7.1: Sets vehicle status to "In Shop" when maintenance is opened.
 * Requirement 7.7: Rejects if vehicle status is "Retired".
 * 
 * @param vehicle - The vehicle to open maintenance for
 * @returns Result with new vehicle status or error
 * 
 * **Validates: Requirements 7.1, 7.7**
 */
export function openMaintenance(vehicle: Vehicle): Result<VehicleStatus> {
  // Req 7.7: Reject opening maintenance for Retired vehicles
  if (vehicle.status === "Retired") {
    return { ok: false, error: "Vehicle is Retired" };
  }

  // Req 7.1: Set vehicle to In Shop
  return { ok: true, value: "In Shop" };
}

/**
 * Closes a maintenance record for a vehicle.
 * 
 * Requirement 7.3: Sets vehicle status to "Available" when maintenance is closed.
 * Requirement 7.4: Preserves "Retired" status if vehicle was retired.
 * 
 * @param vehicle - The vehicle to close maintenance for
 * @returns New vehicle status
 * 
 * **Validates: Requirements 7.3, 7.4**
 */
export function closeMaintenance(vehicle: Vehicle): VehicleStatus {
  // Req 7.4: Keep Retired status if vehicle is Retired
  if (vehicle.status === "Retired") {
    return "Retired";
  }

  // Req 7.3: Set vehicle to Available
  return "Available";
}
