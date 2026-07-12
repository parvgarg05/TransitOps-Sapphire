/**
 * Tests for RBAC Permission Matrix
 * 
 * Validates:
 * - Fail-closed authorization (unknown role/action → deny)
 * - Each role's specific permissions per Requirements 2.5-2.8
 * - Boundary cases (null, undefined, invalid roles)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

import { describe, it, expect } from "vitest";
import { can, getAuthorizedActions, Action } from "./rbac";
import { Role } from "./types";

describe("RBAC Permission Matrix", () => {
  // ============================================================================
  // Requirement 2.1: Unknown/No Role Denied Everything
  // ============================================================================

  describe("Requirement 2.1: Unknown/No Role Handling", () => {
    it("should deny all actions when role is null", () => {
      expect(can(null, "vehicle:create")).toBe(false);
      expect(can(null, "trip:create")).toBe(false);
      expect(can(null, "dashboard:view")).toBe(false);
    });

    it("should deny all actions when role is undefined", () => {
      expect(can(undefined, "vehicle:create")).toBe(false);
      expect(can(undefined, "trip:create")).toBe(false);
      expect(can(undefined, "dashboard:view")).toBe(false);
    });

    it("should return empty set for null role", () => {
      const actions = getAuthorizedActions(null);
      expect(actions.size).toBe(0);
    });

    it("should return empty set for undefined role", () => {
      const actions = getAuthorizedActions(undefined);
      expect(actions.size).toBe(0);
    });
  });

  // ============================================================================
  // Requirement 2.5: Fleet Manager Permissions
  // ============================================================================

  describe("Requirement 2.5: Fleet Manager Permissions", () => {
    const role: Role = "Fleet Manager";

    it("should allow Fleet Manager to create vehicles", () => {
      expect(can(role, "vehicle:create")).toBe(true);
    });

    it("should allow Fleet Manager to read vehicles", () => {
      expect(can(role, "vehicle:read")).toBe(true);
    });

    it("should allow Fleet Manager to update vehicles", () => {
      expect(can(role, "vehicle:update")).toBe(true);
    });

    it("should allow Fleet Manager to retire vehicles", () => {
      expect(can(role, "vehicle:retire")).toBe(true);
    });

    it("should allow Fleet Manager to open maintenance logs", () => {
      expect(can(role, "maintenance:open")).toBe(true);
    });

    it("should allow Fleet Manager to close maintenance logs", () => {
      expect(can(role, "maintenance:close")).toBe(true);
    });

    it("should allow Fleet Manager to record maintenance costs", () => {
      expect(can(role, "maintenance:record-cost")).toBe(true);
    });

    it("should allow Fleet Manager to view dashboard", () => {
      expect(can(role, "dashboard:view")).toBe(true);
    });

    it("should deny Fleet Manager from creating trips", () => {
      expect(can(role, "trip:create")).toBe(false);
    });

    it("should deny Fleet Manager from reading driver compliance", () => {
      expect(can(role, "driver:read")).toBe(false);
    });

    it("should deny Fleet Manager from reading fuel logs", () => {
      expect(can(role, "fuel:read")).toBe(false);
    });
  });

  // ============================================================================
  // Requirement 2.6: Safety Officer Permissions
  // ============================================================================

  describe("Requirement 2.6: Safety Officer Permissions", () => {
    const role: Role = "Safety Officer";

    it("should allow Safety Officer to read driver data", () => {
      expect(can(role, "driver:read")).toBe(true);
    });

    it("should allow Safety Officer to update driver compliance", () => {
      expect(can(role, "driver:update-compliance")).toBe(true);
    });

    it("should allow Safety Officer to view dashboard", () => {
      expect(can(role, "dashboard:view")).toBe(true);
    });

    it("should deny Safety Officer from creating vehicles", () => {
      expect(can(role, "vehicle:create")).toBe(false);
    });

    it("should deny Safety Officer from opening maintenance", () => {
      expect(can(role, "maintenance:open")).toBe(false);
    });

    it("should deny Safety Officer from creating trips", () => {
      expect(can(role, "trip:create")).toBe(false);
    });

    it("should deny Safety Officer from reading analytics", () => {
      expect(can(role, "analytics:read")).toBe(false);
    });
  });

  // ============================================================================
  // Requirement 2.7: Financial Analyst Permissions
  // ============================================================================

  describe("Requirement 2.7: Financial Analyst Permissions", () => {
    const role: Role = "Financial Analyst";

    it("should allow Financial Analyst to read fuel logs", () => {
      expect(can(role, "fuel:read")).toBe(true);
    });

    it("should allow Financial Analyst to read expenses", () => {
      expect(can(role, "expense:read")).toBe(true);
    });

    it("should allow Financial Analyst to read analytics", () => {
      expect(can(role, "analytics:read")).toBe(true);
    });

    it("should allow Financial Analyst to read operational cost", () => {
      expect(can(role, "operational-cost:read")).toBe(true);
    });

    it("should allow Financial Analyst to view dashboard", () => {
      expect(can(role, "dashboard:view")).toBe(true);
    });

    it("should deny Financial Analyst from creating vehicles", () => {
      expect(can(role, "vehicle:create")).toBe(false);
    });

    it("should deny Financial Analyst from updating drivers", () => {
      expect(can(role, "driver:update-compliance")).toBe(false);
    });

    it("should deny Financial Analyst from creating trips", () => {
      expect(can(role, "trip:create")).toBe(false);
    });

    it("should deny Financial Analyst from opening maintenance", () => {
      expect(can(role, "maintenance:open")).toBe(false);
    });
  });

  // ============================================================================
  // Requirement 2.8: Driver Role Permissions
  // ============================================================================

  describe("Requirement 2.8: Driver Role Permissions", () => {
    const role: Role = "Driver";

    it("should allow Driver to create trips", () => {
      expect(can(role, "trip:create")).toBe(true);
    });

    it("should allow Driver to read trips", () => {
      expect(can(role, "trip:read")).toBe(true);
    });

    it("should allow Driver to assign vehicles and drivers to trips", () => {
      expect(can(role, "trip:assign")).toBe(true);
    });

    it("should allow Driver to view dashboard", () => {
      expect(can(role, "dashboard:view")).toBe(true);
    });

    it("should deny Driver from creating vehicles", () => {
      expect(can(role, "vehicle:create")).toBe(false);
    });

    it("should deny Driver from opening maintenance", () => {
      expect(can(role, "maintenance:open")).toBe(false);
    });

    it("should deny Driver from reading driver compliance", () => {
      expect(can(role, "driver:read")).toBe(false);
    });

    it("should deny Driver from reading fuel logs", () => {
      expect(can(role, "fuel:read")).toBe(false);
    });
  });

  // ============================================================================
  // Requirement 2.4: Fail-Closed Authorization
  // ============================================================================

  describe("Requirement 2.4: Fail-Closed Authorization", () => {
    it("should deny actions not explicitly granted to any role", () => {
      // Create a fake action that doesn't exist in any role's permission set
      const unknownAction = "unknown:action" as Action;

      expect(can("Fleet Manager", unknownAction)).toBe(false);
      expect(can("Driver", unknownAction)).toBe(false);
      expect(can("Safety Officer", unknownAction)).toBe(false);
      expect(can("Financial Analyst", unknownAction)).toBe(false);
    });
  });

  // ============================================================================
  // Requirement 10.1: Dashboard Access for All Authenticated Users
  // ============================================================================

  describe("Requirement 10.1: Dashboard Access", () => {
    it("should allow all valid roles to view dashboard", () => {
      expect(can("Fleet Manager", "dashboard:view")).toBe(true);
      expect(can("Driver", "dashboard:view")).toBe(true);
      expect(can("Safety Officer", "dashboard:view")).toBe(true);
      expect(can("Financial Analyst", "dashboard:view")).toBe(true);
    });
  });

  // ============================================================================
  // Requirement 2.2: Authorized Role + Action → Permit
  // ============================================================================

  describe("Requirement 2.2: Authorized Actions Permitted", () => {
    it("should permit explicitly authorized (role, action) pairs", () => {
      // Sample from each role
      expect(can("Fleet Manager", "vehicle:create")).toBe(true);
      expect(can("Driver", "trip:create")).toBe(true);
      expect(can("Safety Officer", "driver:read")).toBe(true);
      expect(can("Financial Analyst", "fuel:read")).toBe(true);
    });
  });

  // ============================================================================
  // Helper Function Tests
  // ============================================================================

  describe("getAuthorizedActions helper", () => {
    it("should return correct action set for Fleet Manager", () => {
      const actions = getAuthorizedActions("Fleet Manager");
      expect(actions.has("vehicle:create")).toBe(true);
      expect(actions.has("maintenance:open")).toBe(true);
      expect(actions.has("trip:create")).toBe(false);
    });

    it("should return correct action set for Driver", () => {
      const actions = getAuthorizedActions("Driver");
      expect(actions.has("trip:create")).toBe(true);
      expect(actions.has("trip:read")).toBe(true);
      expect(actions.has("vehicle:create")).toBe(false);
    });

    it("should return correct action set for Safety Officer", () => {
      const actions = getAuthorizedActions("Safety Officer");
      expect(actions.has("driver:read")).toBe(true);
      expect(actions.has("driver:update-compliance")).toBe(true);
      expect(actions.has("vehicle:create")).toBe(false);
    });

    it("should return correct action set for Financial Analyst", () => {
      const actions = getAuthorizedActions("Financial Analyst");
      expect(actions.has("fuel:read")).toBe(true);
      expect(actions.has("analytics:read")).toBe(true);
      expect(actions.has("trip:create")).toBe(false);
    });
  });
});
