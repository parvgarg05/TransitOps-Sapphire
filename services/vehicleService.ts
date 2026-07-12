/**
 * Vehicle Service Layer
 * 
 * This module provides business logic for Vehicle Registry operations:
 * - List all vehicles with their status
 * - Create new vehicles with validation and uniqueness checks
 * - Update existing vehicles (registration number is immutable)
 * - Retire vehicles (set status to Retired)
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

import { Result, Vehicle, VehicleStatus } from "../domain/types";
import {
  validateVehicleCreation,
  validateVehicleUpdate,
  CreateVehicleInput,
  UpdateVehicleInput,
} from "../domain/validators/vehicle";
import { checkRegistrationNumberUniqueness } from "../domain/uniqueness";
import { prisma } from "../lib/db";
import { VehicleStatus as PrismaVehicleStatus } from "@prisma/client";

/**
 * Maps Prisma VehicleStatus enum to domain VehicleStatus type
 */
function mapPrismaVehicleStatusToDomain(status: PrismaVehicleStatus): VehicleStatus {
  const mapping: Record<PrismaVehicleStatus, VehicleStatus> = {
    AVAILABLE: "Available",
    ON_TRIP: "On Trip",
    IN_SHOP: "In Shop",
    RETIRED: "Retired",
  };
  return mapping[status];
}

/**
 * Maps domain VehicleStatus to Prisma VehicleStatus enum
 */
function mapDomainVehicleStatusToPrisma(status: VehicleStatus): PrismaVehicleStatus {
  const mapping: Record<VehicleStatus, PrismaVehicleStatus> = {
    "Available": "AVAILABLE",
    "On Trip": "ON_TRIP",
    "In Shop": "IN_SHOP",
    "Retired": "RETIRED",
  };
  return mapping[status];
}

/**
 * Maps Prisma Vehicle to domain Vehicle
 */
function mapPrismaVehicleToDomain(vehicle: any): Vehicle {
  return {
    id: vehicle.id,
    registrationNumber: vehicle.registrationNumber,
    name: vehicle.name,
    type: vehicle.type,
    region: vehicle.region,
    maxLoadCapacity: parseFloat(vehicle.maxLoadCapacity.toString()),
    odometer: parseFloat(vehicle.odometer.toString()),
    acquisitionCost: parseFloat(vehicle.acquisitionCost.toString()),
    revenue: parseFloat(vehicle.revenue.toString()),
    status: mapPrismaVehicleStatusToDomain(vehicle.status),
    createdAt: vehicle.createdAt,
  };
}

/**
 * List all vehicles with their current status.
 * 
 * Requirement 3.4: Show all vehicles from the registry
 * 
 * @returns Result containing array of vehicles or error message
 */
export async function listVehicles(): Promise<Result<Vehicle[]>> {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      ok: true,
      value: vehicles.map(mapPrismaVehicleToDomain),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to fetch vehicles: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Create a new vehicle with validation and uniqueness checks.
 * 
 * Requirements:
 * - 3.1: Create vehicle with validated fields, initial status = Available
 * - 3.2: Registration number must be unique (check before persistence)
 * - 3.8: Return field-specific validation errors
 * - 3.9: On persistence failure, retain previous values (no partial state)
 * 
 * @param input - Vehicle creation input
 * @returns Result containing created vehicle or error message
 */
export async function createVehicle(input: CreateVehicleInput): Promise<Result<Vehicle>> {
  // Step 1: Validate vehicle fields
  const validationResult = validateVehicleCreation(input);
  if (!validationResult.ok) {
    return validationResult;
  }

  const validated = validationResult.value;

  // Step 2: Check registration number uniqueness
  try {
    // Fetch existing registration numbers
    const existingVehicles = await prisma.vehicle.findMany({
      select: { registrationNumber: true },
    });
    const existingRegNumbers = new Set(existingVehicles.map((v) => v.registrationNumber));

    const uniquenessResult = checkRegistrationNumberUniqueness(
      validated.registrationNumber,
      existingRegNumbers
    );

    if (!uniquenessResult.ok) {
      return uniquenessResult;
    }

    // Step 3: Persist to database with initial status Available (Requirement 3.1)
    const createdVehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: validated.registrationNumber,
        name: validated.name,
        type: validated.type,
        region: validated.region,
        maxLoadCapacity: validated.maxLoadCapacity,
        odometer: validated.odometer,
        acquisitionCost: validated.acquisitionCost,
        revenue: validated.revenue,
        status: mapDomainVehicleStatusToPrisma(validated.status), // AVAILABLE
      },
    });

    return {
      ok: true,
      value: mapPrismaVehicleToDomain(createdVehicle),
    };
  } catch (error) {
    // Requirement 3.9: On persistence failure, return error and retain previous values
    return {
      ok: false,
      error: `Failed to create vehicle: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Update an existing vehicle.
 * 
 * Requirements:
 * - 3.5: Update editable fields (registration number is immutable)
 * - 3.6: Validate updated fields
 * - 3.7: Return error if vehicle not found
 * - 3.8: Return field-specific validation errors
 * - 3.9: On persistence failure, retain previous values
 * 
 * @param id - Vehicle ID to update
 * @param input - Vehicle update input (registration number excluded)
 * @returns Result containing updated vehicle or error message
 */
export async function updateVehicle(id: string, input: UpdateVehicleInput): Promise<Result<Vehicle>> {
  // Step 1: Validate update fields
  const validationResult = validateVehicleUpdate(input);
  if (!validationResult.ok) {
    return validationResult;
  }

  try {
    // Step 2: Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle) {
      return {
        ok: false,
        error: "Vehicle not found",
      };
    }

    // Step 3: Update vehicle (registration number is NOT included in input - Requirement 3.5)
    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.region !== undefined && { region: input.region }),
        ...(input.maxLoadCapacity !== undefined && { maxLoadCapacity: input.maxLoadCapacity }),
        ...(input.odometer !== undefined && { odometer: input.odometer }),
        ...(input.acquisitionCost !== undefined && { acquisitionCost: input.acquisitionCost }),
        ...(input.revenue !== undefined && { revenue: input.revenue }),
      },
    });

    return {
      ok: true,
      value: mapPrismaVehicleToDomain(updatedVehicle),
    };
  } catch (error) {
    // Requirement 3.9: On persistence failure, return error and retain previous values
    return {
      ok: false,
      error: `Failed to update vehicle: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Retire a vehicle by setting its status to Retired.
 * 
 * Requirements:
 * - 3.6: Retire vehicle (set status to Retired)
 * - 3.7: Retired vehicles are excluded from dispatch selection
 * - 3.9: On persistence failure, retain previous values
 * 
 * @param id - Vehicle ID to retire
 * @returns Result containing retired vehicle or error message
 */
export async function retireVehicle(id: string): Promise<Result<Vehicle>> {
  try {
    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle) {
      return {
        ok: false,
        error: "Vehicle not found",
      };
    }

    // Update vehicle status to Retired
    const retiredVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        status: "RETIRED",
      },
    });

    return {
      ok: true,
      value: mapPrismaVehicleToDomain(retiredVehicle),
    };
  } catch (error) {
    // Requirement 3.9: On persistence failure, return error and retain previous values
    return {
      ok: false,
      error: `Failed to retire vehicle: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
