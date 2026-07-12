/**
 * Driver API Routes - PATCH /api/drivers/[id]
 * 
 * This endpoint handles updating existing drivers.
 * 
 * Requirements: 4.4, 4.7
 */

import { NextRequest, NextResponse } from "next/server";
import { updateDriver, getDriverById } from "@/services/driverService";
import { UpdateDriverInput } from "@/domain/validators/driver";

/**
 * GET /api/drivers/[id]
 * 
 * Retrieves a single driver by ID with license validity flag.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing driver ID
 * @returns 200 OK with driver data, or 404 Not Found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getDriverById(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.value, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch driver" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/drivers/[id]
 * 
 * Updates an existing driver with validated fields.
 * On persistence failure, retains previous values.
 * 
 * Requirement 4.4: Update editable fields including compliance data
 * Requirement 4.7: Return field-specific rejection for invalid fields
 * 
 * Request Body (all fields optional for partial update):
 * - name?: string (non-empty if provided)
 * - licenseNumber?: string (non-empty, unique if provided)
 * - licenseCategory?: string (non-empty if provided)
 * - licenseExpiryDate?: ISO date string (valid date if provided)
 * - contactNumber?: string (non-empty if provided)
 * - safetyScore?: number (0 <= x <= 100 if provided)
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing driver ID
 * @returns 200 OK with updated driver, or 400/404 with error message
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build update input from provided fields
    const input: UpdateDriverInput = {};

    if (body.name !== undefined) {
      input.name = body.name;
    }
    if (body.licenseNumber !== undefined) {
      input.licenseNumber = body.licenseNumber;
    }
    if (body.licenseCategory !== undefined) {
      input.licenseCategory = body.licenseCategory;
    }
    if (body.licenseExpiryDate !== undefined) {
      input.licenseExpiryDate = new Date(body.licenseExpiryDate);
      
      // Validate that date parsing succeeded
      if (isNaN(input.licenseExpiryDate.getTime())) {
        return NextResponse.json(
          { error: "License expiry date must be a valid date" },
          { status: 400 }
        );
      }
    }
    if (body.contactNumber !== undefined) {
      input.contactNumber = body.contactNumber;
    }
    if (body.safetyScore !== undefined) {
      input.safetyScore = Number(body.safetyScore);
    }

    // Update driver through service layer
    const result = await updateDriver(id, input);

    if (!result.ok) {
      const status = result.error === "Driver not found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.value, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
