/**
 * Shared domain types and enums for TransitOps
 * 
 * This module defines:
 * - Role, VehicleStatus, DriverStatus, TripStatus union types
 * - Result<T> type for error handling
 * - Domain entity shapes (Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense)
 * - Date helper functions (startOfDay, addDays)
 * 
 * Requirements: 2.1, 3.3, 4.2, 6.1
 */

// ============================================================================
// Status Enumerations (Requirements 2.1, 3.3, 4.2, 6.1)
// ============================================================================

/**
 * Role represents the four permission sets in the system.
 * Requirement 2.1: Fleet Manager, Driver, Safety Officer, Financial Analyst
 */
export type Role = "Fleet Manager" | "Driver" | "Safety Officer" | "Financial Analyst";

/**
 * VehicleStatus represents the lifecycle states of a vehicle.
 * Requirement 3.3: Available, On Trip, In Shop, Retired
 */
export type VehicleStatus = "Available" | "On Trip" | "In Shop" | "Retired";

/**
 * DriverStatus represents the lifecycle states of a driver.
 * Requirement 4.2: Available, On Trip, Off Duty, Suspended
 */
export type DriverStatus = "Available" | "On Trip" | "Off Duty" | "Suspended";

/**
 * TripStatus represents the lifecycle states of a trip.
 * Requirement 6.1: Draft, Dispatched, Completed, Cancelled
 */
export type TripStatus = "Draft" | "Dispatched" | "Completed" | "Cancelled";

// ============================================================================
// Result Type for Error Handling
// ============================================================================

/**
 * Result<T> represents a success or failure outcome.
 * Success: { ok: true, value: T }
 * Failure: { ok: false, error: string }
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// ============================================================================
// Domain Entity Shapes
// ============================================================================

/**
 * Vehicle domain entity shape.
 * Requirement 3: Vehicle Registry
 */
export interface Vehicle {
  id: string;
  registrationNumber: string;      // Unique, immutable (Req 3.2, 3.5)
  name: string;                     // Vehicle name/model
  type: string;                     // Vehicle type
  region?: string | null;           // For dashboard filters
  maxLoadCapacity: number;          // kg, 0 < x <= 100,000 (Req 3.1)
  odometer: number;                 // km, 0 <= x <= 10,000,000 (Req 3.1)
  acquisitionCost: number;          // >= 0 (Req 3.1)
  revenue: number;                  // default 0, input to ROI (Req 9.3)
  status: VehicleStatus;            // Req 3.3
  createdAt: Date;
}

/**
 * Driver domain entity shape.
 * Requirement 4: Driver Management
 */
export interface Driver {
  id: string;
  name: string;                     // Non-empty (Req 4.1)
  licenseNumber: string;            // Unique, non-empty (Req 4.1, 4.8)
  licenseCategory: string;          // Req 4.1
  licenseExpiryDate: Date;          // Valid date (Req 4.1)
  contactNumber: string;            // Req 4.1
  safetyScore: number;              // 0 <= x <= 100 (Req 4.1)
  status: DriverStatus;             // Req 4.2
  createdAt: Date;
}

/**
 * Trip domain entity shape.
 * Requirement 5, 6: Trip Creation and Lifecycle
 */
export interface Trip {
  id: string;
  source: string;                   // Req 5.1
  destination: string;              // Req 5.1
  vehicleId: string;                // Foreign key
  driverId: string;                 // Foreign key
  createdByUserId: string;          // Foreign key
  cargoWeight: number;              // kg, > 0 (Req 5.8)
  plannedDistance: number;          // km, > 0 (Req 5.8)
  finalOdometer?: number | null;    // Set on completion (Req 6.3)
  fuelConsumed?: number | null;     // >= 0, set on completion (Req 6.3)
  status: TripStatus;               // Req 6.1
  createdAt: Date;
}

/**
 * MaintenanceLog domain entity shape.
 * Requirement 7: Maintenance Workflow
 */
export interface MaintenanceLog {
  id: string;
  vehicleId: string;                // Foreign key
  description: string;              // Req 7.1
  cost: number;                     // 0 <= x <= 999,999,999.99 (Req 7.5, 7.8)
  closed: boolean;                  // false = active, true = closed (Req 7.1, 7.3)
  openedAt: Date;                   // Req 7.1
  closedAt?: Date | null;           // Set when closed (Req 7.3)
}

/**
 * FuelLog domain entity shape.
 * Requirement 8: Fuel and Expense Management
 */
export interface FuelLog {
  id: string;
  vehicleId: string;                // Foreign key
  liters: number;                   // > 0 (Req 8.1)
  cost: number;                     // >= 0 (Req 8.1)
  date: Date;                       // <= today (Req 8.1)
  createdAt?: Date;
}

/**
 * Expense domain entity shape.
 * Requirement 8: Fuel and Expense Management
 */
export interface Expense {
  id: string;
  vehicleId: string;                // Foreign key
  category: "toll" | "maintenance charge" | "other"; // Req 8.3
  cost: number;                     // >= 0 (Req 8.3)
  date: Date;                       // <= today (Req 8.3)
  createdAt?: Date;
}

// ============================================================================
// Date Helper Functions
// ============================================================================

/**
 * Returns a new Date representing the start of day (00:00:00.000) for the given date.
 * This is used for consistent date comparisons (e.g., license expiry checks).
 * 
 * @param date - The date to normalize
 * @returns A new Date at midnight (start of day)
 */
export function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Returns a new Date representing the given date plus the specified number of days.
 * This is used for date range calculations (e.g., soon-to-expire licenses).
 * 
 * @param date - The starting date
 * @param days - Number of days to add (can be negative)
 * @returns A new Date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
