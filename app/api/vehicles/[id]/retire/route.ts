/**
 * Vehicle API Route: POST /api/vehicles/[id]/retire
 * 
 * Retire a vehicle by setting its status to Retired
 * 
 * Requirements: 3.6, 3.7, 3.9
 */

import { NextRequest, NextResponse } from "next/server";
import { retireVehicle } from "../../../../../services/vehicleService";

/**
 * POST /api/vehicles/[id]/retire
 * Set vehicle status to Retired
 * 
 * Requirements:
 * - 3.6: Retire vehicle (set status to Retired)
 * - 3.7: Retired vehicles are excluded from dispatch selection
 * - 3.9: On persistence failure, retain previous values
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await retireVehicle(id);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        data: result.value,
      });
    }

    // Return error (not found or persistence failure)
    const statusCode = result.error === "Vehicle not found" ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: statusCode }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to retire vehicle: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
