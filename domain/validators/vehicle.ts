/**
 * Vehicle field validators
 * 
 * This module provides validation functions for Vehicle entity fields.
 * Each validator returns a Result type indicating success or field-specific error.
 * 
 * Requirements: 3.1, 3.8
 */

import { Result, VehicleStatus } from "../types";

/**
 * Input shape for creating a new Vehicle.
 * Requirement 3.1: Vehicle creation with validated fields
 */
export interface CreateVehicleInput {
  registrationNumber: string;
  name: string;
  type: string;
  region?: string | null;
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  revenue?: number;
}

/**
 * Validated vehicle data with initial status set to Available.
 * Requirement 3.1: Valid input yields initial status Available
 */
export interface ValidatedVehicle {
  registrationNumber: string;
  name: string;
  type: string;
  region?: string | null;
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  revenue: number;
  status: VehicleStatus;
}

/**
 * Validates registration number is non-empty.
 * Requirement 3.1, 3.8: Non-empty registration number required
 */
function validateRegistrationNumber(registrationNumber: string): Result<string> {
  const trimmed = registrationNumber.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Registration number is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates vehicle name/model is non-empty.
 * Requirement 3.1, 3.8: Non-empty vehicle name/model required
 */
function validateName(name: string): Result<string> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Vehicle name is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates vehicle type is non-empty.
 * Requirement 3.1, 3.8: Non-empty type required
 */
function validateType(type: string): Result<string> {
  const trimmed = type.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Vehicle type is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates maximum load capacity is greater than 0 and at most 100,000 kg.
 * Requirement 3.1, 3.8: 0 < capacity ≤ 100,000
 */
function validateMaxLoadCapacity(capacity: number): Result<number> {
  if (capacity <= 0) {
    return { ok: false, error: "Maximum load capacity must be greater than 0" };
  }
  if (capacity > 100_000) {
    return { ok: false, error: "Maximum load capacity must not exceed 100,000 kg" };
  }
  return { ok: true, value: capacity };
}

/**
 * Validates odometer is greater than or equal to 0 and at most 10,000,000 km.
 * Requirement 3.1, 3.8: 0 ≤ odometer ≤ 10,000,000
 */
function validateOdometer(odometer: number): Result<number> {
  if (odometer < 0) {
    return { ok: false, error: "Odometer must be greater than or equal to 0" };
  }
  if (odometer > 10_000_000) {
    return { ok: false, error: "Odometer must not exceed 10,000,000 km" };
  }
  return { ok: true, value: odometer };
}

/**
 * Validates acquisition cost is greater than or equal to 0.
 * Requirement 3.1, 3.8: acquisition cost ≥ 0
 */
function validateAcquisitionCost(cost: number): Result<number> {
  if (cost < 0) {
    return { ok: false, error: "Acquisition cost must be greater than or equal to 0" };
  }
  return { ok: true, value: cost };
}

/**
 * Validates all vehicle fields for creation.
 * Returns field-specific rejection errors or validated vehicle with status Available.
 * 
 * Requirement 3.1: Create vehicle with validated fields, status set to Available
 * Requirement 3.8: Return field-specific rejection for invalid fields
 * 
 * @param input - The vehicle creation input to validate
 * @returns Result containing ValidatedVehicle or field-specific error message
 */
export function validateVehicleCreation(input: CreateVehicleInput): Result<ValidatedVehicle> {
  // Validate registration number
  const regNoResult = validateRegistrationNumber(input.registrationNumber);
  if (!regNoResult.ok) {
    return regNoResult;
  }

  // Validate name
  const nameResult = validateName(input.name);
  if (!nameResult.ok) {
    return nameResult;
  }

  // Validate type
  const typeResult = validateType(input.type);
  if (!typeResult.ok) {
    return typeResult;
  }

  // Validate max load capacity
  const capacityResult = validateMaxLoadCapacity(input.maxLoadCapacity);
  if (!capacityResult.ok) {
    return capacityResult;
  }

  // Validate odometer
  const odometerResult = validateOdometer(input.odometer);
  if (!odometerResult.ok) {
    return odometerResult;
  }

  // Validate acquisition cost
  const costResult = validateAcquisitionCost(input.acquisitionCost);
  if (!costResult.ok) {
    return costResult;
  }

  // All validations passed - return validated vehicle with initial status Available
  return {
    ok: true,
    value: {
      registrationNumber: regNoResult.value,
      name: nameResult.value,
      type: typeResult.value,
      region: input.region,
      maxLoadCapacity: capacityResult.value,
      odometer: odometerResult.value,
      acquisitionCost: costResult.value,
      revenue: input.revenue ?? 0,
      status: "Available", // Requirement 3.1: Initial status set to Available
    },
  };
}

/**
 * Input shape for updating an existing Vehicle.
 * Registration number is immutable and cannot be updated (Requirement 3.5).
 */
export interface UpdateVehicleInput {
  name?: string;
  type?: string;
  region?: string | null;
  maxLoadCapacity?: number;
  odometer?: number;
  acquisitionCost?: number;
  revenue?: number;
}

/**
 * Validates vehicle fields for update.
 * Only validates provided fields, allowing partial updates.
 * Registration number is immutable and not included in update validation.
 * 
 * Requirement 3.5: Update editable fields (registration number immutable)
 * Requirement 3.8: Return field-specific rejection for invalid fields
 * 
 * @param input - The vehicle update input to validate
 * @returns Result containing validated update fields or field-specific error message
 */
export function validateVehicleUpdate(input: UpdateVehicleInput): Result<UpdateVehicleInput> {
  // Validate name if provided
  if (input.name !== undefined) {
    const nameResult = validateName(input.name);
    if (!nameResult.ok) {
      return nameResult;
    }
  }

  // Validate type if provided
  if (input.type !== undefined) {
    const typeResult = validateType(input.type);
    if (!typeResult.ok) {
      return typeResult;
    }
  }

  // Validate max load capacity if provided
  if (input.maxLoadCapacity !== undefined) {
    const capacityResult = validateMaxLoadCapacity(input.maxLoadCapacity);
    if (!capacityResult.ok) {
      return capacityResult;
    }
  }

  // Validate odometer if provided
  if (input.odometer !== undefined) {
    const odometerResult = validateOdometer(input.odometer);
    if (!odometerResult.ok) {
      return odometerResult;
    }
  }

  // Validate acquisition cost if provided
  if (input.acquisitionCost !== undefined) {
    const costResult = validateAcquisitionCost(input.acquisitionCost);
    if (!costResult.ok) {
      return costResult;
    }
  }

  // All provided fields are valid
  return { ok: true, value: input };
}
