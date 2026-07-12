/**
 * Expense Service Layer
 * 
 * This module provides business logic for Fuel and Expense Management:
 * - Create validated fuel logs
 * - Create validated expenses
 * - Compute operational cost from live data (fuel + maintenance)
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { Result, FuelLog, Expense, MaintenanceLog } from "../domain/types";
import {
  validateFuelLogCreation,
  validateExpenseCreation,
  CreateFuelLogInput,
  CreateExpenseInput,
} from "../domain/validators/expense";
import { operationalCost } from "../domain/analytics";
import { prisma } from "../lib/db";

/**
 * Maps Prisma FuelLog to domain FuelLog
 */
function mapPrismaFuelLogToDomain(fuelLog: any): FuelLog {
  return {
    id: fuelLog.id,
    vehicleId: fuelLog.vehicleId,
    liters: parseFloat(fuelLog.liters.toString()),
    cost: parseFloat(fuelLog.cost.toString()),
    date: fuelLog.date,
    createdAt: fuelLog.createdAt,
  };
}

/**
 * Maps Prisma Expense to domain Expense
 */
function mapPrismaExpenseToDomain(expense: any): Expense {
  return {
    id: expense.id,
    vehicleId: expense.vehicleId,
    category: expense.category as "toll" | "maintenance charge" | "other",
    cost: parseFloat(expense.cost.toString()),
    date: expense.date,
    createdAt: expense.createdAt,
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
 * Create a validated fuel log for a vehicle.
 * 
 * Requirements:
 * - 8.1: Fuel log valid iff liters > 0, cost ≥ 0, date ≤ today
 * - 8.2: Reject fuel log with invalid fields (field-specific errors)
 * 
 * @param vehicleId - The vehicle ID
 * @param liters - Liters of fuel (must be > 0)
 * @param cost - Fuel cost (must be ≥ 0)
 * @param date - Date of fuel log (must be ≤ today)
 * @returns Result containing created FuelLog or error message
 */
export async function createFuelLog(
  vehicleId: string,
  liters: number,
  cost: number,
  date: Date
): Promise<Result<FuelLog>> {
  // Step 1: Validate fuel log fields
  const input: CreateFuelLogInput = {
    vehicleId,
    liters,
    cost,
    date,
  };

  const today = new Date();
  const validationResult = validateFuelLogCreation(input, today);
  
  if (!validationResult.ok) {
    return validationResult;
  }

  // Step 2: Check if vehicle exists
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return {
        ok: false,
        error: "Vehicle not found",
      };
    }

    // Step 3: Create fuel log
    const createdFuelLog = await prisma.fuelLog.create({
      data: {
        vehicleId: validationResult.value.vehicleId,
        liters: validationResult.value.liters,
        cost: validationResult.value.cost,
        date: validationResult.value.date,
      },
    });

    return {
      ok: true,
      value: mapPrismaFuelLogToDomain(createdFuelLog),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to create fuel log: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Create a validated expense for a vehicle.
 * 
 * Requirements:
 * - 8.3: Expense valid iff cost ≥ 0, date ≤ today
 * - 8.4: Reject expense with invalid fields (field-specific errors)
 * 
 * @param vehicleId - The vehicle ID
 * @param category - Expense category (toll, maintenance charge, other)
 * @param cost - Expense cost (must be ≥ 0)
 * @param date - Date of expense (must be ≤ today)
 * @returns Result containing created Expense or error message
 */
export async function createExpense(
  vehicleId: string,
  category: string,
  cost: number,
  date: Date
): Promise<Result<Expense>> {
  // Step 1: Validate expense fields
  const input: CreateExpenseInput = {
    vehicleId,
    category,
    cost,
    date,
  };

  const today = new Date();
  const validationResult = validateExpenseCreation(input, today);
  
  if (!validationResult.ok) {
    return validationResult;
  }

  // Step 2: Check if vehicle exists
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return {
        ok: false,
        error: "Vehicle not found",
      };
    }

    // Step 3: Create expense
    const createdExpense = await prisma.expense.create({
      data: {
        vehicleId: validationResult.value.vehicleId,
        category: validationResult.value.category,
        cost: validationResult.value.cost,
        date: validationResult.value.date,
      },
    });

    return {
      ok: true,
      value: mapPrismaExpenseToDomain(createdExpense),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to create expense: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get operational cost for a vehicle.
 * Computes total fuel cost + qualifying maintenance cost from live data.
 * 
 * Requirements:
 * - 8.5: Operational Cost = fuel cost + maintenance cost
 * - 8.6: Recomputed on read from live rows (within 2 seconds)
 * - 7.6: Only costs > 0 contribute to operational cost
 * 
 * @param vehicleId - The vehicle ID
 * @returns Result containing operational cost (rounded to 2 decimals) or error message
 */
export async function getOperationalCost(
  vehicleId: string
): Promise<Result<number>> {
  try {
    // Step 1: Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return {
        ok: false,
        error: "Vehicle not found",
      };
    }

    // Step 2: Fetch live fuel logs and maintenance logs
    const [fuelLogs, maintenanceLogs] = await Promise.all([
      prisma.fuelLog.findMany({
        where: { vehicleId },
      }),
      prisma.maintenanceLog.findMany({
        where: { vehicleId },
      }),
    ]);

    // Step 3: Map to domain types
    const domainFuelLogs = fuelLogs.map(mapPrismaFuelLogToDomain);
    const domainMaintenanceLogs = maintenanceLogs.map(mapPrismaMaintenanceLogToDomain);

    // Step 4: Compute operational cost using domain logic (Req 8.5, 8.6)
    const cost = operationalCost(domainFuelLogs, domainMaintenanceLogs);

    return {
      ok: true,
      value: cost,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to get operational cost: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get all fuel logs.
 * 
 * @returns Result containing array of FuelLogs or error message
 */
export async function getAllFuelLogs(): Promise<Result<FuelLog[]>> {
  try {
    const fuelLogs = await prisma.fuelLog.findMany({
      orderBy: {
        date: "desc",
      },
    });

    return {
      ok: true,
      value: fuelLogs.map(mapPrismaFuelLogToDomain),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to get fuel logs: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get all expenses.
 * 
 * @returns Result containing array of Expenses or error message
 */
export async function getAllExpenses(): Promise<Result<Expense[]>> {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: {
        date: "desc",
      },
    });

    return {
      ok: true,
      value: expenses.map(mapPrismaExpenseToDomain),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to get expenses: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
