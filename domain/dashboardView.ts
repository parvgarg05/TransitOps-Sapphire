/**
 * Role-based Default Dashboard View Mapping
 * 
 * This module defines the presentation-layer mapping from Role to the emphasized
 * subset of KPIs/widgets shown by default on the dashboard. This is **initial emphasis
 * only** and does not restrict which KPIs a user may view (Req 10.14).
 * 
 * Requirements: 10.10, 10.11, 10.12, 10.13, 10.14
 */

import type { Role } from "./types";

// ============================================================================
// KPI Types
// ============================================================================

/**
 * All possible KPIs that can be displayed on the dashboard.
 * These correspond to the KPIs defined in Requirement 10.1.
 */
export type KPI =
  | "Active Vehicles"              // Count of vehicles where status != Retired (Req 10.7)
  | "Available Vehicles"           // Count of vehicles where status == Available (Req 10.2)
  | "Vehicles in Maintenance"      // Count of vehicles where status == In Shop (Req 10.3)
  | "Active Trips"                 // Count of trips where status == Dispatched (Req 10.4)
  | "Pending Trips"                // Count of trips where status == Draft (Req 10.4)
  | "Drivers On Duty"              // Count of drivers where status in {Available, On Trip} (Req 10.8)
  | "Fleet Utilization"            // Percentage of On Trip vehicles vs non-Retired (Req 10.9)
  | "Available Drivers Count"      // Count of drivers where status == Available
  | "Expired License Count"        // Count of drivers with expired license
  | "Soon-To-Expire License Count" // Count of drivers with license expiring in 0-30 days
  | "Suspended Drivers Count"      // Count of drivers where status == Suspended
  | "Safety Scores"                // Safety scores of displayed drivers
  | "Operational Cost"             // Sum of fuel cost + maintenance cost (Req 8.5)
  | "Fuel Efficiency"              // km/L per vehicle (Req 9.1)
  | "Vehicle ROI";                 // ROI per vehicle (Req 9.3)

/**
 * The complete set of KPIs that the dashboard endpoint always computes.
 * This set is available to ALL authenticated users regardless of role (Req 10.14).
 */
export const FULL_KPI_SET: ReadonlyArray<KPI> = [
  "Active Vehicles",
  "Available Vehicles",
  "Vehicles in Maintenance",
  "Active Trips",
  "Pending Trips",
  "Drivers On Duty",
  "Fleet Utilization",
  "Available Drivers Count",
  "Expired License Count",
  "Soon-To-Expire License Count",
  "Suspended Drivers Count",
  "Safety Scores",
  "Operational Cost",
  "Fuel Efficiency",
  "Vehicle ROI",
] as const;

// ============================================================================
// Default Dashboard View Mapping
// ============================================================================

/**
 * Maps a Role to its Default Dashboard View — the subset of KPIs emphasized
 * by default for that role. This is a pure presentation-layer concern that
 * controls initial emphasis only, never viewing restrictions.
 * 
 * Per-role mappings:
 * - Fleet Manager (Req 10.10): Active Vehicles, Available Vehicles, 
 *   Vehicles in Maintenance, Fleet Utilization
 * - Driver (Req 10.11): Pending Trips, Active Trips, 
 *   Available Vehicles Count, Available Drivers Count
 * - Safety Officer (Req 10.12): Expired License Count, Soon-To-Expire License Count,
 *   Suspended Drivers Count, Drivers On Duty, Safety Scores
 * - Financial Analyst (Req 10.13): Operational Cost, Fuel Efficiency, Vehicle ROI
 * 
 * @param role - The user's assigned Role
 * @returns Array of KPIs to emphasize by default for this role
 * 
 * Requirements: 10.10, 10.11, 10.12, 10.13
 */
export function defaultDashboardView(role: Role): ReadonlyArray<KPI> {
  switch (role) {
    case "Fleet Manager":
      return [
        "Active Vehicles",
        "Available Vehicles",
        "Vehicles in Maintenance",
        "Fleet Utilization",
      ];

    case "Driver":
      return [
        "Pending Trips",
        "Active Trips",
        "Available Vehicles",      // Count of Available vehicles
        "Available Drivers Count", // Count of Available drivers
      ];

    case "Safety Officer":
      return [
        "Expired License Count",
        "Soon-To-Expire License Count",
        "Suspended Drivers Count",
        "Drivers On Duty",
        "Safety Scores",
      ];

    case "Financial Analyst":
      return [
        "Operational Cost",
        "Fuel Efficiency",
        "Vehicle ROI",
      ];

    // No default case needed - Role type is exhaustive
  }
}

/**
 * Determines if a specific KPI is in the Default Dashboard View for a given role.
 * This is a convenience helper for filtering or UI checks.
 * 
 * @param role - The user's assigned Role
 * @param kpi - The KPI to check
 * @returns true if the KPI is in the role's default view, false otherwise
 */
export function isInDefaultView(role: Role, kpi: KPI): boolean {
  const defaultView = defaultDashboardView(role);
  return defaultView.includes(kpi);
}

/**
 * Type guard to check if a string is a valid Role.
 * 
 * @param value - The string to check
 * @returns true if the value is a valid Role, false otherwise
 */
export function isValidRole(value: string): value is Role {
  return (
    value === "Fleet Manager" ||
    value === "Driver" ||
    value === "Safety Officer" ||
    value === "Financial Analyst"
  );
}
