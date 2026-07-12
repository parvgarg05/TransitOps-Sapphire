/**
 * Role-Based Access Control (RBAC) Permission Matrix
 * 
 * This module implements the static (Role, Action) permission map with
 * fail-closed authorization semantics.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

import { Role } from "./types";

// ============================================================================
// Action Enumeration
// ============================================================================

/**
 * Action represents all authorizable operations in the system.
 * Each action corresponds to a specific operation that requires authorization.
 */
export type Action =
  // Vehicle operations (Req 2.5, 3.x)
  | "vehicle:create"
  | "vehicle:read"
  | "vehicle:update"
  | "vehicle:retire"
  // Maintenance operations (Req 2.5, 7.x)
  | "maintenance:open"
  | "maintenance:close"
  | "maintenance:record-cost"
  // Driver operations (Req 2.6, 4.x)
  | "driver:read"
  | "driver:update-compliance"
  // Financial operations (Req 2.7, 8.x, 9.x)
  | "fuel:read"
  | "expense:read"
  | "analytics:read"
  | "operational-cost:read"
  // Trip operations (Req 2.8, 5.x, 6.x)
  | "trip:create"
  | "trip:read"
  | "trip:assign"
  // Dashboard operations (Req 10.1)
  | "dashboard:view";

// ============================================================================
// Permission Matrix
// ============================================================================

/**
 * Static permission matrix mapping (Role, Action) to allow/deny.
 * 
 * Any (Role, Action) pair NOT present in this map is DENIED (fail-closed).
 * 
 * Requirement 2.4: Actions not explicitly authorized are treated as unauthorized.
 */
const PERMISSION_MATRIX: ReadonlyMap<Role, ReadonlySet<Action>> = new Map([
  // Fleet Manager: Vehicles + Maintenance (Req 2.5)
  [
    "Fleet Manager",
    new Set<Action>([
      "vehicle:create",
      "vehicle:read",
      "vehicle:update",
      "vehicle:retire",
      "maintenance:open",
      "maintenance:close",
      "maintenance:record-cost",
      "dashboard:view",
    ]),
  ],

  // Driver: Trips (Req 2.8)
  [
    "Driver",
    new Set<Action>([
      "trip:create",
      "trip:read",
      "trip:assign",
      "dashboard:view",
    ]),
  ],

  // Safety Officer: Driver compliance (Req 2.6)
  [
    "Safety Officer",
    new Set<Action>([
      "driver:read",
      "driver:update-compliance",
      "dashboard:view",
    ]),
  ],

  // Financial Analyst: Fuel, Expenses, Analytics (Req 2.7)
  [
    "Financial Analyst",
    new Set<Action>([
      "fuel:read",
      "expense:read",
      "analytics:read",
      "operational-cost:read",
      "dashboard:view",
    ]),
  ],
]);

// ============================================================================
// Authorization Function
// ============================================================================

/**
 * Determines whether a given role is authorized to perform an action.
 * 
 * Fail-closed semantics (Req 2.4):
 * - Unknown role → DENY
 * - No role (null/undefined) → DENY
 * - Action not explicitly granted to role → DENY
 * 
 * @param role - The user's role (or null/undefined for no role)
 * @param action - The action to authorize
 * @returns true if authorized, false otherwise
 * 
 * Requirements:
 * - 2.1: Unknown/no role denied everything
 * - 2.2: Authorized role + action → permit
 * - 2.3: Unauthorized action → deny, no data change
 * - 2.4: Not explicitly authorized → unauthorized
 */
export function can(role: Role | null | undefined, action: Action): boolean {
  // Req 2.1: No role or unknown role → deny everything
  if (!role) {
    return false;
  }

  // Look up the role's permission set
  const permissions = PERMISSION_MATRIX.get(role);

  // Unknown role (not in matrix) → deny everything (Req 2.1)
  if (!permissions) {
    return false;
  }

  // Req 2.2: Check if action is explicitly granted
  // Req 2.4: If not present, deny (fail-closed)
  return permissions.has(action);
}

/**
 * Gets the complete set of actions authorized for a given role.
 * Useful for debugging and testing.
 * 
 * @param role - The role to query
 * @returns A readonly set of authorized actions, or empty set if role is unknown
 */
export function getAuthorizedActions(role: Role | null | undefined): ReadonlySet<Action> {
  if (!role) {
    return new Set<Action>();
  }

  return PERMISSION_MATRIX.get(role) ?? new Set<Action>();
}
