/**
 * Driver Service Layer
 * 
 * This module provides service functions for Driver CRUD operations.
 * It integrates domain validators, uniqueness checks, and license validity derivation.
 * 
 * Requirements: 4.1, 4.3, 4.4, 4.7, 4.8
 */

import { prisma } from "../lib/db";
import {
  validateDriverCreation,
  validateDriverUpdate,
  CreateDriverInput,
  UpdateDriverInput,
} from "../domain/validators/driver";
import { checkLicenseNumberUniqueness } from "../domain/uniqueness";
import { isLicenseExpired } from "../domain/license";
import { Result, Driver, DriverStatus } from "../domain/types";

/**
 * Extended driver type with license validity flag.
 * Requirement 4.3: List returns status, expiry, and derived license-validity flag
 */
export interface DriverWithValidity extends Driver {
  isLicenseValid: boolean;
}

/**
 * Converts a Prisma Driver record to domain Driver with license validity.
 * 
 * @param prismaDriver - Driver record from Prisma
 * @param today - Current date for license validity calculation
 * @returns DriverWithValidity including the derived isLicenseValid flag
 */
function toDomainDriverWithValidity(
  prismaDriver: {
    id: string;
    name: string;
    licenseNumber: string;
    licenseCategory: string;
    licenseExpiryDate: Date;
    contactNumber: string;
    safetyScore: any; // Prisma Decimal
    status: string;
    createdAt: Date;
  },
  today: Date
): DriverWithValidity {
  // Map Prisma enum to domain status
  const statusMap: Record<string, DriverStatus> = {
    'AVAILABLE': 'Available',
    'ON_TRIP': 'On Trip',
    'OFF_DUTY': 'Off Duty',
    'SUSPENDED': 'Suspended',
  };

  const licenseExpiryDate = new Date(prismaDriver.licenseExpiryDate);
  const isLicenseValid = !isLicenseExpired(licenseExpiryDate, today);

  return {
    id: prismaDriver.id,
    name: prismaDriver.name,
    licenseNumber: prismaDriver.licenseNumber,
    licenseCategory: prismaDriver.licenseCategory,
    licenseExpiryDate,
    contactNumber: prismaDriver.contactNumber,
    safetyScore: Number(prismaDriver.safetyScore),
    status: statusMap[prismaDriver.status] || 'Available',
    createdAt: prismaDriver.createdAt,
    isLicenseValid,
  };
}

/**
 * Lists all drivers with status, expiry, and derived license-validity flag.
 * 
 * Requirement 4.3: List returns status, expiry, and derived license-validity flag
 * 
 * @returns Promise<DriverWithValidity[]> - Array of drivers with validity flags
 */
export async function listDrivers(): Promise<DriverWithValidity[]> {
  const today = new Date();
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
  });

  return drivers.map((driver) => toDomainDriverWithValidity(driver, today));
}

/**
 * Creates a new driver with validated fields and uniqueness check.
 * 
 * Requirement 4.1: Create driver with validated fields, status set to Available
 * Requirement 4.7: Return field-specific rejection for invalid fields
 * Requirement 4.8: Display uniqueness error when license number matches
 * 
 * @param input - Driver creation input
 * @returns Promise<Result<DriverWithValidity>> - Created driver or error message
 */
export async function createDriver(
  input: CreateDriverInput
): Promise<Result<DriverWithValidity>> {
  // Validate driver fields
  const validationResult = validateDriverCreation(input);
  if (!validationResult.ok) {
    return { ok: false, error: validationResult.error };
  }

  const validatedDriver = validationResult.value;

  // Check license number uniqueness
  const existingDrivers = await prisma.driver.findMany({
    select: { licenseNumber: true },
  });
  const existingLicenseNumbers = new Set(
    existingDrivers.map((d) => d.licenseNumber)
  );

  const uniquenessCheck = checkLicenseNumberUniqueness(
    validatedDriver.licenseNumber,
    existingLicenseNumbers
  );
  if (!uniquenessCheck.ok) {
    return { ok: false, error: uniquenessCheck.error };
  }

  // Create driver in database with status Available (Requirement 4.1)
  try {
    const createdDriver = await prisma.driver.create({
      data: {
        name: validatedDriver.name,
        licenseNumber: validatedDriver.licenseNumber,
        licenseCategory: validatedDriver.licenseCategory,
        licenseExpiryDate: validatedDriver.licenseExpiryDate,
        contactNumber: validatedDriver.contactNumber,
        safetyScore: validatedDriver.safetyScore,
        status: 'AVAILABLE', // Available by default (Requirement 4.1)
      },
    });

    const today = new Date();
    return {
      ok: true,
      value: toDomainDriverWithValidity(createdDriver, today),
    };
  } catch (error: any) {
    // Handle potential database-level uniqueness violation
    if (error.code === "P2002") {
      return { ok: false, error: "License number already exists" };
    }
    return { ok: false, error: "Failed to create driver" };
  }
}

/**
 * Updates an existing driver with validated fields.
 * On persistence failure, the function returns an error and retains previous values.
 * 
 * Requirement 4.4: Update editable fields including compliance data
 * Requirement 4.7: Return field-specific rejection for invalid fields
 * 
 * @param id - Driver ID to update
 * @param input - Driver update input (partial)
 * @returns Promise<Result<DriverWithValidity>> - Updated driver or error message
 */
export async function updateDriver(
  id: string,
  input: UpdateDriverInput
): Promise<Result<DriverWithValidity>> {
  // Validate update fields
  const validationResult = validateDriverUpdate(input);
  if (!validationResult.ok) {
    return { ok: false, error: validationResult.error };
  }

  // Check if driver exists
  const existingDriver = await prisma.driver.findUnique({ where: { id } });
  if (!existingDriver) {
    return { ok: false, error: "Driver not found" };
  }

  // If license number is being updated, check uniqueness
  if (input.licenseNumber && input.licenseNumber !== existingDriver.licenseNumber) {
    const existingDrivers = await prisma.driver.findMany({
      where: { licenseNumber: input.licenseNumber },
      select: { licenseNumber: true },
    });

    if (existingDrivers.length > 0) {
      return { ok: false, error: "License number already exists" };
    }
  }

  // Update driver in database
  try {
    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.licenseNumber !== undefined && { licenseNumber: input.licenseNumber }),
        ...(input.licenseCategory !== undefined && { licenseCategory: input.licenseCategory }),
        ...(input.licenseExpiryDate !== undefined && { licenseExpiryDate: input.licenseExpiryDate }),
        ...(input.contactNumber !== undefined && { contactNumber: input.contactNumber }),
        ...(input.safetyScore !== undefined && { safetyScore: input.safetyScore }),
      },
    });

    const today = new Date();
    return {
      ok: true,
      value: toDomainDriverWithValidity(updatedDriver, today),
    };
  } catch (error: any) {
    // On persistence failure, retain previous values by returning error
    if (error.code === "P2002") {
      return { ok: false, error: "License number already exists" };
    }
    return { ok: false, error: "Failed to update driver" };
  }
}

/**
 * Gets a single driver by ID with license validity flag.
 * 
 * @param id - Driver ID to retrieve
 * @returns Promise<Result<DriverWithValidity>> - Driver with validity flag or error
 */
export async function getDriverById(
  id: string
): Promise<Result<DriverWithValidity>> {
  const driver = await prisma.driver.findUnique({ where: { id } });

  if (!driver) {
    return { ok: false, error: "Driver not found" };
  }

  const today = new Date();
  return {
    ok: true,
    value: toDomainDriverWithValidity(driver, today),
  };
}
