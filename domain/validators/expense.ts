/**
 * Fuel log, expense, and maintenance cost validators
 * 
 * This module provides validation functions for fuel logs, general expenses,
 * and maintenance costs.
 * 
 * Requirements: 7.5, 7.6, 7.8, 8.1, 8.2, 8.3, 8.4
 */

import { Result } from "../types";

/**
 * Input shape for creating a fuel log.
 * Requirement 8.1: Fuel log with liters, cost, and date
 */
export interface CreateFuelLogInput {
  vehicleId: string;
  liters: number;
  cost: number;
  date: Date;
}

/**
 * Validated fuel log data.
 */
export interface ValidatedFuelLog {
  vehicleId: string;
  liters: number;
  cost: number;
  date: Date;
}

/**
 * Input shape for creating an expense.
 * Requirement 8.3: Expense with cost and date
 */
export interface CreateExpenseInput {
  vehicleId: string;
  category: string;
  cost: number;
  date: Date;
}

/**
 * Validated expense data.
 */
export interface ValidatedExpense {
  vehicleId: string;
  category: string;
  cost: number;
  date: Date;
}

/**
 * Validates that liters is greater than 0.
 * Requirement 8.1, 8.2: liters > 0
 */
function validateLiters(liters: number): Result<number> {
  if (liters <= 0) {
    return { ok: false, error: "Liters must be greater than 0" };
  }
  return { ok: true, value: liters };
}

/**
 * Validates that fuel cost is greater than or equal to 0.
 * Requirement 8.1, 8.2: cost ≥ 0
 */
function validateFuelCost(cost: number): Result<number> {
  if (cost < 0) {
    return { ok: false, error: "Fuel cost must be greater than or equal to 0" };
  }
  return { ok: true, value: cost };
}

/**
 * Validates that expense cost is greater than or equal to 0.
 * Requirement 8.3, 8.4: cost ≥ 0
 */
function validateExpenseCost(cost: number): Result<number> {
  if (cost < 0) {
    return { ok: false, error: "Expense cost must be greater than or equal to 0" };
  }
  return { ok: true, value: cost };
}

/**
 * Validates that maintenance cost is within valid range.
 * Requirement 7.5, 7.6, 7.8: 0 ≤ cost ≤ 999,999,999.99
 * Note: Only strictly positive costs (> 0) contribute to operational cost.
 */
function validateMaintenanceCost(cost: number): Result<number> {
  if (cost < 0) {
    return { ok: false, error: "Maintenance cost must be greater than or equal to 0" };
  }
  if (cost > 999_999_999.99) {
    return { ok: false, error: "Maintenance cost must not exceed 999,999,999.99" };
  }
  return { ok: true, value: cost };
}

/**
 * Validates that a date is not in the future (not later than today).
 * Requirement 8.1, 8.2, 8.3, 8.4: date ≤ today
 * 
 * @param date - The date to validate
 * @param today - The current date (passed as parameter for deterministic testing)
 * @returns Result containing the date or error message
 */
function validateDateNotFuture(date: Date, today: Date): Result<Date> {
  // Compare dates at day precision
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  if (dateOnly > todayOnly) {
    return { ok: false, error: "Date must not be in the future" };
  }
  return { ok: true, value: date };
}

/**
 * Validates all fuel log fields.
 * Returns field-specific rejection errors or validated fuel log.
 * 
 * Requirement 8.1: Fuel log valid iff liters > 0, cost ≥ 0, date ≤ today
 * Requirement 8.2: Reject fuel log with invalid fields
 * 
 * @param input - The fuel log creation input to validate
 * @param today - The current date (passed as parameter for deterministic testing)
 * @returns Result containing ValidatedFuelLog or field-specific error message
 */
export function validateFuelLogCreation(
  input: CreateFuelLogInput,
  today: Date
): Result<ValidatedFuelLog> {
  // Validate liters
  const litersResult = validateLiters(input.liters);
  if (!litersResult.ok) {
    return litersResult;
  }

  // Validate cost
  const costResult = validateFuelCost(input.cost);
  if (!costResult.ok) {
    return costResult;
  }

  // Validate date
  const dateResult = validateDateNotFuture(input.date, today);
  if (!dateResult.ok) {
    return dateResult;
  }

  // All validations passed
  return {
    ok: true,
    value: {
      vehicleId: input.vehicleId,
      liters: litersResult.value,
      cost: costResult.value,
      date: dateResult.value,
    },
  };
}

/**
 * Validates all expense fields.
 * Returns field-specific rejection errors or validated expense.
 * 
 * Requirement 8.3: Expense valid iff cost ≥ 0, date ≤ today
 * Requirement 8.4: Reject expense with invalid fields
 * 
 * @param input - The expense creation input to validate
 * @param today - The current date (passed as parameter for deterministic testing)
 * @returns Result containing ValidatedExpense or field-specific error message
 */
export function validateExpenseCreation(
  input: CreateExpenseInput,
  today: Date
): Result<ValidatedExpense> {
  // Validate cost
  const costResult = validateExpenseCost(input.cost);
  if (!costResult.ok) {
    return costResult;
  }

  // Validate date
  const dateResult = validateDateNotFuture(input.date, today);
  if (!dateResult.ok) {
    return dateResult;
  }

  // All validations passed
  return {
    ok: true,
    value: {
      vehicleId: input.vehicleId,
      category: input.category,
      cost: costResult.value,
      date: dateResult.value,
    },
  };
}

/**
 * Validates maintenance cost field.
 * Returns field-specific rejection error or validated cost.
 * 
 * Requirement 7.5, 7.6: Maintenance cost 0 ≤ cost ≤ 999,999,999.99
 * Requirement 7.6: Only costs > 0 qualify for operational cost computation
 * Requirement 7.8: Reject out-of-range maintenance costs
 * 
 * @param cost - The maintenance cost to validate
 * @returns Result containing validated cost or field-specific error message
 */
export function validateMaintenanceCostUpdate(cost: number): Result<number> {
  return validateMaintenanceCost(cost);
}

/**
 * Determines if a validated maintenance cost should contribute to operational cost.
 * Requirement 7.6: Only strictly positive costs (> 0) contribute to operational cost.
 * 
 * @param cost - The validated maintenance cost
 * @returns true if cost should contribute to operational cost, false otherwise
 */
export function shouldContributeToOperationalCost(cost: number): boolean {
  return cost > 0;
}
