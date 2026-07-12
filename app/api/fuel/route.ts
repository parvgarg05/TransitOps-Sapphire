/**
 * Fuel Log API Route: GET /api/fuel, POST /api/fuel
 * 
 * Requirements: 8.1, 8.2
 */

import { NextRequest, NextResponse } from "next/server";
import { createFuelLog } from "../../../services/expenseService";

/**
 * POST /api/fuel
 * Record fuel log for a vehicle
 * 
 * Requirements:
 * - 8.1: Fuel log valid iff liters > 0, cost ≥ 0, date ≤ today
 * - 8.2: Reject fuel log with invalid fields (field-specific errors)
 * 
 * Request body:
 * {
 *   vehicleId: string;
 *   liters: number;
 *   cost: number;
 *   date: string; // ISO 8601 date string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.vehicleId || body.liters === undefined || body.cost === undefined || !body.date) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: vehicleId, liters, cost, date",
        },
        { status: 400 }
      );
    }

    // Parse date
    const date = new Date(body.date);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid date format",
        },
        { status: 400 }
      );
    }

    // Call service layer
    const result = await createFuelLog(
      body.vehicleId,
      body.liters,
      body.cost,
      date
    );

    if (result.ok) {
      return NextResponse.json(
        {
          success: true,
          data: result.value,
        },
        { status: 201 }
      );
    }

    // Return validation error (Requirement 8.2)
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
