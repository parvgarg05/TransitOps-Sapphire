/**
 * Dashboard API Route - GET /api/dashboard
 * 
 * This endpoint computes the full KPI set for the Operations Dashboard and returns
 * a role-appropriate default view subset based on the user's role.
 * 
 * Features:
 * - Computes all KPIs: Active/Available/In-Maintenance vehicles, Active/Pending trips,
 *   Drivers On Duty, Fleet Utilization, Soon-To-Expire Licenses
 * - Returns role-appropriate default-view subset based on user role
 * - Supports ?view=default|full query parameter
 * - Supports filters: vehicleType, status, region (apply filters before counting)
 * - Fleet Utilization is N/A when no non-Retired vehicles
 * 
 * Requirements: 10.1-10.14
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeDashboardKpis, VehicleFilters } from "@/domain/dashboardKpis";
import { defaultDashboardView, FULL_KPI_SET, isValidRole } from "@/domain/dashboardView";
import { fleetUtilization } from "@/domain/analytics";
import { isLicenseExpired, isLicenseSoonToExpire } from "@/domain/license";
import type { Vehicle, Driver, Trip, VehicleStatus, Role } from "@/domain/types";

/**
 * Maps Prisma enums to domain types
 */
function mapVehicleStatus(status: string): VehicleStatus {
  switch (status) {
    case "AVAILABLE":
      return "Available";
    case "ON_TRIP":
      return "On Trip";
    case "IN_SHOP":
      return "In Shop";
    case "RETIRED":
      return "Retired";
    default:
      return "Available";
  }
}

function mapRole(roleType: string): Role {
  switch (roleType) {
    // DB enum form (defensive) …
    case "FLEET_MANAGER":
    case "Fleet Manager":
      return "Fleet Manager";
    case "DRIVER":
    case "Driver":
      return "Driver";
    case "SAFETY_OFFICER":
    case "Safety Officer":
      return "Safety Officer";
    case "FINANCIAL_ANALYST":
    case "Financial Analyst":
      return "Financial Analyst";
    default:
      return "Fleet Manager";
  }
}

/**
 * GET /api/dashboard
 * 
 * Computes and returns dashboard KPIs with optional filtering and view selection.
 * 
 * Query Parameters:
 * - view: "default" | "full" - Controls whether to return role-based default view or full KPI set
 * - vehicleType: string - Filter vehicles by type
 * - status: VehicleStatus - Filter vehicles by status
 * - region: string - Filter vehicles by region
 * 
 * Requirements:
 * - 10.1: Display full KPI set (Active Vehicles, Available Vehicles, Vehicles in Maintenance,
 *         Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization)
 * - 10.5: Apply filters before counting, display 0 for empty matching sets
 * - 10.9: Fleet Utilization is N/A when no non-Retired vehicles
 * - 10.10-10.13: Role-based default views
 * - 10.14: Full KPI set available to all roles (view parameter controls this)
 * 
 * @returns 200 OK with KPI data, or 401 Unauthorized if no session
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.role) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    // Extract user role and validate
    const userRole = mapRole(session.user.role);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get("view") || "default"; // "default" | "full"
    const vehicleType = searchParams.get("vehicleType") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const region = searchParams.get("region") || undefined;

    // Build filters object
    const filters: VehicleFilters | undefined =
      vehicleType || statusParam || region
        ? {
            type: vehicleType,
            status: statusParam as VehicleStatus | undefined,
            region: region,
          }
        : undefined;

    // Fetch data from Prisma
    const [vehiclesRaw, driversRaw, tripsRaw] = await Promise.all([
      prisma.vehicle.findMany({
        select: {
          id: true,
          registrationNumber: true,
          name: true,
          type: true,
          region: true,
          maxLoadCapacity: true,
          odometer: true,
          acquisitionCost: true,
          revenue: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.driver.findMany({
        select: {
          id: true,
          name: true,
          licenseNumber: true,
          licenseCategory: true,
          licenseExpiryDate: true,
          contactNumber: true,
          safetyScore: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.trip.findMany({
        select: {
          id: true,
          source: true,
          destination: true,
          vehicleId: true,
          driverId: true,
          createdByUserId: true,
          cargoWeight: true,
          plannedDistance: true,
          finalOdometer: true,
          fuelConsumed: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Map Prisma data to domain types
    const vehicles: Vehicle[] = vehiclesRaw.map((v) => ({
      id: v.id,
      registrationNumber: v.registrationNumber,
      name: v.name,
      type: v.type,
      region: v.region,
      maxLoadCapacity: Number(v.maxLoadCapacity),
      odometer: Number(v.odometer),
      acquisitionCost: Number(v.acquisitionCost),
      revenue: Number(v.revenue),
      status: mapVehicleStatus(v.status),
      createdAt: v.createdAt,
    }));

    const drivers: Driver[] = driversRaw.map((d) => ({
      id: d.id,
      name: d.name,
      licenseNumber: d.licenseNumber,
      licenseCategory: d.licenseCategory,
      licenseExpiryDate: d.licenseExpiryDate,
      contactNumber: d.contactNumber,
      safetyScore: Number(d.safetyScore),
      status: d.status === "AVAILABLE"
        ? "Available"
        : d.status === "ON_TRIP"
        ? "On Trip"
        : d.status === "OFF_DUTY"
        ? "Off Duty"
        : "Suspended",
      createdAt: d.createdAt,
    }));

    const trips: Trip[] = tripsRaw.map((t) => ({
      id: t.id,
      source: t.source,
      destination: t.destination,
      vehicleId: t.vehicleId,
      driverId: t.driverId,
      createdByUserId: t.createdByUserId,
      cargoWeight: Number(t.cargoWeight),
      plannedDistance: Number(t.plannedDistance),
      finalOdometer: t.finalOdometer ? Number(t.finalOdometer) : null,
      fuelConsumed: t.fuelConsumed ? Number(t.fuelConsumed) : null,
      status:
        t.status === "DRAFT"
          ? "Draft"
          : t.status === "DISPATCHED"
          ? "Dispatched"
          : t.status === "COMPLETED"
          ? "Completed"
          : "Cancelled",
      createdAt: t.createdAt,
    }));

    // Compute basic dashboard KPIs using domain functions
    const basicKpis = computeDashboardKpis(vehicles, drivers, trips, filters);

    // Compute Fleet Utilization (Req 10.9)
    // Apply filters to vehicles before computing
    let filteredVehicles = vehicles;
    if (filters) {
      filteredVehicles = vehicles.filter((v) => {
        if (filters.type && v.type !== filters.type) return false;
        if (filters.status && v.status !== filters.status) return false;
        if (filters.region && v.region !== filters.region) return false;
        return true;
      });
    }
    const fleetUtilizationValue = fleetUtilization(filteredVehicles);

    // Compute license-related counts (Req 10.12 - Safety Officer view)
    const today = new Date();
    const expiredLicenseCount = drivers.filter((d) =>
      isLicenseExpired(d.licenseExpiryDate, today)
    ).length;
    const soonToExpireLicenseCount = drivers.filter((d) =>
      isLicenseSoonToExpire(d.licenseExpiryDate, today)
    ).length;
    const suspendedDriversCount = drivers.filter(
      (d) => d.status === "Suspended"
    ).length;

    // Count of available drivers (Req 10.11 - Driver role view)
    const availableDriversCount = drivers.filter(
      (d) => d.status === "Available"
    ).length;

    // Safety scores for all displayed drivers (Req 10.12)
    const safetyScores = drivers.map((d) => ({
      driverId: d.id,
      driverName: d.name,
      score: d.safetyScore,
    }));

    // Build the full KPI set
    const fullKpiSet = {
      "Active Vehicles": basicKpis.activeVehicles,
      "Available Vehicles": basicKpis.availableVehicles,
      "Vehicles in Maintenance": basicKpis.vehiclesInMaintenance,
      "Active Trips": basicKpis.activeTrips,
      "Pending Trips": basicKpis.pendingTrips,
      "Drivers On Duty": basicKpis.driversOnDuty,
      "Fleet Utilization": fleetUtilizationValue,
      "Available Drivers Count": availableDriversCount,
      "Expired License Count": expiredLicenseCount,
      "Soon-To-Expire License Count": soonToExpireLicenseCount,
      "Suspended Drivers Count": suspendedDriversCount,
      "Safety Scores": safetyScores,
      // Financial metrics would require additional data fetching
      // For now, we'll include placeholders or indicate they need separate computation
      "Operational Cost": null, // Requires fuel logs + maintenance logs per vehicle
      "Fuel Efficiency": null, // Requires fuel logs per vehicle
      "Vehicle ROI": null, // Requires revenue, fuel logs, maintenance logs per vehicle
    };

    // Determine which KPIs to return based on view parameter
    if (view === "full") {
      // Return the complete KPI set (Req 10.14)
      return NextResponse.json(
        {
          view: "full",
          role: userRole,
          kpis: fullKpiSet,
          appliedFilters: filters || null,
        },
        { status: 200 }
      );
    } else {
      // Return role-based default view (Req 10.10-10.13)
      const defaultKpis = defaultDashboardView(userRole);

      // Build a subset containing only the default KPIs for this role
      const defaultKpiData: Record<string, any> = {};
      defaultKpis.forEach((kpi) => {
        defaultKpiData[kpi] = fullKpiSet[kpi];
      });

      return NextResponse.json(
        {
          view: "default",
          role: userRole,
          kpis: defaultKpiData,
          appliedFilters: filters || null,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to compute dashboard KPIs" },
      { status: 500 }
    );
  }
}
