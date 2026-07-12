# Requirements Document

## Introduction

TransitOps is a centralized, SaaS-style web application that digitizes transport operations for logistics companies. It replaces spreadsheets and manual logbooks with a single system that manages the complete lifecycle of vehicles, drivers, trips, maintenance, fuel, and expenses while enforcing operational business rules and surfacing operational insights.

This document defines requirements for an 8-hour hackathon build. Requirements are grouped into two tiers:

- **Mandatory Requirements (Requirements 1–10)**: The core deliverables that MUST be implemented. These include authentication with RBAC, CRUD for vehicles and drivers, trip management with validations, automatic status transitions, the maintenance workflow, fuel and expense tracking, and the KPI dashboard. The mandatory business rules embedded in these requirements represent the core correctness of the system.
- **Bonus Requirements (Requirements 11–16)**: Nice-to-have enhancements that SHALL be attempted only after all mandatory requirements are complete.

The mandatory business rules are expressed as precise, testable acceptance criteria because they define system correctness.

## Glossary

- **TransitOps**: The complete web application described by this document.
- **Auth_Service**: The component responsible for authentication and session management.
- **Access_Control**: The component that enforces Role-Based Access Control (RBAC) on features and actions.
- **Vehicle_Registry**: The component that manages the master list of vehicles.
- **Driver_Registry**: The component that manages driver profiles.
- **Trip_Service**: The component that manages trip creation, dispatch, completion, and cancellation.
- **Maintenance_Service**: The component that manages maintenance records for vehicles.
- **Expense_Service**: The component that manages fuel logs and other expenses and computes operational cost.
- **Analytics_Service**: The component that computes and displays reports and analytics.
- **Dashboard_Service**: The component that computes and displays operational KPIs.
- **User**: An authenticated person who interacts with TransitOps.
- **Role**: A named permission set assigned to a User. Valid roles are Fleet Manager, Driver, Safety Officer, and Financial Analyst.
- **Fleet Manager**: A Role that oversees fleet assets, maintenance, and vehicle lifecycle.
- **Driver (role)**: A Role that creates trips, assigns vehicles and drivers, and monitors active deliveries.
- **Safety Officer**: A Role that monitors driver compliance, license validity, and safety scores.
- **Financial Analyst**: A Role that reviews expenses, fuel consumption, maintenance costs, and profitability.
- **Vehicle**: A fleet asset with a unique Registration Number and a lifecycle Status.
- **Vehicle Status**: One of Available, On Trip, In Shop, Retired.
- **Registration Number**: A unique identifier assigned to a Vehicle.
- **Maximum Load Capacity**: The maximum cargo weight, in kilograms, a Vehicle may carry.
- **Odometer**: The recorded distance reading, in kilometers, of a Vehicle.
- **Acquisition Cost**: The purchase cost of a Vehicle, in the system currency.
- **Driver**: A person profile with a License Number and a lifecycle Status.
- **Driver Status**: One of Available, On Trip, Off Duty, Suspended.
- **License Expiry Date**: The date after which a Driver's license is no longer valid.
- **Expired License**: A driver license whose License Expiry Date is earlier than the current date.
- **Soon-To-Expire License**: A driver license whose License Expiry Date is on or after the current date and no more than 30 days after the current date.
- **Safety Score**: A numeric score representing a Driver's safety record.
- **Trip**: A planned or executed movement of cargo from a source to a destination using one Vehicle and one Driver.
- **Trip Status**: One of Draft, Dispatched, Completed, Cancelled.
- **Cargo Weight**: The weight of cargo, in kilograms, assigned to a Trip.
- **Planned Distance**: The estimated distance, in kilometers, of a Trip.
- **Dispatch Selection Pool**: The set of Vehicles and Drivers eligible to be assigned to a Trip.
- **Maintenance Log**: A record of maintenance work performed on a Vehicle, with an open or closed state.
- **Active Maintenance Record**: A Maintenance Log that is currently open (not closed).
- **Fuel Log**: A record of a fueling event with liters, cost, and date for a Vehicle.
- **Expense**: A recorded operational cost such as a toll or maintenance charge.
- **Operational Cost**: The sum of fuel cost and maintenance cost for a Vehicle.
- **Fuel Efficiency**: Distance travelled divided by fuel consumed, for a Vehicle.
- **Fleet Utilization**: The percentage of Vehicles currently On Trip relative to total non-Retired Vehicles.
- **Active Vehicles**: The count of Vehicles whose Status is not Retired.
- **Drivers On Duty**: The count of Drivers whose Status is Available or On Trip.
- **Revenue**: The income recorded against a Vehicle, used as an input to Vehicle ROI.
- **Vehicle ROI**: (Revenue − (Maintenance cost + Fuel cost)) ÷ Acquisition Cost for a Vehicle.
- **Default Dashboard View**: The presentation-layer subset of KPIs and widgets the Dashboard_Service emphasizes by default for a User, determined by that User's Role. The Default Dashboard View controls initial emphasis only and does not restrict which KPIs a User may view.

---

## Requirements

> **Mandatory tier (Requirements 1–10):** Core deliverables that MUST be implemented.

### Requirement 1: Authentication

**User Story:** As a User, I want to log in securely with my email and password, so that only authorized people can access transport operations data.

#### Acceptance Criteria

1. WHEN a User submits a registered email and correct password, THE Auth_Service SHALL establish an authenticated session for that User within 3 seconds without displaying an authentication error message.
2. IF a User submits an email that is not registered or an incorrect password, THEN THE Auth_Service SHALL reject the login attempt within 3 seconds, clear any session state, and display an authentication error message that does not indicate whether the email or the password was incorrect.
3. WHILE a User has no authenticated session, THE Access_Control SHALL redirect requests for application pages to the login page within 3 seconds and SHALL NOT return any application page content.
4. THE Auth_Service SHALL store User passwords using a one-way cryptographic hash and SHALL NOT store or return the plaintext password after registration.
5. WHEN an authenticated User requests to log out, THE Auth_Service SHALL terminate the User's session within 3 seconds and redirect the User to the login page.
6. IF a User submits an incorrect password for the same registered email 5 consecutive times within a 15-minute window, THEN THE Auth_Service SHALL lock that account for 15 minutes, reject further login attempts during the lock period, and display an error message indicating the account is temporarily locked.
7. WHEN an authenticated User's session has been inactive for 30 continuous minutes, THE Auth_Service SHALL terminate that session and require re-authentication on the next request.
8. IF a User submits an email that exceeds 254 characters or a password that exceeds 128 characters, THEN THE Auth_Service SHALL reject the login attempt and display an authentication error message without establishing a session.

### Requirement 2: Role-Based Access Control

**User Story:** As a Fleet Manager, I want each User's access to be governed by their assigned Role, so that users only perform actions appropriate to their responsibilities.

#### Acceptance Criteria

1. THE Access_Control SHALL assign exactly one Role to each User from the set {Fleet Manager, Driver, Safety Officer, Financial Analyst}, and IF a User has no assigned Role or a Role outside this set, THEN THE Access_Control SHALL deny all actions for that User and display an authorization error message.
2. WHERE the User's Role is authorized for a requested action, WHEN an authenticated User requests that action, THE Access_Control SHALL permit the action to proceed.
3. IF an authenticated User requests an action that the User's Role is not authorized to perform, THEN THE Access_Control SHALL deny the action, make no change to system data, and display an authorization error message indicating the action is not permitted for the User's Role.
4. WHERE an action is not explicitly authorized for a User's Role by these acceptance criteria, THE Access_Control SHALL treat that action as unauthorized for that Role.
5. THE Access_Control SHALL authorize the Fleet Manager Role to create, read, update, and retire Vehicles and to manage Maintenance Logs.
6. THE Access_Control SHALL authorize the Safety Officer Role to read and update Driver compliance data including License Expiry Date, Safety Score, and Driver Status.
7. THE Access_Control SHALL authorize the Financial Analyst Role to read Fuel Logs, Expenses, Operational Cost, and analytics reports.
8. THE Access_Control SHALL authorize the Driver Role to create Trips, assign Vehicles and Drivers to Trips, and read active Trips.

### Requirement 3: Vehicle Registry

**User Story:** As a Fleet Manager, I want to maintain a master list of vehicles, so that I have an accurate record of every fleet asset.

#### Acceptance Criteria

1. WHEN a Fleet Manager submits a new Vehicle with a non-empty Registration Number, a non-empty Vehicle Name/Model, a Type, a Maximum Load Capacity greater than 0 and at most 100,000 kilograms, an Odometer greater than or equal to 0 and at most 10,000,000 kilometers, and an Acquisition Cost greater than or equal to 0, THE Vehicle_Registry SHALL create the Vehicle with Status set to Available.
2. IF a Fleet Manager submits a Vehicle whose Registration Number matches an existing Vehicle, THEN THE Vehicle_Registry SHALL reject the submission, create no Vehicle, and display a uniqueness error message.
3. THE Vehicle_Registry SHALL restrict Vehicle Status to one of {Available, On Trip, In Shop, Retired}.
4. WHEN a Fleet Manager requests the Vehicle list, THE Vehicle_Registry SHALL display all Vehicles with their current Status.
5. WHEN a Fleet Manager updates an existing Vehicle's editable fields (Vehicle Name/Model, Type, Maximum Load Capacity, Odometer, and Acquisition Cost) with values within the valid ranges defined in criterion 1, THE Vehicle_Registry SHALL persist the updated values while leaving the Registration Number unchanged.
6. WHEN a Fleet Manager retires a Vehicle, THE Vehicle_Registry SHALL set that Vehicle's Status to Retired.
7. THE Vehicle_Registry SHALL set a Vehicle's Status to Retired only WHEN a Fleet Manager explicitly retires that Vehicle.
8. IF a Fleet Manager submits a new Vehicle with a missing required field or a numeric field outside its valid range defined in criterion 1, THEN THE Vehicle_Registry SHALL reject the submission, create no Vehicle, and display a validation error message identifying the invalid field.
9. IF persisting an updated Vehicle fails, THEN THE Vehicle_Registry SHALL display an error message and retain the Vehicle's previous field values.

### Requirement 4: Driver Management

**User Story:** As a Safety Officer, I want to maintain driver profiles with license and safety information, so that only compliant drivers operate vehicles.

#### Acceptance Criteria

1. WHEN a User with an authorized Role submits a new Driver with a non-empty Name, a non-empty License Number, a License Category, a valid License Expiry Date, a Contact Number, and a Safety Score greater than or equal to 0 and at most 100, THE Driver_Registry SHALL create the Driver with Status set to Available.
2. THE Driver_Registry SHALL restrict Driver Status to one of {Available, On Trip, Off Duty, Suspended}.
3. WHEN a User with an authorized Role requests the Driver list, THE Driver_Registry SHALL display all Drivers with their current Status and License Expiry Date.
4. WHEN a User with an authorized Role updates an existing Driver's editable fields, THE Driver_Registry SHALL persist the updated values, and IF persistence fails, THEN THE Driver_Registry SHALL display an error message and retain the previous values.
5. IF a Driver's License Expiry Date is earlier than the system's current date, THEN THE Driver_Registry SHALL display that Driver as having an Expired License.
6. IF a Driver's License Expiry Date is equal to or later than the system's current date, THEN THE Driver_Registry SHALL display that Driver's license as valid.
7. IF a User with an authorized Role submits a new Driver with a missing required field, a Safety Score outside the range 0 to 100, or an invalid License Expiry Date, THEN THE Driver_Registry SHALL reject the submission, create no Driver, and display a validation error message identifying the invalid field.
8. IF a User with an authorized Role submits a new Driver whose License Number matches an existing Driver, THEN THE Driver_Registry SHALL reject the submission, create no Driver, and display a uniqueness error message.

### Requirement 5: Trip Creation with Dispatch Validations

**User Story:** As a Driver, I want to create trips by selecting an eligible vehicle and driver, so that only valid, safe dispatches are scheduled.

#### Acceptance Criteria

1. WHEN a User creates a Trip with a source, a destination, a selected Vehicle, a selected Driver, a Cargo Weight, and a Planned Distance all provided, THE Trip_Service SHALL record these values with Trip Status set to Draft.
2. THE Trip_Service SHALL include in the Dispatch Selection Pool only Vehicles whose Status is Available.
3. THE Trip_Service SHALL exclude from the Dispatch Selection Pool every Vehicle whose Status is Retired or In Shop.
4. THE Trip_Service SHALL exclude from the Dispatch Selection Pool every Driver whose license is an Expired License or whose Status is one of On Trip, Off Duty, or Suspended.
5. IF a User attempts to assign a Driver whose Status is On Trip or a Vehicle whose Status is On Trip to a Trip, THEN THE Trip_Service SHALL reject the assignment, leave the Trip unchanged, and display a conflict error message identifying the conflicting Vehicle or Driver.
6. IF a User submits a Trip whose Cargo Weight is greater than the selected Vehicle's Maximum Load Capacity, THEN THE Trip_Service SHALL reject the Trip and display a capacity error message.
7. WHERE a Trip's Cargo Weight is less than or equal to the selected Vehicle's Maximum Load Capacity and both the selected Vehicle and Driver are eligible, THE Trip_Service SHALL allow the Trip to be dispatched.
8. IF a User submits a Trip with a missing required field, a Cargo Weight less than or equal to 0 kilograms, or a Planned Distance less than or equal to 0 kilometers, THEN THE Trip_Service SHALL reject the Trip, retain no Draft, and display a validation error message identifying the invalid field.

### Requirement 6: Trip Lifecycle and Automatic Status Transitions

**User Story:** As a Driver, I want vehicle and driver statuses to update automatically as trips progress, so that fleet availability always reflects reality without manual bookkeeping.

#### Acceptance Criteria

1. THE Trip_Service SHALL restrict Trip Status to one of {Draft, Dispatched, Completed, Cancelled}.
2. WHEN a User dispatches a Trip whose current Trip Status is Draft, THE Trip_Service SHALL set the Trip Status to Dispatched and set both the assigned Vehicle Status and assigned Driver Status to On Trip.
3. WHEN a User completes a Trip whose current Trip Status is Dispatched by entering a final Odometer reading greater than or equal to the assigned Vehicle's current Odometer and a fuel consumed value greater than or equal to 0, THE Trip_Service SHALL set the Trip Status to Completed and set both the assigned Vehicle Status and assigned Driver Status to Available.
4. WHEN a User cancels a Trip whose current Trip Status is Dispatched, THE Trip_Service SHALL set the Trip Status to Cancelled and set both the assigned Vehicle Status and assigned Driver Status to Available.
5. WHEN a User completes a Trip with a final Odometer reading greater than or equal to the assigned Vehicle's current Odometer, THE Trip_Service SHALL update the assigned Vehicle's Odometer to the entered final reading.
6. IF a User attempts to complete or cancel a Trip whose current Trip Status is not Dispatched, THEN THE Trip_Service SHALL reject the request, preserve the Trip Status and the assigned Vehicle and Driver Statuses, and display an error message.
7. IF a User submits a final Odometer reading less than the assigned Vehicle's current Odometer or a fuel consumed value less than 0 when completing a Trip, THEN THE Trip_Service SHALL reject the completion, preserve the Trip Status and the assigned Vehicle's Odometer, and display a validation error message.

### Requirement 7: Maintenance Workflow

**User Story:** As a Fleet Manager, I want to log maintenance for a vehicle, so that vehicles under service are automatically removed from dispatch and restored when service completes.

#### Acceptance Criteria

1. WHEN a Fleet Manager creates an Active Maintenance Record for a Vehicle whose Status is not Retired, THE Maintenance_Service SHALL set that Vehicle's Status to In Shop.
2. WHILE a Vehicle has an Active Maintenance Record, THE Trip_Service SHALL exclude that Vehicle from the Dispatch Selection Pool.
3. WHEN a Fleet Manager closes a Maintenance Record for a Vehicle whose Status is not Retired, THE Maintenance_Service SHALL set that Vehicle's Status to Available.
4. WHERE a Vehicle's Status is Retired, THE Maintenance_Service SHALL leave that Vehicle's Status as Retired when a Maintenance Record is closed.
5. WHEN a Fleet Manager records a maintenance cost greater than 0 and at most 999,999,999.99 on a Maintenance Record, THE Maintenance_Service SHALL associate that cost with the corresponding Vehicle for Operational Cost computation.
6. IF a Fleet Manager submits a maintenance cost equal to 0, THEN THE Maintenance_Service SHALL exclude that entry from Operational Cost computation.
7. IF a Fleet Manager attempts to create an Active Maintenance Record for a Vehicle whose Status is Retired, THEN THE Maintenance_Service SHALL reject the request, retain the Vehicle's Retired Status, and display an error message indicating the Vehicle is Retired.
8. IF a Fleet Manager submits a maintenance cost less than 0 or greater than 999,999,999.99, THEN THE Maintenance_Service SHALL reject the cost entry, exclude it from Operational Cost computation, and display a validation error message.

### Requirement 8: Fuel and Expense Management

**User Story:** As a Financial Analyst, I want to record fuel logs and expenses per vehicle, so that operational costs are tracked accurately.

#### Acceptance Criteria

1. WHEN a User records a Fuel Log whose liters is greater than 0, whose cost is greater than or equal to 0, and whose date is not later than the current date for a Vehicle, THE Expense_Service SHALL persist the Fuel Log associated with that Vehicle.
2. IF a User submits a Fuel Log whose liters is less than or equal to 0, whose cost is less than 0, or whose date is later than the current date, THEN THE Expense_Service SHALL reject the Fuel Log, display a validation error message indicating the invalid field, and not persist the Fuel Log.
3. WHEN a User records an Expense such as a toll or maintenance charge whose cost is greater than or equal to 0 and whose date is not later than the current date for a Vehicle, THE Expense_Service SHALL persist the Expense associated with that Vehicle.
4. IF a User submits an Expense whose cost is less than 0 or whose date is later than the current date, THEN THE Expense_Service SHALL reject the Expense, display a validation error message indicating the invalid field, and not persist the Expense.
5. THE Expense_Service SHALL compute Operational Cost for a Vehicle as the sum of that Vehicle's total fuel cost, computed as the sum of the costs of all persisted Fuel Logs for that Vehicle, and that Vehicle's total maintenance cost, computed as the sum of the maintenance costs associated with that Vehicle.
6. WHEN a Fuel Log or maintenance cost for a Vehicle is created, updated, or removed, THE Expense_Service SHALL recompute that Vehicle's Operational Cost using the current records within 2 seconds, such that any subsequent read of that Vehicle's Operational Cost reflects the change.

### Requirement 9: Reports and Analytics

**User Story:** As a Financial Analyst, I want reports on efficiency, utilization, cost, and ROI, so that I can evaluate fleet profitability.

#### Acceptance Criteria

1. THE Analytics_Service SHALL compute Fuel Efficiency for a Vehicle in kilometers per liter as the Vehicle's total distance travelled divided by its total fuel consumed, rounded to 2 decimal places.
2. THE Analytics_Service SHALL compute Fleet Utilization as the percentage, in the range 0 to 100 and rounded to 1 decimal place, of Vehicles with Status On Trip relative to the count of non-Retired Vehicles.
3. THE Analytics_Service SHALL compute Vehicle ROI for a Vehicle as (the Vehicle's recorded Revenue − (its maintenance cost + its fuel cost)) ÷ its Acquisition Cost, rounded to 2 decimal places.
4. IF fuel consumed for a Vehicle is zero when computing Fuel Efficiency, THEN THE Analytics_Service SHALL display Fuel Efficiency as not available rather than performing division.
5. IF the count of non-Retired Vehicles is zero when computing Fleet Utilization, THEN THE Analytics_Service SHALL display Fleet Utilization as not available rather than performing division.
6. IF a Vehicle's Acquisition Cost is zero when computing Vehicle ROI, THEN THE Analytics_Service SHALL display Vehicle ROI as not available rather than performing division.
7. WHEN a User requests a report export, THE Analytics_Service SHALL produce a CSV file containing a header row and one row per record in the report data.
8. IF CSV creation fails during a report export, THEN THE Analytics_Service SHALL display an export error message and retain no partial file.

### Requirement 10: Operations Dashboard

**User Story:** As a Fleet Manager, I want a KPI dashboard with filters, so that I have immediate operational visibility.

#### Acceptance Criteria

1. WHEN an authenticated User opens the Dashboard, THE Dashboard_Service SHALL display the count of Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, and Fleet Utilization expressed as a percentage.
2. THE Dashboard_Service SHALL compute Available Vehicles as the count of Vehicles with Status Available.
3. THE Dashboard_Service SHALL compute Vehicles in Maintenance as the count of Vehicles with Status In Shop.
4. THE Dashboard_Service SHALL compute Active Trips as the count of Trips with Status Dispatched and Pending Trips as the count of Trips with Status Draft.
5. WHEN a User applies one or more filters by vehicle type, Vehicle Status, or region, THE Dashboard_Service SHALL display each KPI value computed from only the Vehicles and Trips matching all of the selected filters, and SHALL display a KPI value of zero for any KPI with no matching records.
6. THE TransitOps web interface SHALL render the Dashboard at viewport widths from 360 pixels to 1920 pixels such that all KPI values remain visible without horizontal scrolling.
7. THE Dashboard_Service SHALL compute Active Vehicles as the count of Vehicles whose Status is not Retired.
8. THE Dashboard_Service SHALL compute Drivers On Duty as the count of Drivers whose Status is Available or On Trip.
9. IF the count of non-Retired Vehicles is zero when computing Fleet Utilization, THEN THE Dashboard_Service SHALL display Fleet Utilization as not available rather than performing division.
10. WHEN an authenticated User whose Role is Fleet Manager opens the Dashboard, THE Dashboard_Service SHALL present as the Default Dashboard View the KPIs Active Vehicles, Available Vehicles, Vehicles in Maintenance, and Fleet Utilization, each computed as defined in criteria 2, 3, 7, and Requirement 9 criterion 2 respectively.
11. WHEN an authenticated User whose Role is Driver opens the Dashboard, THE Dashboard_Service SHALL present as the Default Dashboard View the KPIs Pending Trips and Active Trips computed as defined in criterion 4, together with the count of Vehicles whose Status is Available and the count of Drivers whose Status is Available.
12. WHEN an authenticated User whose Role is Safety Officer opens the Dashboard, THE Dashboard_Service SHALL present as the Default Dashboard View the count of Drivers with an Expired License, the count of Drivers with a Soon-To-Expire License, the count of Drivers whose Status is Suspended, Drivers On Duty computed as defined in criterion 8, and the Safety Score of each displayed Driver.
13. WHEN an authenticated User whose Role is Financial Analyst opens the Dashboard, THE Dashboard_Service SHALL present as the Default Dashboard View a financial summary comprising Operational Cost, Fuel Efficiency, and Vehicle ROI, each computed as defined in Requirement 8 criterion 5 and Requirement 9 criteria 1 and 3.
14. THE Dashboard_Service SHALL allow any authenticated User, regardless of Role, to view the complete set of KPIs defined in criterion 1, such that the Default Dashboard View of criteria 10 through 13 governs initial emphasis only and does not prevent the User from viewing any KPI defined in criterion 1.

---

> **Bonus tier (Requirements 11–16):** Nice-to-have enhancements. These SHALL be implemented only after all mandatory-tier requirements are complete.

### Requirement 11: Visual Analytics Charts

**User Story:** As a Financial Analyst, I want charts of key metrics, so that I can interpret trends visually.

#### Acceptance Criteria

1. WHERE visual analytics are enabled, WHEN a User opens the reports view, THE Analytics_Service SHALL display a chart for each metric among Operational Cost and Fleet Utilization that has available data, independent of whether the other metric has available data.

### Requirement 12: PDF Export

**User Story:** As a Financial Analyst, I want PDF exports of reports, so that I can share formatted summaries.

#### Acceptance Criteria

1. WHERE PDF export is enabled, WHEN a User requests a PDF export, THE Analytics_Service SHALL produce a PDF file containing the report data.
2. WHERE PDF export is enabled, IF PDF generation fails, THEN THE Analytics_Service SHALL display an export error message.

### Requirement 13: License Expiry Reminders

**User Story:** As a Safety Officer, I want to be reminded of soon-to-expire licenses, so that I can act before drivers become non-compliant.

#### Acceptance Criteria

1. WHERE email reminders are enabled, WHEN a Driver's License Expiry Date falls within the configured reminder window, THE TransitOps SHALL send an email reminder to the Safety Officer, including licenses that have recently expired but remain within that window.

### Requirement 14: Vehicle Document Management

**User Story:** As a Fleet Manager, I want to attach documents to vehicles, so that registration and insurance records are stored centrally.

#### Acceptance Criteria

1. WHERE document management is enabled, WHEN a Fleet Manager uploads a document for a Vehicle, THE Vehicle_Registry SHALL store the document associated with that Vehicle.
2. WHERE document management is enabled, IF document storage fails, THEN THE Vehicle_Registry SHALL display a storage error message and retain the Vehicle record without the document.

### Requirement 15: Search, Filter, and Sort

**User Story:** As a User, I want to search, filter, and sort lists, so that I can find records quickly.

#### Acceptance Criteria

1. WHERE search and sorting are enabled, WHEN a User enters a search term and a sort order on a Vehicle or Driver list, THE TransitOps SHALL display the matching records in the requested order.
2. WHERE search and sorting are enabled, WHEN a User enters a search term without specifying a sort order, THE TransitOps SHALL display the matching records in the system's default order.

### Requirement 16: Dark Mode

**User Story:** As a User, I want a dark color theme, so that I can reduce eye strain.

#### Acceptance Criteria

1. WHERE dark mode is enabled, WHEN a User selects the dark theme, THE TransitOps web interface SHALL render using the dark color theme.
