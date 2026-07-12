/**
 * Session Management Utilities
 * 
 * Helper functions for working with NextAuth sessions in server components,
 * API routes, and server actions.
 * 
 * Requirements: 1.1, 1.5
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Get the current authenticated user's session
 * 
 * Returns null if the user is not authenticated.
 * Use this in server components and API routes.
 * 
 * @returns The user's session or null
 * 
 * Requirement 1.1: Only authenticated users should access the application
 */
export async function getCurrentSession() {
  return await getServerSession(authOptions);
}

/**
 * Get the current authenticated user
 * 
 * Returns null if the user is not authenticated.
 * 
 * @returns The user object or null
 * 
 * Requirement 1.1
 */
export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

/**
 * Require an authenticated session
 * 
 * Throws an error if the user is not authenticated.
 * Use this in API routes and server actions that require authentication.
 * 
 * @returns The user's session
 * @throws Error if not authenticated
 * 
 * Requirement 1.1
 */
export async function requireAuth() {
  const session = await getCurrentSession();
  
  if (!session || !session.user) {
    throw new Error("Unauthorized - Please sign in");
  }
  
  return session;
}

/**
 * Require a specific role
 * 
 * Throws an error if the user is not authenticated or doesn't have the required role.
 * Use this in API routes and server actions that require specific role permissions.
 * 
 * @param allowedRoles - Array of role names that are allowed
 * @returns The user's session
 * @throws Error if not authenticated or not authorized
 * 
 * Requirement 1.5: Role-Based Access Control (RBAC)
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Forbidden - Insufficient permissions");
  }
  
  return session;
}
