/**
 * Driver field validators
 * 
 * This module provides validation functions for Driver entity fields.
 * Each validator returns a Result type indicating success or field-specific error.
 * 
 * Requirements: 4.1, 4.7
 */

import { Result, DriverStatus } from "../types";

/**
 * Input shape for creating a new Driver.
 * Requirement 4.1: Driver creation with validated fields
 */
export interface CreateDriverInput {
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: Date;
  contactNumber: string;
  safetyScore: number;
}

/**
 * Validated driver data with initial status set to Available.
 * Requirement 4.1: Valid input yields initial status Available
 */
export interface ValidatedDriver {
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: Date;
  contactNumber: string;
  safetyScore: number;
  status: DriverStatus;
}

/**
 * Validates driver name is non-empty.
 * Requirement 4.1, 4.7: Non-empty name required
 */
function validateName(name: string): Result<string> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Driver name is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates license number is non-empty.
 * Requirement 4.1, 4.7: Non-empty license number required
 */
function validateLicenseNumber(licenseNumber: string): Result<string> {
  const trimmed = licenseNumber.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "License number is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates license category is non-empty.
 * Requirement 4.1, 4.7: Non-empty license category required
 */
function validateLicenseCategory(category: string): Result<string> {
  const trimmed = category.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "License category is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates license expiry date is a valid date.
 * Requirement 4.1, 4.7: Valid license expiry date required
 */
function validateLicenseExpiryDate(date: Date): Result<Date> {
  // Check if date is valid (not Invalid Date)
  if (isNaN(date.getTime())) {
    return { ok: false, error: "License expiry date must be a valid date" };
  }
  return { ok: true, value: date };
}

/**
 * Validates contact number is non-empty.
 * Requirement 4.1, 4.7: Non-empty contact number required
 */
function validateContactNumber(contactNumber: string): Result<string> {
  const trimmed = contactNumber.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Contact number is required" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validates safety score is greater than or equal to 0 and at most 100.
 * Requirement 4.1, 4.7: 0 ≤ safety score ≤ 100
 */
function validateSafetyScore(score: number): Result<number> {
  if (score < 0) {
    return { ok: false, error: "Safety score must be greater than or equal to 0" };
  }
  if (score > 100) {
    return { ok: false, error: "Safety score must not exceed 100" };
  }
  return { ok: true, value: score };
}

/**
 * Validates all driver fields for creation.
 * Returns field-specific rejection errors or validated driver with status Available.
 * 
 * Requirement 4.1: Create driver with validated fields, status set to Available
 * Requirement 4.7: Return field-specific rejection for invalid fields
 * 
 * @param input - The driver creation input to validate
 * @returns Result containing ValidatedDriver or field-specific error message
 */
export function validateDriverCreation(input: CreateDriverInput): Result<ValidatedDriver> {
  // Validate name
  const nameResult = validateName(input.name);
  if (!nameResult.ok) {
    return nameResult;
  }

  // Validate license number
  const licenseNumberResult = validateLicenseNumber(input.licenseNumber);
  if (!licenseNumberResult.ok) {
    return licenseNumberResult;
  }

  // Validate license category
  const categoryResult = validateLicenseCategory(input.licenseCategory);
  if (!categoryResult.ok) {
    return categoryResult;
  }

  // Validate license expiry date
  const expiryDateResult = validateLicenseExpiryDate(input.licenseExpiryDate);
  if (!expiryDateResult.ok) {
    return expiryDateResult;
  }

  // Validate contact number
  const contactResult = validateContactNumber(input.contactNumber);
  if (!contactResult.ok) {
    return contactResult;
  }

  // Validate safety score
  const safetyScoreResult = validateSafetyScore(input.safetyScore);
  if (!safetyScoreResult.ok) {
    return safetyScoreResult;
  }

  // All validations passed - return validated driver with initial status Available
  return {
    ok: true,
    value: {
      name: nameResult.value,
      licenseNumber: licenseNumberResult.value,
      licenseCategory: categoryResult.value,
      licenseExpiryDate: expiryDateResult.value,
      contactNumber: contactResult.value,
      safetyScore: safetyScoreResult.value,
      status: "Available", // Requirement 4.1: Initial status set to Available
    },
  };
}

/**
 * Input shape for updating an existing Driver.
 * All fields are optional for partial updates.
 */
export interface UpdateDriverInput {
  name?: string;
  licenseNumber?: string;
  licenseCategory?: string;
  licenseExpiryDate?: Date;
  contactNumber?: string;
  safetyScore?: number;
}

/**
 * Validates driver fields for update.
 * Only validates provided fields, allowing partial updates.
 * 
 * Requirement 4.4: Update editable fields with validation
 * Requirement 4.7: Return field-specific rejection for invalid fields
 * 
 * @param input - The driver update input to validate
 * @returns Result containing validated update fields or field-specific error message
 */
export function validateDriverUpdate(input: UpdateDriverInput): Result<UpdateDriverInput> {
  // Validate name if provided
  if (input.name !== undefined) {
    const nameResult = validateName(input.name);
    if (!nameResult.ok) {
      return nameResult;
    }
  }

  // Validate license number if provided
  if (input.licenseNumber !== undefined) {
    const licenseNumberResult = validateLicenseNumber(input.licenseNumber);
    if (!licenseNumberResult.ok) {
      return licenseNumberResult;
    }
  }

  // Validate license category if provided
  if (input.licenseCategory !== undefined) {
    const categoryResult = validateLicenseCategory(input.licenseCategory);
    if (!categoryResult.ok) {
      return categoryResult;
    }
  }

  // Validate license expiry date if provided
  if (input.licenseExpiryDate !== undefined) {
    const expiryDateResult = validateLicenseExpiryDate(input.licenseExpiryDate);
    if (!expiryDateResult.ok) {
      return expiryDateResult;
    }
  }

  // Validate contact number if provided
  if (input.contactNumber !== undefined) {
    const contactResult = validateContactNumber(input.contactNumber);
    if (!contactResult.ok) {
      return contactResult;
    }
  }

  // Validate safety score if provided
  if (input.safetyScore !== undefined) {
    const safetyScoreResult = validateSafetyScore(input.safetyScore);
    if (!safetyScoreResult.ok) {
      return safetyScoreResult;
    }
  }

  // All provided fields are valid
  return { ok: true, value: input };
}
