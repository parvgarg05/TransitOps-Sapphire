# Trips UI Component Structure

## Component Hierarchy

```
app/trips/page.tsx (Main Page)
├── CreateTripForm
│   ├── Button (Create New Trip toggle)
│   ├── Form Fields
│   │   ├── Input (source, destination, cargoWeight, plannedDistance)
│   │   └── Select (vehicleId, driverId)
│   └── Button (Submit/Cancel)
│
└── TripList
    ├── Select (Status Filter)
    └── Table
        └── TripActions (per row)
            ├── Button (Dispatch) - Draft trips only
            ├── Button (Complete) - Dispatched trips only
            ├── Button (Cancel) - Dispatched trips only
            └── CompleteTripDialog
                ├── Dialog
                ├── DialogContent
                │   ├── DialogHeader
                │   │   ├── DialogTitle
                │   │   └── DialogDescription
                │   ├── Form
                │   │   ├── Input (finalOdometer)
                │   │   └── Input (fuelConsumed)
                │   └── DialogFooter
                │       ├── Button (Cancel)
                │       └── Button (Submit)
```

## Component Flow

### 1. Trip Creation Flow
```
User clicks "Create New Trip"
  ↓
Form fetches dispatch pool (/api/trips/dispatch-pool)
  ↓
User fills form (source, destination, vehicle, driver, cargo, distance)
  ↓
Client validates cargo ≤ vehicle capacity
  ↓
User submits form
  ↓
POST /api/trips (status: Draft)
  ↓
Server validates (fields, capacity, conflicts)
  ↓
Success: Trip created, form resets, list refreshes
```

### 2. Trip Dispatch Flow
```
User clicks "Dispatch" on Draft trip
  ↓
POST /api/trips/:id/dispatch
  ↓
Server validates (status must be Draft)
  ↓
Server atomically updates:
  - Trip: Draft → Dispatched
  - Vehicle: Available → On Trip
  - Driver: Available → On Trip
  ↓
Success: List refreshes
```

### 3. Trip Completion Flow
```
User clicks "Complete" on Dispatched trip
  ↓
Dialog opens, fetches vehicle odometer (GET /api/vehicles/:id)
  ↓
User enters final odometer and fuel consumed
  ↓
Client validates:
  - finalOdometer ≥ currentOdometer
  - fuelConsumed ≥ 0
  ↓
User submits dialog
  ↓
POST /api/trips/:id/complete
  ↓
Server validates (status, odometer, fuel)
  ↓
Server atomically updates:
  - Trip: Dispatched → Completed (+ finalOdometer, fuelConsumed)
  - Vehicle: On Trip → Available (+ odometer = finalOdometer)
  - Driver: On Trip → Available
  ↓
Success: Dialog closes, list refreshes
```

### 4. Trip Cancellation Flow
```
User clicks "Cancel" on Dispatched trip
  ↓
Confirmation prompt
  ↓
User confirms
  ↓
POST /api/trips/:id/cancel
  ↓
Server validates (status must be Dispatched)
  ↓
Server atomically updates:
  - Trip: Dispatched → Cancelled
  - Vehicle: On Trip → Available
  - Driver: On Trip → Available
  ↓
Success: List refreshes
```

## Data Flow

### API → Component Data Flow

```typescript
// GET /api/trips
{
  trips: [
    {
      id: string
      source: string
      destination: string
      vehicleId: string
      driverId: string
      cargoWeight: number
      plannedDistance: number
      finalOdometer: number | null
      fuelConsumed: number | null
      status: "Draft" | "Dispatched" | "Completed" | "Cancelled"
      createdAt: string
      vehicle: {
        id: string
        registrationNumber: string
        name: string
      }
      driver: {
        id: string
        name: string
        licenseNumber: string
      }
    }
  ]
}

// GET /api/trips/dispatch-pool
{
  vehicles: [
    {
      id: string
      registrationNumber: string
      name: string
      type: string
      maxLoadCapacity: number
      status: "Available"
    }
  ]
  drivers: [
    {
      id: string
      name: string
      licenseNumber: string
      licenseCategory: string
      status: "Available"
    }
  ]
}
```

## State Management

### Page Level State
- `refreshTrigger` - Counter to trigger TripList refresh after trip creation

### TripList State
- `trips` - Array of trip objects
- `isLoading` - Loading state for fetch
- `error` - Error message string
- `statusFilter` - Selected status filter value

### CreateTripForm State
- `isOpen` - Form visibility toggle
- `isLoading` - Submit loading state
- `isLoadingPool` - Dispatch pool loading state
- `error` - Error message string
- `vehicles` - Available vehicles array
- `drivers` - Available drivers array
- `formData` - Form field values

### TripActions State
- `isLoading` - Action loading state
- `error` - Error message string
- `isCompleteDialogOpen` - Dialog visibility

### CompleteTripDialog State
- `finalOdometer` - Input value
- `fuelConsumed` - Input value
- `currentOdometer` - Vehicle's current odometer
- `isLoading` - Submit loading state
- `error` - Error message string

## Validation Layers

### Client-Side Validation
1. **CreateTripForm**
   - Non-empty strings (source, destination)
   - Numbers > 0 (cargoWeight, plannedDistance)
   - Selected IDs (vehicleId, driverId)
   - Visual feedback: cargo vs capacity comparison

2. **CompleteTripDialog**
   - Valid numbers (finalOdometer, fuelConsumed)
   - finalOdometer ≥ currentOdometer
   - fuelConsumed ≥ 0

### Server-Side Validation
1. **POST /api/trips**
   - Field validation (Req 5.8)
   - Vehicle/driver existence
   - Capacity check (Req 5.6, 5.7)
   - Conflict check (Req 5.5)

2. **POST /api/trips/:id/dispatch**
   - Status validation (must be Draft, Req 6.6)
   - State machine validation

3. **POST /api/trips/:id/complete**
   - Status validation (must be Dispatched, Req 6.6)
   - Odometer validation (Req 6.7)
   - Fuel validation (Req 6.7)
   - State machine validation

4. **POST /api/trips/:id/cancel**
   - Status validation (must be Dispatched, Req 6.6)
   - State machine validation

## Error Handling

### Display Locations
- **Form-level errors**: Red alert box above form buttons
- **Field-level errors**: Small red text below specific field
- **Action errors**: Inline red text next to action buttons
- **Page-level errors**: Full-width error box with retry button

### Error Types
- **Validation errors**: Field-specific messages (e.g., "Cargo weight exceeds capacity")
- **Not found errors**: "Trip/Vehicle/Driver not found"
- **State errors**: "Only Draft trips can be dispatched"
- **Network errors**: "Failed to fetch trips"

## Loading States

### Visual Indicators
- **Disabled buttons**: Opacity reduced + cursor not-allowed
- **Loading text**: Button text changes (e.g., "Creating..." instead of "Create")
- **Skeleton loaders**: "Loading trips..." message in table
- **Spinners**: Could be added for longer operations

### Loading Scenarios
1. Initial page load - TripList fetching trips
2. Filter change - TripList refetching trips
3. Form submission - CreateTripForm disabled
4. Dispatch pool fetch - Form shows loading message
5. Action execution - TripActions buttons disabled
6. Dialog submission - CompleteTripDialog form disabled
7. Vehicle fetch - CompleteTripDialog shows loading

## Responsive Design

### Breakpoints (Tailwind)
- `sm:` 640px - Form layout adjustments
- `md:` 768px - Two-column form fields
- `lg:` 1024px - Max width container

### Responsive Behaviors
- Form fields: Stack on mobile, side-by-side on tablet+
- Table: Horizontal scroll on mobile
- Dialog: Full-width on mobile, max-width on desktop
- Buttons: Full-width on mobile, auto-width on desktop

## Accessibility

### Implemented Features
- Semantic HTML (form, table, button elements)
- Label associations (htmlFor attributes)
- Required field indicators (*)
- Keyboard navigation support
- Focus indicators (focus:ring)
- Disabled state indicators
- ARIA-friendly dialog
- Clear error messages
- Loading state announcements

### Future Enhancements
- ARIA labels for actions
- Screen reader announcements for state changes
- Keyboard shortcuts
- Focus management in dialogs
- Skip links for table navigation
