/**
 * Unit tests for shared domain types and date helpers
 * Feature: transitops
 */

import { describe, it, expect } from "vitest";
import {
  Role,
  VehicleStatus,
  DriverStatus,
  TripStatus,
  Result,
  Vehicle,
  Driver,
  Trip,
  MaintenanceLog,
  FuelLog,
  Expense,
  startOfDay,
  addDays,
} from "./types";

describe("Domain Types", () => {
  describe("Status Enumerations", () => {
    it("should allow valid Role values", () => {
      const roles: Role[] = ["Fleet Manager", "Driver", "Safety Officer", "Financial Analyst"];
      expect(roles).toHaveLength(4);
    });

    it("should allow valid VehicleStatus values", () => {
      const statuses: VehicleStatus[] = ["Available", "On Trip", "In Shop", "Retired"];
      expect(statuses).toHaveLength(4);
    });

    it("should allow valid DriverStatus values", () => {
      const statuses: DriverStatus[] = ["Available", "On Trip", "Off Duty", "Suspended"];
      expect(statuses).toHaveLength(4);
    });

    it("should allow valid TripStatus values", () => {
      const statuses: TripStatus[] = ["Draft", "Dispatched", "Completed", "Cancelled"];
      expect(statuses).toHaveLength(4);
    });
  });

  describe("Result type", () => {
    it("should represent success with ok: true and value", () => {
      const success: Result<number> = { ok: true, value: 42 };
      expect(success.ok).toBe(true);
      if (success.ok) {
        expect(success.value).toBe(42);
      }
    });

    it("should represent failure with ok: false and error", () => {
      const failure: Result<number> = { ok: false, error: "Something went wrong" };
      expect(failure.ok).toBe(false);
      if (!failure.ok) {
        expect(failure.error).toBe("Something went wrong");
      }
    });
  });

  describe("Domain Entity Shapes", () => {
    it("should allow valid Vehicle shape", () => {
      const vehicle: Vehicle = {
        id: "v1",
        registrationNumber: "ABC123",
        name: "Truck 1",
        type: "Heavy Duty",
        region: "North",
        maxLoadCapacity: 5000,
        odometer: 10000,
        acquisitionCost: 50000,
        revenue: 0,
        status: "Available",
        createdAt: new Date(),
      };
      expect(vehicle.registrationNumber).toBe("ABC123");
      expect(vehicle.status).toBe("Available");
    });

    it("should allow valid Driver shape", () => {
      const driver: Driver = {
        id: "d1",
        name: "John Doe",
        licenseNumber: "DL123456",
        licenseCategory: "Heavy Vehicle",
        licenseExpiryDate: new Date("2025-12-31"),
        contactNumber: "+1234567890",
        safetyScore: 95,
        status: "Available",
        createdAt: new Date(),
      };
      expect(driver.licenseNumber).toBe("DL123456");
      expect(driver.safetyScore).toBe(95);
    });

    it("should allow valid Trip shape", () => {
      const trip: Trip = {
        id: "t1",
        source: "Warehouse A",
        destination: "Store B",
        vehicleId: "v1",
        driverId: "d1",
        createdByUserId: "u1",
        cargoWeight: 1000,
        plannedDistance: 50,
        finalOdometer: null,
        fuelConsumed: null,
        status: "Draft",
        createdAt: new Date(),
      };
      expect(trip.status).toBe("Draft");
      expect(trip.cargoWeight).toBe(1000);
    });

    it("should allow valid MaintenanceLog shape", () => {
      const log: MaintenanceLog = {
        id: "m1",
        vehicleId: "v1",
        description: "Oil change",
        cost: 150,
        closed: false,
        openedAt: new Date(),
        closedAt: null,
      };
      expect(log.closed).toBe(false);
      expect(log.cost).toBe(150);
    });

    it("should allow valid FuelLog shape", () => {
      const fuelLog: FuelLog = {
        id: "f1",
        vehicleId: "v1",
        liters: 50,
        cost: 75,
        date: new Date(),
      };
      expect(fuelLog.liters).toBe(50);
      expect(fuelLog.cost).toBe(75);
    });

    it("should allow valid Expense shape", () => {
      const expense: Expense = {
        id: "e1",
        vehicleId: "v1",
        category: "toll",
        cost: 25,
        date: new Date(),
      };
      expect(expense.category).toBe("toll");
      expect(expense.cost).toBe(25);
    });
  });
});

describe("Date Helper Functions", () => {
  describe("startOfDay", () => {
    it("should normalize a date to midnight (00:00:00.000)", () => {
      const date = new Date("2024-01-15T14:30:45.123");
      const normalized = startOfDay(date);
      
      expect(normalized.getHours()).toBe(0);
      expect(normalized.getMinutes()).toBe(0);
      expect(normalized.getSeconds()).toBe(0);
      expect(normalized.getMilliseconds()).toBe(0);
      expect(normalized.getDate()).toBe(15);
      expect(normalized.getMonth()).toBe(0); // January
      expect(normalized.getFullYear()).toBe(2024);
    });

    it("should not mutate the original date", () => {
      const original = new Date("2024-01-15T14:30:45.123");
      const originalTime = original.getTime();
      
      startOfDay(original);
      
      expect(original.getTime()).toBe(originalTime);
    });

    it("should handle dates already at midnight", () => {
      const midnight = new Date("2024-01-15T00:00:00.000");
      const normalized = startOfDay(midnight);
      
      expect(normalized.getTime()).toBe(midnight.getTime());
    });
  });

  describe("addDays", () => {
    it("should add positive days to a date", () => {
      const date = new Date("2024-01-15");
      const future = addDays(date, 10);
      
      expect(future.getDate()).toBe(25);
      expect(future.getMonth()).toBe(0); // January
      expect(future.getFullYear()).toBe(2024);
    });

    it("should subtract days when given a negative number", () => {
      const date = new Date("2024-01-15");
      const past = addDays(date, -5);
      
      expect(past.getDate()).toBe(10);
      expect(past.getMonth()).toBe(0); // January
      expect(past.getFullYear()).toBe(2024);
    });

    it("should handle month boundaries", () => {
      const date = new Date("2024-01-31");
      const nextMonth = addDays(date, 1);
      
      expect(nextMonth.getDate()).toBe(1);
      expect(nextMonth.getMonth()).toBe(1); // February
      expect(nextMonth.getFullYear()).toBe(2024);
    });

    it("should handle year boundaries", () => {
      const date = new Date("2024-12-31");
      const nextYear = addDays(date, 1);
      
      expect(nextYear.getDate()).toBe(1);
      expect(nextYear.getMonth()).toBe(0); // January
      expect(nextYear.getFullYear()).toBe(2025);
    });

    it("should not mutate the original date", () => {
      const original = new Date("2024-01-15");
      const originalTime = original.getTime();
      
      addDays(original, 10);
      
      expect(original.getTime()).toBe(originalTime);
    });

    it("should handle adding zero days", () => {
      const date = new Date("2024-01-15T14:30:00");
      const same = addDays(date, 0);
      
      expect(same.getTime()).toBe(date.getTime());
    });
  });
});
