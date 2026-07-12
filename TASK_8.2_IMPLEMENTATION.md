# Task 8.2: Transactional Trip Transitions Implementation

## Overview

This document describes the implementation of task 8.2, which wires the trip state machine to API endpoints and implements transactional updates for trip lifecycle transitions.

## Requirements Addressed

- **6.2**: Dispatch transition (Draft → Dispatched, Vehicle & Driver → On Trip)
- **6.3**: Complete transition (Dispatched → Completed, Vehicle & Driver → Available)
- **6.4**: Cancel transition (Dispatched → Cancelled, Vehicle & Driver → Available)
- **6.5**: Update vehicle odometer on completion
- **6.6**: Reject invalid state transitions
- **6.7**: Validate odometer and fuel consumed values

## Implementation Details

### 1. Service Layer Functions (`services/tripService.ts`)

Three new functions were added to the trip service, each implementing a state transition with full transactional integrity:

#### `dispatchTrip(tripId: string): Promise<TripTransitionResult>`

**Purpose**: Transition a Draft trip to Dispatched status.

**Behavior**:
- Fetches the trip with related vehicle and driver
- Validates the transition using the domain state machine
- Atomically updates all three entities in a single transaction:
  - Trip status: Draft → Dispatched
  - Vehicle status: Available → On Trip
  - Driver status: Available → On Trip

**Error Cases**:
- Trip not found (404)
- Trip is not in Draft status (400)

**Requirements**: 6.2, 6.6

---

#### `completeTrip(tripId: string, finalOdometer: number, fuelConsumed: number): Promise<TripTransitionResult>`

**Purpose**: Transition a Dispatched trip to Completed status with validation.

**Behavior**:
- Fetches the trip with related vehicle and driver
- Validates the transition and input values using the domain state machine:
  - `finalOdometer >= currentVehicleOdometer`
  - `fuelConsumed >= 0`
- Atomically updates all three entities in a single transaction:
  - Trip status: Dispatched → Completed
  - Trip final values: finalOdometer and fuelConsumed
  - Vehicle status: On Trip → Available
  - Vehicle odometer: updated to finalOdometer
  - Driver status: On Trip → Available

**Error Cases**:
- Trip not found (404)
- Trip is not in Dispatched status (400)
- Final odometer less than current odometer (400)
- Fuel consumed is negative (400)

**Requirements**: 6.3, 6.5, 6.6, 6.7

---

#### `cancelTrip(tripId: string): Promise<TripTransitionResult>`

**Purpose**: Transition a Dispatched trip to Cancelled status.

**Behavior**:
- Fetches the trip with related vehicle and driver
- Validates the transition using the domain state machine
- Atomically updates all three entities in a single transaction:
  - Trip status: Dispatched → Cancelled
  - Vehicle status: On Trip → Available
  - Driver status: On Trip → Available

**Error Cases**:
- Trip not found (404)
- Trip is not in Dispatched status (400)

**Requirements**: 6.4, 6.6

---

### 2. API Routes

Three new API endpoints were created following Next.js 13+ app directory conventions:

#### `POST /api/trips/:id/dispatch`
- **File**: `app/api/trips/[id]/dispatch/route.ts`
- **Handler**: Calls `dispatchTrip(id)`
- **Response**:
  - 200: Success with updated trip
  - 400: Invalid state transition
  - 404: Trip not found
  - 500: Server error

#### `POST /api/trips/:id/complete`
- **File**: `app/api/trips/[id]/complete/route.ts`
- **Handler**: Calls `completeTrip(id, finalOdometer, fuelConsumed)`
- **Request Body**:
  ```json
  {
    "finalOdometer": number,
    "fuelConsumed": number
  }
  ```
- **Response**:
  - 200: Success with updated trip
  - 400: Invalid state transition or validation error
  - 404: Trip not found
  - 500: Server error

#### `POST /api/trips/:id/cancel`
- **File**: `app/api/trips/[id]/cancel/route.ts`
- **Handler**: Calls `cancelTrip(id)`
- **Response**:
  - 200: Success with updated trip
  - 400: Invalid state transition
  - 404: Trip not found
  - 500: Server error

---

## Key Design Decisions

### 1. **Transactional Integrity**

All three service functions use Prisma's `$transaction` API to ensure atomicity. This guarantees that:
- Either all three entities (Trip, Vehicle, Driver) are updated successfully
- Or none of them are updated (rollback on error)
- No partial state updates can occur

Example transaction structure:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.trip.update({ ... });
  await tx.vehicle.update({ ... });
  await tx.driver.update({ ... });
  return trip;
});
```

### 2. **Domain-Driven Validation**

All validation logic is delegated to the domain state machine (`domain/tripStateMachine.ts`):
- Service layer converts Prisma entities to domain types
- Calls state machine functions for validation and transition computation
- State machine returns the next state for all entities or an error
- Service layer applies the computed state changes

This ensures:
- Pure, testable business logic in the domain layer
- Consistent validation across all callers
- Clear separation of concerns

### 3. **Status Mapping**

The implementation includes mapping between domain types and Prisma enums:
- **Domain types**: `"Draft"`, `"Dispatched"`, `"Completed"`, `"Cancelled"`
- **Prisma enums**: `"DRAFT"`, `"DISPATCHED"`, `"COMPLETED"`, `"CANCELLED"`

This mapping is necessary because:
- Domain layer uses human-readable string literals
- Database uses uppercase enum values
- The service layer bridges these two representations

### 4. **Error Handling**

Each function follows a consistent error handling pattern:
1. Try-catch for unexpected errors (500)
2. Explicit "not found" checks (404)
3. Domain validation errors (400)
4. Descriptive error messages for debugging

---

## Files Created/Modified

### Created:
1. `app/api/trips/[id]/dispatch/route.ts` - Dispatch endpoint
2. `app/api/trips/[id]/complete/route.ts` - Complete endpoint
3. `app/api/trips/[id]/cancel/route.ts` - Cancel endpoint

### Modified:
1. `services/tripService.ts` - Added three transactional functions:
   - `dispatchTrip()`
   - `completeTrip()`
   - `cancelTrip()`

---

## Testing Recommendations

### Unit Tests (Service Layer)
- Test each transition function with valid inputs
- Test guard conditions (invalid status transitions)
- Test validation (odometer, fuel consumed)
- Mock Prisma client to verify transaction structure

### Integration Tests (API Layer)
- Test each endpoint with valid requests
- Test 404 responses (non-existent trip IDs)
- Test 400 responses (invalid state transitions)
- Test 400 responses (validation errors for complete)
- Verify database state after successful transitions
- Verify rollback behavior on errors

### Example Test Cases:

**Dispatch**:
- ✓ Dispatch a Draft trip
- ✗ Dispatch a Dispatched trip (already dispatched)
- ✗ Dispatch a Completed trip
- ✗ Dispatch a non-existent trip

**Complete**:
- ✓ Complete a Dispatched trip with valid values
- ✗ Complete a Draft trip
- ✗ Complete with finalOdometer < currentOdometer
- ✗ Complete with fuelConsumed < 0
- ✗ Complete a non-existent trip

**Cancel**:
- ✓ Cancel a Dispatched trip
- ✗ Cancel a Draft trip
- ✗ Cancel a Completed trip
- ✗ Cancel a non-existent trip

---

## Usage Examples

### Dispatch a Trip
```bash
curl -X POST http://localhost:3000/api/trips/cm5abc123/dispatch
```

Response (200):
```json
{
  "trip": {
    "id": "cm5abc123",
    "status": "Dispatched",
    "vehicleId": "v123",
    "driverId": "d456",
    ...
  }
}
```

### Complete a Trip
```bash
curl -X POST http://localhost:3000/api/trips/cm5abc123/complete \
  -H "Content-Type: application/json" \
  -d '{
    "finalOdometer": 12500.5,
    "fuelConsumed": 45.2
  }'
```

Response (200):
```json
{
  "trip": {
    "id": "cm5abc123",
    "status": "Completed",
    "finalOdometer": 12500.5,
    "fuelConsumed": 45.2,
    ...
  }
}
```

### Cancel a Trip
```bash
curl -X POST http://localhost:3000/api/trips/cm5abc123/cancel
```

Response (200):
```json
{
  "trip": {
    "id": "cm5abc123",
    "status": "Cancelled",
    ...
  }
}
```

---

## Verification Checklist

- [x] Service functions delegate validation to domain state machine
- [x] All updates are wrapped in Prisma transactions
- [x] Trip, Vehicle, and Driver are all updated atomically
- [x] Vehicle odometer is updated on completion
- [x] API routes follow Next.js 13+ conventions
- [x] Error responses include descriptive messages
- [x] All code passes TypeScript compilation
- [x] Implementation matches requirements 6.2-6.7

---

## Dependencies

- `@prisma/client` - Database ORM with transaction support
- `next` - Next.js framework for API routes
- `domain/tripStateMachine.ts` - Pure state transition logic
- `domain/types.ts` - Domain type definitions
- `lib/db.ts` - Prisma client instance

---

## Notes

1. **Transaction Isolation**: Prisma uses database-level transactions, ensuring ACID properties.

2. **Idempotency**: These operations are NOT idempotent by design. Dispatching a Dispatched trip will fail. For idempotency, the client should check the current status first.

3. **Optimistic Concurrency**: No explicit locking is implemented. If two requests try to transition the same trip simultaneously, one will succeed and one will fail with a validation error.

4. **Audit Trail**: The current implementation does not create audit logs. Consider adding this in a future enhancement.

5. **State Machine Coverage**: All valid transitions from the domain state machine are now wired to API endpoints. Invalid transitions are rejected with clear error messages.

---

## Future Enhancements

1. Add audit logging for state transitions
2. Implement optimistic locking to prevent concurrent modifications
3. Add webhook notifications for trip status changes
4. Create real-time updates via WebSockets
5. Add batch operation endpoints (e.g., dispatch multiple trips)
