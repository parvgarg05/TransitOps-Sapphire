/**
 * Role → UI access helpers.
 *
 * Maps each role to the page it should land on after login and the RBAC action
 * each navigation destination requires. Kept framework-free so it can be used
 * from both client components (sidebar, login) and server code.
 */

import type { Role } from "@/domain/types";
import type { Action } from "@/domain/rbac";

/**
 * The primary landing page for each role, chosen to match its core
 * responsibility:
 *  - Fleet Manager   → dashboard (fleet assets & maintenance overview)
 *  - Driver          → trips (creates/dispatches/monitors trips)
 *  - Safety Officer  → drivers (license validity & compliance)
 *  - Financial Analyst → reports (expenses, fuel, ROI)
 */
export function roleHome(role?: string | null): string {
  switch (role) {
    case "Fleet Manager":
      return "/dashboard";
    case "Driver":
      return "/trips";
    case "Safety Officer":
      return "/drivers";
    case "Financial Analyst":
      return "/reports";
    default:
      return "/dashboard";
  }
}

/** A single item in the primary navigation, with the permission it needs. */
export interface NavAccess {
  href: string;
  action: Action;
}

/**
 * The RBAC action gating each navigation destination. Used to filter the
 * sidebar so a role only sees links it can actually open.
 */
export const NAV_ACCESS: Record<string, Action> = {
  "/dashboard": "dashboard:view",
  "/vehicles": "vehicle:read",
  "/drivers": "driver:read",
  "/trips": "trip:read",
  "/maintenance": "maintenance:open",
  "/expenses": "expense:read",
  "/reports": "analytics:read",
};

export type { Role };
