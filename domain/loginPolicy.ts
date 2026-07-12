/**
 * Login Policy - Credential Validation and Generic Rejection
 * 
 * This module implements credential validation rules before any database lookup.
 * It enforces input length limits and produces a single generic failure message
 * for any invalid credential, preventing user enumeration.
 * 
 * Requirements: 1.2, 1.8
 */

import { Result } from "./types";

/**
 * Maximum allowed email length (characters).
 * Requirement 1.8: Email must not exceed 254 characters
 */
export const MAX_EMAIL_LENGTH = 254;

/**
 * Maximum allowed password length (characters).
 * Requirement 1.8: Password must not exceed 128 characters
 */
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Generic authentication error message.
 * Requirement 1.2: Display an authentication error message that does not indicate
 * whether the email or the password was incorrect.
 */
export const GENERIC_AUTH_ERROR = "Invalid email or password";

/**
 * Validates credential format before any database lookup.
 * 
 * This function enforces:
 * - Email length must not exceed 254 characters (Req 1.8)
 * - Password length must not exceed 128 characters (Req 1.8)
 * 
 * If validation fails, it returns a generic error message that does not
 * reveal which field was invalid (Req 1.2).
 * 
 * @param email - The email credential to validate
 * @param password - The password credential to validate
 * @returns Result indicating success (credentials valid for lookup) or failure with generic error
 * 
 * Requirements: 1.2, 1.8
 */
export function validateCredentials(
  email: string,
  password: string
): Result<void> {
  // Requirement 1.8: Reject email > 254 characters
  if (email.length > MAX_EMAIL_LENGTH) {
    return { ok: false, error: GENERIC_AUTH_ERROR };
  }

  // Requirement 1.8: Reject password > 128 characters
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: GENERIC_AUTH_ERROR };
  }

  // Credentials pass format validation
  return { ok: true, value: undefined };
}
