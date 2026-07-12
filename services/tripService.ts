/**
 * Trip Service Layer
 * 
 * This module provides business logic operations for trips:
 * - List trips with optional status filtering
 * - Get dispatch pool (eligible vehicles and drivers)
 * - Create trips with full validation (field validation, capacity check, conflict check)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 7.2
 */

import { prisma } from '../lib/db';
import type { Trip, Vehicle, Driver, TripStatus } from '../domain/types';
import { validateTripCreation, CreateTripInput } from '../domain/validators/trip';
import { eligibleVehicles, eligibleDrivers } from '../domain/dispatch';
import { capacityOk, assignmentConflict } from '../domain/capacityConflict';
import { Prisma } from '@prisma/client';

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
 * 
 * Requirement 5.1: Support listing trips
 * 
 * @param statusFilter - Optional status to filter by (Draft, Dispatched, Completed, Cancelled)
 * @returns Array of trips matching the filter
 */
export async function listTrips(statusFilter?: TripStatus): Promise<Trip[]> {
  // Map domain status to Prisma enum if filter provided
  const prismaStatusMap: Record<TripStatus, string> = {
    'Draft': 'DRAFT',
    'Dispatched': 'DISPATCHED',
    'Completed': 'COMPLETED',
    'Cancelled': 'CANCELLED',
  };

  const prismaTrips = await prisma.trip.findMany({
    where: statusFilter ? { status: prismaStatusMap[statusFilter] as any } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return prismaTrips.map(toDomainTrip);
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
