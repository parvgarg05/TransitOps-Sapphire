/**
 * Report Export API Route: GET /api/reports/export
 * 
 * Exports data as CSV format with proper validation.
 * Throws error if building fails (no partial file).
 * 
 * Requirements: 9.7, 9.8
 * 
 * Query Parameters:
 * - format: "csv" (required)
 * - type: "vehicles" | "drivers" | "trips" | "maintenance" | "fuel" | "expenses" (required)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCsvString } from "@/domain/csvExport";

// Type mapping for export types
type ExportType = "vehicles" | "drivers" | "trips" | "maintenance" | "fuel" | "expenses";

/**
 * GET /api/reports/export?format=csv&type=[type]
 * 
 * Builds CSV in memory and returns as downloadable file.
 * Throws error if building fails (no partial file).
 * 
 * Requirement 9.7: CSV export produces one header row plus one row per record
 * Requirement 9.8: Throw before offering file if building fails
 * 
 * @returns CSV file download or error
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format");
    const type = searchParams.get("type") as ExportType | null;

    // Validate format parameter
    if (format !== "csv") {
      return NextResponse.json(
        { success: false, error: "Only CSV format is supported" },
        { status: 400 }
      );
    }

    // Validate type parameter
    if (!type) {
      return NextResponse.json(
        { success: false, error: "Export type is required" },
        { status: 400 }
      );
    }

    const validTypes: ExportType[] = ["vehicles", "drivers", "trips", "maintenance", "fuel", "expenses"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid export type. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Fetch data based on type
    let data: any[];
    let headers: string[];
    let filename: string;

    switch (type) {
      case "vehicles":
        data = await prisma.vehicle.findMany({
          select: {
            id: true,
            registrationNumber: true,
            name: true,
            type: true,
            region: true,
            maxLoadCapacity: true,
            odometer: true,
            acquisitionCost: true,
            revenue: true,
            status: true,
            createdAt: true,
          },
        });
        headers = [
          "id",
          "registrationNumber",
          "name",
          "type",
          "region",
          "maxLoadCapacity",
          "odometer",
          "acquisitionCost",
          "revenue",
          "status",
          "createdAt",
        ];
        filename = "vehicles-export.csv";
        break;

      case "drivers":
        data = await prisma.driver.findMany({
          select: {
            id: true,
            name: true,
            licenseNumber: true,
            licenseCategory: true,
            licenseExpiryDate: true,
            contactNumber: true,
            safetyScore: true,
            status: true,
            createdAt: true,
          },
        });
        headers = [
          "id",
          "name",
          "licenseNumber",
          "licenseCategory",
          "licenseExpiryDate",
          "contactNumber",
          "safetyScore",
          "status",
          "createdAt",
        ];
        filename = "drivers-export.csv";
        break;

      case "trips":
        data = await prisma.trip.findMany({
          select: {
            id: true,
            source: true,
            destination: true,
            vehicleId: true,
            driverId: true,
            createdByUserId: true,
            cargoWeight: true,
            plannedDistance: true,
            finalOdometer: true,
            fuelConsumed: true,
            status: true,
            createdAt: true,
          },
        });
        headers = [
          "id",
          "source",
          "destination",
          "vehicleId",
          "driverId",
          "createdByUserId",
          "cargoWeight",
          "plannedDistance",
          "finalOdometer",
          "fuelConsumed",
          "status",
          "createdAt",
        ];
        filename = "trips-export.csv";
        break;

      case "maintenance":
        data = await prisma.maintenanceLog.findMany({
          select: {
            id: true,
            vehicleId: true,
            description: true,
            cost: true,
            closed: true,
            openedAt: true,
            closedAt: true,
          },
        });
        headers = [
          "id",
          "vehicleId",
          "description",
          "cost",
          "closed",
          "openedAt",
          "closedAt",
        ];
        filename = "maintenance-export.csv";
        break;

      case "fuel":
        data = await prisma.fuelLog.findMany({
          select: {
            id: true,
            vehicleId: true,
            liters: true,
            cost: true,
            date: true,
            createdAt: true,
          },
        });
        headers = ["id", "vehicleId", "liters", "cost", "date", "createdAt"];
        filename = "fuel-logs-export.csv";
        break;

      case "expenses":
        data = await prisma.expense.findMany({
          select: {
            id: true,
            vehicleId: true,
            category: true,
            cost: true,
            date: true,
            createdAt: true,
          },
        });
        headers = ["id", "vehicleId", "category", "cost", "date", "createdAt"];
        filename = "expenses-export.csv";
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid export type" },
          { status: 400 }
        );
    }

    // Convert Prisma Decimal values to strings for CSV export
    const serializedData = data.map((record) => {
      const serialized: Record<string, any> = {};
      for (const key in record) {
        const value = record[key];
        // Convert Decimal to string, keep other values as-is
        serialized[key] = value?.constructor?.name === "Decimal" 
          ? value.toString() 
          : value;
      }
      return serialized;
    });

    // Build CSV string in memory (Requirement 9.8: throw if building fails)
    const csvResult = buildCsvString(serializedData, headers);

    if (!csvResult.ok) {
      // Requirement 9.8: Throw error if building fails (no partial file)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to build CSV: ${csvResult.error}`,
        },
        { status: 500 }
      );
    }

    // Return CSV as downloadable file
    return new NextResponse(csvResult.value, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    // Requirement 9.8: Throw error if any step fails
    return NextResponse.json(
      {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
