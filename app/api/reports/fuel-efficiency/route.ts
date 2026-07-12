/**
 * Fuel Efficiency Report API Route: GET /api/reports/fuel-efficiency
 * 
 * Returns fuel efficiency (km/L) per vehicle.
 * Surfaces "N/A" (null) for vehicles with zero fuel consumption.
 * 
 * Requirements: 9.1, 9.4
 */

import { NextResponse } from "next/server";
import { getFuelEfficiencyReport } from "../../../../services/analyticsService";

/**
 * GET /api/reports/fuel-efficiency
 * 
 * Returns an array of fuel efficiency data per vehicle:
 * - vehicleId: Vehicle identifier
 * - registrationNumber: Vehicle registration number
 * - name: Vehicle name
 * - fuelEfficiency: km/L rounded to 2 decimals, or null if fuel = 0 (N/A)
 * 
 * Requirement 9.1: Fuel Efficiency = total distance / total fuel
 * Requirement 9.4: If fuel = 0, return "N/A" (null)
 */
export async function GET() {
  try {
    const report = await getFuelEfficiencyReport();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate fuel efficiency report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
