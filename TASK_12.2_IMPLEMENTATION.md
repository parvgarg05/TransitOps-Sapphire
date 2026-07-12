# Task 12.2: CSV Export Builder and Endpoint Implementation

## Overview

This document describes the implementation of Task 12.2, which provides CSV export functionality for TransitOps data. The implementation includes a pure domain function for building CSV strings and a REST API endpoint for exporting various data types.

## Requirements Addressed

- **Requirement 9.7**: CSV export produces one header row plus one row per record
- **Requirement 9.8**: Throw before offering a file if building fails (no partial file)

## Implementation Details

### 1. Domain Layer: `domain/csvExport.ts`

Created a pure function `buildCsvString<T>()` that:

- **Input**: 
  - `data: T[]` - Array of records to export
  - `headers: string[]` - Array of column header names (also used as keys to extract values)

- **Output**: `Result<string>` with either:
  - Success: `{ ok: true, value: "header1,header2\nval1,val2\n..." }`
  - Failure: `{ ok: false, error: "descriptive error message" }`

- **Validation**:
  - Headers array cannot be empty
  - Data array cannot be null/undefined
  - All records are processed (empty data results in header-only CSV)

- **CSV Generation**:
  - Builds complete CSV in memory (header + data rows)
  - Properly escapes CSV special characters (commas, quotes, newlines) per RFC 4180
  - Handles various data types:
    - `null`/`undefined` → empty string
    - `Date` objects → ISO string format
    - Objects/arrays → JSON string
    - Other types → string conversion

- **Error Handling**:
  - Returns `Result` type for composable error handling
  - Fails early with descriptive errors
  - No partial CSV generation on error (Requirement 9.8)

### 2. API Layer: `app/api/reports/export/route.ts`

Created `GET /api/reports/export` endpoint that:

- **Query Parameters**:
  - `format`: Must be "csv" (required)
  - `type`: Export type (required) - one of:
    - `vehicles` - Export vehicle registry
    - `drivers` - Export driver records
    - `trips` - Export trip records
    - `maintenance` - Export maintenance logs
    - `fuel` - Export fuel logs
    - `expenses` - Export expense records

- **Response**:
  - Success (200): CSV file as attachment with appropriate filename
    - Headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="..."`
  - Error (400): JSON with error message for validation failures
  - Error (500): JSON with error message for build failures

- **Data Flow**:
  1. Validate query parameters (format and type)
  2. Fetch data from database using Prisma
  3. Serialize Prisma Decimal types to strings
  4. Build CSV using `buildCsvString()` domain function
  5. Return error if building fails (Requirement 9.8)
  6. Return CSV file download on success

- **Export Types Configuration**:
  Each export type defines:
  - Database query (Prisma select)
  - Column headers array
  - Filename for download

### 3. Testing

#### Property Tests: `domain/csvExport.property.test.ts`

**Property 32**: CSV export produces one header row plus one row per record
- Tests with 100 iterations using fast-check
- Generates arbitrary headers and data
- Verifies row count: `1 + data.length`
- Verifies header presence
- Verifies field count per row

Additional property tests:
- Empty headers rejection
- Records with missing fields (treated as empty)
- Empty data (header-only output)
- CSV escaping (commas, quotes, newlines)
- Date object handling
- Null/undefined handling

#### Integration Tests: `__tests__/csvExport.integration.test.ts`

**Requirement 9.7 Tests**:
- Export with header row and multiple data rows
- Export empty dataset (header only)

**Requirement 9.8 Tests**:
- Error for invalid format
- Error for invalid type
- Error for missing type
- Validates no partial file is offered on failure

**All Export Types Test**:
- Verifies all 6 export types work correctly
- Validates CSV structure for each type

## Usage Examples

### Export Vehicles
```bash
GET /api/reports/export?format=csv&type=vehicles
```

Response:
```csv
id,registrationNumber,name,type,region,maxLoadCapacity,odometer,acquisitionCost,revenue,status,createdAt
abc123,REG-001,Truck Alpha,Truck,North,5000.00,10000.00,50000.00,10000.00,AVAILABLE,2024-01-15T10:30:00.000Z
def456,REG-002,Van Beta,Van,South,3000.00,5000.00,30000.00,5000.00,ON_TRIP,2024-01-16T14:20:00.000Z
```

### Export Drivers
```bash
GET /api/reports/export?format=csv&type=drivers
```

### Export Trips
```bash
GET /api/reports/export?format=csv&type=trips
```

### Export Maintenance Logs
```bash
GET /api/reports/export?format=csv&type=maintenance
```

### Export Fuel Logs
```bash
GET /api/reports/export?format=csv&type=fuel
```

### Export Expenses
```bash
GET /api/reports/export?format=csv&type=expenses
```

## Design Decisions

1. **Pure Domain Function**: CSV building logic is framework-free and testable in isolation
2. **Result Type**: Consistent error handling using the existing `Result<T>` type
3. **In-Memory Building**: Entire CSV is built in memory before returning (Requirement 9.8)
4. **RFC 4180 Compliance**: Proper CSV escaping for commas, quotes, and newlines
5. **Decimal Serialization**: Prisma Decimal types are converted to strings for accurate representation
6. **Type Safety**: Export types are validated against a whitelist
7. **Descriptive Filenames**: Each export type gets a meaningful filename

## Error Handling

The implementation follows a fail-fast approach:

1. **Validation Errors (400)**:
   - Invalid format parameter
   - Missing type parameter
   - Invalid export type

2. **Build Errors (500)**:
   - CSV building failures
   - Database query failures
   - Serialization errors

All errors return JSON with `{ success: false, error: "..." }` format, except successful CSV downloads which return the file directly.

## CSV Format Details

- **Line Endings**: Lines end with `\n`
- **Field Separator**: Comma (`,`)
- **Quoting**: Fields containing commas, quotes, or newlines are wrapped in double quotes
- **Quote Escaping**: Quotes within fields are doubled (`""`)
- **Empty Fields**: Represented as empty string between separators
- **Null/Undefined**: Converted to empty string

Example with special characters:
```csv
id,description,value
1,"Contains, comma",100
2,"Contains ""quote""",200
3,"Contains
newline",300
```

## Test Results

All tests passing:

### Property Tests (7/7 passed)
- ✓ Property 32: CSV export produces one header row plus one row per record (25ms)
- ✓ should reject empty headers array (4ms)
- ✓ should reject records missing required headers (0ms)
- ✓ should handle empty data with header-only output (0ms)
- ✓ should escape CSV special characters correctly (0ms)
- ✓ should handle Date objects by converting to ISO string (1ms)
- ✓ should handle null and undefined values (0ms)

### Integration Tests (6/6 passed)
- ✓ should export vehicles with header row and data rows (219ms)
- ✓ should export empty dataset with header only (3ms)
- ✓ should return error for invalid format (1ms)
- ✓ should return error for invalid type (0ms)
- ✓ should return error for missing type (0ms)
- ✓ should support all defined export types (12ms)

## Files Created

1. **domain/csvExport.ts** - Pure CSV building function
2. **domain/csvExport.property.test.ts** - Property tests (Property 32)
3. **app/api/reports/export/route.ts** - API endpoint
4. **__tests__/csvExport.integration.test.ts** - Integration tests

## Future Enhancements

Potential improvements for future iterations:

1. **Streaming**: For very large datasets, implement streaming CSV generation
2. **Column Selection**: Allow clients to specify which columns to include
3. **Filtering**: Support query parameters for filtering data before export
4. **Sorting**: Allow sorting by specific columns
5. **Custom Headers**: Support custom header labels (different from field names)
6. **Compression**: Offer gzip compression for large exports
7. **Rate Limiting**: Add rate limiting to prevent abuse
8. **Pagination**: For extremely large datasets, support paginated exports

## Compliance

- ✅ Requirement 9.7: CSV export produces one header row plus one row per record
- ✅ Requirement 9.8: Throw before offering a file if building fails (no partial file)
- ✅ Property 32: Validated with 100+ test iterations
- ✅ Pure domain function (framework-free)
- ✅ RFC 4180 CSV format compliance
- ✅ Result type for error handling
- ✅ Comprehensive test coverage (property + integration tests)
