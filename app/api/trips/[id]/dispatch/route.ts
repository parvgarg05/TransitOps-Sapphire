/**
 * Dispatch Trip API Route
 * 
 * POST /api/trips/:id/dispatch - Dispatch a Draft trip to Dispatched status
 * 
 * Requirements: 6.2, 6.6
 * 
 * Transitions:
 * - Trip: Draft → Dispatched
 * - Vehicle: Available → On Trip
 * - Driver: Available → On Trip
 * 
 * All updates are performed atomically in a single transaction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { dispatchTrip } from '@/services/tripService';

/**
 * POST /api/trips/:id/dispatch
 * 
 * Dispatch a trip from Draft to Dispatched status.
 * Sets the assigned vehicle and driver to On Trip.
 * 
 * Path parameters:
 * - id: Trip ID
 * 
 * Returns:
 * - 200: Trip dispatched successfully
 * - 400: Invalid state transition (e.g., trip is not Draft)
 * - 404: Trip not found
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await dispatchTrip(id);

    if (!result.success) {
      // Check if error is "not found" vs validation error
      if (result.error === 'Trip not found') {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { trip: result.trip },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error dispatching trip:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch trip' },
      { status: 500 }
    );
  }
}
