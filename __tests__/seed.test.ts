import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, RoleType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Setup Prisma client with adapter for tests
const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
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

describe('Database Seed Script', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it('should create all four roles', async () => {
    const roles = await prisma.role.findMany();
    
    expect(roles).toHaveLength(4);
    
    const roleNames = roles.map(r => r.name);
    expect(roleNames).toContain(RoleType.FLEET_MANAGER);
    expect(roleNames).toContain(RoleType.DRIVER);
    expect(roleNames).toContain(RoleType.SAFETY_OFFICER);
    expect(roleNames).toContain(RoleType.FINANCIAL_ANALYST);
  });

  it('should create one demo user per role', async () => {
    const users = await prisma.user.findMany({
      include: { role: true }
    });
    
    expect(users).toHaveLength(4);
    
    // Check each role has exactly one user
    const usersByRole = users.reduce((acc, user) => {
      acc[user.role.name] = (acc[user.role.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    expect(usersByRole[RoleType.FLEET_MANAGER]).toBe(1);
    expect(usersByRole[RoleType.DRIVER]).toBe(1);
    expect(usersByRole[RoleType.SAFETY_OFFICER]).toBe(1);
    expect(usersByRole[RoleType.FINANCIAL_ANALYST]).toBe(1);
  });

  it('should hash passwords with bcrypt (Requirement 1.4)', async () => {
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      // Verify password is hashed (bcrypt hashes start with $2b$)
      expect(user.passwordHash).toMatch(/^\$2b\$/);
      
      // Verify password hash is valid and can be compared
      const isValid = await bcrypt.compare('TransitOps2024', user.passwordHash);
      expect(isValid).toBe(true);
      
      // Verify plaintext password is NOT stored
      expect(user.passwordHash).not.toBe('TransitOps2024');
    }
  });

  it('should have unique email addresses for all users', async () => {
    const users = await prisma.user.findMany();
    const emails = users.map(u => u.email);
    const uniqueEmails = new Set(emails);
    
    expect(uniqueEmails.size).toBe(emails.length);
  });

  it('should create users with correct email patterns', async () => {
    const users = await prisma.user.findMany({
      include: { role: true }
    });
    
    const expectedEmails = {
      [RoleType.FLEET_MANAGER]: 'fleetmanager@transitops.com',
      [RoleType.DRIVER]: 'driver@transitops.com',
      [RoleType.SAFETY_OFFICER]: 'safetyofficer@transitops.com',
      [RoleType.FINANCIAL_ANALYST]: 'analyst@transitops.com',
    };
    
    for (const user of users) {
      expect(user.email).toBe(expectedEmails[user.role.name]);
    }
  });
});
