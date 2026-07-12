/**
 * Maintenance Close API Route - POST /api/maintenance/[id]/close
 * 
 * This endpoint handles closing maintenance records.
 * 
 * Requirements: 7.3, 7.4
 */

import { NextRequest, NextResponse } from "next/server";
import { closeMaintenanceRecord } from "@/services/maintenanceService";

/**
 * POST /api/maintenance/[id]/close
 * 
 * Closes a maintenance record for a vehicle.
 * Sets vehicle status to "Available" (preserves "Retired" if already retired).
 * 
 * Requirement 7.3: Closing maintenance sets vehicle to Available
 * Requirement 7.4: Closing maintenance preserves Retired status
 * 
 * URL Parameters:
 * - id: string (maintenance record ID)
 * 
 * @returns 200 OK with maintenance log data, or 400/404 with error message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Maintenance ID is required" },
        { status: 400 }
      );
    }

    // Close maintenance record through service layer
    const result = await closeMaintenanceRecord(id);

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
      { error: "Failed to close maintenance record" },
      { status: 500 }
    );
  }
}
