/**
 * Driver API Routes - GET /api/drivers and POST /api/drivers
 * 
 * These endpoints handle listing all drivers and creating new drivers.
 * 
 * Requirements: 4.1, 4.3, 4.7, 4.8
 */

import { NextRequest, NextResponse } from "next/server";
import { listDrivers, createDriver } from "@/services/driverService";
import { CreateDriverInput } from "@/domain/validators/driver";

/**
 * GET /api/drivers
 * 
 * Lists all drivers with status, expiry, and derived license-validity flag.
 * 
 * Requirement 4.3: List returns status, expiry, and derived license-validity flag
 * 
 * @returns 200 OK with array of drivers including isLicenseValid flag
 */
export async function GET() {
  try {
    const drivers = await listDrivers();
    return NextResponse.json(drivers, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/drivers
 * 
 * Creates a new driver with validated fields and uniqueness check.
 * New drivers start with status Available.
 * 
 * Requirement 4.1: Create driver with validated fields, status set to Available
 * Requirement 4.7: Return field-specific rejection for invalid fields
 * Requirement 4.8: Display uniqueness error when license number matches
 * 
 * Request Body:
 * - name: string (required, non-empty)
 * - licenseNumber: string (required, non-empty, unique)
 * - licenseCategory: string (required, non-empty)
 * - licenseExpiryDate: ISO date string (required, valid date)
 * - contactNumber: string (required, non-empty)
 * - safetyScore: number (required, 0 <= x <= 100)
 * 
 * @returns 201 Created with driver data, or 400 Bad Request with error message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parse and validate input
    const input: CreateDriverInput = {
      name: body.name,
      licenseNumber: body.licenseNumber,
      licenseCategory: body.licenseCategory,
      licenseExpiryDate: new Date(body.licenseExpiryDate),
      contactNumber: body.contactNumber,
      safetyScore: Number(body.safetyScore),
    };

    // Validate that date parsing succeeded
    if (isNaN(input.licenseExpiryDate.getTime())) {
      return NextResponse.json(
        { error: "License expiry date must be a valid date" },
        { status: 400 }
      );
    }

    // Create driver through service layer
    const result = await createDriver(input);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
