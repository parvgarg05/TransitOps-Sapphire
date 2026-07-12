/**
 * Vehicle ROI Report API Route: GET /api/reports/vehicle-roi
 * 
 * Returns ROI per vehicle calculated as (Revenue - Costs) / Acquisition Cost.
 * Surfaces "N/A" (null) for vehicles with zero acquisition cost.
 * 
 * Requirements: 9.3, 9.6
 */

import { NextResponse } from "next/server";
import { getVehicleROIReport } from "../../../../services/analyticsService";

/**
 * GET /api/reports/vehicle-roi
 * 
 * Returns an array of ROI data per vehicle:
 * - vehicleId: Vehicle identifier
 * - registrationNumber: Vehicle registration number
 * - name: Vehicle name
 * - roi: ROI value rounded to 2 decimals, or null if acquisition cost = 0 (N/A)
 * 
 * Requirement 9.3: Vehicle ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
 * Requirement 9.6: If acquisition cost = 0, return "N/A" (null)
 */
export async function GET() {
  try {
    const report = await getVehicleROIReport();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate vehicle ROI report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
