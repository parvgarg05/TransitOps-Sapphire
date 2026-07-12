/**
 * Expense API Route: GET /api/expenses, POST /api/expenses
 * 
 * Requirements: 8.3, 8.4
 */

import { NextRequest, NextResponse } from "next/server";
import { createExpense, getAllExpenses } from "../../../services/expenseService";

/**
 * POST /api/expenses
 * Record expense for a vehicle
 * 
 * Requirements:
 * - 8.3: Expense valid iff cost ≥ 0, date ≤ today
 * - 8.4: Reject expense with invalid fields (field-specific errors)
 * 
 * Request body:
 * {
 *   vehicleId: string;
 *   category: string; // toll, maintenance charge, other
 *   cost: number;
 *   date: string; // ISO 8601 date string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.vehicleId || !body.category || body.cost === undefined || !body.date) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: vehicleId, category, cost, date",
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
    const result = await createExpense(
      body.vehicleId,
      body.category,
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

    // Return validation error (Requirement 8.4)
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

/**
 * GET /api/expenses
 * Get all expenses
 */
export async function GET() {
  try {
    const result = await getAllExpenses();

    if (result.ok) {
      return NextResponse.json(
        {
          success: true,
          data: result.value,
        },
        { status: 200 }
      );
    }

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
      { status: 500 }
    );
  }
}
