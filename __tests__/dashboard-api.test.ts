/**
 * Dashboard API Integration Test
 * 
 * Tests the dashboard endpoint to ensure:
 * - KPI computation works correctly
 * - Role-based views are returned correctly
 * - Filters are applied correctly
 * - Fleet Utilization handles N/A case
 */

import { describe, it, expect } from "vitest";
import { computeDashboardKpis } from "@/domain/dashboardKpis";
import { defaultDashboardView, FULL_KPI_SET } from "@/domain/dashboardView";
import { fleetUtilization } from "@/domain/analytics";
import { isLicenseExpired, isLicenseSoonToExpire } from "@/domain/license";
import type { Vehicle, Driver, Trip } from "@/domain/types";

describe("Dashboard API Logic", () => {
  describe("KPI Computation", () => {
    it("should compute all basic KPIs correctly", () => {
      const vehicles: Vehicle[] = [
        {
          id: "1",
          registrationNumber: "V001",
          name: "Van 1",
          type: "Van",
          region: "North",
          maxLoadCapacity: 1000,
          odometer: 5000,
          acquisitionCost: 25000,
          revenue: 10000,
          status: "Available",
          createdAt: new Date(),
        },
        {
          id: "2",
          registrationNumber: "V002",
          name: "Truck 1",
          type: "Truck",
          region: "South",
          maxLoadCapacity: 5000,
          odometer: 10000,
          acquisitionCost: 50000,
          revenue: 20000,
          status: "On Trip",
          createdAt: new Date(),
        },
        {
          id: "3",
          registrationNumber: "V003",
          name: "Van 2",
          type: "Van",
          region: "East",
          maxLoadCapacity: 1000,
          odometer: 3000,
          acquisitionCost: 24000,
          revenue: 8000,
          status: "In Shop",
          createdAt: new Date(),
        },
      ];

      const drivers: Driver[] = [
        {
          id: "1",
          name: "John Doe",
          licenseNumber: "L001",
          licenseCategory: "B",
          licenseExpiryDate: new Date("2025-12-31"),
          contactNumber: "1234567890",
          safetyScore: 95,
          status: "Available",
          createdAt: new Date(),
        },
        {
          id: "2",
          name: "Jane Smith",
          licenseNumber: "L002",
          licenseCategory: "C",
          licenseExpiryDate: new Date("2024-06-30"),
          contactNumber: "0987654321",
          safetyScore: 88,
          status: "On Trip",
          createdAt: new Date(),
        },
      ];

      const trips: Trip[] = [
        {
          id: "1",
          source: "City A",
          destination: "City B",
          vehicleId: "2",
          driverId: "2",
          createdByUserId: "user1",
          cargoWeight: 4000,
          plannedDistance: 150,
          status: "Dispatched",
          createdAt: new Date(),
        },
        {
          id: "2",
          source: "City C",
          destination: "City D",
          vehicleId: "1",
          driverId: "1",
          createdByUserId: "user1",
          cargoWeight: 500,
          plannedDistance: 80,
          status: "Draft",
          createdAt: new Date(),
        },
      ];

      const kpis = computeDashboardKpis(vehicles, drivers, trips);

      expect(kpis.activeVehicles).toBe(3); // All non-Retired
      expect(kpis.availableVehicles).toBe(1); // V001
      expect(kpis.vehiclesInMaintenance).toBe(1); // V003
      expect(kpis.activeTrips).toBe(1); // Trip 1 (Dispatched)
      expect(kpis.pendingTrips).toBe(1); // Trip 2 (Draft)
      expect(kpis.driversOnDuty).toBe(2); // Both Available and On Trip
    });

    it("should apply filters correctly", () => {
      const vehicles: Vehicle[] = [
        {
          id: "1",
          registrationNumber: "V001",
          name: "Van 1",
          type: "Van",
          region: "North",
          maxLoadCapacity: 1000,
          odometer: 5000,
          acquisitionCost: 25000,
          revenue: 10000,
          status: "Available",
          createdAt: new Date(),
        },
        {
          id: "2",
          registrationNumber: "V002",
          name: "Truck 1",
          type: "Truck",
          region: "South",
          maxLoadCapacity: 5000,
          odometer: 10000,
          acquisitionCost: 50000,
          revenue: 20000,
          status: "Available",
          createdAt: new Date(),
        },
      ];

      const drivers: Driver[] = [];
      const trips: Trip[] = [];

      // Filter by type
      const kpis = computeDashboardKpis(vehicles, drivers, trips, {
        type: "Van",
      });

      expect(kpis.availableVehicles).toBe(1); // Only V001 (Van)
    });

    it("should return 0 for empty matching sets", () => {
      const vehicles: Vehicle[] = [
        {
          id: "1",
          registrationNumber: "V001",
          name: "Van 1",
          type: "Van",
          region: "North",
          maxLoadCapacity: 1000,
          odometer: 5000,
          acquisitionCost: 25000,
          revenue: 10000,
          status: "Available",
          createdAt: new Date(),
        },
      ];

      const drivers: Driver[] = [];
      const trips: Trip[] = [];

      // Filter by type that doesn't exist
      const kpis = computeDashboardKpis(vehicles, drivers, trips, {
        type: "Truck",
      });

      expect(kpis.availableVehicles).toBe(0);
      expect(kpis.vehiclesInMaintenance).toBe(0);
    });
  });

  describe("Fleet Utilization", () => {
    it("should return N/A when no non-Retired vehicles", () => {
      const vehicles: Vehicle[] = [
        {
          id: "1",
          registrationNumber: "V001",
          name: "Van 1",
          type: "Van",
          region: "North",
          maxLoadCapacity: 1000,
          odometer: 5000,
          acquisitionCost: 25000,
          revenue: 10000,
          status: "Retired",
          createdAt: new Date(),
        },
      ];

      const utilization = fleetUtilization(vehicles);
      expect(utilization).toBeNull(); // N/A
    });

    it("should compute utilization correctly", () => {
      const vehicles: Vehicle[] = [
        {
          id: "1",
          registrationNumber: "V001",
          name: "Van 1",
          type: "Van",
          region: "North",
          maxLoadCapacity: 1000,
          odometer: 5000,
          acquisitionCost: 25000,
          revenue: 10000,
          status: "On Trip",
          createdAt: new Date(),
        },
        {
          id: "2",
          registrationNumber: "V002",
          name: "Truck 1",
          type: "Truck",
          region: "South",
          maxLoadCapacity: 5000,
          odometer: 10000,
          acquisitionCost: 50000,
          revenue: 20000,
          status: "Available",
          createdAt: new Date(),
        },
      ];

      const utilization = fleetUtilization(vehicles);
      expect(utilization).toBe(50.0); // 1/2 = 50%
    });
  });

  describe("License Derivations", () => {
    it("should identify expired licenses", () => {
      const today = new Date("2024-12-15");
      const expiredDate = new Date("2024-12-14");
      const validDate = new Date("2024-12-16");

      expect(isLicenseExpired(expiredDate, today)).toBe(true);
      expect(isLicenseExpired(validDate, today)).toBe(false);
    });

    it("should identify soon-to-expire licenses", () => {
      const today = new Date("2024-12-15");
      const soonToExpire = new Date("2025-01-14"); // 30 days
      const notSoonToExpire = new Date("2025-01-16"); // 32 days
      const expired = new Date("2024-12-14");

      expect(isLicenseSoonToExpire(soonToExpire, today)).toBe(true);
      expect(isLicenseSoonToExpire(notSoonToExpire, today)).toBe(false);
      expect(isLicenseSoonToExpire(expired, today)).toBe(false); // Already expired
    });
  });

  describe("Role-Based Default Views", () => {
    it("should return correct default view for Fleet Manager", () => {
      const defaultKpis = defaultDashboardView("Fleet Manager");

      expect(defaultKpis).toContain("Active Vehicles");
      expect(defaultKpis).toContain("Available Vehicles");
      expect(defaultKpis).toContain("Vehicles in Maintenance");
      expect(defaultKpis).toContain("Fleet Utilization");
      expect(defaultKpis.length).toBe(4);
    });

    it("should return correct default view for Driver", () => {
      const defaultKpis = defaultDashboardView("Driver");

      expect(defaultKpis).toContain("Pending Trips");
      expect(defaultKpis).toContain("Active Trips");
      expect(defaultKpis).toContain("Available Vehicles");
      expect(defaultKpis).toContain("Available Drivers Count");
      expect(defaultKpis.length).toBe(4);
    });

    it("should return correct default view for Safety Officer", () => {
      const defaultKpis = defaultDashboardView("Safety Officer");

      expect(defaultKpis).toContain("Expired License Count");
      expect(defaultKpis).toContain("Soon-To-Expire License Count");
      expect(defaultKpis).toContain("Suspended Drivers Count");
      expect(defaultKpis).toContain("Drivers On Duty");
      expect(defaultKpis).toContain("Safety Scores");
      expect(defaultKpis.length).toBe(5);
    });

    it("should return correct default view for Financial Analyst", () => {
      const defaultKpis = defaultDashboardView("Financial Analyst");

      expect(defaultKpis).toContain("Operational Cost");
      expect(defaultKpis).toContain("Fuel Efficiency");
      expect(defaultKpis).toContain("Vehicle ROI");
      expect(defaultKpis.length).toBe(3);
    });

    it("should have a consistent full KPI set available to all roles", () => {
      expect(FULL_KPI_SET.length).toBeGreaterThan(0);
      expect(FULL_KPI_SET).toContain("Active Vehicles");
      expect(FULL_KPI_SET).toContain("Fleet Utilization");
      expect(FULL_KPI_SET).toContain("Operational Cost");
    });
  });
});
