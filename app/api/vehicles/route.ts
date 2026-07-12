/**
 * Vehicle API Routes: GET and POST /api/vehicles
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

import { NextRequest, NextResponse } from "next/server";
import { listVehicles, createVehicle } from "../../../services/vehicleService";
import { CreateVehicleInput } from "../../../domain/validators/vehicle";

/**
 * GET /api/vehicles
 * List all vehicles with their status
 * 
 * Requirement 3.4: Show all vehicles from the registry
 */
export async function GET() {
  const result = await listVehicles();

  if (result.ok) {
    return NextResponse.json({
      success: true,
      data: result.value,
    });
  }

  return NextResponse.json(
    {
      success: false,
      error: result.error,
    },
    { status: 500 }
  );
}

/**
 * POST /api/vehicles
 * Create a new vehicle with validation and uniqueness checks
 * 
 * Requirements:
 * - 3.1: Create vehicle with validated fields, initial status = Available
 * - 3.2: Registration number must be unique
 * - 3.8: Return field-specific validation errors
 * - 3.9: On persistence failure, retain previous values
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract and validate input
    const input: CreateVehicleInput = {
      registrationNumber: body.registrationNumber,
      name: body.name,
      type: body.type,
      region: body.region,
      maxLoadCapacity: body.maxLoadCapacity,
      odometer: body.odometer,
      acquisitionCost: body.acquisitionCost,
      revenue: body.revenue,
    };

    const result = await createVehicle(input);

    if (result.ok) {
      return NextResponse.json(
        {
          success: true,
          data: result.value,
        },
        { status: 201 }
      );
    }

    // Return validation or uniqueness error (Requirement 3.8, 3.2)
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: 400 }
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
