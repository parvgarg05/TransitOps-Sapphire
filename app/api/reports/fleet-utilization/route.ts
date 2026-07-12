/**
 * Fleet Utilization Report API Route: GET /api/reports/fleet-utilization
 * 
 * Returns fleet utilization percentage (% On Trip vs non-Retired).
 * Surfaces "N/A" (null) when there are no non-Retired vehicles.
 * 
 * Requirements: 9.2, 9.5
 */

import { NextResponse } from "next/server";
import { getFleetUtilizationReport } from "../../../../services/analyticsService";

/**
 * GET /api/reports/fleet-utilization
 * 
 * Returns fleet utilization data:
 * - utilization: Percentage (0-100) rounded to 1 decimal, or null if non-Retired = 0 (N/A)
 * - onTripCount: Number of vehicles with status "On Trip"
 * - nonRetiredCount: Number of vehicles with status != "Retired"
 * 
 * Requirement 9.2: Fleet Utilization = (On Trip / non-Retired) * 100
 * Requirement 9.5: If non-Retired = 0, return "N/A" (null)
 */
export async function GET() {
  try {
    const report = await getFleetUtilizationReport();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate fleet utilization report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
