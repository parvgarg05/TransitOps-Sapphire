/**
 * Vehicle Document API Routes: GET and POST /api/vehicles/[id]/documents
 *
 * GET: List all documents for a vehicle (ordered by uploadedAt desc)
 * POST: Store a new document (metadata only: filename + url)
 *
 * Requirements: 14.1, 14.2
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/vehicles/[id]/documents
 * Return all VehicleDocument rows for the vehicle, newest first.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const documents = await prisma.vehicleDocument.findMany({
      where: { vehicleId: id },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error("Error fetching vehicle documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vehicles/[id]/documents
 * Store a new document for the vehicle.
 *
 * Validates that filename and url are non-empty strings and that the
 * vehicle exists. On any validation failure nothing is created.
 *
 * Requirement 14.2: On persistence failure, create nothing and return an error.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { filename, url } = (body ?? {}) as {
    filename?: unknown;
    url?: unknown;
  };

  // Validate inputs are non-empty strings (Requirement 14.1)
  if (
    typeof filename !== "string" ||
    filename.trim().length === 0 ||
    typeof url !== "string" ||
    url.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "filename and url are required and must be non-empty strings" },
      { status: 400 }
    );
  }

  // Ensure the vehicle exists before creating the document
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // Persist the document. On failure, create nothing (Requirement 14.2).
  try {
    const document = await prisma.vehicleDocument.create({
      data: {
        vehicleId: id,
        filename: filename.trim(),
        url: url.trim(),
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error storing vehicle document:", error);
    return NextResponse.json(
      { error: "Failed to store document" },
      { status: 500 }
    );
  }
}
