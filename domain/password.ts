/**
 * Password hashing utilities using bcrypt
 * 
 * This module provides secure password hashing and verification functions.
 * Passwords are NEVER stored or returned as plaintext.
 * 
 * Requirements: 1.4
 */

import bcrypt from "bcrypt";

/**
 * The number of salt rounds for bcrypt hashing.
 * 10 rounds provides a good balance between security and performance.
 */
const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 * The plaintext password is never stored or persisted.
 * 
 * Requirement 1.4: Passwords SHALL be stored using a one-way cryptographic hash
 * and SHALL NOT be stored or returned as plaintext.
 * 
 * @param plaintext - The plaintext password to hash
 * @returns A promise that resolves to the bcrypt hash string
 * 
 * @example
 * const hash = await hashPassword("mySecurePassword123");
 * // hash is something like: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * 
 * Requirement 1.4: Passwords SHALL be verified using the bcrypt comparison function.
 * The plaintext password is never stored or persisted.
 * 
 * @param plaintext - The plaintext password to verify
 * @param hash - The stored bcrypt hash to compare against
 * @returns A promise that resolves to true if the password matches, false otherwise
 * 
 * @example
 * const isValid = await verifyPassword("mySecurePassword123", storedHash);
 * if (isValid) {
 *   // Password is correct
 * } else {
 *   // Password is incorrect
 * }
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
