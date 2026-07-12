# Prisma Schema Implementation - Task 1.3

## Summary

The Prisma schema has been successfully defined with all required models for TransitOps. This document explains what was implemented and how to run the initial migration.

## What Was Implemented

### ✅ All Required Models

1. **Role** - RBAC roles (Fleet Manager, Driver, Safety Officer, Financial Analyst)
2. **User** - Authentication with session management fields
3. **Vehicle** - Fleet assets with lifecycle tracking
4. **Driver** - Driver profiles with license and safety information
5. **Trip** - Trip management with dispatch tracking
6. **MaintenanceLog** - Maintenance workflow records
7. **FuelLog** - Fuel consumption tracking
8. **Expense** - Operational expense tracking
9. **VehicleDocument** - (BONUS) Document attachment capability

### ✅ Required Constraints

- **UNIQUE constraint** on `Vehicle.registrationNumber` (Requirement 3.2)
- **UNIQUE constraint** on `Driver.licenseNumber` (Requirement 4.8)
- Proper foreign key relationships between all tables
- Appropriate indexes on frequently queried fields

### ✅ Decimal Types for Precision

All currency and measurement fields use PostgreSQL `Decimal` type to avoid floating-point errors:

| Field | Type | Range/Purpose |
|-------|------|---------------|
| `Vehicle.maxLoadCapacity` | Decimal(10,2) | 0 < x ≤ 100,000 kg |
| `Vehicle.odometer` | Decimal(12,2) | 0 ≤ x ≤ 10,000,000 km |
| `Vehicle.acquisitionCost` | Decimal(12,2) | ≥ 0 (currency) |
| `Vehicle.revenue` | Decimal(12,2) | For ROI calculation |
| `Driver.safetyScore` | Decimal(5,2) | 0 ≤ x ≤ 100 |
| `Trip.cargoWeight` | Decimal(10,2) | > 0 kg |
| `Trip.plannedDistance` | Decimal(10,2) | > 0 km |
| `Trip.finalOdometer` | Decimal(12,2) | Nullable until completed |
| `Trip.fuelConsumed` | Decimal(10,2) | ≥ 0 liters |
| `MaintenanceLog.cost` | Decimal(12,2) | 0 ≤ x ≤ 999,999,999.99 |
| `FuelLog.liters` | Decimal(10,2) | > 0 |
| `FuelLog.cost` | Decimal(10,2) | ≥ 0 |
| `Expense.cost` | Decimal(12,2) | ≥ 0 |

### ✅ Status Enums

All status fields use PostgreSQL enums for type safety:

- `RoleType`: FLEET_MANAGER, DRIVER, SAFETY_OFFICER, FINANCIAL_ANALYST
- `VehicleStatus`: AVAILABLE, ON_TRIP, IN_SHOP, RETIRED
- `DriverStatus`: AVAILABLE, ON_TRIP, OFF_DUTY, SUSPENDED
- `TripStatus`: DRAFT, DISPATCHED, COMPLETED, CANCELLED

## Database Configuration

The database connection is configured in:
- `prisma.config.ts` - Migration and datasource configuration (Prisma 7 format)
- `.env` - Database URL environment variable

Current configuration:
```
DATABASE_URL="postgresql://transitops:transitops_dev_password@localhost:5432/transitops?schema=public"
```

## Running the Initial Migration

### Prerequisites

1. **Docker Desktop must be running** (or PostgreSQL must be running on localhost:5432)

### Steps to Execute Migration

1. **Start the PostgreSQL database:**
   ```bash
   cd /Users/krrishrawat/Desktop/TransitOps/TransitOps-Sapphire
   docker-compose up -d
   ```

2. **Wait for PostgreSQL to be ready** (about 5-10 seconds)

3. **Run the Prisma migration:**
   ```bash
   npx prisma migrate dev --name initial_schema
   ```

4. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

### Expected Migration Output

The migration will create all tables with proper constraints:
- 9 tables (roles, users, vehicles, drivers, trips, maintenance_logs, fuel_logs, expenses, vehicle_documents)
- 4 enum types (RoleType, VehicleStatus, DriverStatus, TripStatus)
- UNIQUE constraints on registrationNumber and licenseNumber
- Foreign key constraints for all relationships
- Indexes on frequently queried fields

## Verification

After running the migration, you can verify the schema:

```bash
# View the database schema in Prisma Studio
npx prisma studio

# Or check the generated migration SQL
cat prisma/migrations/*/migration.sql
```

## Next Steps

After successful migration:
1. ✅ Schema is ready for application development
2. ✅ Domain layer can use Prisma Client types
3. ✅ Service layer can implement CRUD operations
4. ✅ Can proceed to Task 1.4 (Seed initial data)

## Troubleshooting

### "Can't reach database server"
- Ensure Docker Desktop is running
- Run `docker ps` to verify the postgres container is running
- Check that port 5432 is not already in use

### "Database already exists"
- This is normal if you've run migrations before
- Prisma will apply the migration to the existing database

### Prisma Client generation fails
- Run `npx prisma generate` manually
- Ensure prisma-client-js is installed in dependencies

## Design Compliance

This implementation satisfies:
- **Requirement 3.2**: UNIQUE constraint on Vehicle.registrationNumber
- **Requirement 4.8**: UNIQUE constraint on Driver.licenseNumber
- **Design Document**: All models from the Entity Relationship Diagram
- **Design Document**: Decimal types for all currency and measurement fields
- **Design Document**: Proper enums for all status fields
- **Design Document**: Complete relationships between all entities

## Files Modified

- `prisma/schema.prisma` - Complete schema definition
- This README created for documentation

## Schema Highlights

### Unique Business Constraints
- Vehicle registration numbers are globally unique across the fleet
- Driver license numbers are globally unique across all drivers
- User emails are unique (max 254 characters per RFC 5321)

### Audit Fields
- All models include `createdAt` timestamp
- User has `lastActivityAt` for session timeout (Requirement 1.7)
- MaintenanceLog tracks both `openedAt` and `closedAt`

### Nullable Fields
- Optional fields like `Vehicle.region` (for dashboard filtering)
- Completion fields like `Trip.finalOdometer` and `Trip.fuelConsumed`
- Session management fields like `User.lockedUntil` and `User.lastActivityAt`
- `MaintenanceLog.closedAt` (null while active)

### Default Values
- Status fields default to the "available" state
- `User.failedAttempts` defaults to 0 (for lockout logic)
- `Vehicle.revenue` defaults to 0
- `MaintenanceLog.closed` defaults to false (active)
- `MaintenanceLog.cost` defaults to 0

This schema provides a solid, type-safe foundation for the entire TransitOps application!
