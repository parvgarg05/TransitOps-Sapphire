# TransitOps

A centralized transport operations platform that digitizes the full lifecycle of fleet management — vehicle registry, driver management, trip dispatch, maintenance, fuel/expense logging, and operational analytics — while enforcing business rules and role-based access.

TransitOps replaces the spreadsheets and manual logbooks many logistics teams still rely on, cutting down on scheduling conflicts, underused vehicles, missed maintenance, expired licenses, and blind spots in cost tracking.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn-style UI components
- **Database**: PostgreSQL via Prisma ORM (v7, `@prisma/adapter-pg`)
- **Authentication**: NextAuth (Auth.js) — Credentials provider with JWT sessions
- **Password hashing**: bcrypt
- **Charts**: Recharts
- **PDF / CSV export**: jsPDF + jspdf-autotable, custom CSV serializer
- **Validation**: Zod + react-hook-form
- **Testing**: Vitest + fast-check (property-based testing)

## Architecture

The codebase separates pure business logic from I/O to keep rules testable and framework-agnostic.

```
├── app/                    # Next.js App Router (pages + API route handlers)
│   ├── api/                # Backend REST endpoints
│   ├── dashboard/          # Feature pages: dashboard, vehicles, drivers,
│   ├── vehicles/           #   trips, maintenance, expenses, reports
│   ├── login/              # Credentials login page
│   └── layout.tsx          # Root layout (SessionProvider + app shell)
├── domain/                 # Pure business logic, no I/O (heavily unit-tested)
│   ├── rbac.ts             # Role/Action permission matrix (fail-closed)
│   ├── tripStateMachine.ts # Trip lifecycle transitions
│   ├── maintenanceStateMachine.ts
│   ├── dispatch.ts         # Dispatch eligibility rules
│   ├── capacityConflict.ts # Cargo-weight vs. capacity checks
│   ├── license.ts          # License expiry validation
│   ├── lockout.ts          # Failed-login lockout policy
│   ├── analytics.ts        # Fuel efficiency, ROI, cost calculations
│   ├── dashboardKpis.ts    # KPI aggregation
│   ├── csvExport.ts        # CSV serialization
│   └── validators/         # Zod input schemas
├── services/               # Application services (domain logic + Prisma I/O)
├── lib/                    # auth config, db client, session, mailer, utils
├── prisma/                 # schema, seed, migrations
├── components/             # React UI components grouped by feature
├── middleware.ts           # Route protection + RBAC enforcement
└── __tests__/              # Integration/API-level tests
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker (for local PostgreSQL) or a managed Postgres instance (Neon/Supabase)

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up your environment variables:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env`:

   | Variable | Description |
   |---|---|
   | `DATABASE_URL` | PostgreSQL connection string |
   | `NEXTAUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
   | `NEXTAUTH_SECRET` | Secret used to sign JWT sessions — generate with `openssl rand -base64 32` |

3. Start PostgreSQL (choose one):

   **Option A — Local Docker** (credentials match `.env.example`):

   ```bash
   docker-compose up -d
   ```

   **Option B — Managed database:** set `DATABASE_URL` to your Neon/Supabase connection string.

4. Generate the Prisma client, apply the schema, and seed demo data:

   ```bash
   npm run db:generate
   npm run db:push      # or: npm run db:migrate
   npm run db:seed
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Demo Accounts

The seed script creates one user per role. All demo accounts share the password **`TransitOps2024`**.

| Email | Role | Access |
|---|---|---|
| `fleetmanager@transitops.com` | Fleet Manager | Vehicles + maintenance lifecycle |
| `driver@transitops.com` | Driver | Trip creation + dispatch |
| `safetyofficer@transitops.com` | Safety Officer | Driver compliance + license tracking |
| `analyst@transitops.com` | Financial Analyst | Fuel, expenses, and analytics |

The seed also loads 18 vehicles, 15 drivers, and a spread of trips, maintenance logs, fuel logs, and expenses across every status — including expired-license and soon-to-expire drivers for testing compliance rules.

## Available Scripts

- `npm run dev` — Start the development server
- `npm run build` — Build for production
- `npm run start` — Start the production server
- `npm run lint` — Run ESLint
- `npm run test` — Run the test suite once
- `npm run test:watch` — Run tests in watch mode
- `npm run test:ui` — Run tests with the Vitest UI
- `npm run db:generate` — Generate the Prisma client
- `npm run db:push` — Push schema changes to the database
- `npm run db:migrate` — Create and run a migration (dev)
- `npm run db:studio` — Open Prisma Studio
- `npm run db:seed` — Seed the database with demo data

## Roles & Permissions

Authorization uses a static `(Role, Action)` permission matrix with **fail-closed** semantics — any pair not explicitly granted is denied. See `domain/rbac.ts`.

| Role | Authorized areas |
|---|---|
| **Fleet Manager** | Create/read/update/retire vehicles, open/close maintenance, record maintenance cost |
| **Driver** | Create, read, and assign trips |
| **Safety Officer** | Read drivers, update driver compliance |
| **Financial Analyst** | Read fuel, expenses, analytics, and operational cost |

All roles can view the dashboard. Login is protected by bcrypt password hashing, a generic error message to avoid account enumeration, and a 5-failure account lockout (`domain/lockout.ts`, `domain/loginPolicy.ts`).

## Data Model

Core entities (`prisma/schema.prisma`):

- **Role / User** — RBAC roles and credential-based accounts with lockout tracking
- **Vehicle** — registration (unique), type, region, load capacity, odometer, acquisition cost, revenue, status (`AVAILABLE`, `ON_TRIP`, `IN_SHOP`, `RETIRED`)
- **Driver** — license number (unique), category, expiry, safety score, status (`AVAILABLE`, `ON_TRIP`, `OFF_DUTY`, `SUSPENDED`)
- **Trip** — source/destination, vehicle, driver, cargo weight, planned distance, final odometer/fuel, status (`DRAFT`, `DISPATCHED`, `COMPLETED`, `CANCELLED`)
- **MaintenanceLog** — description, cost, open/closed state
- **FuelLog** — liters, cost, date
- **Expense** — category (toll, maintenance charge, other), cost, date
- **VehicleDocument** — uploaded document metadata (bonus feature)

## Business Rules

Enforced in the domain and service layers:

- Vehicle registration numbers must be unique.
- Retired or in-shop vehicles never appear in the dispatch pool.
- Drivers with expired licenses or `SUSPENDED` status cannot be assigned to trips.
- A driver or vehicle already `ON_TRIP` cannot be assigned to another trip.
- Cargo weight must not exceed the vehicle's maximum load capacity.
- Dispatching a trip sets both vehicle and driver to `ON_TRIP`.
- Completing a trip returns both vehicle and driver to `AVAILABLE`.
- Cancelling a dispatched trip restores vehicle and driver to `AVAILABLE`.
- Opening a maintenance record sets the vehicle to `IN_SHOP` (hidden from dispatch).
- Closing maintenance restores the vehicle to `AVAILABLE` (unless retired).

## API Overview

REST endpoints live under `app/api/`:

- `auth/*` — NextAuth handlers plus login, logout, and session routes
- `dashboard` — KPI aggregation
- `vehicles`, `vehicles/[id]` — vehicle CRUD and retire
- `drivers`, `drivers/[id]` — driver management and compliance
- `trips`, `trips/[id]/dispatch|complete|cancel`, `trips/dispatch-pool` — trip lifecycle
- `maintenance`, `maintenance/[id]/close|cost` — maintenance workflow
- `fuel`, `expenses` — logging
- `reports/fuel-efficiency|fleet-utilization|vehicle-roi|export` — analytics and CSV export
- `reminders/license-expiry` — license expiry reminders

## Features

### Core
- Authentication with RBAC and account lockout
- Vehicle registry with unique-registration enforcement
- Driver management with license and compliance tracking
- Trip management with capacity and eligibility validation
- Automatic vehicle/driver status transitions across the trip lifecycle
- Maintenance workflow with automatic status changes
- Fuel and expense tracking with per-vehicle operational cost
- Operations dashboard with KPIs (active/available/in-shop vehicles, active/pending trips, drivers on duty, fleet utilization)
- Reports & analytics: fuel efficiency, fleet utilization, operational cost, vehicle ROI

### Bonus
- Visual analytics charts (Recharts)
- PDF and CSV export
- License-expiry email reminders (`lib/mailer.ts`)
- Vehicle document management

## Testing

The domain layer is covered by unit tests and property-based tests (fast-check) for invariants like RBAC fail-closed behavior, trip/maintenance state machines, capacity conflicts, license validation, and analytics calculations. Run the full suite:

```bash
npm run test
```

## License

MIT
