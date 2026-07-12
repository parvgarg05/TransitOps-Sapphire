/**
 * Property-based tests for fuel log, expense, and maintenance cost validators
 * 
 * Feature: transitops
 * Property 25: Only positive maintenance costs contribute to operational cost, and out-of-range costs are rejected
 * Property 26: Fuel logs are valid exactly when liters, cost, and date are in range
 * Property 27: Expenses are valid exactly when cost and date are in range
 * 
 * Requirements: 7.5, 7.6, 7.8, 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateFuelLogCreation,
  validateExpenseCreation,
  validateMaintenanceCostUpdate,
  shouldContributeToOperationalCost,
  CreateFuelLogInput,
  CreateExpenseInput,
} from "./expense";

describe("Expense Validators", () => {
  // ============================================================================
  // Helper Functions and Arbitraries
  // ============================================================================

  /**
   * Creates a date at midnight (start of day) for consistent comparison
   */
  function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Arbitrary for dates in the past (not future)
   */
  const pastDateArb = fc.date({ max: new Date() });

  /**
   * Arbitrary for future dates (at least 1 day in future, with max bound)
   */
  const futureDateArb = fc.date({ 
    min: new Date(Date.now() + 86400000), // At least 1 day in future
    max: new Date(Date.now() + 365 * 86400000) // Max 1 year in future
  }).filter(date => !isNaN(date.getTime())); // Filter out invalid dates

  /**
   * Arbitrary for today's date
   */
  const todayArb = fc.constant(new Date());

  /**
   * Valid fuel log liters (> 0)
   */
  const validLitersArb = fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true });

  /**
   * Invalid fuel log liters (<= 0)
   */
  const invalidLitersArb = fc.double({ max: 0, min: -1000, noNaN: true, noDefaultInfinity: true });

  /**
   * Valid fuel/expense cost (>= 0)
   */
  const validCostArb = fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

  /**
   * Invalid fuel/expense cost (< 0)
   */
  const invalidCostArb = fc.double({ max: -0.01, min: -100_000, noNaN: true, noDefaultInfinity: true });

  /**
   * Valid maintenance cost (0 <= cost <= 999,999,999.99)
   */
  const validMaintenanceCostArb = fc.double({ 
    min: 0, 
    max: 999_999_999.99, 
    noNaN: true, 
    noDefaultInfinity: true 
  });

  /**
   * Invalid maintenance cost (out of range)
   */
  const invalidMaintenanceCostArb = fc.oneof(
    fc.double({ max: -0.01, min: -1_000_000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 1_000_000_000, max: 2_000_000_000, noNaN: true, noDefaultInfinity: true })
  );

  /**
   * Maintenance cost that should contribute to operational cost (> 0)
   */
  const contributingMaintenanceCostArb = fc.double({ 
    min: 0.01, 
    max: 999_999_999.99, 
    noNaN: true, 
    noDefaultInfinity: true 
  });

  /**
   * Maintenance cost that should NOT contribute to operational cost (= 0)
   */
  const nonContributingMaintenanceCostArb = fc.constant(0);

  // ============================================================================
  // Property 26: Fuel logs are valid exactly when liters, cost, and date are in range
  // **Validates: Requirements 8.1, 8.2**
  // ============================================================================

  describe("Property 26: Fuel Log Validation", () => {
    it("Property: Valid fuel log (liters > 0, cost >= 0, date <= today) is always accepted", () => {
      // **Validates: Requirements 8.1**
      const validFuelLogArb = fc.record({
        vehicleId: fc.uuid(),
        liters: validLitersArb,
        cost: validCostArb,
        date: pastDateArb,
      });

      fc.assert(
        fc.property(validFuelLogArb, todayArb, (input, today) => {
          const result = validateFuelLogCreation(input, today);
          
          // Valid input must always succeed
          return result.ok === true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Fuel log with liters <= 0 is always rejected", () => {
      // **Validates: Requirements 8.2**
      fc.assert(
        fc.property(
          fc.uuid(),
          invalidLitersArb,
          validCostArb,
          pastDateArb,
          todayArb,
          (vehicleId, liters, cost, date, today) => {
            const input: CreateFuelLogInput = { vehicleId, liters, cost, date };
            const result = validateFuelLogCreation(input, today);
            
            return !result.ok && result.error === "Liters must be greater than 0";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Fuel log with cost < 0 is always rejected", () => {
      // **Validates: Requirements 8.2**
      fc.assert(
        fc.property(
          fc.uuid(),
          validLitersArb,
          invalidCostArb,
          pastDateArb,
          todayArb,
          (vehicleId, liters, cost, date, today) => {
            const input: CreateFuelLogInput = { vehicleId, liters, cost, date };
            const result = validateFuelLogCreation(input, today);
            
            return !result.ok && result.error === "Fuel cost must be greater than or equal to 0";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Fuel log with future date is always rejected", () => {
      // **Validates: Requirements 8.2**
      fc.assert(
        fc.property(
          fc.uuid(),
          validLitersArb,
          validCostArb,
          futureDateArb,
          todayArb,
          (vehicleId, liters, cost, date, today) => {
            // Skip invalid dates
            if (isNaN(date.getTime()) || isNaN(today.getTime())) {
              return true;
            }
            
            const input: CreateFuelLogInput = { vehicleId, liters, cost, date };
            const result = validateFuelLogCreation(input, today);
            
            return !result.ok && result.error === "Date must not be in the future";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Fuel log with today's date is always accepted", () => {
      // **Validates: Requirements 8.1**
      fc.assert(
        fc.property(
          fc.uuid(),
          validLitersArb,
          validCostArb,
          (vehicleId, liters, cost) => {
            const today = new Date();
            const input: CreateFuelLogInput = { vehicleId, liters, cost, date: today };
            const result = validateFuelLogCreation(input, today);
            
            return result.ok === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Fuel log validation is deterministic - same input yields same result", () => {
      // **Validates: Requirements 8.1, 8.2**
      const fuelLogArb = fc.record({
        vehicleId: fc.uuid(),
        liters: fc.double({ min: -100, max: 10000, noNaN: true, noDefaultInfinity: true }),
        cost: fc.double({ min: -100, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        date: fc.date(),
      });

      fc.assert(
        fc.property(fuelLogArb, todayArb, (input, today) => {
          const result1 = validateFuelLogCreation(input, today);
          const result2 = validateFuelLogCreation(input, today);
          
          // Both results must have same ok status
          if (result1.ok !== result2.ok) {
            return false;
          }
          
          if (!result1.ok && !result2.ok) {
            return result1.error === result2.error;
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Fuel log with boundary values (liters = 0.01, cost = 0) behaves correctly", () => {
      // **Validates: Requirements 8.1**
      fc.assert(
        fc.property(fc.uuid(), pastDateArb, todayArb, (vehicleId, date, today) => {
          // liters = 0.01 (just above minimum) should succeed
          const minLitersInput: CreateFuelLogInput = { 
            vehicleId, 
            liters: 0.01, 
            cost: 0, 
            date 
          };
          const result1 = validateFuelLogCreation(minLitersInput, today);
          
          // cost = 0 (minimum) should succeed
          const minCostInput: CreateFuelLogInput = { 
            vehicleId, 
            liters: 1, 
            cost: 0, 
            date 
          };
          const result2 = validateFuelLogCreation(minCostInput, today);
          
          return result1.ok === true && result2.ok === true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Fuel log preserves all valid field values", () => {
      // **Validates: Requirements 8.1**
      const validFuelLogArb = fc.record({
        vehicleId: fc.uuid(),
        liters: validLitersArb,
        cost: validCostArb,
        date: pastDateArb,
      });

      fc.assert(
        fc.property(validFuelLogArb, todayArb, (input, today) => {
          const result = validateFuelLogCreation(input, today);
          
          if (!result.ok) {
            return false;
          }
          
          // All fields must be preserved
          return (
            result.value.vehicleId === input.vehicleId &&
            result.value.liters === input.liters &&
            result.value.cost === input.cost &&
            result.value.date === input.date
          );
        }),
        { numRuns: 100 }
      );
    });

    it("Property: First validation error is returned when multiple fields are invalid", () => {
      // **Validates: Requirements 8.2**
      fc.assert(
        fc.property(
          fc.uuid(),
          invalidLitersArb,
          invalidCostArb,
          futureDateArb,
          todayArb,
          (vehicleId, liters, cost, date, today) => {
            const input: CreateFuelLogInput = { vehicleId, liters, cost, date };
            const result = validateFuelLogCreation(input, today);
            
            // Should fail (liters is checked first)
            return !result.ok && result.error === "Liters must be greater than 0";
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 27: Expenses are valid exactly when cost and date are in range
  // **Validates: Requirements 8.3, 8.4**
  // ============================================================================

  describe("Property 27: Expense Validation", () => {
    it("Property: Valid expense (cost >= 0, date <= today) is always accepted", () => {
      // **Validates: Requirements 8.3**
      const validExpenseArb = fc.record({
        vehicleId: fc.uuid(),
        category: fc.constantFrom("toll", "maintenance charge", "other"),
        cost: validCostArb,
        date: pastDateArb,
      });

      fc.assert(
        fc.property(validExpenseArb, todayArb, (input, today) => {
          const result = validateExpenseCreation(input, today);
          
          // Valid input must always succeed
          return result.ok === true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Expense with cost < 0 is always rejected", () => {
      // **Validates: Requirements 8.4**
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.constantFrom("toll", "maintenance charge", "other"),
          invalidCostArb,
          pastDateArb,
          todayArb,
          (vehicleId, category, cost, date, today) => {
            const input: CreateExpenseInput = { vehicleId, category, cost, date };
            const result = validateExpenseCreation(input, today);
            
            return !result.ok && result.error === "Expense cost must be greater than or equal to 0";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Expense with future date is always rejected", () => {
      // **Validates: Requirements 8.4**
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.constantFrom("toll", "maintenance charge", "other"),
          validCostArb,
          futureDateArb,
          todayArb,
          (vehicleId, category, cost, date, today) => {
            const input: CreateExpenseInput = { vehicleId, category, cost, date };
            const result = validateExpenseCreation(input, today);
            
            return !result.ok && result.error === "Date must not be in the future";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Expense with today's date is always accepted", () => {
      // **Validates: Requirements 8.3**
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.constantFrom("toll", "maintenance charge", "other"),
          validCostArb,
          (vehicleId, category, cost) => {
            const today = new Date();
            const input: CreateExpenseInput = { vehicleId, category, cost, date: today };
            const result = validateExpenseCreation(input, today);
            
            return result.ok === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Expense validation is deterministic - same input yields same result", () => {
      // **Validates: Requirements 8.3, 8.4**
      const expenseArb = fc.record({
        vehicleId: fc.uuid(),
        category: fc.constantFrom("toll", "maintenance charge", "other"),
        cost: fc.double({ min: -100, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        date: fc.date(),
      });

      fc.assert(
        fc.property(expenseArb, todayArb, (input, today) => {
          const result1 = validateExpenseCreation(input, today);
          const result2 = validateExpenseCreation(input, today);
          
          // Both results must have same ok status
          if (result1.ok !== result2.ok) {
            return false;
          }
          
          if (!result1.ok && !result2.ok) {
            return result1.error === result2.error;
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Expense with boundary value (cost = 0) is accepted", () => {
      // **Validates: Requirements 8.3**
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.constantFrom("toll", "maintenance charge", "other"),
          pastDateArb,
          todayArb,
          (vehicleId, category, date, today) => {
            const input: CreateExpenseInput = { vehicleId, category, cost: 0, date };
            const result = validateExpenseCreation(input, today);
            
            return result.ok === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Expense preserves all valid field values", () => {
      // **Validates: Requirements 8.3**
      const validExpenseArb = fc.record({
        vehicleId: fc.uuid(),
        category: fc.constantFrom("toll", "maintenance charge", "other"),
        cost: validCostArb,
        date: pastDateArb,
      });

      fc.assert(
        fc.property(validExpenseArb, todayArb, (input, today) => {
          const result = validateExpenseCreation(input, today);
          
          if (!result.ok) {
            return false;
          }
          
          // All fields must be preserved
          return (
            result.value.vehicleId === input.vehicleId &&
            result.value.category === input.category &&
            result.value.cost === input.cost &&
            result.value.date === input.date
          );
        }),
        { numRuns: 100 }
      );
    });

    it("Property: First validation error is returned when multiple fields are invalid", () => {
      // **Validates: Requirements 8.4**
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.constantFrom("toll", "maintenance charge", "other"),
          invalidCostArb,
          futureDateArb,
          todayArb,
          (vehicleId, category, cost, date, today) => {
            const input: CreateExpenseInput = { vehicleId, category, cost, date };
            const result = validateExpenseCreation(input, today);
            
            // Should fail (cost is checked first)
            return !result.ok && result.error === "Expense cost must be greater than or equal to 0";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Expense accepts all valid category values", () => {
      // **Validates: Requirements 8.3**
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.constantFrom("toll", "maintenance charge", "other", "custom category"),
          validCostArb,
          pastDateArb,
          todayArb,
          (vehicleId, category, cost, date, today) => {
            const input: CreateExpenseInput = { vehicleId, category, cost, date };
            const result = validateExpenseCreation(input, today);
            
            return result.ok === true && result.value.category === category;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 25: Only positive maintenance costs contribute to operational cost,
  // and out-of-range costs are rejected
  // **Validates: Requirements 7.5, 7.6, 7.8**
  // ============================================================================

  describe("Property 25: Maintenance Cost Validation", () => {
    it("Property: Valid maintenance cost (0 <= cost <= 999,999,999.99) is always accepted", () => {
      // **Validates: Requirements 7.5**
      fc.assert(
        fc.property(validMaintenanceCostArb, (cost) => {
          const result = validateMaintenanceCostUpdate(cost);
          
          // Valid cost must always succeed
          return result.ok === true && result.value === cost;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Maintenance cost < 0 is always rejected", () => {
      // **Validates: Requirements 7.8**
      fc.assert(
        fc.property(
          fc.double({ max: -0.01, min: -1_000_000, noNaN: true, noDefaultInfinity: true }),
          (cost) => {
            const result = validateMaintenanceCostUpdate(cost);
            
            return !result.ok && result.error === "Maintenance cost must be greater than or equal to 0";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Maintenance cost > 999,999,999.99 is always rejected", () => {
      // **Validates: Requirements 7.8**
      fc.assert(
        fc.property(
          fc.double({ min: 1_000_000_000, max: 2_000_000_000, noNaN: true, noDefaultInfinity: true }),
          (cost) => {
            const result = validateMaintenanceCostUpdate(cost);
            
            return !result.ok && result.error === "Maintenance cost must not exceed 999,999,999.99";
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Maintenance cost = 0 is accepted but does NOT contribute to operational cost", () => {
      // **Validates: Requirements 7.6**
      const cost = 0;
      const validationResult = validateMaintenanceCostUpdate(cost);
      const shouldContribute = shouldContributeToOperationalCost(cost);
      
      expect(validationResult.ok).toBe(true);
      expect(shouldContribute).toBe(false);
    });

    it("Property: Maintenance cost > 0 is accepted and DOES contribute to operational cost", () => {
      // **Validates: Requirements 7.5, 7.6**
      fc.assert(
        fc.property(contributingMaintenanceCostArb, (cost) => {
          const validationResult = validateMaintenanceCostUpdate(cost);
          const shouldContribute = shouldContributeToOperationalCost(cost);
          
          return validationResult.ok === true && shouldContribute === true;
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Only strictly positive costs contribute to operational cost", () => {
      // **Validates: Requirements 7.6**
      fc.assert(
        fc.property(validMaintenanceCostArb, (cost) => {
          const shouldContribute = shouldContributeToOperationalCost(cost);
          
          // Should contribute if and only if cost > 0
          return shouldContribute === (cost > 0);
        }),
        { numRuns: 100 }
      );
    });

    it("Property: Maintenance cost validation is deterministic", () => {
      // **Validates: Requirements 7.5, 7.8**
      fc.assert(
        fc.property(
          fc.double({ min: -1_000_000, max: 2_000_000_000, noNaN: true, noDefaultInfinity: true }),
          (cost) => {
            const result1 = validateMaintenanceCostUpdate(cost);
            const result2 = validateMaintenanceCostUpdate(cost);
            
            // Both results must have same ok status
            if (result1.ok !== result2.ok) {
              return false;
            }
            
            if (!result1.ok && !result2.ok) {
              return result1.error === result2.error;
            }
            
            if (result1.ok && result2.ok) {
              return result1.value === result2.value;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Boundary values (0 and 999,999,999.99) are accepted", () => {
      // **Validates: Requirements 7.5**
      const minCost = 0;
      const maxCost = 999_999_999.99;
      
      const minResult = validateMaintenanceCostUpdate(minCost);
      const maxResult = validateMaintenanceCostUpdate(maxCost);
      
      expect(minResult.ok).toBe(true);
      expect(maxResult.ok).toBe(true);
      
      if (minResult.ok) {
        expect(minResult.value).toBe(minCost);
      }
      if (maxResult.ok) {
        expect(maxResult.value).toBe(maxCost);
      }
    });

    it("Property: Out-of-range costs are always rejected with appropriate error", () => {
      // **Validates: Requirements 7.8**
      fc.assert(
        fc.property(invalidMaintenanceCostArb, (cost) => {
          const result = validateMaintenanceCostUpdate(cost);
          
          if (result.ok) {
            return false; // Should have failed
          }
          
          // Check correct error message based on value
          if (cost < 0) {
            return result.error === "Maintenance cost must be greater than or equal to 0";
          } else {
            return result.error === "Maintenance cost must not exceed 999,999,999.99";
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Additional Cross-Property Tests
  // ============================================================================

  describe("Cross-Property Tests", () => {
    it("Property: Date validation is consistent across fuel logs and expenses", () => {
      // **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.date(),
          todayArb,
          (vehicleId, date, today) => {
            const fuelLogInput: CreateFuelLogInput = {
              vehicleId,
              liters: 10,
              cost: 50,
              date,
            };
            
            const expenseInput: CreateExpenseInput = {
              vehicleId,
              category: "toll",
              cost: 50,
              date,
            };
            
            const fuelResult = validateFuelLogCreation(fuelLogInput, today);
            const expenseResult = validateExpenseCreation(expenseInput, today);
            
            // Both should have same success/failure for date validation
            // (ignoring other field validation)
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isFutureDate = dateOnly > todayOnly;
            
            if (isFutureDate) {
              return !fuelResult.ok && !expenseResult.ok &&
                     fuelResult.error === "Date must not be in the future" &&
                     expenseResult.error === "Date must not be in the future";
            }
            
            return true; // Other validations may differ
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Zero cost is valid for both fuel logs and expenses", () => {
      // **Validates: Requirements 8.1, 8.3**
      fc.assert(
        fc.property(
          fc.uuid(),
          pastDateArb,
          todayArb,
          (vehicleId, date, today) => {
            const fuelLogInput: CreateFuelLogInput = {
              vehicleId,
              liters: 1,
              cost: 0,
              date,
            };
            
            const expenseInput: CreateExpenseInput = {
              vehicleId,
              category: "toll",
              cost: 0,
              date,
            };
            
            const fuelResult = validateFuelLogCreation(fuelLogInput, today);
            const expenseResult = validateExpenseCreation(expenseInput, today);
            
            return fuelResult.ok === true && expenseResult.ok === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("Property: Validation functions are pure (no side effects)", () => {
      // **Validates: All requirements - validates pure function property**
      const vehicleId = "test-vehicle-id";
      const date = new Date("2024-01-01");
      const today = new Date();
      
      const fuelLogInput: CreateFuelLogInput = {
        vehicleId,
        liters: 10,
        cost: 50,
        date,
      };
      
      const expenseInput: CreateExpenseInput = {
        vehicleId,
        category: "toll",
        cost: 25,
        date,
      };
      
      const cost = 1000;
      
      // Call functions multiple times
      const fuelResult1 = validateFuelLogCreation(fuelLogInput, today);
      const fuelResult2 = validateFuelLogCreation(fuelLogInput, today);
      
      const expenseResult1 = validateExpenseCreation(expenseInput, today);
      const expenseResult2 = validateExpenseCreation(expenseInput, today);
      
      const maintenanceResult1 = validateMaintenanceCostUpdate(cost);
      const maintenanceResult2 = validateMaintenanceCostUpdate(cost);
      
      // Inputs should be unchanged
      expect(fuelLogInput.liters).toBe(10);
      expect(fuelLogInput.cost).toBe(50);
      expect(expenseInput.cost).toBe(25);
      
      // Results should be identical (deterministic)
      expect(JSON.stringify(fuelResult1)).toBe(JSON.stringify(fuelResult2));
      expect(JSON.stringify(expenseResult1)).toBe(JSON.stringify(expenseResult2));
      expect(JSON.stringify(maintenanceResult1)).toBe(JSON.stringify(maintenanceResult2));
    });
  });
});
