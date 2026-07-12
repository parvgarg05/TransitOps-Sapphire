/**
 * Analytics Service Layer
 * 
 * This module provides business logic for analytics operations:
 * - Fuel Efficiency Report (km/L per vehicle)
 * - Fleet Utilization Report (% On Trip vs non-Retired)
 * - Vehicle ROI Report (ROI per vehicle)
 * 
 * All reports handle guarded division cases by returning "N/A" when appropriate.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { prisma } from "../lib/db";
import {
  fuelEfficiency as computeFuelEfficiency,
  fleetUtilization as computeFleetUtilization,
  vehicleROI as computeVehicleROI,
} from "../domain/analytics";
import { Vehicle, FuelLog, MaintenanceLog } from "../domain/types";

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
    status: mapPrismaStatus(vehicle.status),
    createdAt: vehicle.createdAt,
  };
}

/**
 * Maps Prisma VehicleStatus to domain VehicleStatus
 */
function mapPrismaStatus(status: string): "Available" | "On Trip" | "In Shop" | "Retired" {
  const mapping: Record<string, "Available" | "On Trip" | "In Shop" | "Retired"> = {
    AVAILABLE: "Available",
    ON_TRIP: "On Trip",
    IN_SHOP: "In Shop",
    RETIRED: "Retired",
  };
  return mapping[status] || "Available";
}

/**
 * Maps Prisma FuelLog to domain FuelLog
 */
function mapPrismaFuelLogToDomain(log: any): FuelLog {
  return {
    id: log.id,
    vehicleId: log.vehicleId,
    liters: parseFloat(log.liters.toString()),
    cost: parseFloat(log.cost.toString()),
    date: log.date,
    createdAt: log.createdAt,
  };
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
 * Fuel Efficiency Report - Returns km/L per vehicle
 * 
 * Requirements:
 * - 9.1: Fuel Efficiency = total distance / total fuel, rounded to 2 decimals
 * - 9.4: If fuel consumed = 0, return "N/A" instead of performing division
 * 
 * Computes fuel efficiency by:
 * 1. Fetching all completed trips with distance and fuel data
 * 2. Aggregating total distance and fuel per vehicle
 * 3. Computing km/L using domain analytics function
 * 
 * @returns Array of {vehicleId, registrationNumber, name, fuelEfficiency}
 */
export async function getFuelEfficiencyReport(): Promise<
  Array<{
    vehicleId: string;
    registrationNumber: string;
    name: string;
    fuelEfficiency: number | null; // null = "N/A"
  }>
> {
  // Fetch all completed trips with vehicle details
  const trips = await prisma.trip.findMany({
    where: {
      status: "COMPLETED",
      fuelConsumed: { not: null },
      finalOdometer: { not: null },
    },
    include: {
      vehicle: true,
    },
  });

  // Aggregate data per vehicle
  const vehicleData = new Map<
    string,
    {
      vehicle: any;
      totalDistance: number;
      totalFuel: number;
    }
  >();

  for (const trip of trips) {
    const vehicleId = trip.vehicleId;
    const distance = parseFloat((trip.finalOdometer || 0).toString()) - parseFloat(trip.vehicle.odometer.toString());
    const fuel = parseFloat((trip.fuelConsumed || 0).toString());

    if (!vehicleData.has(vehicleId)) {
      vehicleData.set(vehicleId, {
        vehicle: trip.vehicle,
        totalDistance: 0,
        totalFuel: 0,
      });
    }

    const data = vehicleData.get(vehicleId)!;
    data.totalDistance += distance;
    data.totalFuel += fuel;
  }

  // Compute fuel efficiency for each vehicle
  const report = Array.from(vehicleData.entries()).map(([vehicleId, data]) => {
    const efficiency = computeFuelEfficiency(data.totalDistance, data.totalFuel);
    return {
      vehicleId,
      registrationNumber: data.vehicle.registrationNumber,
      name: data.vehicle.name,
      fuelEfficiency: efficiency, // null if totalFuel = 0
    };
  });

  return report;
}

/**
 * Fleet Utilization Report - Returns % On Trip vs non-Retired
 * 
 * Requirements:
 * - 9.2: Fleet Utilization = (On Trip / non-Retired) * 100, rounded to 1 decimal
 * - 9.5: If non-Retired count = 0, return "N/A" instead of performing division
 * 
 * Computes fleet utilization by:
 * 1. Fetching all vehicles
 * 2. Computing utilization using domain analytics function
 * 
 * @returns {utilization: number | null} where null = "N/A"
 */
export async function getFleetUtilizationReport(): Promise<{
  utilization: number | null; // null = "N/A"
  onTripCount: number;
  nonRetiredCount: number;
}> {
  // Fetch all vehicles
  const vehicles = await prisma.vehicle.findMany();

  // Map to domain type
  const domainVehicles = vehicles.map(mapPrismaVehicleToDomain);

  // Compute utilization
  const utilization = computeFleetUtilization(domainVehicles);

  // Count vehicles for context
  const onTripCount = domainVehicles.filter((v) => v.status === "On Trip").length;
  const nonRetiredCount = domainVehicles.filter((v) => v.status !== "Retired").length;

  return {
    utilization, // null if nonRetiredCount = 0
    onTripCount,
    nonRetiredCount,
  };
}

/**
 * Vehicle ROI Report - Returns ROI per vehicle
 * 
 * Requirements:
 * - 9.3: Vehicle ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost, rounded to 2 decimals
 * - 9.6: If acquisition cost = 0, return "N/A" instead of performing division
 * 
 * Computes vehicle ROI by:
 * 1. Fetching all vehicles with their fuel logs and maintenance logs
 * 2. Computing ROI using domain analytics function
 * 
 * @returns Array of {vehicleId, registrationNumber, name, roi}
 */
export async function getVehicleROIReport(): Promise<
  Array<{
    vehicleId: string;
    registrationNumber: string;
    name: string;
    roi: number | null; // null = "N/A"
  }>
> {
  // Fetch all vehicles with fuel logs and maintenance logs
  const vehicles = await prisma.vehicle.findMany({
    include: {
      fuelLogs: true,
      maintenanceLogs: true,
    },
  });

  // Compute ROI for each vehicle
  const report = vehicles.map((vehicle) => {
    const domainVehicle = mapPrismaVehicleToDomain(vehicle);
    const fuelLogs = vehicle.fuelLogs.map(mapPrismaFuelLogToDomain);
    const maintenanceLogs = vehicle.maintenanceLogs.map(mapPrismaMaintenanceLogToDomain);

    const roi = computeVehicleROI(domainVehicle, fuelLogs, maintenanceLogs);

    return {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      name: vehicle.name,
      roi, // null if acquisitionCost = 0
    };
  });

  return report;
}
