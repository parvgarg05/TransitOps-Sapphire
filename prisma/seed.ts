import 'dotenv/config';
import { PrismaClient, RoleType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Build the pool from the full connection string so SSL settings such as
// `sslmode=require` (needed by managed providers like Neon/Supabase) are
// honored. Decomposing the URL into individual fields drops those params
// and causes connections to be rejected.
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
  ssl: {
    rejectUnauthorized: false,
  },
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
  
  // All monetary values are in Indian Rupees (INR).
  // Registration numbers follow the Indian format: SS-RR-XX-NNNN.
  const vehicleData = [
    // Trucks
    { reg: 'MH12AB1234', name: 'Tata Prima 5530', type: 'Truck', region: 'West', capacity: 25000, odometer: 186420.40, cost: 4200000, revenue: 6900000, status: 'AVAILABLE' },
    { reg: 'DL1LAA4321', name: 'Ashok Leyland 4825', type: 'Truck', region: 'North', capacity: 22000, odometer: 142110.80, cost: 3900000, revenue: 5800000, status: 'ON_TRIP' },
    { reg: 'KA03MN7788', name: 'BharatBenz 2823', type: 'Truck', region: 'South', capacity: 18000, odometer: 215900.20, cost: 3600000, revenue: 6100000, status: 'IN_SHOP' },
    { reg: 'GJ01TT9090', name: 'Eicher Pro 6048', type: 'Truck', region: 'West', capacity: 24000, odometer: 301500.00, cost: 3400000, revenue: 7200000, status: 'AVAILABLE' },
    { reg: 'TN09ZX5500', name: 'Mahindra Blazo X', type: 'Truck', region: 'South', capacity: 20000, odometer: 410250.90, cost: 3100000, revenue: 8100000, status: 'RETIRED' },
    // Vans
    { reg: 'MH14CV1111', name: 'Force Traveller Cargo', type: 'Van', region: 'West', capacity: 3500, odometer: 92500.10, cost: 1800000, revenue: 2550000, status: 'AVAILABLE' },
    { reg: 'DL8CAF2222', name: 'Tata Winger', type: 'Van', region: 'North', capacity: 3200, odometer: 108340.70, cost: 1650000, revenue: 2380000, status: 'ON_TRIP' },
    { reg: 'KA01VV3333', name: 'Maruti Eeco Cargo', type: 'Van', region: 'South', capacity: 900, odometer: 76420.30, cost: 720000, revenue: 1290000, status: 'AVAILABLE' },
    { reg: 'WB02VN4444', name: 'Mahindra Supro Cargo', type: 'Van', region: 'East', capacity: 950, odometer: 118200.00, cost: 690000, revenue: 1490000, status: 'AVAILABLE' },
    { reg: 'RJ14VV5555', name: 'Ashok Dost Plus', type: 'Van', region: 'North', capacity: 1250, odometer: 139430.50, cost: 820000, revenue: 1760000, status: 'IN_SHOP' },
    // Sedans
    { reg: 'MH01EV6001', name: 'Hyundai Aura Fleet', type: 'Sedan', region: 'West', capacity: 450, odometer: 56220.40, cost: 780000, revenue: 960000, status: 'AVAILABLE' },
    { reg: 'DL3CXY6002', name: 'Maruti Dzire Tour', type: 'Sedan', region: 'North', capacity: 450, odometer: 83410.90, cost: 720000, revenue: 1210000, status: 'AVAILABLE' },
    { reg: 'KA05AA6003', name: 'Honda Amaze Fleet', type: 'Sedan', region: 'South', capacity: 450, odometer: 91550.20, cost: 820000, revenue: 1320000, status: 'ON_TRIP' },
    { reg: 'TS09BB6004', name: 'Toyota Etios Fleet', type: 'Sedan', region: 'South', capacity: 450, odometer: 127000.00, cost: 760000, revenue: 1680000, status: 'AVAILABLE' },
    { reg: 'UP32CC6005', name: 'Tigor CNG Fleet', type: 'Sedan', region: 'North', capacity: 450, odometer: 143880.30, cost: 740000, revenue: 1710000, status: 'AVAILABLE' },
    // Additional Trucks
    { reg: 'PB10TR7001', name: 'Ashok Leyland 4220', type: 'Truck', region: 'North', capacity: 21000, odometer: 187700.00, cost: 3550000, revenue: 5420000, status: 'AVAILABLE' },
    { reg: 'OD05TR7002', name: 'Tata Signa 5530', type: 'Truck', region: 'East', capacity: 25000, odometer: 266880.70, cost: 4300000, revenue: 6880000, status: 'AVAILABLE' },
    { reg: 'AP16TR7003', name: 'BharatBenz 3128', type: 'Truck', region: 'South', capacity: 23000, odometer: 298450.60, cost: 3850000, revenue: 7340000, status: 'ON_TRIP' },
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

  // License categories follow Indian classes: LMV (light), HMV (heavy),
  // HGMV (heavy goods), HTV (heavy transport). Contacts are +91 mobile numbers.
  const driverData = [
    // Available drivers with valid licenses
    { name: 'Rohit Sharma', license: 'MH-TR-10234', category: 'HMV', expiry: futureDate(365), contact: '+91-9876501011', score: 95.5, status: 'AVAILABLE' },
    { name: 'Aman Verma', license: 'DL-TR-20456', category: 'LMV', expiry: futureDate(180), contact: '+91-9876501022', score: 92.0, status: 'AVAILABLE' },
    { name: 'Suresh Kumar', license: 'KA-TR-30789', category: 'HMV', expiry: futureDate(540), contact: '+91-9876501033', score: 88.5, status: 'AVAILABLE' },
    { name: 'Priya Nair', license: 'TN-TR-40123', category: 'LMV', expiry: futureDate(420), contact: '+91-9876501044', score: 96.0, status: 'AVAILABLE' },
    { name: 'Vikram Singh', license: 'RJ-TR-50567', category: 'HMV', expiry: futureDate(90), contact: '+91-9876501055', score: 85.0, status: 'AVAILABLE' },
    // On trip drivers
    { name: 'Neha Patel', license: 'GJ-TR-60890', category: 'LMV', expiry: futureDate(270), contact: '+91-9876501066', score: 91.5, status: 'ON_TRIP' },
    { name: 'Imran Khan', license: 'UP-TR-70234', category: 'HMV', expiry: futureDate(450), contact: '+91-9876501077', score: 87.0, status: 'ON_TRIP' },
    { name: 'Kiran Reddy', license: 'TS-TR-80567', category: 'LMV', expiry: futureDate(200), contact: '+91-9876501088', score: 94.5, status: 'ON_TRIP' },
    // Off duty drivers
    { name: 'Manoj Yadav', license: 'BR-TR-90890', category: 'LMV', expiry: futureDate(150), contact: '+91-9876501099', score: 82.0, status: 'OFF_DUTY' },
    { name: 'Deepika Joshi', license: 'MP-TR-01234', category: 'LMV', expiry: futureDate(330), contact: '+91-9876501100', score: 90.0, status: 'OFF_DUTY' },
    // Drivers with soon-to-expire licenses (within 30 days)
    { name: 'Arjun Mehta', license: 'MH-TR-11567', category: 'HMV', expiry: futureDate(25), contact: '+91-9876501111', score: 89.5, status: 'AVAILABLE' },
    { name: 'Pooja Das', license: 'WB-TR-21890', category: 'LMV', expiry: futureDate(15), contact: '+91-9876501122', score: 93.0, status: 'AVAILABLE' },
    // Drivers with expired licenses
    { name: 'Anil Rawat', license: 'UK-TR-32123', category: 'HMV', expiry: pastDate(10), contact: '+91-9876501133', score: 75.5, status: 'OFF_DUTY' },
    { name: 'Sneha Kulkarni', license: 'MH-TR-42456', category: 'LMV', expiry: pastDate(45), contact: '+91-9876501144', score: 78.0, status: 'OFF_DUTY' },
    { name: 'Gaurav Choudhary', license: 'HR-TR-52789', category: 'HMV', expiry: pastDate(120), contact: '+91-9876501155', score: 80.5, status: 'SUSPENDED' },
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

  // Routes use Indian city pairs; distances are in kilometres.
  const tripData = [
    // Completed trips
    { source: 'Mumbai', dest: 'Pune', vehicleIdx: 0, driverIdx: 0, weight: 8500, distance: 154.0, finalOdo: 186574.40, fuel: 62.5, status: 'COMPLETED' },
    { source: 'Delhi', dest: 'Jaipur', vehicleIdx: 3, driverIdx: 2, weight: 9200, distance: 281.0, finalOdo: 301781.00, fuel: 96.4, status: 'COMPLETED' },
    { source: 'Bengaluru', dest: 'Chennai', vehicleIdx: 5, driverIdx: 4, weight: 2800, distance: 347.0, finalOdo: 92847.10, fuel: 54.2, status: 'COMPLETED' },
    { source: 'Hyderabad', dest: 'Vijayawada', vehicleIdx: 8, driverIdx: 1, weight: 2500, distance: 273.0, finalOdo: 118473.00, fuel: 39.8, status: 'COMPLETED' },
    { source: 'Ahmedabad', dest: 'Surat', vehicleIdx: 10, driverIdx: 3, weight: 350, distance: 266.0, finalOdo: 56486.40, fuel: 23.1, status: 'COMPLETED' },
    { source: 'Kolkata', dest: 'Bhubaneswar', vehicleIdx: 13, driverIdx: 10, weight: 420, distance: 442.0, finalOdo: 127422.00, fuel: 33.6, status: 'COMPLETED' },
    // Dispatched trips (on-going)
    { source: 'Lucknow', dest: 'Kanpur', vehicleIdx: 1, driverIdx: 5, weight: 10500, distance: 98.0, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    { source: 'Nagpur', dest: 'Indore', vehicleIdx: 6, driverIdx: 6, weight: 3100, distance: 445.0, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    { source: 'Kochi', dest: 'Coimbatore', vehicleIdx: 12, driverIdx: 7, weight: 380, distance: 190.0, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    { source: 'Patna', dest: 'Ranchi', vehicleIdx: 17, driverIdx: 11, weight: 12800, distance: 332.0, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    // Draft trips
    { source: 'Chandigarh', dest: 'Amritsar', vehicleIdx: 15, driverIdx: 9, weight: 11200, distance: 230.0, finalOdo: null, fuel: null, status: 'DRAFT' },
    { source: 'Guwahati', dest: 'Siliguri', vehicleIdx: 7, driverIdx: 8, weight: 3500, distance: 470.0, finalOdo: null, fuel: null, status: 'DRAFT' },
    // Cancelled trips
    { source: 'Raipur', dest: 'Bhopal', vehicleIdx: 11, driverIdx: 12, weight: 400, distance: 633.0, finalOdo: null, fuel: null, status: 'CANCELLED' },
    { source: 'Dehradun', dest: 'Delhi', vehicleIdx: 14, driverIdx: 13, weight: 450, distance: 248.0, finalOdo: null, fuel: null, status: 'CANCELLED' },
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

  // Maintenance costs are in INR.
  const maintenanceData = [
    // Closed maintenance records
    { vehicleIdx: 0, desc: 'Engine oil and filter service', cost: 18500.00, closed: true, openedDaysAgo: 30, closedDaysAgo: 28 },
    { vehicleIdx: 2, desc: 'Brake pad replacement for all wheels', cost: 62500.00, closed: true, openedDaysAgo: 15, closedDaysAgo: 13 },
    { vehicleIdx: 3, desc: 'Wheel alignment and balancing', cost: 12400.00, closed: true, openedDaysAgo: 45, closedDaysAgo: 45 },
    { vehicleIdx: 9, desc: 'Transmission fluid and filter service', cost: 28200.00, closed: true, openedDaysAgo: 60, closedDaysAgo: 58 },
    { vehicleIdx: 15, desc: 'Battery replacement', cost: 9300.00, closed: true, openedDaysAgo: 20, closedDaysAgo: 19 },
    { vehicleIdx: 16, desc: 'Cabin AC compressor repair', cost: 41800.00, closed: true, openedDaysAgo: 10, closedDaysAgo: 8 },
    // Open maintenance records
    { vehicleIdx: 2, desc: 'Engine diagnostics due to warning light', cost: 0, closed: false, openedDaysAgo: 2, closedDaysAgo: null },
    { vehicleIdx: 9, desc: 'Front suspension inspection required', cost: 0, closed: false, openedDaysAgo: 5, closedDaysAgo: null },
    { vehicleIdx: 4, desc: 'Major overhaul for retired heavy truck', cost: 0, closed: false, openedDaysAgo: 90, closedDaysAgo: null },
    { vehicleIdx: 7, desc: 'Windshield replacement pending', cost: 0, closed: false, openedDaysAgo: 1, closedDaysAgo: null },
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

  // Fuel costs are in INR (diesel ~Rs 92/L for trucks & vans, petrol ~Rs 106/L for sedans).
  const fuelData = [
    { vehicleIdx: 0, liters: 125.5, cost: 12425.00, daysAgo: 5 },
    { vehicleIdx: 0, liters: 130.2, cost: 12910.00, daysAgo: 12 },
    { vehicleIdx: 1, liters: 140.8, cost: 13930.00, daysAgo: 3 },
    { vehicleIdx: 2, liters: 155.0, cost: 15345.00, daysAgo: 8 },
    { vehicleIdx: 3, liters: 148.3, cost: 14685.00, daysAgo: 6 },
    { vehicleIdx: 6, liters: 68.5, cost: 6710.00, daysAgo: 4 },
    { vehicleIdx: 7, liters: 72.0, cost: 7055.00, daysAgo: 10 },
    { vehicleIdx: 8, liters: 65.3, cost: 6405.00, daysAgo: 15 },
    { vehicleIdx: 11, liters: 45.2, cost: 4425.00, daysAgo: 7 },
    { vehicleIdx: 12, liters: 48.0, cost: 4700.00, daysAgo: 9 },
    { vehicleIdx: 13, liters: 42.5, cost: 4165.00, daysAgo: 11 },
    { vehicleIdx: 15, liters: 152.0, cost: 15045.00, daysAgo: 2 },
    { vehicleIdx: 16, liters: 145.7, cost: 14420.00, daysAgo: 14 },
    { vehicleIdx: 17, liters: 158.9, cost: 15730.00, daysAgo: 1 },
    { vehicleIdx: 17, liters: 162.0, cost: 16035.00, daysAgo: 8 },
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

  // Expense costs are in INR (tolls reflect FASTag highway charges).
  const expenseData = [
    { vehicleIdx: 0, category: 'toll', cost: 780.00, daysAgo: 5 },
    { vehicleIdx: 1, category: 'toll', cost: 620.00, daysAgo: 3 },
    { vehicleIdx: 2, category: 'maintenance charge', cost: 62500.00, daysAgo: 13 },
    { vehicleIdx: 3, category: 'toll', cost: 950.00, daysAgo: 6 },
    { vehicleIdx: 6, category: 'other', cost: 3250.00, daysAgo: 4 },
    { vehicleIdx: 9, category: 'maintenance charge', cost: 28200.00, daysAgo: 58 },
    { vehicleIdx: 11, category: 'toll', cost: 420.00, daysAgo: 7 },
    { vehicleIdx: 15, category: 'maintenance charge', cost: 9300.00, daysAgo: 19 },
    { vehicleIdx: 16, category: 'maintenance charge', cost: 41800.00, daysAgo: 8 },
    { vehicleIdx: 17, category: 'toll', cost: 1240.00, daysAgo: 1 },
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
