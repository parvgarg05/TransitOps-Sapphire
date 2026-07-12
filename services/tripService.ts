/**
 * Trip Service Layer
 * 
 * This module provides business logic operations for trips:
 * - List trips with optional status filtering
 * - Get dispatch pool (eligible vehicles and drivers)
 * - Create trips with full validation (field validation, capacity check, conflict check)
 * - Transactional trip state transitions (dispatch, complete, cancel)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.2
 */

import { prisma } from '../lib/db';
import type { Trip, Vehicle, Driver, TripStatus } from '../domain/types';
import { validateTripCreation, CreateTripInput } from '../domain/validators/trip';
import { eligibleVehicles, eligibleDrivers } from '../domain/dispatch';
import { capacityOk, assignmentConflict } from '../domain/capacityConflict';
import { Prisma } from '@prisma/client';
import * as TripStateMachine from '../domain/tripStateMachine';

/**
 * Converts Prisma enum to domain TripStatus type
 */
function mapPrismaTripStatus(status: string): TripStatus {
  const statusMap: Record<string, TripStatus> = {
    'DRAFT': 'Draft',
    'DISPATCHED': 'Dispatched',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
  };
  return statusMap[status] || 'Draft';
}

/**
 * Converts Prisma Trip to domain Trip type
 */
function toDomainTrip(prismaTrip: any): Trip {
  return {
    id: prismaTrip.id,
    source: prismaTrip.source,
    destination: prismaTrip.destination,
    vehicleId: prismaTrip.vehicleId,
    driverId: prismaTrip.driverId,
    createdByUserId: prismaTrip.createdByUserId,
    cargoWeight: Number(prismaTrip.cargoWeight),
    plannedDistance: Number(prismaTrip.plannedDistance),
    finalOdometer: prismaTrip.finalOdometer ? Number(prismaTrip.finalOdometer) : null,
    fuelConsumed: prismaTrip.fuelConsumed ? Number(prismaTrip.fuelConsumed) : null,
    status: mapPrismaTripStatus(prismaTrip.status),
    createdAt: prismaTrip.createdAt,
  };
}

/**
 * Converts Prisma Vehicle to domain Vehicle type
 */
function toDomainVehicle(prismaVehicle: any): Vehicle {
  const statusMap: Record<string, any> = {
    'AVAILABLE': 'Available',
    'ON_TRIP': 'On Trip',
    'IN_SHOP': 'In Shop',
    'RETIRED': 'Retired',
  };

  return {
    id: prismaVehicle.id,
    registrationNumber: prismaVehicle.registrationNumber,
    name: prismaVehicle.name,
    type: prismaVehicle.type,
    region: prismaVehicle.region,
    maxLoadCapacity: Number(prismaVehicle.maxLoadCapacity),
    odometer: Number(prismaVehicle.odometer),
    acquisitionCost: Number(prismaVehicle.acquisitionCost),
    revenue: Number(prismaVehicle.revenue),
    status: statusMap[prismaVehicle.status] || 'Available',
    createdAt: prismaVehicle.createdAt,
  };
}

/**
 * Converts Prisma Driver to domain Driver type
 */
function toDomainDriver(prismaDriver: any): Driver {
  const statusMap: Record<string, any> = {
    'AVAILABLE': 'Available',
    'ON_TRIP': 'On Trip',
    'OFF_DUTY': 'Off Duty',
    'SUSPENDED': 'Suspended',
  };

  return {
    id: prismaDriver.id,
    name: prismaDriver.name,
    licenseNumber: prismaDriver.licenseNumber,
    licenseCategory: prismaDriver.licenseCategory,
    licenseExpiryDate: prismaDriver.licenseExpiryDate,
    contactNumber: prismaDriver.contactNumber,
    safetyScore: Number(prismaDriver.safetyScore),
    status: statusMap[prismaDriver.status] || 'Available',
    createdAt: prismaDriver.createdAt,
  };
}

/**
 * List all trips, optionally filtered by status.
 * Includes vehicle and driver information.
 * 
 * Requirement 5.1: Support listing trips
 * 
 * @param statusFilter - Optional status to filter by (Draft, Dispatched, Completed, Cancelled)
 * @returns Array of trips matching the filter with vehicle and driver data
 */
export async function listTrips(statusFilter?: TripStatus): Promise<any[]> {
  // Map domain status to Prisma enum if filter provided
  const prismaStatusMap: Record<TripStatus, string> = {
    'Draft': 'DRAFT',
    'Dispatched': 'DISPATCHED',
    'Completed': 'COMPLETED',
    'Cancelled': 'CANCELLED',
  };

  const prismaTrips = await prisma.trip.findMany({
    where: statusFilter ? { status: prismaStatusMap[statusFilter] as any } : undefined,
    include: {
      vehicle: true,
      driver: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return prismaTrips.map((trip) => ({
    ...toDomainTrip(trip),
    vehicle: trip.vehicle ? {
      id: trip.vehicle.id,
      registrationNumber: trip.vehicle.registrationNumber,
      name: trip.vehicle.name,
    } : null,
    driver: trip.driver ? {
      id: trip.driver.id,
      name: trip.driver.name,
      licenseNumber: trip.driver.licenseNumber,
    } : null,
  }));
}

/**
 * Dispatch pool result containing eligible vehicles and drivers.
 */
export interface DispatchPool {
  vehicles: Vehicle[];
  drivers: Driver[];
}

/**
 * Get the dispatch pool: all eligible vehicles and drivers for trip assignment.
 * 
 * Requirements:
 * - 5.2: Only Available vehicles are eligible
 * - 5.3: Exclude vehicles with status Retired or In Shop
 * - 5.4: Exclude drivers with expired licenses or non-Available status
 * - 7.2: Vehicles with active maintenance are In Shop (excluded)
 * 
 * @param today - Current date for license expiry check (defaults to now)
 * @returns Object containing arrays of eligible vehicles and drivers
 */
export async function getDispatchPool(today: Date = new Date()): Promise<DispatchPool> {
  // Fetch all vehicles and drivers from database
  const [prismaVehicles, prismaDrivers] = await Promise.all([
    prisma.vehicle.findMany(),
    prisma.driver.findMany(),
  ]);

  // Convert to domain types
  const vehicles = prismaVehicles.map(toDomainVehicle);
  const drivers = prismaDrivers.map(toDomainDriver);

  // Apply eligibility filters using domain functions
  const eligibleVehiclesList = eligibleVehicles(vehicles);
  const eligibleDriversList = eligibleDrivers(drivers, today);

  return {
    vehicles: eligibleVehiclesList,
    drivers: eligibleDriversList,
  };
}

/**
 * Result type for trip creation operation.
 */
export type CreateTripResult =
  | { success: true; trip: Trip }
  | { success: false; error: string };

/**
 * Create a new trip with full validation.
 * 
 * Validation steps:
 * 1. Field validation (source, destination, IDs, cargo weight > 0, planned distance > 0)
 * 2. Vehicle and driver existence check
 * 3. Capacity check (cargo weight <= vehicle capacity)
 * 4. Conflict check (vehicle and driver not already On Trip)
 * 
 * Requirements:
 * - 5.1: Create trip with all required fields, initial status = Draft
 * - 5.5: Reject if vehicle or driver is already On Trip
 * - 5.6: Reject if cargo weight exceeds vehicle capacity
 * - 5.7: Allow if cargo weight <= vehicle capacity
 * - 5.8: Field validation with specific rejection messages
 * 
 * @param input - Trip creation input
 * @param createdByUserId - ID of the user creating the trip
 * @returns CreateTripResult with created trip or error message
 */
export async function createTrip(
  input: CreateTripInput,
  createdByUserId: string
): Promise<CreateTripResult> {
  // Step 1: Field validation
  const validationResult = validateTripCreation(input);
  if (!validationResult.ok) {
    return { success: false, error: validationResult.error };
  }

  const validatedTrip = validationResult.value;

  // Step 2: Verify vehicle and driver exist
  const [vehicle, driver] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: input.vehicleId } }),
    prisma.driver.findUnique({ where: { id: input.driverId } }),
  ]);

  if (!vehicle) {
    return { success: false, error: 'Vehicle not found' };
  }

  if (!driver) {
    return { success: false, error: 'Driver not found' };
  }

  // Convert to domain types for validation
  const domainVehicle = toDomainVehicle(vehicle);
  const domainDriver = toDomainDriver(driver);

  // Step 3: Capacity check (Requirement 5.6, 5.7)
  if (!capacityOk(validatedTrip.cargoWeight, domainVehicle)) {
    return {
      success: false,
      error: `Cargo weight ${validatedTrip.cargoWeight} kg exceeds vehicle capacity ${domainVehicle.maxLoadCapacity} kg`,
    };
  }

  // Step 4: Conflict check (Requirement 5.5)
  const conflict = assignmentConflict(domainVehicle, domainDriver);
  if (conflict.conflict) {
    return {
      success: false,
      error: `${conflict.resource === 'vehicle' ? 'Vehicle' : 'Driver'} is already assigned to an active trip`,
    };
  }

  // All validations passed - create the trip with status Draft
  const createdTrip = await prisma.trip.create({
    data: {
      source: validatedTrip.source,
      destination: validatedTrip.destination,
      vehicleId: validatedTrip.vehicleId,
      driverId: validatedTrip.driverId,
      createdByUserId,
      cargoWeight: new Prisma.Decimal(validatedTrip.cargoWeight),
      plannedDistance: new Prisma.Decimal(validatedTrip.plannedDistance),
      status: 'DRAFT', // Requirement 5.1: Initial status is Draft
    },
  });

  return {
    success: true,
    trip: toDomainTrip(createdTrip),
  };
}

/**
 * Result type for trip transition operations.
 */
export type TripTransitionResult =
  | { success: true; trip: Trip }
  | { success: false; error: string };

/**
 * Dispatch a Draft trip to Dispatched status.
 * 
 * Uses the trip state machine to validate and compute the next state.
 * Atomically updates Trip, Vehicle, and Driver in a single transaction.
 * 
 * Requirements:
 * - 6.2: Set Trip Status to Dispatched, Vehicle and Driver to On Trip
 * - 6.6: Reject if trip is not in Draft status
 * 
 * @param tripId - ID of the trip to dispatch
 * @returns TripTransitionResult with updated trip or error
 */
export async function dispatchTrip(tripId: string): Promise<TripTransitionResult> {
  try {
    // Fetch the trip with related entities
    const prismaTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    if (!prismaTrip) {
      return { success: false, error: 'Trip not found' };
    }

    // Convert to domain types
    const domainTrip = toDomainTrip(prismaTrip);
    const domainVehicle = toDomainVehicle(prismaTrip.vehicle);
    const domainDriver = toDomainDriver(prismaTrip.driver);

    // Validate transition using state machine
    const transition = TripStateMachine.dispatchTrip(domainTrip);

    if (!transition.ok) {
      return { success: false, error: transition.error };
    }

    // Map domain statuses to Prisma enums
    const prismaStatusMap = {
      Draft: 'DRAFT',
      Dispatched: 'DISPATCHED',
      Completed: 'COMPLETED',
      Cancelled: 'CANCELLED',
    };

    const prismaVehicleStatusMap = {
      Available: 'AVAILABLE',
      'On Trip': 'ON_TRIP',
      'In Shop': 'IN_SHOP',
      Retired: 'RETIRED',
    };

    const prismaDriverStatusMap = {
      Available: 'AVAILABLE',
      'On Trip': 'ON_TRIP',
      'Off Duty': 'OFF_DUTY',
      Suspended: 'SUSPENDED',
    };

    // Execute all updates in a single transaction (atomicity requirement)
    const updatedTrip = await prisma.$transaction(async (tx) => {
      // Update trip status
      const trip = await tx.trip.update({
        where: { id: tripId },
        data: { status: prismaStatusMap[transition.trip] as any },
      });

      // Update vehicle status
      await tx.vehicle.update({
        where: { id: domainVehicle.id },
        data: { status: prismaVehicleStatusMap[transition.vehicle] as any },
      });

      // Update driver status
      await tx.driver.update({
        where: { id: domainDriver.id },
        data: { status: prismaDriverStatusMap[transition.driver] as any },
      });

      return trip;
    });

    return {
      success: true,
      trip: toDomainTrip(updatedTrip),
    };
  } catch (error) {
    console.error('Error dispatching trip:', error);
    return { success: false, error: 'Failed to dispatch trip' };
  }
}

/**
 * Complete a Dispatched trip to Completed status.
 * 
 * Uses the trip state machine to validate inputs and compute the next state.
 * Atomically updates Trip (including finalOdometer and fuelConsumed),
 * Vehicle (status and odometer), and Driver in a single transaction.
 * 
 * Requirements:
 * - 6.3: Set Trip Status to Completed, Vehicle and Driver to Available
 * - 6.5: Update vehicle odometer to final reading
 * - 6.6: Reject if trip is not in Dispatched status
 * - 6.7: Reject if finalOdometer < current odometer or fuelConsumed < 0
 * 
 * @param tripId - ID of the trip to complete
 * @param finalOdometer - Final odometer reading (must be >= current vehicle odometer)
 * @param fuelConsumed - Fuel consumed during trip (must be >= 0)
 * @returns TripTransitionResult with updated trip or error
 */
export async function completeTrip(
  tripId: string,
  finalOdometer: number,
  fuelConsumed: number
): Promise<TripTransitionResult> {
  try {
    // Fetch the trip with related entities
    const prismaTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    if (!prismaTrip) {
      return { success: false, error: 'Trip not found' };
    }

    // Convert to domain types
    const domainTrip = toDomainTrip(prismaTrip);
    const domainVehicle = toDomainVehicle(prismaTrip.vehicle);
    const domainDriver = toDomainDriver(prismaTrip.driver);

    // Validate transition using state machine
    const transition = TripStateMachine.completeTrip(
      domainTrip,
      domainVehicle,
      finalOdometer,
      fuelConsumed
    );

    if (!transition.ok) {
      return { success: false, error: transition.error };
    }

    // Map domain statuses to Prisma enums
    const prismaStatusMap = {
      Draft: 'DRAFT',
      Dispatched: 'DISPATCHED',
      Completed: 'COMPLETED',
      Cancelled: 'CANCELLED',
    };

    const prismaVehicleStatusMap = {
      Available: 'AVAILABLE',
      'On Trip': 'ON_TRIP',
      'In Shop': 'IN_SHOP',
      Retired: 'RETIRED',
    };

    const prismaDriverStatusMap = {
      Available: 'AVAILABLE',
      'On Trip': 'ON_TRIP',
      'Off Duty': 'OFF_DUTY',
      Suspended: 'SUSPENDED',
    };

    // Execute all updates in a single transaction (atomicity requirement)
    const updatedTrip = await prisma.$transaction(async (tx) => {
      // Update trip status and final values
      const trip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: prismaStatusMap[transition.trip] as any,
          finalOdometer: new Prisma.Decimal(finalOdometer),
          fuelConsumed: new Prisma.Decimal(fuelConsumed),
        },
      });

      // Update vehicle status AND odometer (Requirement 6.5)
      await tx.vehicle.update({
        where: { id: domainVehicle.id },
        data: {
          status: prismaVehicleStatusMap[transition.vehicle] as any,
          odometer: new Prisma.Decimal(transition.newOdometer!),
        },
      });

      // Update driver status
      await tx.driver.update({
        where: { id: domainDriver.id },
        data: { status: prismaDriverStatusMap[transition.driver] as any },
      });

      return trip;
    });

    return {
      success: true,
      trip: toDomainTrip(updatedTrip),
    };
  } catch (error) {
    console.error('Error completing trip:', error);
    return { success: false, error: 'Failed to complete trip' };
  }
}

/**
 * Cancel a Dispatched trip to Cancelled status.
 * 
 * Uses the trip state machine to validate and compute the next state.
 * Atomically updates Trip, Vehicle, and Driver in a single transaction.
 * 
 * Requirements:
 * - 6.4: Set Trip Status to Cancelled, Vehicle and Driver to Available
 * - 6.6: Reject if trip is not in Dispatched status
 * 
 * @param tripId - ID of the trip to cancel
 * @returns TripTransitionResult with updated trip or error
 */
export async function cancelTrip(tripId: string): Promise<TripTransitionResult> {
  try {
    // Fetch the trip with related entities
    const prismaTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    if (!prismaTrip) {
      return { success: false, error: 'Trip not found' };
    }

    // Convert to domain types
    const domainTrip = toDomainTrip(prismaTrip);
    const domainVehicle = toDomainVehicle(prismaTrip.vehicle);
    const domainDriver = toDomainDriver(prismaTrip.driver);

    // Validate transition using state machine
    const transition = TripStateMachine.cancelTrip(domainTrip);

    if (!transition.ok) {
      return { success: false, error: transition.error };
    }

    // Map domain statuses to Prisma enums
    const prismaStatusMap = {
      Draft: 'DRAFT',
      Dispatched: 'DISPATCHED',
      Completed: 'COMPLETED',
      Cancelled: 'CANCELLED',
    };

    const prismaVehicleStatusMap = {
      Available: 'AVAILABLE',
      'On Trip': 'ON_TRIP',
      'In Shop': 'IN_SHOP',
      Retired: 'RETIRED',
    };

    const prismaDriverStatusMap = {
      Available: 'AVAILABLE',
      'On Trip': 'ON_TRIP',
      'Off Duty': 'OFF_DUTY',
      Suspended: 'SUSPENDED',
    };

    // Execute all updates in a single transaction (atomicity requirement)
    const updatedTrip = await prisma.$transaction(async (tx) => {
      // Update trip status
      const trip = await tx.trip.update({
        where: { id: tripId },
        data: { status: prismaStatusMap[transition.trip] as any },
      });

      // Update vehicle status
      await tx.vehicle.update({
        where: { id: domainVehicle.id },
        data: { status: prismaVehicleStatusMap[transition.vehicle] as any },
      });

      // Update driver status
      await tx.driver.update({
        where: { id: domainDriver.id },
        data: { status: prismaDriverStatusMap[transition.driver] as any },
      });

      return trip;
    });

    return {
      success: true,
      trip: toDomainTrip(updatedTrip),
    };
  } catch (error) {
    console.error('Error cancelling trip:', error);
    return { success: false, error: 'Failed to cancel trip' };
  }
}
