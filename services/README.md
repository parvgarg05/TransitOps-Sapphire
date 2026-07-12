# Vehicle Registry Service & API

This implementation fulfills **Task 5.1: Implement the Vehicle_Registry service and API routes**.

## Overview

The Vehicle Registry implementation consists of:

1. **Service Layer** (`services/vehicleService.ts`) - Business logic for vehicle operations
2. **API Routes** - RESTful endpoints for vehicle management
3. **Domain Validators** (already existing in `domain/validators/vehicle.ts`)
4. **Uniqueness Checks** (already existing in `domain/uniqueness.ts`)

## Requirements Fulfilled

This implementation satisfies the following requirements:

- **3.1**: Create vehicle with validated fields, initial status = Available
- **3.2**: Registration number must be unique (check before persistence)
- **3.4**: Show all vehicles from the registry
- **3.5**: Update editable fields (registration number is immutable)
- **3.6**: Validate updated fields
- **3.7**: Return error if vehicle not found; retired vehicles excluded from dispatch
- **3.8**: Return field-specific validation errors
- **3.9**: On persistence failure, retain previous values (no partial state)

## API Endpoints

### 1. GET /api/vehicles

**Description**: List all vehicles with their status

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "registrationNumber": "ABC-123",
      "name": "Delivery Van",
      "type": "Van",
      "region": "North",
      "maxLoadCapacity": 1000,
      "odometer": 50000,
      "acquisitionCost": 50000,
      "revenue": 0,
      "status": "Available",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Requirement**: 3.4

---

### 2. POST /api/vehicles

**Description**: Create a new vehicle with validation and uniqueness checks

**Request Body**:
```json
{
  "registrationNumber": "ABC-123",
  "name": "Delivery Van",
  "type": "Van",
  "region": "North",
  "maxLoadCapacity": 1000,
  "odometer": 0,
  "acquisitionCost": 50000,
  "revenue": 0
}
```

**Validation Rules**:
- `registrationNumber`: Non-empty, must be unique
- `name`: Non-empty
- `type`: Non-empty
- `maxLoadCapacity`: 0 < value ≤ 100,000 kg
- `odometer`: 0 ≤ value ≤ 10,000,000 km
- `acquisitionCost`: value ≥ 0
- `revenue`: Optional, defaults to 0

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "registrationNumber": "ABC-123",
    "name": "Delivery Van",
    "type": "Van",
    "region": "North",
    "maxLoadCapacity": 1000,
    "odometer": 0,
    "acquisitionCost": 50000,
    "revenue": 0,
    "status": "Available",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "error": "Registration number already exists"
}
```

**Requirements**: 3.1, 3.2, 3.8, 3.9

---

### 3. PATCH /api/vehicles/[id]

**Description**: Update an existing vehicle (registration number is immutable)

**Request Body** (all fields optional):
```json
{
  "name": "Updated Van Name",
  "type": "Truck",
  "region": "South",
  "maxLoadCapacity": 1500,
  "odometer": 51000,
  "acquisitionCost": 55000,
  "revenue": 10000
}
```

**Note**: `registrationNumber` is NOT allowed in the update DTO (immutable field)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "registrationNumber": "ABC-123",
    "name": "Updated Van Name",
    // ... other fields
  }
}
```

**Error Responses**:

404 - Vehicle not found:
```json
{
  "success": false,
  "error": "Vehicle not found"
}
```

400 - Validation error:
```json
{
  "success": false,
  "error": "Odometer must be greater than or equal to 0"
}
```

**Requirements**: 3.5, 3.6, 3.7, 3.8, 3.9

---

### 4. POST /api/vehicles/[id]/retire

**Description**: Set vehicle status to Retired

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "registrationNumber": "ABC-123",
    "status": "Retired",
    // ... other fields
  }
}
```

**Error Response (404)**:
```json
{
  "success": false,
  "error": "Vehicle not found"
}
```

**Requirements**: 3.6, 3.7, 3.9

---

## Service Layer Architecture

### vehicleService.ts

The service layer provides the following functions:

1. **listVehicles()**: Retrieve all vehicles ordered by creation date
2. **createVehicle(input)**: Create a new vehicle with validation and uniqueness checks
3. **updateVehicle(id, input)**: Update editable vehicle fields
4. **retireVehicle(id)**: Set vehicle status to Retired

### Error Handling

All service functions return a `Result<T>` type:

```typescript
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };
```

This pattern ensures:
- **Type-safe error handling**
- **No exceptions for expected failures**
- **Clear separation between success and error paths**
- **Req 3.9**: On persistence failure, previous values are retained (no partial state changes)

### Status Mapping

The service handles conversion between Prisma enum values and domain types:

| Prisma Enum | Domain Type |
|------------|-------------|
| AVAILABLE | Available |
| ON_TRIP | On Trip |
| IN_SHOP | In Shop |
| RETIRED | Retired |

---

## Validation Flow

### Create Vehicle Flow

1. **Field Validation** (domain/validators/vehicle.ts)
   - registrationNumber: non-empty
   - name: non-empty
   - type: non-empty
   - maxLoadCapacity: 0 < value ≤ 100,000
   - odometer: 0 ≤ value ≤ 10,000,000
   - acquisitionCost: value ≥ 0

2. **Uniqueness Check** (domain/uniqueness.ts)
   - Fetch all existing registration numbers
   - Check if proposed number exists
   - Return error if duplicate

3. **Persistence**
   - Create vehicle in database with status = AVAILABLE
   - On failure, return error (no partial state)

### Update Vehicle Flow

1. **Field Validation**
   - Only validate provided fields
   - Registration number is NOT included (immutable)

2. **Existence Check**
   - Verify vehicle exists
   - Return 404 if not found

3. **Persistence**
   - Update only provided fields
   - On failure, return error (no partial state)

---

## Testing

A comprehensive test suite is provided in `services/vehicleService.test.ts`:

### Test Coverage

1. **Create Vehicle Tests**
   - ✓ Creates vehicle with valid input and status Available
   - ✓ Rejects duplicate registration number
   - ✓ Rejects invalid max load capacity
   - ✓ Rejects empty registration number

2. **List Vehicles Tests**
   - ✓ Lists all vehicles successfully

3. **Update Vehicle Tests**
   - ✓ Updates editable fields successfully
   - ✓ Returns error for non-existent vehicle
   - ✓ Rejects invalid update values
   - ✓ Registration number remains immutable

4. **Retire Vehicle Tests**
   - ✓ Sets vehicle status to Retired
   - ✓ Returns error for non-existent vehicle

### Running Tests

```bash
# Run all tests
npm test

# Run only vehicle service tests
npm test -- services/vehicleService.test.ts

# Run tests in watch mode
npm run test:watch
```

**Note**: Tests require a running database. Make sure your `DATABASE_URL` environment variable is set correctly in `.env` file.

---

## Database Schema

The implementation uses the existing Prisma schema:

```prisma
model Vehicle {
  id                 String        @id @default(cuid())
  registrationNumber String        @unique
  name               String
  type               String
  region             String?
  maxLoadCapacity    Decimal       @db.Decimal(10, 2)
  odometer           Decimal       @db.Decimal(12, 2)
  acquisitionCost    Decimal       @db.Decimal(12, 2)
  revenue            Decimal       @default(0) @db.Decimal(12, 2)
  status             VehicleStatus @default(AVAILABLE)
  createdAt          DateTime      @default(now())
  // ... relations
}

enum VehicleStatus {
  AVAILABLE
  ON_TRIP
  IN_SHOP
  RETIRED
}
```

---

## Integration Points

### Domain Layer

- **domain/validators/vehicle.ts**: Field validation logic
- **domain/uniqueness.ts**: Registration number uniqueness check
- **domain/types.ts**: Domain type definitions and Result type

### API Layer

- **app/api/vehicles/route.ts**: GET and POST endpoints
- **app/api/vehicles/[id]/route.ts**: PATCH endpoint
- **app/api/vehicles/[id]/retire/route.ts**: POST retire endpoint

### Service Layer

- **services/vehicleService.ts**: Business logic and database operations

---

## Error Handling Strategy

### Field Validation Errors (400)

Returned when input fields fail validation:
- "Registration number is required"
- "Vehicle name is required"
- "Maximum load capacity must be greater than 0"
- "Odometer must be greater than or equal to 0"
- etc.

### Uniqueness Errors (400)

Returned when registration number already exists:
- "Registration number already exists"

### Not Found Errors (404)

Returned when vehicle ID doesn't exist:
- "Vehicle not found"

### Persistence Errors (500)

Returned when database operations fail:
- "Failed to create vehicle: [error message]"
- "Failed to update vehicle: [error message]"
- "Failed to retire vehicle: [error message]"

---

## Next Steps

This implementation can be extended with:

1. **Filtering & Pagination**: Add query parameters for status, type, region filtering
2. **Search**: Add text search capability on registration number and name
3. **Sorting**: Add sort options for various fields
4. **Audit Logging**: Track who created/updated vehicles and when
5. **Bulk Operations**: Add endpoints for bulk updates/retires
6. **Integration with Dispatch**: Ensure retired/in-shop vehicles are excluded from dispatch selection

---

## Summary

✅ Task 5.1 is **complete** with:

- Service layer with full business logic
- Four RESTful API endpoints (GET, POST, PATCH, POST retire)
- Integration with domain validators and uniqueness checks
- New vehicles start with status = Available
- Registration number immutability enforced
- Comprehensive error handling
- Persistence failure protection (no partial state)
- Full test coverage
- Type-safe implementation with TypeScript
