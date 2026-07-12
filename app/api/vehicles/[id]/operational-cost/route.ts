/**
 * Vehicle Operational Cost API Route: GET /api/vehicles/:id/operational-cost
 * 
 * Requirements: 8.5, 8.6
 */

import { NextRequest, NextResponse } from "next/server";
import { getOperationalCost } from "../../../../../services/expenseService";

/**
 * GET /api/vehicles/:id/operational-cost
 * Get computed operational cost for a vehicle
 * 
 * Requirements:
 * - 8.5: Operational Cost = fuel cost + maintenance cost
 * - 8.6: Recomputed on read from live rows (within 2 seconds)
 * 
 * Returns:
 * {
 *   success: boolean;
 *   data?: number; // operational cost rounded to 2 decimals
 *   error?: string;
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;

    if (!vehicleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle ID is required",
        },
        { status: 400 }
      );
    }

    // Call service layer
    const result = await getOperationalCost(vehicleId);

    if (result.ok) {
      return NextResponse.json(
        {
          success: true,
          data: result.value,
        },
        { status: 200 }
      );
    }

    // Return error (e.g., vehicle not found)
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: result.error.includes("not found") ? 404 : 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid request: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
