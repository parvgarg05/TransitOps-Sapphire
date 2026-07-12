/**
 * Uniqueness Check Helper
 * 
 * This module provides pure functions to check that a proposed identifier
 * (registration number or license number) does not collide with an existing set.
 * 
 * These checks are used for client-side validation before database insertion.
 * The database UNIQUE constraints provide the ultimate enforcement.
 * 
 * Requirements: 3.2, 4.8
 */

import { Result } from "./types";

/**
 * Error message for duplicate registration number.
 * Requirement 3.2: Display a uniqueness error message when registration number matches
 */
export const DUPLICATE_REGISTRATION_ERROR = "Registration number already exists";

/**
 * Error message for duplicate license number.
 * Requirement 4.8: Display a uniqueness error message when license number matches
 */
export const DUPLICATE_LICENSE_ERROR = "License number already exists";

/**
 * Checks if a proposed registration number is unique (does not exist in the given set).
 * 
 * This is a pure check against an existing set of registration numbers.
 * The database UNIQUE constraint on Vehicle.registrationNumber provides the
 * ultimate enforcement (Req 3.2).
 * 
 * @param proposedRegistrationNumber - The registration number to check
 * @param existingRegistrationNumbers - Set of existing registration numbers
 * @returns Result indicating success (unique) or failure with uniqueness error
 * 
 * Requirements: 3.2
 */
export function checkRegistrationNumberUniqueness(
  proposedRegistrationNumber: string,
  existingRegistrationNumbers: Set<string>
): Result<void> {
  if (existingRegistrationNumbers.has(proposedRegistrationNumber)) {
    return { ok: false, error: DUPLICATE_REGISTRATION_ERROR };
  }
  return { ok: true, value: undefined };
}

/**
 * Checks if a proposed license number is unique (does not exist in the given set).
 * 
 * This is a pure check against an existing set of license numbers.
 * The database UNIQUE constraint on Driver.licenseNumber provides the
 * ultimate enforcement (Req 4.8).
 * 
 * @param proposedLicenseNumber - The license number to check
 * @param existingLicenseNumbers - Set of existing license numbers
 * @returns Result indicating success (unique) or failure with uniqueness error
 * 
 * Requirements: 4.8
 */
export function checkLicenseNumberUniqueness(
  proposedLicenseNumber: string,
  existingLicenseNumbers: Set<string>
): Result<void> {
  if (existingLicenseNumbers.has(proposedLicenseNumber)) {
    return { ok: false, error: DUPLICATE_LICENSE_ERROR };
  }
  return { ok: true, value: undefined };
}

/**
 * Generic uniqueness check for any identifier against a set.
 * 
 * This function can be used for both registration numbers and license numbers,
 * or any other identifier that requires uniqueness checking.
 * 
 * @param proposedIdentifier - The identifier to check
 * @param existingIdentifiers - Set of existing identifiers
 * @param errorMessage - Custom error message for duplicates
 * @returns Result indicating success (unique) or failure with custom error
 * 
 * Requirements: 3.2, 4.8
 */
export function checkUniqueness(
  proposedIdentifier: string,
  existingIdentifiers: Set<string>,
  errorMessage: string
): Result<void> {
  if (existingIdentifiers.has(proposedIdentifier)) {
    return { ok: false, error: errorMessage };
  }
  return { ok: true, value: undefined };
}
