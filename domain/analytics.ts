/**
 * Analytics computation functions for TransitOps
 * 
 * Pure functions that compute operational metrics:
 * - Operational Cost (fuel cost + maintenance cost)
 * - Fuel Efficiency (km/L with guarded division)
 * - Fleet Utilization (% On Trip vs non-Retired, with guarded division)
 * - Vehicle ROI (revenue minus costs divided by acquisition cost, with guarded division)
 * 
 * All division operations are guarded to prevent NaN/Infinity:
 * - Division by zero returns "N/A" (null)
 * - All monetary and percentage values are rounded appropriately
 * 
 * Requirements: 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.9
 */

import { Vehicle, FuelLog, MaintenanceLog } from "./types";

/**
 * Computes the total operational cost for a vehicle as the sum of:
 * - Total fuel cost (sum of all fuel log costs)
 * - Total maintenance cost (sum of all maintenance log costs > 0)
 * 
 * Requirements:
 * - 8.5: Operational Cost = fuel cost + maintenance cost
 * - 8.6: Recomputed on read from live rows (within 2 seconds)
 * - 7.6: Only costs > 0 contribute to operational cost
 * 
 * @param fuelLogs - Array of fuel logs for the vehicle
 * @param maintenanceLogs - Array of maintenance logs for the vehicle
 * @returns Total operational cost rounded to 2 decimal places
 */
export function operationalCost(
  fuelLogs: FuelLog[],
  maintenanceLogs: MaintenanceLog[]
): number {
  const fuelCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
  const maintenanceCost = maintenanceLogs
    .filter((log) => log.cost > 0)
    .reduce((sum, log) => sum + log.cost, 0);
  
  const total = fuelCost + maintenanceCost;
  return Math.round(total * 100) / 100; // Round to 2 decimal places
}

/**
 * Computes fuel efficiency for a vehicle as distance / fuel consumed.
 * 
 * Requirements:
 * - 9.1: Fuel Efficiency = total distance / total fuel, rounded to 2 decimals
 * - 9.4: If fuel consumed = 0, return N/A (null) instead of performing division
 * 
 * @param totalDistance - Total distance traveled in kilometers
 * @param totalFuel - Total fuel consumed in liters
 * @returns Fuel efficiency in km/L rounded to 2 decimals, or null if fuel = 0
 */
export function fuelEfficiency(
  totalDistance: number,
  totalFuel: number
): number | null {
  // Guard against division by zero (Req 9.4)
  if (totalFuel === 0) {
    return null; // "N/A"
  }
  
  const efficiency = totalDistance / totalFuel;
  return Math.round(efficiency * 100) / 100; // Round to 2 decimal places
}

/**
 * Computes fleet utilization as the percentage of vehicles On Trip
 * relative to the count of non-Retired vehicles.
 * 
 * Requirements:
 * - 9.2: Fleet Utilization = (On Trip / non-Retired) * 100, rounded to 1 decimal
 * - 9.5: If non-Retired count = 0, return N/A (null) instead of performing division
 * - 10.9: Dashboard uses the same function (identical logic)
 * 
 * The result is bounded to [0, 100] because On Trip ⊆ non-Retired.
 * 
 * @param vehicles - Array of all vehicles
 * @returns Fleet utilization percentage (0-100) rounded to 1 decimal, or null if no non-Retired vehicles
 */
export function fleetUtilization(vehicles: Vehicle[]): number | null {
  const onTrip = vehicles.filter((v) => v.status === "On Trip").length;
  const nonRetired = vehicles.filter((v) => v.status !== "Retired").length;
  
  // Guard against division by zero (Req 9.5, 10.9)
  if (nonRetired === 0) {
    return null; // "N/A"
  }
  
  const utilization = (onTrip / nonRetired) * 100;
  return Math.round(utilization * 10) / 10; // Round to 1 decimal place
}

/**
 * Computes Vehicle ROI as (Revenue - Costs) / Acquisition Cost.
 * 
 * Requirements:
 * - 9.3: Vehicle ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost, rounded to 2 decimals
 * - 9.6: If acquisition cost = 0, return N/A (null) instead of performing division
 * 
 * @param vehicle - The vehicle entity
 * @param fuelLogs - Array of fuel logs for the vehicle
 * @param maintenanceLogs - Array of maintenance logs for the vehicle
 * @returns ROI rounded to 2 decimal places, or null if acquisition cost = 0
 */
export function vehicleROI(
  vehicle: Vehicle,
  fuelLogs: FuelLog[],
  maintenanceLogs: MaintenanceLog[]
): number | null {
  // Guard against division by zero (Req 9.6)
  if (vehicle.acquisitionCost === 0) {
    return null; // "N/A"
  }
  
  const cost = operationalCost(fuelLogs, maintenanceLogs);
  const roi = (vehicle.revenue - cost) / vehicle.acquisitionCost;
  return Math.round(roi * 100) / 100; // Round to 2 decimal places
}
