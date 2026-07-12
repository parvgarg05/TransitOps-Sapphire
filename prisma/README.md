# Prisma Database Setup

## Seed Script

The seed script (`seed.ts`) creates the initial database data for TransitOps:

### What it creates:

1. **Four Roles:**
   - FLEET_MANAGER
   - DRIVER
   - SAFETY_OFFICER
   - FINANCIAL_ANALYST

2. **Four Demo Users** (one per role):
   - `fleetmanager@transitops.com` - FLEET_MANAGER
   - `driver@transitops.com` - DRIVER
   - `safetyofficer@transitops.com` - SAFETY_OFFICER
   - `analyst@transitops.com` - FINANCIAL_ANALYST

### Demo Credentials:
All demo users have the same password: **`TransitOps2024`**

### Running the Seed Script:

```bash
npm run db:seed
```

### Notes:
- The script uses bcrypt with 10 salt rounds to hash passwords securely
- The script will clear existing users and roles before seeding (safe for development)
- Requires Prisma v7 with the `@prisma/adapter-pg` package for PostgreSQL connections

### Requirements Fulfilled:
- **Requirement 2.1**: Creates all four roles from the RBAC system
- **Requirement 1.4**: Uses bcrypt to hash passwords (never stores plaintext)
