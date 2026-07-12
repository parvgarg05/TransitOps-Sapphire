/**
 * Maintenance Cost API Route - PATCH /api/maintenance/[id]/cost
 * 
 * This endpoint handles updating maintenance record costs.
 * 
 * Requirements: 7.5, 7.6, 7.8
 */

import { NextRequest, NextResponse } from "next/server";
import { updateMaintenanceCostRecord } from "@/services/maintenanceService";

/**
 * PATCH /api/maintenance/[id]/cost
 * 
 * Updates the cost of a maintenance record.
 * Validates cost is within valid range (0 <= cost <= 999,999,999.99).
 * 
 * Requirement 7.5, 7.6: Maintenance cost 0 <= cost <= 999,999,999.99
 * Requirement 7.8: Reject out-of-range maintenance costs
 * 
 * URL Parameters:
 * - id: string (maintenance record ID)
 * 
 * Request Body:
 * - cost: number (required, 0 <= cost <= 999,999,999.99)
 * 
 * @returns 200 OK with updated maintenance log data, or 400/404 with error message
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Maintenance ID is required" },
        { status: 400 }
      );
    }

    const { cost } = body;

    // Validate cost is provided and is a number
    if (cost === undefined || cost === null) {
      return NextResponse.json(
        { error: "Cost is required" },
        { status: 400 }
      );
    }

    const costNumber = Number(cost);
    if (isNaN(costNumber)) {
      return NextResponse.json(
        { error: "Cost must be a valid number" },
        { status: 400 }
      );
    }

    // Update maintenance cost through service layer
    const result = await updateMaintenanceCostRecord(id, costNumber);

    if (!result.ok) {
      // Handle different error types
      if (result.error === "Maintenance record not found") {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
