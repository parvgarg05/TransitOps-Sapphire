/**
 * Vehicle API Route: PATCH /api/vehicles/[id]
 * 
 * Update an existing vehicle (registration number is immutable)
 * 
 * Requirements: 3.5, 3.6, 3.7, 3.8, 3.9
 */

import { NextRequest, NextResponse } from "next/server";
import { updateVehicle } from "../../../../services/vehicleService";
import { UpdateVehicleInput } from "../../../../domain/validators/vehicle";

/**
 * PATCH /api/vehicles/[id]
 * Update vehicle fields (registration number excluded from update DTO)
 * 
 * Requirements:
 * - 3.5: Update editable fields (registration number is immutable)
 * - 3.6: Validate updated fields
 * - 3.7: Return error if vehicle not found
 * - 3.8: Return field-specific validation errors
 * - 3.9: On persistence failure, retain previous values
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    // Extract update input (registration number is NOT allowed - Requirement 3.5)
    const input: UpdateVehicleInput = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.region !== undefined && { region: body.region }),
      ...(body.maxLoadCapacity !== undefined && { maxLoadCapacity: body.maxLoadCapacity }),
      ...(body.odometer !== undefined && { odometer: body.odometer }),
      ...(body.acquisitionCost !== undefined && { acquisitionCost: body.acquisitionCost }),
      ...(body.revenue !== undefined && { revenue: body.revenue }),
    };

    const result = await updateVehicle(id, input);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        data: result.value,
      });
    }

    // Return validation error or not found error
    const statusCode = result.error === "Vehicle not found" ? 404 : 400;
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
        error: `Invalid request: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 400 }
    );
  }
}
