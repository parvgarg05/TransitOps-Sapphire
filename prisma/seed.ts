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

  // Clean existing data in correct order (respecting foreign keys)
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  console.log('Cleared existing data');

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

  // Get Fleet Manager for creating trips
  const fleetManager = createdUsers.find(
    (u) => u.role.name === RoleType.FLEET_MANAGER
  );
  if (!fleetManager) {
    throw new Error('Fleet Manager not found');
  }

  // ========================================
  // CREATE VEHICLES (15-20 vehicles)
  // ========================================
  console.log('\nCreating vehicles...');
  
  const vehicleData = [
    // Trucks
    { reg: 'TRK-001-NTH', name: 'Heavy Hauler Alpha', type: 'Truck', region: 'North', capacity: 12000, odometer: 145230.50, cost: 85000, revenue: 125000, status: 'AVAILABLE' },
    { reg: 'TRK-002-STH', name: 'Heavy Hauler Beta', type: 'Truck', region: 'South', capacity: 12000, odometer: 98450.25, cost: 82000, revenue: 95000, status: 'ON_TRIP' },
    { reg: 'TRK-003-EST', name: 'Freight Master Pro', type: 'Truck', region: 'East', capacity: 15000, odometer: 203450.75, cost: 92000, revenue: 180000, status: 'IN_SHOP' },
    { reg: 'TRK-004-WST', name: 'Cargo King', type: 'Truck', region: 'West', capacity: 14000, odometer: 312000.00, cost: 78000, revenue: 220000, status: 'AVAILABLE' },
    { reg: 'TRK-005-NTH', name: 'Thunder Truck', type: 'Truck', region: 'North', capacity: 13500, odometer: 450820.30, cost: 65000, revenue: 350000, status: 'RETIRED' },
    // Vans
    { reg: 'VAN-001-STH', name: 'Express Van 1', type: 'Van', region: 'South', capacity: 3500, odometer: 75200.50, cost: 35000, revenue: 42000, status: 'AVAILABLE' },
    { reg: 'VAN-002-EST', name: 'Express Van 2', type: 'Van', region: 'East', capacity: 3500, odometer: 62100.25, cost: 36000, revenue: 38000, status: 'ON_TRIP' },
    { reg: 'VAN-003-WST', name: 'Swift Courier', type: 'Van', region: 'West', capacity: 4000, odometer: 98320.75, cost: 38000, revenue: 55000, status: 'AVAILABLE' },
    { reg: 'VAN-004-NTH', name: 'City Runner', type: 'Van', region: 'North', capacity: 3000, odometer: 125400.00, cost: 32000, revenue: 68000, status: 'AVAILABLE' },
    { reg: 'VAN-005-STH', name: 'Metro Van', type: 'Van', region: 'South', capacity: 3200, odometer: 185600.50, cost: 28000, revenue: 95000, status: 'IN_SHOP' },
    // Sedans
    { reg: 'SDN-001-EST', name: 'Executive Sedan 1', type: 'Sedan', region: 'East', capacity: 500, odometer: 45200.25, cost: 28000, revenue: 18000, status: 'AVAILABLE' },
    { reg: 'SDN-002-WST', name: 'Executive Sedan 2', type: 'Sedan', region: 'West', capacity: 500, odometer: 38950.50, cost: 30000, revenue: 15000, status: 'AVAILABLE' },
    { reg: 'SDN-003-NTH', name: 'Business Class', type: 'Sedan', region: 'North', capacity: 450, odometer: 92100.75, cost: 25000, revenue: 42000, status: 'ON_TRIP' },
    { reg: 'SDN-004-STH', name: 'Premium Rider', type: 'Sedan', region: 'South', capacity: 500, odometer: 102450.00, cost: 27000, revenue: 48000, status: 'AVAILABLE' },
    { reg: 'SDN-005-EST', name: 'Comfort Cruiser', type: 'Sedan', region: 'East', capacity: 480, odometer: 156200.25, cost: 22000, revenue: 78000, status: 'AVAILABLE' },
    // Additional Trucks
    { reg: 'TRK-006-STH', name: 'Power Hauler', type: 'Truck', region: 'South', capacity: 13000, odometer: 178900.50, cost: 88000, revenue: 142000, status: 'AVAILABLE' },
    { reg: 'TRK-007-WST', name: 'Mountain Mover', type: 'Truck', region: 'West', capacity: 14500, odometer: 245600.00, cost: 90000, revenue: 198000, status: 'AVAILABLE' },
    { reg: 'TRK-008-NTH', name: 'Long Haul Express', type: 'Truck', region: 'North', capacity: 16000, odometer: 289300.75, cost: 95000, revenue: 225000, status: 'ON_TRIP' },
  ];

  const createdVehicles = await Promise.all(
    vehicleData.map((v) =>
      prisma.vehicle.create({
        data: {
          registrationNumber: v.reg,
          name: v.name,
          type: v.type,
          region: v.region,
          maxLoadCapacity: v.capacity,
          odometer: v.odometer,
          acquisitionCost: v.cost,
          revenue: v.revenue,
          status: v.status as any,
        },
      })
    )
  );

  console.log(`Created ${createdVehicles.length} vehicles`);

  // ========================================
  // CREATE DRIVERS (12-15 drivers)
  // ========================================
  console.log('Creating drivers...');
  
  const today = new Date();
  const pastDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d;
  };
  const futureDate = (daysAhead: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d;
  };

  const driverData = [
    // Available drivers with valid licenses
    { name: 'John Mitchell', license: 'DL-A-10234', category: 'A', expiry: futureDate(365), contact: '+1-555-0101', score: 95.5, status: 'AVAILABLE' },
    { name: 'Sarah Johnson', license: 'DL-B-20456', category: 'B', expiry: futureDate(180), contact: '+1-555-0102', score: 92.0, status: 'AVAILABLE' },
    { name: 'Michael Chen', license: 'DL-A-30789', category: 'A', expiry: futureDate(540), contact: '+1-555-0103', score: 88.5, status: 'AVAILABLE' },
    { name: 'Emily Rodriguez', license: 'DL-C-40123', category: 'C', expiry: futureDate(420), contact: '+1-555-0104', score: 96.0, status: 'AVAILABLE' },
    { name: 'David Thompson', license: 'DL-A-50567', category: 'A', expiry: futureDate(90), contact: '+1-555-0105', score: 85.0, status: 'AVAILABLE' },
    // On trip drivers
    { name: 'Lisa Anderson', license: 'DL-B-60890', category: 'B', expiry: futureDate(270), contact: '+1-555-0106', score: 91.5, status: 'ON_TRIP' },
    { name: 'Robert Williams', license: 'DL-A-70234', category: 'A', expiry: futureDate(450), contact: '+1-555-0107', score: 87.0, status: 'ON_TRIP' },
    { name: 'Maria Garcia', license: 'DL-C-80567', category: 'C', expiry: futureDate(200), contact: '+1-555-0108', score: 94.5, status: 'ON_TRIP' },
    // Off duty drivers
    { name: 'James Brown', license: 'DL-D-90890', category: 'D', expiry: futureDate(150), contact: '+1-555-0109', score: 82.0, status: 'OFF_DUTY' },
    { name: 'Jennifer Davis', license: 'DL-B-01234', category: 'B', expiry: futureDate(330), contact: '+1-555-0110', score: 90.0, status: 'OFF_DUTY' },
    // Drivers with soon-to-expire licenses (within 30 days)
    { name: 'Thomas Wilson', license: 'DL-A-11567', category: 'A', expiry: futureDate(25), contact: '+1-555-0111', score: 89.5, status: 'AVAILABLE' },
    { name: 'Patricia Martinez', license: 'DL-C-21890', category: 'C', expiry: futureDate(15), contact: '+1-555-0112', score: 93.0, status: 'AVAILABLE' },
    // Drivers with expired licenses
    { name: 'Christopher Lee', license: 'DL-A-32123', category: 'A', expiry: pastDate(10), contact: '+1-555-0113', score: 75.5, status: 'OFF_DUTY' },
    { name: 'Jessica Taylor', license: 'DL-B-42456', category: 'B', expiry: pastDate(45), contact: '+1-555-0114', score: 78.0, status: 'OFF_DUTY' },
    { name: 'Daniel Anderson', license: 'DL-D-52789', category: 'D', expiry: pastDate(120), contact: '+1-555-0115', score: 80.5, status: 'SUSPENDED' },
  ];

  const createdDrivers = await Promise.all(
    driverData.map((d) =>
      prisma.driver.create({
        data: {
          name: d.name,
          licenseNumber: d.license,
          licenseCategory: d.category,
          licenseExpiryDate: d.expiry,
          contactNumber: d.contact,
          safetyScore: d.score,
          status: d.status as any,
        },
      })
    )
  );

  console.log(`Created ${createdDrivers.length} drivers`);

  // ========================================
  // CREATE TRIPS (10-15 trips)
  // ========================================
  console.log('Creating trips...');

  const tripData = [
    // Completed trips
    { source: 'New York', dest: 'Boston', vehicleIdx: 0, driverIdx: 0, weight: 8500, distance: 345.5, finalOdo: 145576.00, fuel: 85.5, status: 'COMPLETED' },
    { source: 'Los Angeles', dest: 'San Francisco', vehicleIdx: 3, driverIdx: 2, weight: 9200, distance: 615.2, finalOdo: 312615.20, fuel: 142.3, status: 'COMPLETED' },
    { source: 'Chicago', dest: 'Detroit', vehicleIdx: 5, driverIdx: 4, weight: 2800, distance: 450.8, finalOdo: 75651.30, fuel: 55.2, status: 'COMPLETED' },
    { source: 'Houston', dest: 'Dallas', vehicleIdx: 8, driverIdx: 1, weight: 2500, distance: 385.3, finalOdo: 98706.05, fuel: 48.7, status: 'COMPLETED' },
    { source: 'Miami', dest: 'Orlando', vehicleIdx: 10, driverIdx: 3, weight: 350, distance: 378.5, finalOdo: 45578.75, fuel: 32.5, status: 'COMPLETED' },
    { source: 'Seattle', dest: 'Portland', vehicleIdx: 13, driverIdx: 10, weight: 420, distance: 280.0, finalOdo: 92380.75, fuel: 25.8, status: 'COMPLETED' },
    // Dispatched trips (on-going)
    { source: 'Phoenix', dest: 'Las Vegas', vehicleIdx: 1, driverIdx: 5, weight: 10500, distance: 475.0, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    { source: 'Denver', dest: 'Salt Lake City', vehicleIdx: 6, driverIdx: 6, weight: 3100, distance: 520.5, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    { source: 'Atlanta', dest: 'Charlotte', vehicleIdx: 12, driverIdx: 7, weight: 380, distance: 395.2, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    { source: 'Philadelphia', dest: 'Washington DC', vehicleIdx: 17, driverIdx: 11, weight: 12800, distance: 225.5, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    // Draft trips
    { source: 'San Diego', dest: 'Phoenix', vehicleIdx: 15, driverIdx: 9, weight: 11200, distance: 580.0, finalOdo: null, fuel: null, status: 'DRAFT' },
    { source: 'Minneapolis', dest: 'Milwaukee', vehicleIdx: 7, driverIdx: 8, weight: 3500, distance: 540.3, finalOdo: null, fuel: null, status: 'DRAFT' },
    // Cancelled trips
    { source: 'Tampa', dest: 'Jacksonville', vehicleIdx: 11, driverIdx: 12, weight: 400, distance: 320.0, finalOdo: null, fuel: null, status: 'CANCELLED' },
    { source: 'Nashville', dest: 'Memphis', vehicleIdx: 14, driverIdx: 13, weight: 450, distance: 340.5, finalOdo: null, fuel: null, status: 'CANCELLED' },
  ];

  const createdTrips = await Promise.all(
    tripData.map((t) =>
      prisma.trip.create({
        data: {
          source: t.source,
          destination: t.dest,
          vehicleId: createdVehicles[t.vehicleIdx].id,
          driverId: createdDrivers[t.driverIdx].id,
          createdByUserId: fleetManager.id,
          cargoWeight: t.weight,
          plannedDistance: t.distance,
          finalOdometer: t.finalOdo,
          fuelConsumed: t.fuel,
          status: t.status as any,
        },
      })
    )
  );

  console.log(`Created ${createdTrips.length} trips`);

  // ========================================
  // CREATE MAINTENANCE LOGS (8-10 logs)
  // ========================================
  console.log('Creating maintenance logs...');

  const maintenanceData = [
    // Closed maintenance records
    { vehicleIdx: 0, desc: 'Oil change and filter replacement', cost: 450.00, closed: true, openedDaysAgo: 30, closedDaysAgo: 28 },
    { vehicleIdx: 2, desc: 'Brake pad replacement - all wheels', cost: 1250.75, closed: true, openedDaysAgo: 15, closedDaysAgo: 13 },
    { vehicleIdx: 3, desc: 'Tire rotation and alignment', cost: 320.50, closed: true, openedDaysAgo: 45, closedDaysAgo: 45 },
    { vehicleIdx: 9, desc: 'Transmission fluid service', cost: 680.00, closed: true, openedDaysAgo: 60, closedDaysAgo: 58 },
    { vehicleIdx: 15, desc: 'Battery replacement', cost: 285.25, closed: true, openedDaysAgo: 20, closedDaysAgo: 19 },
    { vehicleIdx: 16, desc: 'Air conditioning repair', cost: 920.00, closed: true, openedDaysAgo: 10, closedDaysAgo: 8 },
    // Open maintenance records
    { vehicleIdx: 2, desc: 'Engine diagnostics - check engine light', cost: 0, closed: false, openedDaysAgo: 2, closedDaysAgo: null },
    { vehicleIdx: 9, desc: 'Suspension system inspection required', cost: 0, closed: false, openedDaysAgo: 5, closedDaysAgo: null },
    { vehicleIdx: 4, desc: 'Complete overhaul - retired vehicle', cost: 0, closed: false, openedDaysAgo: 90, closedDaysAgo: null },
    { vehicleIdx: 7, desc: 'Windshield replacement scheduled', cost: 0, closed: false, openedDaysAgo: 1, closedDaysAgo: null },
  ];

  const createdMaintenanceLogs = await Promise.all(
    maintenanceData.map((m) => {
      const openedAt = pastDate(m.openedDaysAgo);
      const closedAt = m.closedDaysAgo !== null ? pastDate(m.closedDaysAgo) : null;
      
      return prisma.maintenanceLog.create({
        data: {
          vehicleId: createdVehicles[m.vehicleIdx].id,
          description: m.desc,
          cost: m.cost,
          closed: m.closed,
          openedAt: openedAt,
          closedAt: closedAt,
        },
      });
    })
  );

  console.log(`Created ${createdMaintenanceLogs.length} maintenance logs`);

  // ========================================
  // CREATE FUEL LOGS (10-15 logs)
  // ========================================
  console.log('Creating fuel logs...');

  const fuelData = [
    { vehicleIdx: 0, liters: 125.5, cost: 188.25, daysAgo: 5 },
    { vehicleIdx: 0, liters: 130.2, cost: 195.30, daysAgo: 12 },
    { vehicleIdx: 1, liters: 140.8, cost: 211.20, daysAgo: 3 },
    { vehicleIdx: 2, liters: 155.0, cost: 232.50, daysAgo: 8 },
    { vehicleIdx: 3, liters: 148.3, cost: 222.45, daysAgo: 6 },
    { vehicleIdx: 6, liters: 68.5, cost: 95.90, daysAgo: 4 },
    { vehicleIdx: 7, liters: 72.0, cost: 100.80, daysAgo: 10 },
    { vehicleIdx: 8, liters: 65.3, cost: 91.42, daysAgo: 15 },
    { vehicleIdx: 11, liters: 45.2, cost: 67.80, daysAgo: 7 },
    { vehicleIdx: 12, liters: 48.0, cost: 72.00, daysAgo: 9 },
    { vehicleIdx: 13, liters: 42.5, cost: 63.75, daysAgo: 11 },
    { vehicleIdx: 15, liters: 152.0, cost: 228.00, daysAgo: 2 },
    { vehicleIdx: 16, liters: 145.7, cost: 218.55, daysAgo: 14 },
    { vehicleIdx: 17, liters: 158.9, cost: 238.35, daysAgo: 1 },
    { vehicleIdx: 17, liters: 162.0, cost: 243.00, daysAgo: 8 },
  ];

  const createdFuelLogs = await Promise.all(
    fuelData.map((f) =>
      prisma.fuelLog.create({
        data: {
          vehicleId: createdVehicles[f.vehicleIdx].id,
          liters: f.liters,
          cost: f.cost,
          date: pastDate(f.daysAgo),
        },
      })
    )
  );

  console.log(`Created ${createdFuelLogs.length} fuel logs`);

  // ========================================
  // CREATE EXPENSES (8-10 expenses)
  // ========================================
  console.log('Creating expenses...');

  const expenseData = [
    { vehicleIdx: 0, category: 'toll', cost: 45.50, daysAgo: 5 },
    { vehicleIdx: 1, category: 'toll', cost: 38.75, daysAgo: 3 },
    { vehicleIdx: 2, category: 'maintenance charge', cost: 1250.75, daysAgo: 13 },
    { vehicleIdx: 3, category: 'toll', cost: 52.00, daysAgo: 6 },
    { vehicleIdx: 6, category: 'other', cost: 125.00, daysAgo: 4 },
    { vehicleIdx: 9, category: 'maintenance charge', cost: 680.00, daysAgo: 58 },
    { vehicleIdx: 11, category: 'toll', cost: 28.50, daysAgo: 7 },
    { vehicleIdx: 15, category: 'maintenance charge', cost: 285.25, daysAgo: 19 },
    { vehicleIdx: 16, category: 'maintenance charge', cost: 920.00, daysAgo: 8 },
    { vehicleIdx: 17, category: 'toll', cost: 65.25, daysAgo: 1 },
  ];

  const createdExpenses = await Promise.all(
    expenseData.map((e) =>
      prisma.expense.create({
        data: {
          vehicleId: createdVehicles[e.vehicleIdx].id,
          category: e.category,
          cost: e.cost,
          date: pastDate(e.daysAgo),
        },
      })
    )
  );

  console.log(`Created ${createdExpenses.length} expenses`);

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n========================================');
  console.log('SEED COMPLETED SUCCESSFULLY!');
  console.log('========================================');
  console.log('\nRecord Counts:');
  console.log(`  Roles:             ${createdRoles.length}`);
  console.log(`  Users:             ${createdUsers.length}`);
  console.log(`  Vehicles:          ${createdVehicles.length}`);
  console.log(`  Drivers:           ${createdDrivers.length}`);
  console.log(`  Trips:             ${createdTrips.length}`);
  console.log(`  Maintenance Logs:  ${createdMaintenanceLogs.length}`);
  console.log(`  Fuel Logs:         ${createdFuelLogs.length}`);
  console.log(`  Expenses:          ${createdExpenses.length}`);
  
  console.log('\nDemo Users (all passwords: "TransitOps2024"):');
  createdUsers.forEach((user) => {
    console.log(`  - ${user.email} (${user.role.name})`);
  });

  console.log('\nVehicle Status Distribution:');
  const vehiclesByStatus = createdVehicles.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(vehiclesByStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\nDriver Status Distribution:');
  const driversByStatus = createdDrivers.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(driversByStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\nTrip Status Distribution:');
  const tripsByStatus = createdTrips.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(tripsByStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\n========================================\n');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
