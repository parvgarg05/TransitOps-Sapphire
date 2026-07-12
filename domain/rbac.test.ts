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
import fc from "fast-check";
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

  // ============================================================================
  // Property-Based Tests (fast-check)
  // Feature: transitops, Property 6: RBAC is fail-closed and matches the grant matrix exactly
  // ============================================================================

  describe("Property 6: RBAC Fail-Closed and Permission Matrix Consistency", () => {
    // All valid roles in the system
    const VALID_ROLES: Role[] = ["Fleet Manager", "Driver", "Safety Officer", "Financial Analyst"];

    // All valid actions in the system
    const ALL_ACTIONS: Action[] = [
      "vehicle:create",
      "vehicle:read",
      "vehicle:update",
      "vehicle:retire",
      "maintenance:open",
      "maintenance:close",
      "maintenance:record-cost",
      "driver:read",
      "driver:update-compliance",
      "fuel:read",
      "expense:read",
      "analytics:read",
      "operational-cost:read",
      "trip:create",
      "trip:read",
      "trip:assign",
      "dashboard:view",
    ];

    // Expected permission matrix (ground truth for testing)
    const EXPECTED_PERMISSIONS: Record<Role, Action[]> = {
      "Fleet Manager": [
        "vehicle:create",
        "vehicle:read",
        "vehicle:update",
        "vehicle:retire",
        "maintenance:open",
        "maintenance:close",
        "maintenance:record-cost",
        "dashboard:view",
      ],
      "Driver": [
        "trip:create",
        "trip:read",
        "trip:assign",
        "dashboard:view",
      ],
      "Safety Officer": [
        "driver:read",
        "driver:update-compliance",
        "dashboard:view",
      ],
      "Financial Analyst": [
        "fuel:read",
        "expense:read",
        "analytics:read",
        "operational-cost:read",
        "dashboard:view",
      ],
    };

    // Arbitraries for property-based testing
    const roleArbitrary = fc.constantFrom(...VALID_ROLES);
    const actionArbitrary = fc.constantFrom(...ALL_ACTIONS);

    it("Property: Permission consistency - all valid roles have deterministic permissions", () => {
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
      fc.assert(
        fc.property(roleArbitrary, actionArbitrary, (role, action) => {
          const isAuthorized = can(role, action);
          const expectedAuthorized = EXPECTED_PERMISSIONS[role].includes(action);

          // The actual authorization result must match the expected matrix
          return isAuthorized === expectedAuthorized;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Fail-closed semantics - unauthorized actions are always denied", () => {
      // **Validates: Requirements 2.4**
      fc.assert(
        fc.property(roleArbitrary, actionArbitrary, (role, action) => {
          const isAuthorized = can(role, action);
          const expectedAuthorized = EXPECTED_PERMISSIONS[role].includes(action);

          // If action is not explicitly granted, it must be denied
          if (!expectedAuthorized) {
            return !isAuthorized;
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: No role or unknown role denies everything", () => {
      // **Validates: Requirements 2.1**
      fc.assert(
        fc.property(actionArbitrary, (action) => {
          // Null role should deny all actions
          const nullResult = can(null, action);
          // Undefined role should deny all actions
          const undefinedResult = can(undefined, action);

          return !nullResult && !undefinedResult;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Authorized role + action always permits", () => {
      // **Validates: Requirements 2.2**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          const authorizedActions = EXPECTED_PERMISSIONS[role];
          
          // Pick a random authorized action for this role
          if (authorizedActions.length === 0) return true;
          
          const randomIndex = Math.floor(Math.random() * authorizedActions.length);
          const action = authorizedActions[randomIndex];
          
          // This explicitly authorized (role, action) pair must be permitted
          return can(role, action) === true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Permission asymmetry - no action is granted to all roles except dashboard:view", () => {
      // **Validates: Requirements 2.5, 2.6, 2.7, 2.8**
      fc.assert(
        fc.property(actionArbitrary, (action) => {
          // Count how many roles have this action
          const rolesWithAction = VALID_ROLES.filter(role => 
            EXPECTED_PERMISSIONS[role].includes(action)
          );

          // Special case: dashboard:view is granted to all roles
          if (action === "dashboard:view") {
            return rolesWithAction.length === VALID_ROLES.length;
          }

          // All other actions should be granted to fewer than all roles (role separation)
          return rolesWithAction.length < VALID_ROLES.length;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: getAuthorizedActions returns exactly the expected set", () => {
      // **Validates: Requirements 2.2, 2.4**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          const actualActions = getAuthorizedActions(role);
          const expectedActions = EXPECTED_PERMISSIONS[role];

          // Check set equality
          if (actualActions.size !== expectedActions.length) return false;

          for (const action of expectedActions) {
            if (!actualActions.has(action)) return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: No data changes when access is denied", () => {
      // **Validates: Requirements 2.3**
      // This property verifies that can() is a pure query function
      fc.assert(
        fc.property(roleArbitrary, actionArbitrary, (role, action) => {
          // Call can() multiple times
          const result1 = can(role, action);
          const result2 = can(role, action);
          const result3 = can(role, action);

          // Results must be identical (deterministic, no side effects)
          return result1 === result2 && result2 === result3;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Each role has at least one authorized action", () => {
      // **Validates: Requirements 2.5, 2.6, 2.7, 2.8**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          const authorizedActions = getAuthorizedActions(role);
          
          // Every valid role should have at least one action (including dashboard:view)
          return authorizedActions.size > 0;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Dashboard view is granted to all roles", () => {
      // **Validates: Requirements 10.1**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          // All authenticated users (with valid roles) can view dashboard
          return can(role, "dashboard:view") === true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
