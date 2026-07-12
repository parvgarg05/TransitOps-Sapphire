# TransitOps - Smart Transport Operations Platform

A centralized SaaS-style web application that digitizes transport operations for logistics companies.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: Auth.js (NextAuth)
- **Testing**: Vitest + fast-check (Property-Based Testing)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker (for local PostgreSQL) or a managed Postgres instance (Neon/Supabase)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up your environment variables:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Start PostgreSQL (choose one option):

**Option A: Local Docker**
```bash
docker-compose up -d
```

**Option B: Managed Database**
- Update `DATABASE_URL` in `.env` with your Neon or Supabase connection string

4. Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed the database

## Project Structure

```
├── app/                    # Next.js App Router pages
├── domain/                 # Pure business logic (no I/O)
├── prisma/                 # Database schema and migrations
├── components/             # React components
├── lib/                    # Utilities and helpers
└── __tests__/             # Test files
```

## Features

### Mandatory (8-hour hackathon scope)
- ✅ Authentication with RBAC
- ✅ Vehicle Registry
- ✅ Driver Management
- ✅ Trip Management with validations
- ✅ Automatic status transitions
- ✅ Maintenance workflow
- ✅ Fuel & Expense tracking
- ✅ Operations Dashboard with KPIs
- ✅ Reports & Analytics

### Bonus (if time permits)
- Visual analytics charts
- PDF export
- License expiry email reminders
- Vehicle document management
- Advanced search/filter/sort
- Dark mode

## License

MIT
