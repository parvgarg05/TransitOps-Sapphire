# Implementation Plan: TransitOps

## Overview

This plan implements TransitOps in the sequence defined by the design's Scope-to-Timeline mapping: Scaffold → Auth + RBAC → Domain core → Registries → Trips + Maintenance → Expenses + Analytics + Dashboard → Polish, followed by an optional Bonus tier.

The build is **pure-domain-first**: every mandatory business rule (validators, dispatch eligibility, capacity/conflict checks, the trip and maintenance state machines, license derivations, analytics, RBAC permission map, dashboard KPI counts, and the role-based default-view mapping) is implemented as a framework-free pure function and property-tested with `fast-check` **before or alongside** the service/UI wiring. Multi-row status transitions (trip dispatch/complete/cancel, maintenance open/close) are persisted inside a single Prisma transaction.

Stack: Next.js 14 (App Router) + TypeScript, Prisma ORM over PostgreSQL, Auth.js Credentials + bcrypt, Tailwind + shadcn/ui, Vitest + fast-check.

Property tests satisfy the design's Testing Strategy: minimum 100 iterations (`fc.assert(..., { numRuns: 100 })`) and each test is tagged `// Feature: transitops, Property {number}: {property_text}`. Properties 1–35 from the design's Correctness Properties section are each covered by a property test, referenced by number in the relevant task.

Tasks marked with `*` are optional. Test sub-tasks are optional so an MVP can be reached faster; the entire **Bonus tier (task 16)** is optional and must be attempted only after every mandatory task (1–15) is complete.

## Tasks

- [ ] 1. Scaffold project and data model
  - [x] 1.1 Initialize the Next.js 14 + TypeScript app
    - Create the Next.js App Router project with TypeScript, Tailwind CSS, and shadcn/ui
    - Add and configure Vitest + fast-check for testing; add `test` script
    - Add `docker-compose` Postgres service and `.env` with `DATABASE_URL` (supports local Docker or managed Neon/Supabase)
    - _Requirements: 10.6_

  - [x] 1.2 Define shared domain types and enums
    - Create `domain/types.ts` with `Role`, `VehicleStatus`, `DriverStatus`, `TripStatus` unions and the `Result<T>` = `{ ok: true; ... } | { ok: false; error }` type
    - Define `Vehicle`, `Driver`, `Trip`, `MaintenanceLog`, `FuelLog`, `Expense` domain shapes and the `startOfDay`/`addDays` date helpers
    - _Requirements: 2.1, 3.3, 4.2, 6.1_

  - [x] 1.3 Define the Prisma schema and initial migration
    - Model Role, User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense (and bonus VehicleDocument) using Prisma `Decimal` for currency/measurement fields
    - Add `UNIQUE` constraints on `Vehicle.registrationNumber` and `Driver.licenseNumber`; run the initial migration
    - _Requirements: 3.2, 4.8_

  - [ ] 1.4 Create the seed script for roles and users
    - Seed the four roles and one demo User per role with bcrypt-hashed passwords
    - _Requirements: 2.1, 1.4_

- [ ] 2. Implement Auth + RBAC
  - [ ] 2.1 Implement password hashing utilities
    - Create `domain/password.ts` with bcrypt hash + verify; never store or return plaintext
    - _Requirements: 1.4_

  - [ ] 2.2 Write property test for password hashing
    - **Property 1: Passwords are stored hashed and verifiable, never as plaintext**
    - **Validates: Requirements 1.4**

  - [ ] 2.3 Implement credential validation and generic rejection
    - Create `domain/loginPolicy.ts`: reject email > 254 or password > 128 chars before any lookup; produce a single generic failure message with no session on any invalid credential
    - _Requirements: 1.2, 1.8_

  - [ ] 2.4 Write property tests for credential validation
    - **Property 2: Login rejection is generic and session-free for all invalid credentials**
    - **Property 5: Credential length limits are enforced**
    - **Validates: Requirements 1.2, 1.8**

  - [ ] 2.5 Implement account lockout logic
    - Create `domain/lockout.ts`: pure function over an attempt timeline computing lock state for 5 consecutive failures within a 15-minute window (15-minute lock)
    - _Requirements: 1.6_

  - [ ] 2.6 Write property test for account lockout
    - **Property 3: Account lockout triggers on 5 consecutive failures within 15 minutes**
    - **Validates: Requirements 1.6**

  - [ ] 2.7 Implement idle session expiry logic
    - Create `domain/session.ts`: pure `isSessionExpired(lastActivityAt, now)` returning expired iff elapsed > 30 minutes
    - _Requirements: 1.7_

  - [ ] 2.8 Write property test for idle session expiry
    - **Property 4: Idle sessions expire after 30 minutes**
    - **Validates: Requirements 1.7**

  - [ ] 2.9 Implement the RBAC permission matrix
    - Create `domain/rbac.ts` with the static `(Role, Action)` map and fail-closed `can(role, action)`; unknown/no role denied everything
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ] 2.10 Write property test for RBAC matrix
    - **Property 6: RBAC is fail-closed and matches the grant matrix exactly**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

  - [ ] 2.11 Wire Auth.js Credentials provider and auth routes
    - Configure Auth.js Credentials + JWT cookie; implement `/api/auth/login`, `/api/auth/logout`, `/api/auth/session` using the hashing, lockout, and generic-rejection logic
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [ ] 2.12 Implement Auth + RBAC middleware
    - Create `middleware.ts` that verifies the session, applies idle-timeout, redirects unauthenticated app requests to `/login` with no page content, and calls `can()` before routing (403 with no data change on deny)
    - _Requirements: 1.3, 1.7, 2.2, 2.3, 2.4_

  - [ ] 2.13 Write integration tests for auth flows
    - Login issues a session cookie; logout invalidates it; unauthenticated request to a protected route redirects to `/login`
    - _Requirements: 1.1, 1.3, 1.5_

- [ ] 3. Implement the pure domain core
  - [ ] 3.1 Implement vehicle field validators
    - Create `domain/validators/vehicle.ts`: require non-empty reg no./name/type, 0 < capacity ≤ 100,000, 0 ≤ odometer ≤ 10,000,000, acquisition cost ≥ 0; return field-specific rejection; valid input yields initial status Available
    - _Requirements: 3.1, 3.8_

  - [ ] 3.2 Write property test for vehicle validators
    - **Property 7: Valid vehicle input creates an Available vehicle; invalid input is rejected by field**
    - **Validates: Requirements 3.1, 3.8**

  - [ ] 3.3 Implement driver field validators
    - Create `domain/validators/driver.ts`: require non-empty name/license no./category/contact, valid expiry date, 0 ≤ safety score ≤ 100; return field-specific rejection; valid input yields initial status Available
    - _Requirements: 4.1, 4.7_

  - [ ] 3.4 Write property test for driver validators
    - **Property 11: Valid driver input creates an Available driver; invalid input is rejected by field**
    - **Validates: Requirements 4.1, 4.7**

  - [ ] 3.5 Implement the uniqueness check helper
    - Create `domain/uniqueness.ts`: pure check that a proposed registration/license identifier does not collide with an existing set
    - _Requirements: 3.2, 4.8_

  - [ ] 3.6 Write property test for uniqueness
    - **Property 8: Registration numbers and license numbers are unique**
    - **Validates: Requirements 3.2, 4.8**

  - [ ] 3.7 Implement license derivations
    - Create `domain/license.ts` with `isLicenseExpired` (expiry < today) and `isLicenseSoonToExpire` (today ≤ expiry ≤ today+30, inclusive), both taking `today` as a parameter
    - _Requirements: 4.5, 4.6, 10.12_

  - [ ] 3.8 Write property tests for license derivations
    - **Property 12: License validity is determined by the expiry-date boundary**
    - **Property 35: Soon-To-Expire License is exactly the inclusive today..today+30 window**
    - **Validates: Requirements 4.5, 4.6, 10.12**

  - [ ] 3.9 Implement dispatch eligibility
    - Create `domain/dispatch.ts`: `eligibleVehicles` (status === Available only) and `eligibleDrivers` (Available and not expired), fail-closed
    - _Requirements: 5.2, 5.3, 5.4, 7.2_

  - [ ] 3.10 Write property tests for dispatch eligibility
    - **Property 13: The dispatch vehicle pool contains exactly the Available vehicles**
    - **Property 14: The dispatch driver pool contains exactly the Available, valid-license drivers**
    - **Validates: Requirements 5.2, 5.3, 5.4, 7.2**

  - [ ] 3.11 Implement capacity and conflict checks
    - Create `domain/capacityConflict.ts`: `capacityOk` (cargo ≤ maxLoad) and `assignmentConflict` identifying the On-Trip vehicle or driver
    - _Requirements: 5.5, 5.6, 5.7_

  - [ ] 3.12 Write property tests for capacity and conflict
    - **Property 15: On-Trip assignment is detected as a conflict with the correct resource**
    - **Property 16: Cargo is accepted if and only if it does not exceed capacity**
    - **Validates: Requirements 5.5, 5.6, 5.7**

  - [ ] 3.13 Implement trip creation validators
    - Create `domain/validators/trip.ts`: require all trip fields, cargo weight > 0, planned distance > 0; valid input yields status Draft; field-specific rejection otherwise
    - _Requirements: 5.1, 5.8_

  - [ ] 3.14 Write property test for trip creation validators
    - **Property 17: Trip creation accepts complete valid input as Draft and rejects invalid input by field**
    - **Validates: Requirements 5.1, 5.8**

  - [ ] 3.15 Implement the trip state machine
    - Create `domain/tripStateMachine.ts` with pure `dispatchTrip`, `completeTrip` (guards odometer ≥ current and fuel ≥ 0, returns odometer update), `cancelTrip`, each returning next trip/vehicle/driver statuses; reject transitions when not Dispatched
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 3.16 Write property tests for the trip state machine
    - **Property 18: Dispatching a Draft trip moves all three entities to On Trip**
    - **Property 19: Valid completion completes the trip, frees resources, and updates the odometer**
    - **Property 20: Cancelling a Dispatched trip frees resources**
    - **Property 21: Complete and cancel are rejected when the trip is not Dispatched**
    - **Property 22: Completion with an invalid odometer or fuel value is rejected without side effects**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

  - [ ] 3.17 Implement the maintenance state machine
    - Create `domain/maintenanceStateMachine.ts` with pure `openMaintenance` (In Shop unless Retired → reject) and `closeMaintenance` (Available unless Retired → keep Retired)
    - _Requirements: 7.1, 7.3, 7.4, 7.7_

  - [ ] 3.18 Write property tests for the maintenance state machine
    - **Property 23: Opening maintenance sends a non-Retired vehicle In Shop and rejects a Retired vehicle**
    - **Property 24: Closing maintenance restores Available unless the vehicle is Retired**
    - **Validates: Requirements 7.1, 7.3, 7.4, 7.7**

  - [ ] 3.19 Write property test for the Retired-terminal invariant
    - Exercise every non-retire operation (trip dispatch/complete/cancel, maintenance open/close) across the trip and maintenance state machines
    - **Property 10: Retired is terminal and only set by explicit retirement**
    - **Validates: Requirements 3.7**

  - [ ] 3.20 Implement fuel, expense, and maintenance-cost validators
    - Create `domain/validators/expense.ts`: fuel log valid iff liters > 0, cost ≥ 0, date ≤ today; expense valid iff cost ≥ 0, date ≤ today; maintenance cost valid iff 0 ≤ cost ≤ 999,999,999.99 with only strictly-positive costs qualifying for operational cost
    - _Requirements: 7.5, 7.6, 7.8, 8.1, 8.2, 8.3, 8.4_

  - [ ] 3.21 Write property tests for fuel/expense/maintenance-cost validators
    - **Property 25: Only positive maintenance costs contribute to operational cost, and out-of-range costs are rejected**
    - **Property 26: Fuel logs are valid exactly when liters, cost, and date are in range**
    - **Property 27: Expenses are valid exactly when cost and date are in range**
    - **Validates: Requirements 7.5, 7.6, 7.8, 8.1, 8.2, 8.3, 8.4**

  - [ ] 3.22 Implement analytics computations
    - Create `domain/analytics.ts` with pure `operationalCost`, `fuelEfficiency` (N/A when fuel = 0, else km/L rounded 2dp), `fleetUtilization` (N/A when no non-Retired, else % bounded 0–100 rounded 1dp), `vehicleROI` (N/A when acquisition = 0, else rounded 2dp); no NaN/Infinity
    - _Requirements: 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.9_

  - [ ] 3.23 Write property tests for analytics computations
    - **Property 28: Operational cost equals total fuel cost plus qualifying maintenance cost, and updates additively on change**
    - **Property 29: Fuel efficiency is guarded division rounded to 2 decimals**
    - **Property 30: Fleet utilization is a guarded percentage in [0, 100] rounded to 1 decimal**
    - **Property 31: Vehicle ROI is guarded division rounded to 2 decimals**
    - **Validates: Requirements 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.9**

  - [ ] 3.24 Implement dashboard KPI counts
    - Create `domain/dashboardKpis.ts`: pure counts (Active/Available/In-Maintenance vehicles, Active/Pending trips, Drivers On Duty) computed over an optionally filtered set; empty matching set yields 0
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8_

  - [ ] 3.25 Write property test for dashboard KPI counts
    - **Property 33: Dashboard KPI counts match their status predicates, including under filters**
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.7, 10.8**

  - [ ] 3.26 Implement the role-based default dashboard view mapping
    - Create `domain/dashboardView.ts` with `FULL_KPI_SET` and pure `defaultDashboardView(role)` returning each role's emphasized subset; full set identical for every role
    - _Requirements: 10.10, 10.11, 10.12, 10.13, 10.14_

  - [ ] 3.27 Write property test for the default view mapping
    - **Property 34: The Default Dashboard View maps each role to its specified subset and never restricts the full KPI set**
    - **Validates: Requirements 10.10, 10.11, 10.12, 10.13, 10.14**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all auth, RBAC, and domain-core tests pass, ask the user if questions arise.

- [ ] 5. Implement the Vehicle Registry
  - [ ] 5.1 Implement the Vehicle_Registry service and API routes
    - Wire `GET/POST /api/vehicles`, `PATCH /api/vehicles/:id` (registration number excluded from update DTO), `POST /api/vehicles/:id/retire` to the vehicle validators and uniqueness check; new vehicles start Available; on persistence failure retain previous values
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ] 5.2 Write property test for vehicle update immutability
    - **Property 9: Vehicle updates preserve the registration number**
    - **Validates: Requirements 3.5**

  - [ ] 5.3 Write integration test for registration-number uniqueness
    - Assert the database `UNIQUE` constraint rejects a duplicate registration number under insert
    - _Requirements: 3.2_

  - [ ] 5.4 Build the Vehicle UI
    - Vehicle list showing current status; create/edit form (reg no. read-only on edit); retire action
    - _Requirements: 3.4, 3.6_

  - [ ] 5.5 Write unit tests for the Vehicle Registry
    - List rendering with status, explicit retire transition, persistence-failure retains previous values (mocked failing repository)
    - _Requirements: 3.4, 3.6, 3.9_

- [ ] 6. Implement Driver Management
  - [ ] 6.1 Implement the Driver_Registry service and API routes
    - Wire `GET/POST /api/drivers`, `PATCH /api/drivers/:id` to the driver validators and uniqueness check; new drivers start Available; list returns status, expiry, and derived license-validity flag; on persistence failure retain previous values
    - _Requirements: 4.1, 4.3, 4.4, 4.7, 4.8_

  - [ ] 6.2 Build the Driver UI
    - Driver list showing status, License Expiry Date, and expired/valid indicator; create/edit form including compliance fields
    - _Requirements: 4.3, 4.5, 4.6_

  - [ ] 6.3 Write unit tests for Driver Management
    - List rendering with status/expiry and validity derivation; persistence-failure retains previous values (mocked failing repository)
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure registry tests pass, ask the user if questions arise.

- [ ] 8. Implement Trips
  - [ ] 8.1 Implement trip creation and the dispatch pool
    - Wire `GET /api/trips`, `GET /api/trips/dispatch-pool` (eligible vehicles + drivers), `POST /api/trips` using the trip validators, capacity check, and conflict check; created trips are Draft
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 7.2_

  - [ ] 8.2 Implement transactional trip transitions
    - Wire `POST /api/trips/:id/dispatch|complete|cancel` to the trip state machine; persist the Trip, Vehicle, and Driver row changes (and odometer update on completion) inside a single Prisma transaction
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 8.3 Write integration test for the trip lifecycle
    - Drive a full Draft→Dispatched→Completed/Cancelled flow through the API and assert vehicle/driver rows change atomically within the transaction
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ] 8.4 Build the Trips UI
    - Trip creation form driven by the dispatch pool; list of trips with status; dispatch/complete/cancel actions
    - _Requirements: 5.1, 6.1_

- [ ] 9. Implement the Maintenance workflow
  - [ ] 9.1 Implement the Maintenance_Service and API routes
    - Wire `POST /api/maintenance` (vehicle → In Shop, reject if Retired), `POST /api/maintenance/:id/close` (→ Available unless Retired), `PATCH /api/maintenance/:id/cost` (validated); persist vehicle-status changes transactionally
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ] 9.2 Build the Maintenance UI
    - Open/close maintenance records for a vehicle and record maintenance cost
    - _Requirements: 7.1, 7.3_

  - [ ] 9.3 Write integration tests for maintenance transitions
    - Open sends non-Retired vehicle In Shop; close restores Available; Retired vehicle open is rejected and stays Retired
    - _Requirements: 7.1, 7.3, 7.4, 7.7_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure trip and maintenance tests pass, ask the user if questions arise.

- [ ] 11. Implement Fuel and Expense management
  - [ ] 11.1 Implement the Expense_Service and API routes
    - Wire `POST /api/fuel`, `POST /api/expenses` (validated), and `GET /api/vehicles/:id/operational-cost` computing fuel cost + qualifying maintenance cost on read from live rows
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 11.2 Build the Fuel/Expense entry UI
    - Forms to record fuel logs and expenses per vehicle and view operational cost
    - _Requirements: 8.1, 8.3, 8.5_

- [ ] 12. Implement Reports and Analytics
  - [ ] 12.1 Implement the report endpoints
    - Wire `GET /api/reports/fuel-efficiency`, `/fleet-utilization`, `/vehicle-roi` to the analytics functions, surfacing "N/A" for guarded-division cases
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 12.2 Implement the CSV export builder and endpoint
    - Create `domain/csvExport.ts` building the full CSV string (header + one row per record) in memory; wire `GET /api/reports/export?format=csv`; throw before offering a file if building fails (no partial file)
    - _Requirements: 9.7, 9.8_

  - [ ] 12.3 Build the Reports UI
    - Render the three reports with N/A handling and a CSV export action
    - _Requirements: 9.1, 9.2, 9.3, 9.7_

  - [ ] 12.4 Write tests for CSV export
    - Property test row count plus an integration test asserting the download has one header row and one row per record
    - **Property 32: CSV export produces one header row plus one row per record**
    - **Validates: Requirements 9.7**

- [ ] 13. Implement the Operations Dashboard
  - [ ] 13.1 Implement the dashboard endpoint
    - Wire `GET /api/dashboard?filters=...&view=default|full`: always compute the full KPI set (using the KPI counts, fleet utilization, and license derivations) and return the role-appropriate default-view subset; apply filters before counting; Fleet Utilization is N/A when no non-Retired vehicles
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12, 10.13, 10.14_

  - [ ] 13.2 Build the responsive Dashboard UI
    - Render KPI cards with the role-based Default Dashboard View emphasized and a toggle to the full KPI set; wire vehicle type / status / region filters
    - _Requirements: 10.1, 10.5, 10.6, 10.14_

  - [ ] 13.3 Verify responsive dashboard layout
    - Snapshot/component checks at 360px, 768px, 1280px, and 1920px for visible KPIs with no horizontal scroll
    - _Requirements: 10.6_

- [ ] 14. Polish and demo readiness
  - [ ] 14.1 Seed demo data and smoke-wire all flows
    - Expand the seed with realistic vehicles, drivers, trips, maintenance, fuel, and expenses; verify navigation links every view together with no orphaned code
    - _Requirements: 10.1_

- [ ] 15. Final checkpoint - Ensure all mandatory tests pass
  - Ensure the full mandatory product (Requirements 1–10) is demoable and all tests pass, ask the user if questions arise.

- [ ] 16. Bonus tier (attempt only if time remains, after tasks 1–15 are complete)
  - [ ] 16.1 Add visual analytics charts
    - Render Recharts charts for Operational Cost and Fleet Utilization, each shown independently when it has available data; reuse existing analytics functions
    - _Requirements: 11.1_

  - [ ] 16.2 Add PDF export
    - Add a PDF renderer beside the CSV writer wired to `GET /api/reports/export?format=pdf`; display an export error on failure
    - _Requirements: 12.1, 12.2_

  - [ ] 16.3 Add license expiry email reminders
    - Send an email reminder to the Safety Officer for licenses within the configured reminder window (including recently expired within the window), reading existing driver license data; mock the mailer in tests
    - _Requirements: 13.1_

  - [ ] 16.4 Add vehicle document management
    - Add the VehicleDocument table + `POST /api/vehicles/:id/documents` upload; on storage failure show an error and retain the vehicle without the document
    - _Requirements: 14.1, 14.2_

  - [ ] 16.5 Add client-side search, filter, and sort
    - Add TanStack Table search/sort over the Vehicle and Driver lists; default order when no sort is specified
    - _Requirements: 15.1, 15.2_

  - [ ] 16.6 Add dark mode
    - Add a Tailwind dark-theme toggle applied across the interface
    - _Requirements: 16.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the entire Bonus tier (task 16) is optional and additive — no bonus task modifies the mandatory data model or domain functions.
- Each task references specific granular requirements for traceability.
- Checkpoints (tasks 4, 7, 10, 15) ensure incremental validation at reasonable breaks.
- Property tests validate the 35 universal correctness properties against the pure domain layer, run at a minimum of 100 iterations, and are tagged `// Feature: transitops, Property {number}: {property_text}`.
- Unit and integration tests cover concrete rendering, persistence-failure, transactional atomicity, uniqueness constraints, and auth/session plumbing that property tests deliberately do not cover.
- Multi-row transitions (trip dispatch/complete/cancel; maintenance open/close) are persisted inside a single Prisma transaction so vehicle/driver/trip statuses never diverge.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1", "2.3", "2.5", "2.7", "2.9", "3.1", "3.3", "3.5", "3.7", "3.9", "3.11", "3.13", "3.15", "3.17", "3.20", "3.22", "3.24", "3.26"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.6", "2.8", "2.10", "2.11", "2.12", "3.2", "3.4", "3.6", "3.8", "3.10", "3.12", "3.14", "3.16", "3.18", "3.19", "3.21", "3.23", "3.25", "3.27"] },
    { "id": 4, "tasks": ["2.13", "5.1", "6.1", "8.1", "8.2", "9.1", "11.1", "12.1", "12.2", "13.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "5.5", "6.2", "6.3", "8.3", "8.4", "9.2", "9.3", "11.2", "12.3", "12.4", "13.2"] },
    { "id": 6, "tasks": ["13.3", "14.1"] },
    { "id": 7, "tasks": ["16.1", "16.2", "16.3", "16.4", "16.5", "16.6"] }
  ]
}
```
