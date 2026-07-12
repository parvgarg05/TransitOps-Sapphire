/**
 * Dispatch Pool API Route
 * 
 * GET /api/trips/dispatch-pool - Get eligible vehicles and drivers for trip assignment
 * 
 * Requirements: 5.2, 5.3, 5.4, 7.2
 */

import { NextResponse } from 'next/server';
import { getDispatchPool } from '@/services/tripService';

/**
 * GET /api/trips/dispatch-pool
 * 
 * Returns all eligible vehicles and drivers for trip dispatch assignment.
 * 
 * Eligibility rules:
 * - Vehicles: Only status === "Available" (Requirements 5.2, 5.3, 7.2)
 *   - Excludes: On Trip, In Shop (active maintenance), Retired
 * - Drivers: Only status === "Available" AND license not expired (Requirement 5.4)
 *   - Excludes: On Trip, Off Duty, Suspended, or expired license
 * 
 * Returns:
 * - 200: Object with vehicles[] and drivers[] arrays
 * - 500: Server error
 */
export async function GET() {
  try {
    const today = new Date();
    const pool = await getDispatchPool(today);

    return NextResponse.json(
      {
        vehicles: pool.vehicles,
        drivers: pool.drivers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching dispatch pool:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dispatch pool' },
      { status: 500 }
    );
  }
}
