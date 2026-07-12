/**
 * Cancel Trip API Route
 * 
 * POST /api/trips/:id/cancel - Cancel a Dispatched trip to Cancelled status
 * 
 * Requirements: 6.4, 6.6
 * 
 * Transitions:
 * - Trip: Dispatched → Cancelled
 * - Vehicle: On Trip → Available
 * - Driver: On Trip → Available
 * 
 * All updates are performed atomically in a single transaction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cancelTrip } from '@/services/tripService';

/**
 * POST /api/trips/:id/cancel
 * 
 * Cancel a trip from Dispatched to Cancelled status.
 * Sets the assigned vehicle and driver to Available.
 * 
 * Path parameters:
 * - id: Trip ID
 * 
 * Returns:
 * - 200: Trip cancelled successfully
 * - 400: Invalid state transition (e.g., trip is not Dispatched)
 * - 404: Trip not found
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await cancelTrip(id);

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
    console.error('Error cancelling trip:', error);
    return NextResponse.json(
      { error: 'Failed to cancel trip' },
      { status: 500 }
    );
  }
}
