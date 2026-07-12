/**
 * Maintenance Service Layer
 * 
 * This module provides business logic for Maintenance Workflow operations:
 * - Open maintenance (creates record, sets vehicle to In Shop, rejects if Retired)
 * - Close maintenance (closes record, sets vehicle to Available, preserves Retired)
 * - Update maintenance cost (validates and updates cost)
 * 
 * All vehicle status changes are performed transactionally with maintenance records.
 * 
 * Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */

import { prisma } from "../lib/db";
import { Result, MaintenanceLog, Vehicle } from "../domain/types";
import { openMaintenance, closeMaintenance } from "../domain/maintenanceStateMachine";
import { validateMaintenanceCostUpdate } from "../domain/validators/expense";
import { VehicleStatus as PrismaVehicleStatus } from "@prisma/client";

/**
 * Maps domain VehicleStatus to Prisma VehicleStatus enum
 */
function mapDomainVehicleStatusToPrisma(status: string): PrismaVehicleStatus {
  const mapping: Record<string, PrismaVehicleStatus> = {
    "Available": "AVAILABLE",
    "On Trip": "ON_TRIP",
    "In Shop": "IN_SHOP",
    "Retired": "RETIRED",
  };
  return mapping[status] || "AVAILABLE";
}

/**
 * Maps Prisma MaintenanceLog to domain MaintenanceLog
 */
function mapPrismaMaintenanceLogToDomain(log: any): MaintenanceLog {
  return {
    id: log.id,
    vehicleId: log.vehicleId,
    description: log.description,
    cost: parseFloat(log.cost.toString()),
    closed: log.closed,
    openedAt: log.openedAt,
    closedAt: log.closedAt,
  };
}

/**
 * Maps Prisma VehicleStatus enum to domain status string
 */
function mapPrismaVehicleStatusToDomain(status: PrismaVehicleStatus): string {
  const mapping: Record<PrismaVehicleStatus, string> = {
    AVAILABLE: "Available",
    ON_TRIP: "On Trip",
    IN_SHOP: "In Shop",
    RETIRED: "Retired",
  };
  return mapping[status];
}

/**
 * Opens a maintenance record for a vehicle.
 * 
 * Creates a maintenance record and transactionally updates vehicle status to "In Shop".
 * Rejects if vehicle status is "Retired".
 * 
 * Requirements:
 * - 7.1: Opening maintenance sets vehicle to In Shop
 * - 7.7: Reject opening maintenance for Retired vehicles
 * 
 * @param vehicleId - ID of the vehicle to open maintenance for
 * @param description - Description of the maintenance work
 * @returns Result containing created maintenance log or error message
 */
export async function openMaintenanceRecord(
  vehicleId: string,
  description: string
): Promise<Result<MaintenanceLog>> {
  try {
    // Fetch vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return { ok: false, error: "Vehicle not found" };
    }

    // Check vehicle status using domain state machine
    const domainVehicle: Vehicle = {
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      name: vehicle.name,
      type: vehicle.type,
      region: vehicle.region,
      maxLoadCapacity: parseFloat(vehicle.maxLoadCapacity.toString()),
      odometer: parseFloat(vehicle.odometer.toString()),
      acquisitionCost: parseFloat(vehicle.acquisitionCost.toString()),
      revenue: parseFloat(vehicle.revenue.toString()),
      status: mapPrismaVehicleStatusToDomain(vehicle.status) as any,
      createdAt: vehicle.createdAt,
    };

    const stateResult = openMaintenance(domainVehicle);
    if (!stateResult.ok) {
      return { ok: false, error: stateResult.error };
    }

    const newStatus = stateResult.value;

    // Create maintenance record and update vehicle status transactionally
    const result = await prisma.$transaction(async (tx) => {
      // Create maintenance record
      const maintenanceLog = await tx.maintenanceLog.create({
        data: {
          vehicleId,
          description,
          cost: 0, // Default cost is 0
          closed: false,
          openedAt: new Date(),
        },
      });

      // Update vehicle status to In Shop
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { status: mapDomainVehicleStatusToPrisma(newStatus) },
      });

      return maintenanceLog;
    });

    return {
      ok: true,
      value: mapPrismaMaintenanceLogToDomain(result),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to open maintenance: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Closes a maintenance record for a vehicle.
 * 
 * Marks the maintenance record as closed and transactionally updates vehicle status
 * to "Available" (unless vehicle is "Retired", in which case it stays "Retired").
 * 
 * Requirements:
 * - 7.3: Closing maintenance sets vehicle to Available
 * - 7.4: Closing maintenance preserves Retired status
 * 
 * @param maintenanceId - ID of the maintenance record to close
 * @returns Result containing closed maintenance log or error message
 */
export async function closeMaintenanceRecord(
  maintenanceId: string
): Promise<Result<MaintenanceLog>> {
  try {
    // Fetch maintenance log
    const maintenanceLog = await prisma.maintenanceLog.findUnique({
      where: { id: maintenanceId },
      include: { vehicle: true },
    });

    if (!maintenanceLog) {
      return { ok: false, error: "Maintenance record not found" };
    }

    if (maintenanceLog.closed) {
      return { ok: false, error: "Maintenance record is already closed" };
    }

    // Map vehicle to domain type
    const domainVehicle: Vehicle = {
      id: maintenanceLog.vehicle.id,
      registrationNumber: maintenanceLog.vehicle.registrationNumber,
      name: maintenanceLog.vehicle.name,
      type: maintenanceLog.vehicle.type,
      region: maintenanceLog.vehicle.region,
      maxLoadCapacity: parseFloat(maintenanceLog.vehicle.maxLoadCapacity.toString()),
      odometer: parseFloat(maintenanceLog.vehicle.odometer.toString()),
      acquisitionCost: parseFloat(maintenanceLog.vehicle.acquisitionCost.toString()),
      revenue: parseFloat(maintenanceLog.vehicle.revenue.toString()),
      status: mapPrismaVehicleStatusToDomain(maintenanceLog.vehicle.status) as any,
      createdAt: maintenanceLog.vehicle.createdAt,
    };

    // Get new status from domain state machine
    const newStatus = closeMaintenance(domainVehicle);

    // Close maintenance record and update vehicle status transactionally
    const result = await prisma.$transaction(async (tx) => {
      // Close maintenance record
      const updatedLog = await tx.maintenanceLog.update({
        where: { id: maintenanceId },
        data: {
          closed: true,
          closedAt: new Date(),
        },
      });

      // Update vehicle status
      await tx.vehicle.update({
        where: { id: maintenanceLog.vehicleId },
        data: { status: mapDomainVehicleStatusToPrisma(newStatus) },
      });

      return updatedLog;
    });

    return {
      ok: true,
      value: mapPrismaMaintenanceLogToDomain(result),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to close maintenance: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Updates the cost of a maintenance record.
 * 
 * Validates cost is within valid range (0 <= cost <= 999,999,999.99).
 * 
 * Requirements:
 * - 7.5, 7.6: Maintenance cost 0 <= cost <= 999,999,999.99
 * - 7.8: Reject out-of-range maintenance costs
 * 
 * @param maintenanceId - ID of the maintenance record to update
 * @param cost - New cost value
 * @returns Result containing updated maintenance log or error message
 */
export async function updateMaintenanceCostRecord(
  maintenanceId: string,
  cost: number
): Promise<Result<MaintenanceLog>> {
  // Validate cost
  const validationResult = validateMaintenanceCostUpdate(cost);
  if (!validationResult.ok) {
    return { ok: false, error: validationResult.error };
  }

  try {
    // Fetch maintenance log
    const maintenanceLog = await prisma.maintenanceLog.findUnique({
      where: { id: maintenanceId },
    });

    if (!maintenanceLog) {
      return { ok: false, error: "Maintenance record not found" };
    }

    // Update cost
    const updatedLog = await prisma.maintenanceLog.update({
      where: { id: maintenanceId },
      data: { cost: validationResult.value },
    });

    return {
      ok: true,
      value: mapPrismaMaintenanceLogToDomain(updatedLog),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to update maintenance cost: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
