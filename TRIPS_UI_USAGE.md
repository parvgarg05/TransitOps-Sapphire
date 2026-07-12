# Trips UI - Usage Guide

## Accessing the Trips Page

Navigate to: `/trips`

## Features Overview

### 1. Creating a Trip

**Steps:**
1. Click the **"Create New Trip"** button at the top of the page
2. The form will automatically fetch available vehicles and drivers
3. Fill in the required fields:
   - **Source**: Starting location
   - **Destination**: End location
   - **Vehicle**: Select from available vehicles (shows registration, name, type, capacity)
   - **Driver**: Select from available drivers (shows name, license number, category)
   - **Cargo Weight (kg)**: Weight of cargo (must be > 0)
   - **Planned Distance (km)**: Expected trip distance (must be > 0)
4. The form will show real-time feedback if cargo exceeds vehicle capacity
5. Click **"Create Trip (Draft)"** to create the trip
6. The trip is created with status "Draft" and appears in the list below

**Validation:**
- All fields are required
- Cargo weight must not exceed vehicle's maximum capacity
- Only vehicles with status "Available" can be selected
- Only drivers with status "Available" and valid (non-expired) licenses can be selected
- Vehicle/driver already "On Trip" will be excluded from selection

**What happens if no vehicles or drivers are available?**
- Form will show a warning message
- Submit button will be disabled
- You need to ensure vehicles and drivers are in "Available" status first

### 2. Dispatching a Trip (Draft → Dispatched)

**Steps:**
1. Find a trip with status "Draft" in the list
2. Click the **"Dispatch"** button in the Actions column
3. The trip status changes to "Dispatched"
4. The assigned vehicle's status changes to "On Trip"
5. The assigned driver's status changes to "On Trip"

**Notes:**
- Only Draft trips show the Dispatch button
- This is an atomic operation - all three status changes happen together
- If the vehicle or driver is no longer available, you'll get an error

### 3. Completing a Trip (Dispatched → Completed)

**Steps:**
1. Find a trip with status "Dispatched" in the list
2. Click the **"Complete"** button in the Actions column
3. A dialog opens showing:
   - Current vehicle odometer reading (for reference)
   - Input field for final odometer reading
   - Input field for fuel consumed
4. Enter the required values:
   - **Final Odometer**: Must be greater than or equal to current odometer
   - **Fuel Consumed**: Must be greater than or equal to 0
5. Click **"Complete Trip"**
6. The trip status changes to "Completed"
7. The vehicle's odometer is updated to the final reading
8. The vehicle's status changes to "Available"
9. The driver's status changes to "Available"

**Validation:**
- Final odometer cannot be less than current odometer
- Fuel consumed cannot be negative
- Both fields are required

**Example:**
```
Current Odometer: 50,000 km
Final Odometer: 50,250 km ✓ (valid)
Fuel Consumed: 15.5 L ✓ (valid)
```

### 4. Cancelling a Trip (Dispatched → Cancelled)

**Steps:**
1. Find a trip with status "Dispatched" in the list
2. Click the **"Cancel"** button in the Actions column
3. Confirm the cancellation in the prompt
4. The trip status changes to "Cancelled"
5. The vehicle's status changes to "Available"
6. The driver's status changes to "Available"

**Notes:**
- Only Dispatched trips can be cancelled
- Once cancelled, the trip cannot be un-cancelled or dispatched again
- The vehicle and driver become available for other trips

### 5. Filtering Trips by Status

**Steps:**
1. Find the "Filter by Status" dropdown above the trip list
2. Select a status:
   - **All Statuses**: Show all trips (default)
   - **Draft**: Show only Draft trips
   - **Dispatched**: Show only Dispatched trips (active trips)
   - **Completed**: Show only Completed trips
   - **Cancelled**: Show only Cancelled trips
3. The list updates automatically

**Use cases:**
- View only active trips: Filter by "Dispatched"
- View trip history: Filter by "Completed"
- View pending work: Filter by "Draft"

### 6. Understanding the Trip List

**Columns:**

| Column | Description |
|--------|-------------|
| Source → Destination | Starting and ending locations |
| Vehicle | Registration number and vehicle name |
| Driver | Driver name and license number |
| Cargo (kg) | Weight of cargo being transported |
| Distance (km) | Planned distance (and final odometer/fuel when completed) |
| Status | Current trip status with color badge |
| Actions | Available actions based on current status |

**Status Badge Colors:**
- **Gray (Draft)**: Trip created but not yet dispatched
- **Blue (Dispatched)**: Trip is currently in progress
- **Green (Completed)**: Trip successfully completed
- **Red (Cancelled)**: Trip was cancelled

### 7. Trip Lifecycle

```
[Create Trip]
     ↓
  Draft (Gray)
     ↓ [Dispatch]
  Dispatched (Blue)
     ↓
  ┌─────────┬─────────┐
  ↓         ↓         ↓
Complete  Cancel   (In Progress)
(Green)   (Red)
```

**State Transitions:**
1. **Draft → Dispatched**: Click "Dispatch"
2. **Dispatched → Completed**: Click "Complete" and enter odometer/fuel
3. **Dispatched → Cancelled**: Click "Cancel" and confirm

**Invalid Transitions:**
- Cannot dispatch a trip that's already Dispatched, Completed, or Cancelled
- Cannot complete a trip that's not Dispatched
- Cannot cancel a trip that's not Dispatched
- Cannot edit or delete a Completed or Cancelled trip

## Error Messages

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Cargo weight exceeds vehicle capacity" | Selected cargo is too heavy | Choose a vehicle with higher capacity or reduce cargo weight |
| "Vehicle is already assigned to an active trip" | Vehicle is On Trip | Wait for current trip to complete or select different vehicle |
| "Driver is already assigned to an active trip" | Driver is On Trip | Wait for current trip to complete or select different driver |
| "Only Draft trips can be dispatched" | Trip status is not Draft | Cannot dispatch already dispatched/completed trips |
| "Only Dispatched trips can be completed" | Trip status is not Dispatched | Must dispatch trip before completing |
| "Final odometer below current reading" | Invalid odometer entry | Enter a final odometer >= current odometer |
| "Fuel consumed cannot be negative" | Invalid fuel entry | Enter fuel consumed >= 0 |
| "No available vehicles or drivers" | All resources are busy | Complete/cancel active trips to free up resources |

## Tips and Best Practices

### 1. Workflow Management
- Create trips in Draft status when planning
- Dispatch only when ready to start the trip
- Complete trips promptly to free up vehicles and drivers
- Cancel if trip cannot proceed (vehicle breakdown, etc.)

### 2. Resource Management
- Check dispatch pool before creating trips
- Monitor active trips (filter by "Dispatched")
- Ensure vehicles have adequate capacity
- Verify driver licenses are valid

### 3. Data Entry
- Double-check odometer readings before completing
- Record fuel accurately for efficiency tracking
- Use descriptive source/destination names
- Plan distances realistically

### 4. Troubleshooting
- If no vehicles available: Check vehicle statuses, complete active trips
- If no drivers available: Check driver statuses and license expiry dates
- If capacity errors: Verify vehicle maxLoadCapacity and cargo weight
- If state transition errors: Check current trip status

## Integration with Other Features

### Vehicle Management
- Vehicles must have status "Available" to appear in dispatch pool
- Vehicles with status "In Shop" (maintenance) are excluded
- Retired vehicles never appear in dispatch pool
- Vehicle odometer is automatically updated on trip completion

### Driver Management
- Drivers must have status "Available" to appear in dispatch pool
- Drivers with expired licenses are excluded
- Suspended drivers are excluded
- Off Duty drivers are excluded

### Maintenance
- If a vehicle goes into maintenance (In Shop), it's removed from dispatch pool
- Cannot dispatch a trip with a vehicle that has active maintenance
- Complete or cancel trips before putting vehicles into maintenance

### Analytics/Reports
- Completed trips contribute to analytics:
  - Fleet utilization (% of vehicles On Trip)
  - Fuel efficiency (distance / fuel consumed)
  - Operational costs
  - Vehicle ROI calculations

## Keyboard Shortcuts (Future Enhancement)

Currently not implemented, but planned:
- `Ctrl + N`: Create new trip
- `Enter`: Submit form
- `Esc`: Close dialog
- `Tab`: Navigate between fields

## Mobile Usage

The trips page is responsive and works on mobile devices:
- Form fields stack vertically
- Table scrolls horizontally
- Dialogs are full-width on small screens
- Touch-friendly buttons and inputs

## Accessibility

- All form fields have associated labels
- Required fields are marked with asterisks (*)
- Error messages are clearly displayed
- Keyboard navigation is supported
- Focus indicators are visible
- Color is not the only indicator (status text + badge)

## FAQ

**Q: Can I edit a Draft trip?**
A: Not currently. You can cancel and create a new one.

**Q: Can I delete a trip?**
A: Not currently implemented. Cancelled trips remain in the system.

**Q: What happens if I close the Complete dialog without submitting?**
A: The trip remains Dispatched. No changes are saved.

**Q: Can I un-cancel a trip?**
A: No, cancellation is permanent. Create a new trip if needed.

**Q: Why don't I see any vehicles in the create form?**
A: All vehicles are either On Trip, In Shop, or Retired. Complete active trips or close maintenance to free up vehicles.

**Q: Can I assign multiple trips to the same vehicle?**
A: Not simultaneously. A vehicle must complete or cancel its current trip before being assigned to another.

**Q: What's the difference between cancelling from Dispatched vs deleting from Draft?**
A: Currently, you can only cancel Dispatched trips. Draft trips don't have a delete option yet.

**Q: Do I need to dispatch immediately after creating?**
A: No, you can create multiple Draft trips and dispatch them later.

**Q: Can I see trip history?**
A: Yes, filter by "Completed" status to see all completed trips.

**Q: Are the status changes reversible?**
A: No, once a trip moves to a new status, it cannot go back to the previous status.
