/**
 * Trip field validators
 * 
 * This module provides validation functions for Trip entity fields.
 * Each validator returns a Result type indicating success or field-specific error.
 * 
 * Requirements: 5.1, 5.8
 */

import { Result, TripStatus } from "../types";

/**
 * Input shape for creating a new Trip.
 * Requirement 5.1: Trip creation with all required fields
 */
export interface CreateTripInput {
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  plannedDistance: number;
}

/**
 * Validated trip data with initial status set to Draft.
 * Requirement 5.1: Valid input yields initial status Draft
 */
export interface ValidatedTrip {
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  plannedDistance: number;
  status: TripStatus;
}

/**
 * Validates source is non-empty.
 * Requirement 5.1, 5.8: Non-empty source required
 */
function validateSource(source: string): Result<string> {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Source is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates destination is non-empty.
 * Requirement 5.1, 5.8: Non-empty destination required
 */
function validateDestination(destination: string): Result<string> {
  const trimmed = destination.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Destination is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates vehicle ID is non-empty.
 * Requirement 5.1, 5.8: Vehicle ID required
 */
function validateVehicleId(vehicleId: string): Result<string> {
  const trimmed = vehicleId.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Vehicle ID is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates driver ID is non-empty.
 * Requirement 5.1, 5.8: Driver ID required
 */
function validateDriverId(driverId: string): Result<string> {
  const trimmed = driverId.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Driver ID is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates cargo weight is greater than 0 kg.
 * Requirement 5.8: cargo weight > 0
 */
function validateCargoWeight(weight: number): Result<number> {
  if (weight <= 0) {
    return { ok: false, error: "Cargo weight must be greater than 0" };
  }
  return { ok: true, value: weight };
}

/**
 * Validates planned distance is greater than 0 km.
 * Requirement 5.8: planned distance > 0
 */
function validatePlannedDistance(distance: number): Result<number> {
  if (distance <= 0) {
    return { ok: false, error: "Planned distance must be greater than 0" };
  }
  return { ok: true, value: distance };
}

/**
 * Validates all trip fields for creation.
 * Returns field-specific rejection errors or validated trip with status Draft.
 * 
 * Requirement 5.1: Create trip with all required fields, status set to Draft
 * Requirement 5.8: Return field-specific rejection for invalid fields (cargo weight > 0, planned distance > 0)
 * 
 * @param input - The trip creation input to validate
 * @returns Result containing ValidatedTrip or field-specific error message
 */
export function validateTripCreation(input: CreateTripInput): Result<ValidatedTrip> {
  // Validate source
  const sourceResult = validateSource(input.source);
  if (!sourceResult.ok) {
    return sourceResult;
  }

  // Validate destination
  const destinationResult = validateDestination(input.destination);
  if (!destinationResult.ok) {
    return destinationResult;
  }

  // Validate vehicle ID
  const vehicleIdResult = validateVehicleId(input.vehicleId);
  if (!vehicleIdResult.ok) {
    return vehicleIdResult;
  }

  // Validate driver ID
  const driverIdResult = validateDriverId(input.driverId);
  if (!driverIdResult.ok) {
    return driverIdResult;
  }

  // Validate cargo weight
  const cargoWeightResult = validateCargoWeight(input.cargoWeight);
  if (!cargoWeightResult.ok) {
    return cargoWeightResult;
  }

  // Validate planned distance
  const plannedDistanceResult = validatePlannedDistance(input.plannedDistance);
  if (!plannedDistanceResult.ok) {
    return plannedDistanceResult;
  }

  // All validations passed - return validated trip with initial status Draft
  return {
    ok: true,
    value: {
      source: sourceResult.value,
      destination: destinationResult.value,
      vehicleId: vehicleIdResult.value,
      driverId: driverIdResult.value,
      cargoWeight: cargoWeightResult.value,
      plannedDistance: plannedDistanceResult.value,
      status: "Draft", // Requirement 5.1: Initial status set to Draft
    },
  };
}
