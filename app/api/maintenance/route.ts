/**
 * Maintenance API Route - GET and POST /api/maintenance
 * 
 * This endpoint handles fetching and opening maintenance records.
 * 
 * Requirements: 7.1, 7.7
 */

import { NextRequest, NextResponse } from "next/server";
import { openMaintenanceRecord } from "@/services/maintenanceService";
import { prisma } from "@/lib/db";

/**
 * GET /api/maintenance
 * 
 * Fetches all maintenance records with vehicle details.
 * Supports filtering by vehicleId and status (open/closed).
 * 
 * Query Parameters:
 * - vehicleId: string (optional) - filter by vehicle
 * - status: "open" | "closed" (optional) - filter by status
 * 
 * @returns 200 OK with maintenance logs array
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");
    const status = searchParams.get("status");

    // Build filter
    const where: any = {};
    
    if (vehicleId) {
      where.vehicleId = vehicleId;
    }
    
    if (status === "open") {
      where.closed = false;
    } else if (status === "closed") {
      where.closed = true;
    }

    // Fetch maintenance logs with vehicle details
    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: {
        openedAt: "desc",
      },
    });

    // Map to response format
    const mappedLogs = logs.map((log) => ({
      id: log.id,
      vehicleId: log.vehicleId,
      description: log.description,
      cost: parseFloat(log.cost.toString()),
      closed: log.closed,
      openedAt: log.openedAt.toISOString(),
      closedAt: log.closedAt?.toISOString() || null,
      vehicle: {
        id: log.vehicle.id,
        registrationNumber: log.vehicle.registrationNumber,
        name: log.vehicle.name,
        status: log.vehicle.status,
      },
    }));

    return NextResponse.json({ logs: mappedLogs }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch maintenance logs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/maintenance
 * 
 * Opens a maintenance record for a vehicle.
 * Sets vehicle status to "In Shop" (rejects if vehicle is "Retired").
 * 
 * Requirement 7.1: Opening maintenance sets vehicle to In Shop
 * Requirement 7.7: Reject opening maintenance for Retired vehicles
 * 
 * Request Body:
 * - vehicleId: string (required)
 * - description: string (required)
 * 
 * @returns 201 Created with maintenance log data, or 400/404 with error message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { vehicleId, description } = body;

    // Validate required fields
    if (!vehicleId || typeof vehicleId !== "string") {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim() === "") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Open maintenance record through service layer
    const result = await openMaintenanceRecord(vehicleId, description.trim());

    if (!result.ok) {
      // Handle different error types
      if (result.error === "Vehicle not found") {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
