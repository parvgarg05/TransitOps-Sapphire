import 'dotenv/config';
import { PrismaClient, RoleType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Parse connection string manually for Prisma v7 adapter
const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const url = new URL(connectionString);

const pool = new Pool({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  database: url.pathname.slice(1).split('?')[0],
  user: url.username,
  password: url.password,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');

  // Clean existing data (optional - for development resets)
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  console.log('Cleared existing users and roles');

  // Create the four roles
  const roles = [
    RoleType.FLEET_MANAGER,
    RoleType.DRIVER,
    RoleType.SAFETY_OFFICER,
    RoleType.FINANCIAL_ANALYST,
  ];

  const createdRoles = await Promise.all(
    roles.map((roleName) =>
      prisma.role.create({
        data: {
          name: roleName,
        },
      })
    )
  );

  console.log(`Created ${createdRoles.length} roles`);

  // Define demo users with bcrypt-hashed passwords
  // Password for all demo users: "TransitOps2024"
  const SALT_ROUNDS = 10;
  const demoPassword = 'TransitOps2024';
  const hashedPassword = await bcrypt.hash(demoPassword, SALT_ROUNDS);

  const demoUsers = [
    {
      email: 'fleetmanager@transitops.com',
      roleType: RoleType.FLEET_MANAGER,
    },
    {
      email: 'driver@transitops.com',
      roleType: RoleType.DRIVER,
    },
    {
      email: 'safetyofficer@transitops.com',
      roleType: RoleType.SAFETY_OFFICER,
    },
    {
      email: 'analyst@transitops.com',
      roleType: RoleType.FINANCIAL_ANALYST,
    },
  ];

  // Create demo users
  const createdUsers = await Promise.all(
    demoUsers.map((user) => {
      const role = createdRoles.find((r) => r.name === user.roleType);
      if (!role) {
        throw new Error(`Role ${user.roleType} not found`);
      }

      return prisma.user.create({
        data: {
          email: user.email,
          passwordHash: hashedPassword,
          roleId: role.id,
        },
        include: {
          role: true,
        },
      });
    })
  );

  console.log(`Created ${createdUsers.length} demo users`);
  console.log('\nDemo Users (all passwords: "TransitOps2024"):');
  createdUsers.forEach((user) => {
    console.log(`  - ${user.email} (${user.role.name})`);
  });

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
