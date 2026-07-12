/**
 * Driver Service Tests
 * 
 * Integration tests for driver service CRUD operations.
 * 
 * Requirements: 4.1, 4.3, 4.4, 4.7, 4.8
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../lib/db';
import {
  listDrivers,
  createDriver,
  updateDriver,
  getDriverById,
} from '../driverService';

describe('Driver Service', () => {
  // Clean up test data after all tests
  afterAll(async () => {
    await prisma.driver.deleteMany({
      where: {
        licenseNumber: {
          startsWith: 'TEST_',
        },
      },
    });
  });

  // Clean up before each test to ensure isolation
  beforeEach(async () => {
    await prisma.driver.deleteMany({
      where: {
        licenseNumber: {
          startsWith: 'TEST_',
        },
      },
    });
  });

  describe('createDriver', () => {
    it('should create a driver with status Available', async () => {
      // Use a date far in the future to avoid timezone issues
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      
      const input = {
        name: 'John Doe',
        licenseNumber: 'TEST_LIC123',
        licenseCategory: 'Class A',
        licenseExpiryDate: futureDate,
        contactNumber: '+1234567890',
        safetyScore: 95,
      };

      const result = await createDriver(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('John Doe');
        expect(result.value.licenseNumber).toBe('TEST_LIC123');
        expect(result.value.status).toBe('Available');
        expect(result.value.isLicenseValid).toBe(true);
      }
    });

    it('should reject duplicate license number', async () => {
      const input = {
        name: 'John Doe',
        licenseNumber: 'TEST_DUP123',
        licenseCategory: 'Class A',
        licenseExpiryDate: new Date('2025-12-31'),
        contactNumber: '+1234567890',
        safetyScore: 95,
      };

      // Create first driver
      const result1 = await createDriver(input);
      expect(result1.ok).toBe(true);

      // Try to create duplicate
      const result2 = await createDriver(input);
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error).toBe('License number already exists');
      }
    });

    it('should reject invalid safety score', async () => {
      const input = {
        name: 'Jane Doe',
        licenseNumber: 'TEST_INVALID',
        licenseCategory: 'Class B',
        licenseExpiryDate: new Date('2025-12-31'),
        contactNumber: '+1234567890',
        safetyScore: 150, // Invalid: > 100
      };

      const result = await createDriver(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Safety score');
      }
    });
  });

  describe('listDrivers', () => {
    it('should return drivers with license validity flags', async () => {
      // Create test driver with expired license (far in the past)
      const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      
      await createDriver({
        name: 'Expired License Driver',
        licenseNumber: 'TEST_EXPIRED',
        licenseCategory: 'Class C',
        licenseExpiryDate: pastDate,
        contactNumber: '+1234567890',
        safetyScore: 80,
      });

      // Create test driver with valid license (far in the future)
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      
      await createDriver({
        name: 'Valid License Driver',
        licenseNumber: 'TEST_VALID',
        licenseCategory: 'Class A',
        licenseExpiryDate: futureDate,
        contactNumber: '+0987654321',
        safetyScore: 90,
      });

      const drivers = await listDrivers();

      const expiredDriver = drivers.find((d) => d.licenseNumber === 'TEST_EXPIRED');
      const validDriver = drivers.find((d) => d.licenseNumber === 'TEST_VALID');

      expect(expiredDriver?.isLicenseValid).toBe(false);
      expect(validDriver?.isLicenseValid).toBe(true);
    });
  });

  describe('updateDriver', () => {
    it('should update driver fields', async () => {
      // Create initial driver
      const createResult = await createDriver({
        name: 'Update Test Driver',
        licenseNumber: 'TEST_UPDATE',
        licenseCategory: 'Class A',
        licenseExpiryDate: new Date('2025-12-31'),
        contactNumber: '+1111111111',
        safetyScore: 70,
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const driverId = createResult.value.id;

      // Update driver
      const updateResult = await updateDriver(driverId, {
        name: 'Updated Name',
        safetyScore: 85,
      });

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.value.name).toBe('Updated Name');
        expect(updateResult.value.safetyScore).toBe(85);
        expect(updateResult.value.licenseNumber).toBe('TEST_UPDATE'); // Unchanged
      }
    });

    it('should reject invalid field values', async () => {
      // Create initial driver
      const createResult = await createDriver({
        name: 'Validation Test Driver',
        licenseNumber: 'TEST_VALIDATION',
        licenseCategory: 'Class B',
        licenseExpiryDate: new Date('2025-12-31'),
        contactNumber: '+2222222222',
        safetyScore: 75,
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const driverId = createResult.value.id;

      // Try to update with invalid safety score
      const updateResult = await updateDriver(driverId, {
        safetyScore: -10, // Invalid: < 0
      });

      expect(updateResult.ok).toBe(false);
      if (!updateResult.ok) {
        expect(updateResult.error).toContain('Safety score');
      }
    });

    it('should return error for non-existent driver', async () => {
      const result = await updateDriver('non-existent-id', {
        name: 'Updated Name',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Driver not found');
      }
    });
  });

  describe('getDriverById', () => {
    it('should retrieve a driver with license validity flag', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      
      const createResult = await createDriver({
        name: 'Get Test Driver',
        licenseNumber: 'TEST_GET',
        licenseCategory: 'Class A',
        licenseExpiryDate: futureDate,
        contactNumber: '+3333333333',
        safetyScore: 88,
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const driverId = createResult.value.id;
      const getResult = await getDriverById(driverId);

      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value.id).toBe(driverId);
        expect(getResult.value.name).toBe('Get Test Driver');
        expect(getResult.value.isLicenseValid).toBe(true);
      }
    });

    it('should return error for non-existent driver', async () => {
      const result = await getDriverById('non-existent-id');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Driver not found');
      }
    });
  });
});
