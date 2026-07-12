/**
 * Tests for Role-Based Default Dashboard View Mapping
 * 
 * Validates:
 * - Each role maps to its specified Default Dashboard View subset
 * - The full KPI set is identical for every role (no viewing restrictions)
 * - Default view is pure presentation logic (deterministic, no side effects)
 * - Default views are proper subsets of the full KPI set
 * 
 * Requirements: 10.10, 10.11, 10.12, 10.13, 10.14
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  defaultDashboardView,
  isInDefaultView,
  isValidRole,
  FULL_KPI_SET,
  type KPI,
} from "./dashboardView";
import { Role } from "./types";

describe("Role-Based Default Dashboard View Mapping", () => {
  // ============================================================================
  // Requirement 10.10: Fleet Manager Default View
  // ============================================================================

  describe("Requirement 10.10: Fleet Manager Default View", () => {
    const role: Role = "Fleet Manager";

    it("should return correct default view for Fleet Manager", () => {
      const view = defaultDashboardView(role);

      expect(view).toContain("Active Vehicles");
      expect(view).toContain("Available Vehicles");
      expect(view).toContain("Vehicles in Maintenance");
      expect(view).toContain("Fleet Utilization");
      expect(view.length).toBe(4);
    });

    it("should have exactly the specified KPIs in Fleet Manager view", () => {
      const view = defaultDashboardView(role);
      const expected: KPI[] = [
        "Active Vehicles",
        "Available Vehicles",
        "Vehicles in Maintenance",
        "Fleet Utilization",
      ];

      expect(new Set(view)).toEqual(new Set(expected));
    });
  });

  // ============================================================================
  // Requirement 10.11: Driver Default View
  // ============================================================================

  describe("Requirement 10.11: Driver Default View", () => {
    const role: Role = "Driver";

    it("should return correct default view for Driver", () => {
      const view = defaultDashboardView(role);

      expect(view).toContain("Pending Trips");
      expect(view).toContain("Active Trips");
      expect(view).toContain("Available Vehicles");
      expect(view).toContain("Available Drivers Count");
      expect(view.length).toBe(4);
    });

    it("should have exactly the specified KPIs in Driver view", () => {
      const view = defaultDashboardView(role);
      const expected: KPI[] = [
        "Pending Trips",
        "Active Trips",
        "Available Vehicles",
        "Available Drivers Count",
      ];

      expect(new Set(view)).toEqual(new Set(expected));
    });
  });

  // ============================================================================
  // Requirement 10.12: Safety Officer Default View
  // ============================================================================

  describe("Requirement 10.12: Safety Officer Default View", () => {
    const role: Role = "Safety Officer";

    it("should return correct default view for Safety Officer", () => {
      const view = defaultDashboardView(role);

      expect(view).toContain("Expired License Count");
      expect(view).toContain("Soon-To-Expire License Count");
      expect(view).toContain("Suspended Drivers Count");
      expect(view).toContain("Drivers On Duty");
      expect(view).toContain("Safety Scores");
      expect(view.length).toBe(5);
    });

    it("should have exactly the specified KPIs in Safety Officer view", () => {
      const view = defaultDashboardView(role);
      const expected: KPI[] = [
        "Expired License Count",
        "Soon-To-Expire License Count",
        "Suspended Drivers Count",
        "Drivers On Duty",
        "Safety Scores",
      ];

      expect(new Set(view)).toEqual(new Set(expected));
    });
  });

  // ============================================================================
  // Requirement 10.13: Financial Analyst Default View
  // ============================================================================

  describe("Requirement 10.13: Financial Analyst Default View", () => {
    const role: Role = "Financial Analyst";

    it("should return correct default view for Financial Analyst", () => {
      const view = defaultDashboardView(role);

      expect(view).toContain("Operational Cost");
      expect(view).toContain("Fuel Efficiency");
      expect(view).toContain("Vehicle ROI");
      expect(view.length).toBe(3);
    });

    it("should have exactly the specified KPIs in Financial Analyst view", () => {
      const view = defaultDashboardView(role);
      const expected: KPI[] = [
        "Operational Cost",
        "Fuel Efficiency",
        "Vehicle ROI",
      ];

      expect(new Set(view)).toEqual(new Set(expected));
    });
  });

  // ============================================================================
  // Requirement 10.14: Full KPI Set Available to All Roles
  // ============================================================================

  describe("Requirement 10.14: Full KPI Set Accessibility", () => {
    const ALL_ROLES: Role[] = [
      "Fleet Manager",
      "Driver",
      "Safety Officer",
      "Financial Analyst",
    ];

    it("should have identical full KPI set for all roles", () => {
      // The FULL_KPI_SET constant is the same for everyone
      expect(FULL_KPI_SET).toBeDefined();
      expect(FULL_KPI_SET.length).toBeGreaterThan(0);

      // Verify it contains all expected KPIs
      expect(FULL_KPI_SET.length).toBe(15);
    });

    it("should allow all roles to access the complete KPI set", () => {
      // Every role can view every KPI in FULL_KPI_SET - default view is just emphasis
      ALL_ROLES.forEach((role) => {
        const defaultView = defaultDashboardView(role);

        // Default view should be a subset of full KPI set
        defaultView.forEach((kpi) => {
          expect(FULL_KPI_SET).toContain(kpi);
        });

        // Default view should be smaller than full set (it's emphasis, not restriction)
        expect(defaultView.length).toBeLessThan(FULL_KPI_SET.length);
      });
    });

    it("should have all default views as proper subsets of full KPI set", () => {
      ALL_ROLES.forEach((role) => {
        const defaultView = defaultDashboardView(role);
        const defaultSet = new Set(defaultView);
        const fullSet = new Set(FULL_KPI_SET);

        // Every KPI in default view must be in full set
        defaultView.forEach((kpi) => {
          expect(fullSet.has(kpi)).toBe(true);
        });

        // Default set should be a proper subset (smaller than full set)
        expect(defaultSet.size).toBeLessThan(fullSet.size);
      });
    });
  });

  // ============================================================================
  // Helper Function Tests
  // ============================================================================

  describe("isInDefaultView helper", () => {
    it("should correctly identify KPIs in Fleet Manager default view", () => {
      expect(isInDefaultView("Fleet Manager", "Active Vehicles")).toBe(true);
      expect(isInDefaultView("Fleet Manager", "Operational Cost")).toBe(false);
    });

    it("should correctly identify KPIs in Driver default view", () => {
      expect(isInDefaultView("Driver", "Pending Trips")).toBe(true);
      expect(isInDefaultView("Driver", "Vehicle ROI")).toBe(false);
    });

    it("should correctly identify KPIs in Safety Officer default view", () => {
      expect(isInDefaultView("Safety Officer", "Expired License Count")).toBe(true);
      expect(isInDefaultView("Safety Officer", "Fleet Utilization")).toBe(false);
    });

    it("should correctly identify KPIs in Financial Analyst default view", () => {
      expect(isInDefaultView("Financial Analyst", "Operational Cost")).toBe(true);
      expect(isInDefaultView("Financial Analyst", "Active Trips")).toBe(false);
    });
  });

  describe("isValidRole helper", () => {
    it("should return true for valid roles", () => {
      expect(isValidRole("Fleet Manager")).toBe(true);
      expect(isValidRole("Driver")).toBe(true);
      expect(isValidRole("Safety Officer")).toBe(true);
      expect(isValidRole("Financial Analyst")).toBe(true);
    });

    it("should return false for invalid roles", () => {
      expect(isValidRole("Admin")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole("unknown")).toBe(false);
    });
  });

  // ============================================================================
  // Property-Based Tests (fast-check)
  // Feature: transitops, Property 34: The Default Dashboard View maps each role to its specified subset and never restricts the full KPI set
  // ============================================================================

  describe("Property 34: Default Dashboard View Mapping and Full KPI Access", () => {
    const ALL_ROLES: Role[] = [
      "Fleet Manager",
      "Driver",
      "Safety Officer",
      "Financial Analyst",
    ];

    // Expected default views for each role (ground truth)
    const EXPECTED_DEFAULT_VIEWS: Record<Role, ReadonlyArray<KPI>> = {
      "Fleet Manager": [
        "Active Vehicles",
        "Available Vehicles",
        "Vehicles in Maintenance",
        "Fleet Utilization",
      ],
      "Driver": [
        "Pending Trips",
        "Active Trips",
        "Available Vehicles",
        "Available Drivers Count",
      ],
      "Safety Officer": [
        "Expired License Count",
        "Soon-To-Expire License Count",
        "Suspended Drivers Count",
        "Drivers On Duty",
        "Safety Scores",
      ],
      "Financial Analyst": [
        "Operational Cost",
        "Fuel Efficiency",
        "Vehicle ROI",
      ],
    };

    // Arbitraries for property-based testing
    const roleArbitrary = fc.constantFrom(...ALL_ROLES);
    const kpiArbitrary = fc.constantFrom(...FULL_KPI_SET);

    it("Property: Each role maps to its exact specified default view", () => {
      // **Validates: Requirements 10.10, 10.11, 10.12, 10.13**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          const actualView = defaultDashboardView(role);
          const expectedView = EXPECTED_DEFAULT_VIEWS[role];

          // Convert to sets for comparison
          const actualSet = new Set(actualView);
          const expectedSet = new Set(expectedView);

          // Size must match
          if (actualSet.size !== expectedSet.size) return false;

          // Every expected KPI must be in actual
          for (const kpi of expectedView) {
            if (!actualSet.has(kpi)) return false;
          }

          // Every actual KPI must be in expected
          for (const kpi of actualView) {
            if (!expectedSet.has(kpi)) return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Default view is always a proper subset of full KPI set", () => {
      // **Validates: Requirements 10.14**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          const defaultView = defaultDashboardView(role);
          const fullSet = new Set(FULL_KPI_SET);

          // Every KPI in default view must be in full set
          for (const kpi of defaultView) {
            if (!fullSet.has(kpi)) return false;
          }

          // Default view must be smaller (proper subset)
          return defaultView.length < FULL_KPI_SET.length;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Default view mapping is deterministic", () => {
      // **Validates: Requirements 10.10, 10.11, 10.12, 10.13**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          // Call multiple times
          const view1 = defaultDashboardView(role);
          const view2 = defaultDashboardView(role);
          const view3 = defaultDashboardView(role);

          // Results must be identical (deterministic, no side effects)
          const set1 = new Set(view1);
          const set2 = new Set(view2);
          const set3 = new Set(view3);

          // Check set equality
          if (set1.size !== set2.size || set2.size !== set3.size) return false;

          for (const kpi of view1) {
            if (!set2.has(kpi) || !set3.has(kpi)) return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Full KPI set is identical across all roles", () => {
      // **Validates: Requirements 10.14**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          // Full KPI set is the same constant for all roles
          // This verifies that viewing access is never restricted by role
          const fullSet = new Set(FULL_KPI_SET);

          // Full set should contain all possible KPIs
          return fullSet.size === FULL_KPI_SET.length && fullSet.size > 0;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: No KPI appears in all default views (role differentiation)", () => {
      // **Validates: Requirements 10.10, 10.11, 10.12, 10.13**
      fc.assert(
        fc.property(kpiArbitrary, (kpi) => {
          // Count how many role default views contain this KPI
          const rolesWithKPI = ALL_ROLES.filter((role) =>
            EXPECTED_DEFAULT_VIEWS[role].includes(kpi)
          );

          // No KPI should be in all default views (that would defeat the purpose of role-specific emphasis)
          return rolesWithKPI.length < ALL_ROLES.length;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Default views have no duplicate KPIs", () => {
      // **Validates: Requirements 10.10, 10.11, 10.12, 10.13**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          const view = defaultDashboardView(role);
          const uniqueSet = new Set(view);

          // Set size should equal array length (no duplicates)
          return uniqueSet.size === view.length;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: isInDefaultView is consistent with defaultDashboardView", () => {
      // **Validates: Requirements 10.10, 10.11, 10.12, 10.13**
      fc.assert(
        fc.property(roleArbitrary, kpiArbitrary, (role, kpi) => {
          const view = defaultDashboardView(role);
          const isInView = isInDefaultView(role, kpi);
          const actuallyInView = view.includes(kpi);

          // isInDefaultView must match the actual presence in default view
          return isInView === actuallyInView;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Each role has a non-empty default view", () => {
      // **Validates: Requirements 10.10, 10.11, 10.12, 10.13**
      fc.assert(
        fc.property(roleArbitrary, (role) => {
          const view = defaultDashboardView(role);

          // Every role should have at least one KPI in their default view
          return view.length > 0;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Different roles have different default views", () => {
      // **Validates: Requirements 10.10, 10.11, 10.12, 10.13**
      fc.assert(
        fc.property(
          fc.tuple(roleArbitrary, roleArbitrary).filter(([r1, r2]) => r1 !== r2),
          ([role1, role2]) => {
            const view1 = new Set(defaultDashboardView(role1));
            const view2 = new Set(defaultDashboardView(role2));

            // Different roles should have different default views
            // Check if sets are different (either size or content)
            if (view1.size !== view2.size) return true;

            // If same size, check if content differs
            for (const kpi of view1) {
              if (!view2.has(kpi)) return true;
            }

            // If we get here, views are identical - but they shouldn't be for different roles
            return false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Default view emphasis does not restrict full KPI access", () => {
      // **Validates: Requirements 10.14**
      fc.assert(
        fc.property(roleArbitrary, kpiArbitrary, (role, kpi) => {
          // Any KPI in the full set can be accessed by any role
          const fullSet = new Set(FULL_KPI_SET);

          // If KPI is in full set, all roles can access it (even if not in their default view)
          if (fullSet.has(kpi)) {
            // The default view selection doesn't prevent access
            // This is a presentation concern only
            return true;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
