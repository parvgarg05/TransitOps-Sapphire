/**
 * Expense Service Tests
 * 
 * Tests for fuel log creation, expense creation, and operational cost computation.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFuelLog, createExpense, getOperationalCost } from '../expenseService';
import { prisma } from '../../lib/db';

describe('Expense Service', () => {
  let testVehicleId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.fuelLog.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.maintenanceLog.deleteMany({});
    await prisma.vehicle.deleteMany({});

    // Create a test vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: 'TEST-EXPENSE-001',
        name: 'Test Vehicle',
        type: 'Truck',
        maxLoadCapacity: 5000,
        odometer: 10000,
        acquisitionCost: 50000,
        status: 'AVAILABLE',
      },
    });
    testVehicleId = vehicle.id;
  });

  describe('createFuelLog', () => {
    it('should create a valid fuel log', async () => {
      const today = new Date();
      const result = await createFuelLog(testVehicleId, 50, 100, today);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.vehicleId).toBe(testVehicleId);
        expect(result.value.liters).toBe(50);
        expect(result.value.cost).toBe(100);
      }
    });

    it('should reject fuel log with liters <= 0 (Req 8.2)', async () => {
      const today = new Date();
      const result = await createFuelLog(testVehicleId, 0, 100, today);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('greater than 0');
      }
    });

    it('should reject fuel log with cost < 0 (Req 8.2)', async () => {
      const today = new Date();
      const result = await createFuelLog(testVehicleId, 50, -10, today);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('greater than or equal to 0');
      }
    });

    it('should reject fuel log with future date (Req 8.2)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const result = await createFuelLog(testVehicleId, 50, 100, futureDate);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('future');
      }
    });

    it('should reject fuel log for non-existent vehicle', async () => {
      const today = new Date();
      const result = await createFuelLog('non-existent-id', 50, 100, today);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Vehicle not found');
      }
    });
  });

  describe('createExpense', () => {
    it('should create a valid expense', async () => {
      const today = new Date();
      const result = await createExpense(testVehicleId, 'toll', 50, today);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.vehicleId).toBe(testVehicleId);
        expect(result.value.category).toBe('toll');
        expect(result.value.cost).toBe(50);
      }
    });

    it('should reject expense with cost < 0 (Req 8.4)', async () => {
      const today = new Date();
      const result = await createExpense(testVehicleId, 'toll', -10, today);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('greater than or equal to 0');
      }
    });

    it('should reject expense with future date (Req 8.4)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const result = await createExpense(testVehicleId, 'toll', 50, futureDate);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('future');
      }
    });

    it('should reject expense for non-existent vehicle', async () => {
      const today = new Date();
      const result = await createExpense('non-existent-id', 'toll', 50, today);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Vehicle not found');
      }
    });
  });

  describe('getOperationalCost', () => {
    it('should compute operational cost from fuel and maintenance (Req 8.5, 8.6)', async () => {
      // Create fuel logs
      const today = new Date();
      await createFuelLog(testVehicleId, 50, 100, today);
      await createFuelLog(testVehicleId, 30, 60, today);

      // Create maintenance logs
      await prisma.maintenanceLog.create({
        data: {
          vehicleId: testVehicleId,
          description: 'Oil change',
          cost: 50,
          closed: false,
        },
      });

      await prisma.maintenanceLog.create({
        data: {
          vehicleId: testVehicleId,
          description: 'Tire replacement',
          cost: 200,
          closed: false,
        },
      });

      const result = await getOperationalCost(testVehicleId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Fuel: 100 + 60 = 160, Maintenance: 50 + 200 = 250, Total = 410
        expect(result.value).toBe(410);
      }
    });

    it('should only include maintenance costs > 0 in operational cost (Req 7.6)', async () => {
      // Create fuel log
      const today = new Date();
      await createFuelLog(testVehicleId, 50, 100, today);

      // Create maintenance log with cost = 0
      await prisma.maintenanceLog.create({
        data: {
          vehicleId: testVehicleId,
          description: 'Inspection',
          cost: 0,
          closed: false,
        },
      });

      // Create maintenance log with cost > 0
      await prisma.maintenanceLog.create({
        data: {
          vehicleId: testVehicleId,
          description: 'Repair',
          cost: 150,
          closed: false,
        },
      });

      const result = await getOperationalCost(testVehicleId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Fuel: 100, Maintenance: 150 (0 cost excluded), Total = 250
        expect(result.value).toBe(250);
      }
    });

    it('should return 0 for vehicle with no fuel logs or maintenance', async () => {
      const result = await getOperationalCost(testVehicleId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(0);
      }
    });

    it('should return error for non-existent vehicle', async () => {
      const result = await getOperationalCost('non-existent-id');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Vehicle not found');
      }
    });
  });
});
