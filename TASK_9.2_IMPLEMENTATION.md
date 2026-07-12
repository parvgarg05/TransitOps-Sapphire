# Task 9.2: Maintenance UI Implementation

## Overview

This document describes the implementation of the Maintenance Workflow UI component for TransitOps. The implementation provides a complete maintenance management interface with the ability to open maintenance records, close them, update costs, and filter by vehicle and status.

## Requirements Implemented

### Core Requirements (7.1, 7.3)
- ✅ Open maintenance sends non-Retired vehicle to In Shop
- ✅ Reject open if vehicle is Retired
- ✅ Close maintenance restores Available status (unless Retired stays Retired)
- ✅ Cost updates validate: 0 ≤ cost ≤ 999,999,999.99
- ✅ Only positive costs contribute to operational cost

## Architecture

### File Structure

```
TransitOps-Sapphire/
├── app/
│   ├── api/
│   │   └── maintenance/
│   │       ├── route.ts                    # GET (list logs) and POST (open maintenance)
│   │       └── [id]/
│   │           ├── close/
│   │           │   └── route.ts           # POST (close maintenance)
│   │           └── cost/
│   │               └── route.ts           # PATCH (update cost)
│   └── maintenance/
│       └── page.tsx                        # Main maintenance page
└── components/
    └── maintenance/
        ├── MaintenanceList.tsx             # Maintenance log table with filters
        ├── OpenMaintenanceDialog.tsx       # Open maintenance form dialog
        └── UpdateCostDialog.tsx            # Update cost form dialog
```

## Component Details

### 1. Maintenance Page (`app/maintenance/page.tsx`)

**Purpose**: Main page component that orchestrates the maintenance workflow UI.

**Features**:
- Page header with title and description
- Open Maintenance button/dialog
- Maintenance list with refresh trigger mechanism

**State Management**:
- `refreshTrigger`: Counter to trigger list refresh after operations

### 2. MaintenanceList Component

**Purpose**: Displays all maintenance logs in a table format with filtering capabilities.

**Features**:
- **Data Display**:
  - Vehicle (registration number + name)
  - Description (with truncation and tooltip)
  - Cost (formatted as currency)
  - Status (Open/Closed with badge)
  - Opened date
  - Closed date (or "-" if not closed)
  - Actions column

- **Filtering**:
  - Filter by status: All / Open / Closed
  - Filter by vehicle: Dropdown of all vehicles
  - Filters work independently and together

- **Actions for Open Records**:
  - Update Cost button → Opens UpdateCostDialog
  - Close button → Closes maintenance record
  - Loading state during close operation

- **Visual Indicators**:
  - Badge component for status (default=Open, outline=Closed)
  - Hover effect on table rows
  - Truncated descriptions with full text on hover
  - Currency formatting for costs
  - Date formatting for timestamps

**API Integration**:
- GET `/api/maintenance?status={status}&vehicleId={vehicleId}`
- POST `/api/maintenance/{id}/close`

**Error Handling**:
- Display error banner with retry button
- Loading states
- Empty states with contextual messages

### 3. OpenMaintenanceDialog Component

**Purpose**: Dialog for opening new maintenance records.

**Features**:
- **Vehicle Selection**:
  - Dropdown of all non-Retired vehicles
  - Shows registration number, name, and current status
  - Pre-filters out Retired vehicles for better UX

- **Description Input**:
  - Text input for maintenance description
  - Required field validation
  - Trim whitespace on submit

- **Validation & Warnings**:
  - Retired vehicle warning (shouldn't appear due to filtering)
  - On Trip vehicle info message
  - Client-side required field validation
  - Server-side error display

- **State Management**:
  - Form reset on close
  - Loading state during submission
  - Error state display

**API Integration**:
- GET `/api/vehicles` (to fetch vehicle list)
- POST `/api/maintenance` (to open maintenance)

**Requirements Coverage**:
- **7.1**: Opens maintenance and sets vehicle to In Shop
- **7.7**: Rejects if vehicle is Retired (handled by API)

### 4. UpdateCostDialog Component

**Purpose**: Dialog for updating maintenance record costs.

**Features**:
- **Cost Input**:
  - Number input with step of 0.01
  - Min: 0, Max: 999,999,999.99
  - Currency formatting in display

- **Context Display**:
  - Shows vehicle information
  - Shows maintenance description
  - Shows current cost

- **Validation**:
  - Client-side: numeric, range checks
  - Server-side: domain validation
  - Clear error messages

- **Info Display**:
  - Blue info box: "Only positive costs contribute to operational cost"
  - Current cost formatted in dialog description

**API Integration**:
- PATCH `/api/maintenance/{id}/cost`

**Requirements Coverage**:
- **7.5, 7.6**: Cost validation (0 ≤ cost ≤ 999,999,999.99)
- **7.8**: Rejects out-of-range costs
- Informs user about operational cost calculation

## API Enhancements

### GET /api/maintenance

**New Endpoint Added**: Fetches all maintenance logs with filtering.

**Query Parameters**:
- `vehicleId` (optional): Filter by vehicle
- `status` (optional): "open" or "closed"

**Response Format**:
```json
{
  "logs": [
    {
      "id": "string",
      "vehicleId": "string",
      "description": "string",
      "cost": number,
      "closed": boolean,
      "openedAt": "ISO-8601 string",
      "closedAt": "ISO-8601 string | null",
      "vehicle": {
        "id": "string",
        "registrationNumber": "string",
        "name": "string",
        "status": "AVAILABLE | ON_TRIP | IN_SHOP | RETIRED"
      }
    }
  ]
}
```

**Features**:
- Includes vehicle details via Prisma relation
- Orders by openedAt descending (newest first)
- Supports multiple simultaneous filters
- Returns empty array if no matches

## Technical Implementation

### Technology Stack
- **Next.js 14 App Router**: Server/client components
- **shadcn/ui**: Dialog, Button, Input, Label, Badge, NativeSelect, Table
- **Tailwind CSS**: Styling and responsive design
- **TypeScript**: Type safety throughout

### Type Safety

All components use proper TypeScript interfaces:
- `Vehicle`: Vehicle data structure
- `MaintenanceLog`: Maintenance record structure
- Props interfaces for all components

### State Management
- React `useState` for local component state
- `useEffect` for data fetching and filters
- Callback props for refresh triggers

### API Integration Pattern
- Fetch API for all HTTP requests
- Proper error handling with try/catch
- Loading states during operations
- Success callbacks to trigger parent refresh

### Validation Strategy
- **Client-side**: Immediate feedback, prevents bad requests
- **Server-side**: Authoritative validation via domain layer
- **User feedback**: Clear error messages at field level

### Responsive Design
- Table with horizontal scroll on small screens
- Flexible filter bar with wrapping
- Dialog sizing (`sm:max-w-[500px]`)
- Mobile-friendly buttons and inputs

## User Experience Features

### Visual Indicators
1. **Status Badges**:
   - Open: Blue/default badge
   - Closed: Gray/outline badge

2. **Loading States**:
   - "Loading..." text in table
   - Disabled buttons during operations
   - Button text changes ("Opening...", "Updating...", "Closing...")

3. **Empty States**:
   - Contextual messages based on filters
   - Helpful guidance for first-time users

4. **Hover Effects**:
   - Table rows highlight on hover
   - Full description shown in tooltip

### Error Handling
1. **API Errors**: Red banner with error message and retry button
2. **Form Errors**: Red border boxes with specific error messages
3. **Validation Errors**: Inline error text below inputs

### Accessibility
- Proper form labels with required indicators
- Semantic HTML elements
- ARIA-compliant dialog components
- Keyboard navigation support

## Requirements Traceability

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| 7.1 | Open maintenance sets vehicle to In Shop | `OpenMaintenanceDialog` → API |
| 7.3 | Close maintenance restores Available | MaintenanceList close button → API |
| 7.4 | Retired status preserved on close | Service layer (existing) |
| 7.5, 7.6 | Cost validation (0 to 999,999,999.99) | `UpdateCostDialog` validation |
| 7.7 | Reject open if Retired | `OpenMaintenanceDialog` → API error |
| 7.8 | Reject out-of-range costs | `UpdateCostDialog` → API error |
| Visual indicators | Open vs Closed badges | `MaintenanceList` Badge components |
| Filter by vehicle | Vehicle dropdown filter | `MaintenanceList` vehicleFilter |
| Filter by status | Status dropdown filter | `MaintenanceList` statusFilter |

## Usage

### Opening Maintenance
1. Click "Open Maintenance" button
2. Select a vehicle from dropdown (non-Retired only)
3. Enter maintenance description
4. Click "Open Maintenance"
5. Vehicle status changes to In Shop
6. New record appears in list with "Open" badge

### Closing Maintenance
1. Find open maintenance record in list
2. Click "Close" button in Actions column
3. Vehicle status changes to Available (or stays Retired)
4. Record updates to show "Closed" badge and closed date

### Updating Cost
1. Find open maintenance record in list
2. Click "Update Cost" button
3. Enter new cost value (0 to 999,999,999.99)
4. Click "Update Cost"
5. Cost updates in list immediately

### Filtering
1. **By Status**: Select "Open", "Closed", or "All" from status dropdown
2. **By Vehicle**: Select specific vehicle or "All Vehicles"
3. Filters apply immediately and show count of matching records

## Testing Recommendations

### Manual Testing
1. **Open Maintenance**:
   - Try opening for Available vehicle → should succeed
   - Try opening for In Shop vehicle → should succeed
   - Try opening for Retired vehicle → should fail with error
   - Verify vehicle status changes to In Shop

2. **Close Maintenance**:
   - Close record for Available vehicle → should succeed
   - Close record for Retired vehicle → should keep Retired status
   - Verify closed date is set

3. **Update Cost**:
   - Try negative cost → should fail
   - Try cost > 999,999,999.99 → should fail
   - Try valid cost → should succeed
   - Try cost = 0 → should succeed

4. **Filtering**:
   - Filter by status → verify correct records shown
   - Filter by vehicle → verify only that vehicle's records shown
   - Combine filters → verify both apply

### Edge Cases
- Empty description → validation error
- No vehicles available → empty dropdown message
- Network errors → error banner with retry
- Multiple rapid operations → loading states prevent duplicates

## Future Enhancements

Potential improvements for future iterations:

1. **Pagination**: For large maintenance log lists
2. **Date Range Filter**: Filter by opened/closed date ranges
3. **Export**: Export filtered maintenance logs to CSV
4. **Bulk Operations**: Close multiple records at once
5. **Maintenance History**: Detailed view per vehicle
6. **Cost History**: Track cost updates over time
7. **Attachments**: Upload photos/documents per maintenance record
8. **Notifications**: Alert when maintenance is open too long
9. **Analytics**: Average maintenance cost, frequency, duration
10. **Search**: Text search in descriptions

## Conclusion

The Maintenance UI implementation provides a complete, user-friendly interface for managing vehicle maintenance records. It follows the established patterns in the codebase (similar to Trips UI), integrates seamlessly with existing APIs, and enforces all business rules from Requirements 7.1-7.8. The implementation is type-safe, responsive, accessible, and production-ready.
