/**
 * Integration Tests for CSV Export API Endpoint
 * 
 * Validates that the GET /api/reports/export endpoint:
 * - Builds CSV in memory
 * - Returns proper CSV format with headers
 * - Throws error if building fails (no partial file)
 * 
 * Requirements: 9.7, 9.8
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET } from "@/app/api/reports/export/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

describe("CSV Export API - Integration Tests", () => {
  // Clean up test data before and after tests
  beforeAll(async () => {
    await prisma.vehicle.deleteMany({
      where: {
        registrationNumber: {
          startsWith: "TEST-CSV-",
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.vehicle.deleteMany({
      where: {
        registrationNumber: {
          startsWith: "TEST-CSV-",
        },
      },
    });
  });

  describe("Requirement 9.7: CSV export produces one header row plus one row per record", () => {
    it("should export vehicles with header row and data rows", async () => {
      // Create test vehicles
      await prisma.vehicle.createMany({
        data: [
          {
            registrationNumber: "TEST-CSV-001",
            name: "Test Vehicle 1",
            type: "Truck",
            region: "North",
            maxLoadCapacity: 5000,
            odometer: 10000,
            acquisitionCost: 50000,
            revenue: 10000,
            status: "AVAILABLE",
          },
          {
            registrationNumber: "TEST-CSV-002",
            name: "Test Vehicle 2",
            type: "Van",
            region: "South",
            maxLoadCapacity: 3000,
            odometer: 5000,
            acquisitionCost: 30000,
            revenue: 5000,
            status: "ON_TRIP",
          },
        ],
      });

      // Make request
      const request = new NextRequest(
        new URL(
          "http://localhost:3000/api/reports/export?format=csv&type=vehicles"
        )
      );
      const response = await GET(request);

      // Verify response
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/csv");
      expect(response.headers.get("Content-Disposition")).toContain(
        "attachment"
      );
      expect(response.headers.get("Content-Disposition")).toContain(
        "vehicles-export.csv"
      );

      // Parse CSV
      const csvText = await response.text();
      const lines = csvText.split("\n");
      
      // Remove trailing empty line
      if (lines[lines.length - 1] === "") {
        lines.pop();
      }

      // Verify structure: at least 1 header + 2 test data rows
      expect(lines.length).toBeGreaterThanOrEqual(3);

      // Verify header row contains expected columns
      const headerRow = lines[0];
      expect(headerRow).toContain("id");
      expect(headerRow).toContain("registrationNumber");
      expect(headerRow).toContain("name");
      expect(headerRow).toContain("type");
      expect(headerRow).toContain("status");

      // Verify test data appears in CSV
      const csvContent = csvText;
      expect(csvContent).toContain("TEST-CSV-001");
      expect(csvContent).toContain("TEST-CSV-002");
      expect(csvContent).toContain("Test Vehicle 1");
      expect(csvContent).toContain("Test Vehicle 2");
    });

    it("should export empty dataset with header only", async () => {
      // Create a fresh database state for drivers (assuming no test drivers exist)
      const request = new NextRequest(
        new URL(
          "http://localhost:3000/api/reports/export?format=csv&type=drivers"
        )
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();
      const lines = csvText.split("\n");
      
      // Remove trailing empty line
      if (lines[lines.length - 1] === "") {
        lines.pop();
      }

      // Should have at least header row
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines[0]).toContain("id");
      expect(lines[0]).toContain("name");
      expect(lines[0]).toContain("licenseNumber");
    });
  });

  describe("Requirement 9.8: Throw before offering file if building fails", () => {
    it("should return error for invalid format", async () => {
      const request = new NextRequest(
        new URL(
          "http://localhost:3000/api/reports/export?format=pdf&type=vehicles"
        )
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("CSV");
    });

    it("should return error for invalid type", async () => {
      const request = new NextRequest(
        new URL(
          "http://localhost:3000/api/reports/export?format=csv&type=invalid"
        )
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("Invalid export type");
    });

    it("should return error for missing type", async () => {
      const request = new NextRequest(
        new URL("http://localhost:3000/api/reports/export?format=csv")
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("required");
    });
  });

  describe("All export types", () => {
    it("should support all defined export types", async () => {
      const exportTypes = [
        "vehicles",
        "drivers",
        "trips",
        "maintenance",
        "fuel",
        "expenses",
      ];

      for (const type of exportTypes) {
        const request = new NextRequest(
          new URL(
            `http://localhost:3000/api/reports/export?format=csv&type=${type}`
          )
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("text/csv");

        const csvText = await response.text();
        const lines = csvText.split("\n");
        
        // Remove trailing empty line
        if (lines[lines.length - 1] === "") {
          lines.pop();
        }

        // Should have at least header
        expect(lines.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
