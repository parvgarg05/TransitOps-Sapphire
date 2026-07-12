# Task 11.1 Implementation: Expense Service and API Routes

## Overview
This document describes the implementation of Task 11.1, which includes the expense service layer and API routes for fuel logs, expenses, and operational cost computation.

## Requirements Implemented
- **8.1**: Fuel log valid iff liters > 0, cost ≥ 0, date ≤ today
- **8.2**: Reject fuel log with invalid fields (field-specific errors)
- **8.3**: Expense valid iff cost ≥ 0, date ≤ today
- **8.4**: Reject expense with invalid fields (field-specific errors)
- **8.5**: Operational Cost = fuel cost + maintenance cost
- **8.6**: Recomputed on read from live rows (within 2 seconds)

## Files Created

### 1. Service Layer: `services/expenseService.ts`
The service layer provides three main functions:

#### `createFuelLog(vehicleId, liters, cost, date)`
- Creates a validated fuel log for a vehicle
- Uses `validateFuelLogCreation` from `domain/validators/expense.ts`
- Returns field-specific validation errors (Req 8.2)
- Checks vehicle existence before creation

#### `createExpense(vehicleId, category, cost, date)`
- Creates a validated expense for a vehicle
- Uses `validateExpenseCreation` from `domain/validators/expense.ts`
- Returns field-specific validation errors (Req 8.4)
- Checks vehicle existence before creation

#### `getOperationalCost(vehicleId)`
- Computes total fuel cost + qualifying maintenance cost from live data
- Uses `operationalCost` function from `domain/analytics.ts`
- Fetches live fuel logs and maintenance logs from database
- Only includes maintenance costs > 0 (Req 7.6)
- Returns cost rounded to 2 decimal places (Req 8.5, 8.6)

### 2. API Routes

#### `POST /api/fuel`
**Location**: `app/api/fuel/route.ts`

**Request Body**:
```json
{
  "vehicleId": "string",
  "liters": "number",
  "cost": "number",
  "date": "string (ISO 8601)"
}
```

**Response** (Success - 201):
```json
{
  "success": true,
  "data": {
    "id": "string",
    "vehicleId": "string",
    "liters": "number",
    "cost": "number",
    "date": "Date",
    "createdAt": "Date"
  }
}
```

**Response** (Error - 400):
```json
{
  "success": false,
  "error": "Field-specific error message"
}
```

#### `POST /api/expenses`
**Location**: `app/api/expenses/route.ts`

**Request Body**:
```json
{
  "vehicleId": "string",
  "category": "string (toll, maintenance charge, other)",
  "cost": "number",
  "date": "string (ISO 8601)"
}
```

**Response** (Success - 201):
```json
{
  "success": true,
  "data": {
    "id": "string",
    "vehicleId": "string",
    "category": "string",
    "cost": "number",
    "date": "Date",
    "createdAt": "Date"
  }
}
```

**Response** (Error - 400):
```json
{
  "success": false,
  "error": "Field-specific error message"
}
```

#### `GET /api/vehicles/[id]/operational-cost`
**Location**: `app/api/vehicles/[id]/operational-cost/route.ts`

**Response** (Success - 200):
```json
{
  "success": true,
  "data": {
    "vehicleId": "string",
    "operationalCost": "number (rounded to 2 decimals)"
  }
}
```

**Response** (Error - 404):
```json
{
  "success": false,
  "error": "Vehicle not found"
}
```

### 3. Test Suite: `services/__tests__/expenseService.test.ts`
Comprehensive test suite covering:
- Valid fuel log creation
- Fuel log validation errors (liters ≤ 0, cost < 0, future date)
- Non-existent vehicle handling
- Valid expense creation
- Expense validation errors (cost < 0, future date)
- Operational cost computation from live data
- Maintenance cost filtering (only > 0 contribute)
- Empty operational cost (no logs)

**Test Results**: ✅ 13/13 tests passed

## Design Decisions

1. **Validation at Service Layer**: All validation is performed using domain validators before persistence, ensuring data integrity and providing field-specific error messages.

2. **Live Data Computation**: Operational cost is computed on-demand from live database rows (Req 8.6), ensuring accuracy within 2 seconds.

3. **Consistent Error Handling**: All functions return `Result<T>` type for consistent error handling across the application.

4. **Domain Type Mapping**: Prisma types are mapped to domain types to maintain separation of concerns and enable type-safe operations.

5. **Vehicle Existence Check**: Both fuel log and expense creation verify vehicle existence before persistence to prevent orphaned records.

## Usage Examples

### Create a Fuel Log
```bash
curl -X POST http://localhost:3000/api/fuel \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "vehicle-id-here",
    "liters": 50,
    "cost": 100,
    "date": "2024-01-15"
  }'
```

### Create an Expense
```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "vehicle-id-here",
    "category": "toll",
    "cost": 25,
    "date": "2024-01-15"
  }'
```

### Get Operational Cost
```bash
curl http://localhost:3000/api/vehicles/vehicle-id-here/operational-cost
```

## Dependencies
- `domain/validators/expense.ts`: Fuel log and expense validation functions
- `domain/analytics.ts`: Operational cost computation function
- `domain/types.ts`: Domain entity types (FuelLog, Expense, MaintenanceLog)
- `lib/db.ts`: Prisma client singleton

## Testing
Run the test suite:
```bash
npm test -- services/__tests__/expenseService.test.ts
```

## Next Steps
- Integrate with authentication middleware for secure access
- Add rate limiting for API endpoints
- Implement pagination for operational cost history
- Add filtering/date range support for cost computation
