/**
 * Complete Trip API Route
 * 
 * POST /api/trips/:id/complete - Complete a Dispatched trip to Completed status
 * 
 * Requirements: 6.3, 6.5, 6.6, 6.7
 * 
 * Transitions:
 * - Trip: Dispatched → Completed (with finalOdometer and fuelConsumed)
 * - Vehicle: On Trip → Available (with odometer updated)
 * - Driver: On Trip → Available
 * 
 * All updates are performed atomically in a single transaction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { completeTrip } from '@/services/tripService';

/**
 * POST /api/trips/:id/complete
 * 
 * Complete a trip from Dispatched to Completed status.
 * Sets the assigned vehicle and driver to Available.
 * Updates the vehicle odometer to the final reading.
 * 
 * Path parameters:
 * - id: Trip ID
 * 
 * Request body:
 * - finalOdometer: number (must be >= current vehicle odometer)
 * - fuelConsumed: number (must be >= 0)
 * 
 * Returns:
 * - 200: Trip completed successfully
 * - 400: Invalid state transition or validation error
 * - 404: Trip not found
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const { finalOdometer, fuelConsumed } = body;

    // Validate request body
    if (typeof finalOdometer !== 'number' || typeof fuelConsumed !== 'number') {
      return NextResponse.json(
        { error: 'finalOdometer and fuelConsumed must be numbers' },
        { status: 400 }
      );
    }

    const result = await completeTrip(id, finalOdometer, fuelConsumed);

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
    console.error('Error completing trip:', error);
    return NextResponse.json(
      { error: 'Failed to complete trip' },
      { status: 500 }
    );
  }
}
