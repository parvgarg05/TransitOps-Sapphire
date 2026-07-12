/**
 * Trip API Routes
 * 
 * GET /api/trips - List all trips (optionally filter by status)
 * POST /api/trips - Create a new trip with validation
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 7.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { listTrips, createTrip } from '@/services/tripService';
import type { TripStatus } from '@/domain/types';

/**
 * GET /api/trips
 * 
 * List all trips, optionally filtered by status.
 * 
 * Query parameters:
 * - status (optional): Filter by trip status (Draft, Dispatched, Completed, Cancelled)
 * 
 * Returns:
 * - 200: Array of trips
 * - 400: Invalid status parameter
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get('status');

    // Validate status parameter if provided
    if (statusParam) {
      const validStatuses: TripStatus[] = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(statusParam as TripStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const trips = await listTrips(statusParam as TripStatus | undefined);

    return NextResponse.json({ trips }, { status: 200 });
  } catch (error) {
    console.error('Error listing trips:', error);
    return NextResponse.json(
      { error: 'Failed to list trips' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips
 * 
 * Create a new trip with full validation.
 * 
 * Request body:
 * - source: string (non-empty)
 * - destination: string (non-empty)
 * - vehicleId: string (non-empty)
 * - driverId: string (non-empty)
 * - cargoWeight: number (> 0)
 * - plannedDistance: number (> 0)
 * - createdByUserId: string (non-empty)
 * 
 * Validations:
 * - Field validation (requirement 5.8)
 * - Vehicle and driver existence
 * - Capacity check (requirement 5.6, 5.7)
 * - Conflict check (requirement 5.5)
 * 
 * Returns:
 * - 201: Trip created successfully (status = Draft)
 * - 400: Validation error
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract and validate required fields
    const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, createdByUserId } = body;

    if (!createdByUserId || typeof createdByUserId !== 'string' || createdByUserId.trim().length === 0) {
      return NextResponse.json(
        { error: 'createdByUserId is required' },
        { status: 400 }
      );
    }

    // Validate field types
    if (typeof source !== 'string' ||
        typeof destination !== 'string' ||
        typeof vehicleId !== 'string' ||
        typeof driverId !== 'string' ||
        typeof cargoWeight !== 'number' ||
        typeof plannedDistance !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input types. Check that all fields are provided with correct types.' },
        { status: 400 }
      );
    }

    // Call service layer to create trip (includes all domain validations)
    const result = await createTrip(
      {
        source,
        destination,
        vehicleId,
        driverId,
        cargoWeight,
        plannedDistance,
      },
      createdByUserId.trim()
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { trip: result.trip },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    );
  }
}
