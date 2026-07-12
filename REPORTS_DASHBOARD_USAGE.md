# Reports and Dashboard Usage Guide

## Quick Start

### Accessing the Dashboard
The dashboard is now the default home page. Simply navigate to:
```
http://localhost:3000/
or
http://localhost:3000/dashboard
```

### Accessing Reports
Navigate to:
```
http://localhost:3000/reports
```

---

## Dashboard Features

### Role-Based Views

The dashboard displays different KPIs based on your user role:

#### Fleet Manager View (Default)
- **Active Vehicles**: Count of vehicles currently on trip
- **Available Vehicles**: Count of vehicles ready for dispatch
- **Vehicles in Maintenance**: Count of vehicles in shop
- **Fleet Utilization**: Percentage of non-retired vehicles on trip

#### Driver View (Default)
- **Pending Trips**: Count of trips awaiting dispatch
- **Active Trips**: Count of trips in progress
- **Available Vehicles**: Count of vehicles ready for assignment
- **Drivers On Duty**: Count of drivers currently working

#### Safety Officer View (Default)
- **Expired Licenses**: Count of drivers with expired licenses
- **Expiring Soon**: Count of licenses expiring within 30 days
- **Suspended Drivers**: Count of suspended drivers
- **Drivers On Duty**: Count of drivers currently working
- **Safety Scores**: Individual safety scores for all drivers

#### Financial Analyst View (Default)
- **Operational Cost**: Total fleet operational costs
- **Fuel Efficiency**: Average fleet fuel efficiency (km/L)
- **Vehicle ROI**: Average return on investment

### Viewing All KPIs

Click the **"Show All KPIs"** button in the top-right corner to see the complete set of metrics regardless of your role.

Click **"Default View"** to return to your role-specific dashboard.

### Filtering Data

Use the filter bar to narrow down metrics:

1. **Vehicle Type**: Filter by vehicle type (Truck, Van, Sedan, SUV)
2. **Status**: Filter by vehicle status (Available, On Trip, In Shop, Retired)
3. **Region**: Filter by geographic region (North, South, East, West, Central)

**Important**: Filters are applied **before** counting, so you'll see `0` for empty matching sets, not the total count.

**Example**: If you filter by "Status: On Trip" and "Region: North", you'll only see vehicles that are both on trip AND in the North region.

### Clearing Filters

Click the **"Clear Filters"** button (appears when filters are active) to reset all filters.

---

## Reports Features

### Available Reports

1. **Fleet Utilization**
   - Shows percentage of non-retired vehicles currently on trip
   - Displays "N/A" when there are no non-retired vehicles
   - Shows detailed breakdown of on-trip vs. total non-retired vehicles

2. **Average Fuel Efficiency**
   - Shows average fuel efficiency across all vehicles (km/L)
   - Displays "N/A" when no fuel data is available
   - Calculated from all vehicles with fuel consumption data

3. **Average Vehicle ROI**
   - Shows average return on investment across all vehicles
   - Displays "N/A" when acquisition cost is zero
   - Calculated as (Revenue - Costs) / Acquisition Cost

### Detailed Tables

#### Fuel Efficiency by Vehicle
- Lists all vehicles with their fuel efficiency (km/L)
- Shows "N/A" for vehicles with zero fuel consumption
- Sortable by vehicle name and registration number

#### Vehicle ROI by Vehicle
- Lists all vehicles with their ROI ratio
- Shows "N/A" for vehicles with zero acquisition cost
- Sortable by vehicle name and registration number

### Exporting Data

Click the **"Export CSV"** button to download a CSV file containing:
- All vehicle data
- Current metrics
- Timestamp of export

**File Format**: `vehicles-report-YYYY-MM-DD.csv`

---

## N/A Cases Explained

### When You'll See "N/A"

1. **Fuel Efficiency**: When a vehicle has zero fuel consumption
   - **Why**: Cannot divide distance by zero fuel
   - **Solution**: Record fuel logs for the vehicle

2. **Fleet Utilization**: When there are no non-retired vehicles
   - **Why**: Cannot calculate percentage with zero vehicles
   - **Solution**: Add active vehicles to the fleet

3. **Vehicle ROI**: When a vehicle has zero acquisition cost
   - **Why**: Cannot divide profit by zero cost
   - **Solution**: Update vehicle with correct acquisition cost

---

## Responsive Design

### Mobile View (< 640px)
- KPI cards stack in a single column
- Filters stack vertically
- Tables scroll horizontally
- Buttons stack vertically

### Tablet View (640px - 1024px)
- KPI cards display in 2 columns
- Filters display in a row
- Better spacing and readability

### Desktop View (> 1024px)
- KPI cards display in 3-4 columns
- Full horizontal layout
- Optimal spacing and visual hierarchy

---

## Tips and Best Practices

### Dashboard
1. **Regular Monitoring**: Check the dashboard daily for fleet status
2. **Use Filters**: Apply filters to focus on specific regions or vehicle types
3. **Toggle Views**: Switch between default and full view to see all metrics
4. **Watch for N/A**: Investigate any N/A values to identify data gaps

### Reports
1. **Export Regularly**: Export CSV reports for record-keeping
2. **Compare Metrics**: Compare fuel efficiency across vehicles to identify underperformers
3. **Monitor ROI**: Use ROI report to identify vehicles that need maintenance or replacement
4. **Track Utilization**: Keep fleet utilization above 60% for optimal efficiency

### Performance Optimization
1. **Apply Specific Filters**: Narrow down data to improve loading times
2. **Refresh Periodically**: Click retry if data seems stale
3. **Use Default View**: Start with default view for faster loading

---

## Common Scenarios

### Scenario 1: Fleet Manager Morning Check
1. Navigate to Dashboard
2. Check "Active Vehicles" and "Fleet Utilization"
3. Filter by "Region: North" to check specific area
4. Click "Show All KPIs" to see full operational status

### Scenario 2: Safety Officer License Review
1. Navigate to Dashboard
2. Default view shows expired and expiring licenses
3. Review "Safety Scores" section
4. Note drivers needing attention

### Scenario 3: Financial Analyst Monthly Report
1. Navigate to Dashboard
2. Default view shows financial metrics
3. Switch to Reports page
4. Export CSV for monthly records
5. Review ROI per vehicle table

### Scenario 4: Driver Checking Trip Status
1. Navigate to Dashboard
2. Default view shows pending and active trips
3. Check available vehicles and drivers
4. No filters needed for this view

---

## Troubleshooting

### Issue: Dashboard shows "Unauthorized"
**Solution**: Log in to your account. The dashboard requires authentication.

### Issue: All KPIs show "N/A"
**Solution**: Check if there's data in the system. Add vehicles, drivers, and trips if needed.

### Issue: Filters don't seem to work
**Solution**: Clear filters and reapply. Check that you're selecting valid filter values.

### Issue: CSV export fails
**Solution**: 
1. Check your internet connection
2. Ensure you have browser permissions for downloads
3. Try again after refreshing the page

### Issue: Loading takes too long
**Solution**: 
1. Apply specific filters to reduce data load
2. Check your internet connection
3. Refresh the page

### Issue: Tables are hard to read on mobile
**Solution**: 
1. Rotate device to landscape mode
2. Scroll tables horizontally
3. Consider using tablet or desktop for detailed table views

---

## Keyboard Shortcuts (Accessibility)

- **Tab**: Navigate through filters and buttons
- **Enter**: Activate selected button
- **Escape**: Close dropdown menus
- **Arrow Keys**: Navigate dropdown options

---

## Browser Compatibility

Tested and supported on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## Data Refresh Rate

- **Dashboard**: Data is fetched on page load and when filters change
- **Reports**: Data is fetched on page load
- **Manual Refresh**: Click retry button or refresh browser page

**Note**: Data is computed in real-time from the database, so changes are reflected immediately on refresh.

---

## Security and Privacy

- All pages require authentication
- Role-based access control ensures users only see appropriate data
- Data is transmitted over HTTPS
- Session timeout after 30 minutes of inactivity

---

## Support and Feedback

For issues or feature requests:
1. Check this usage guide first
2. Review the implementation documentation (TASK_12.3_13.2_IMPLEMENTATION.md)
3. Contact your system administrator

---

## What's Next?

Planned enhancements:
- Real-time dashboard updates via WebSocket
- Chart visualizations for trends
- Custom dashboard layouts
- PDF export functionality
- Email report scheduling
- Advanced filtering and search
