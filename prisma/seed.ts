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

const pool = new Pool({ connectionString });

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
    { reg: 'MH-12-GH-4521', name: 'Ashok Leyland Titan', type: 'Truck', region: 'West', capacity: 12000, odometer: 145230.50, cost: 3200000, revenue: 4800000, status: 'AVAILABLE' },
    { reg: 'GJ-05-JK-7788', name: 'Tata Prima Hauler', type: 'Truck', region: 'West', capacity: 12000, odometer: 98450.25, cost: 3000000, revenue: 3600000, status: 'ON_TRIP' },
    { reg: 'WB-06-CD-1290', name: 'BharatBenz Freight', type: 'Truck', region: 'East', capacity: 15000, odometer: 203450.75, cost: 3800000, revenue: 6500000, status: 'IN_SHOP' },
    { reg: 'RJ-14-AB-9012', name: 'Eicher Pro Cargo', type: 'Truck', region: 'West', capacity: 14000, odometer: 312000.00, cost: 2800000, revenue: 8200000, status: 'AVAILABLE' },
    { reg: 'PB-10-EF-3344', name: 'Mahindra Blazo', type: 'Truck', region: 'North', capacity: 13500, odometer: 450820.30, cost: 2400000, revenue: 12500000, status: 'RETIRED' },
    // Vans
    { reg: 'KA-01-MN-5566', name: 'Tata Winger Express', type: 'Van', region: 'South', capacity: 3500, odometer: 75200.50, cost: 1200000, revenue: 1600000, status: 'AVAILABLE' },
    { reg: 'OD-02-PQ-2233', name: 'Force Traveller', type: 'Van', region: 'East', capacity: 3500, odometer: 62100.25, cost: 1250000, revenue: 1400000, status: 'ON_TRIP' },
    { reg: 'MH-14-RS-8899', name: 'Mahindra Supro', type: 'Van', region: 'West', capacity: 4000, odometer: 98320.75, cost: 1000000, revenue: 2100000, status: 'AVAILABLE' },
    { reg: 'DL-01-TU-4455', name: 'Tata Ace Gold', type: 'Van', region: 'North', capacity: 3000, odometer: 125400.00, cost: 850000, revenue: 2600000, status: 'AVAILABLE' },
    { reg: 'TS-09-VW-6677', name: 'Ashok Leyland Dost', type: 'Van', region: 'South', capacity: 3200, odometer: 185600.50, cost: 900000, revenue: 3500000, status: 'IN_SHOP' },
    // Sedans
    { reg: 'KA-05-XY-1122', name: 'Toyota Etios', type: 'Sedan', region: 'South', capacity: 500, odometer: 45200.25, cost: 950000, revenue: 700000, status: 'AVAILABLE' },
    { reg: 'MH-02-ZA-3344', name: 'Honda Amaze', type: 'Sedan', region: 'West', capacity: 500, odometer: 38950.50, cost: 1000000, revenue: 600000, status: 'AVAILABLE' },
    { reg: 'UP-16-BC-5566', name: 'Maruti Ciaz', type: 'Sedan', region: 'North', capacity: 450, odometer: 92100.75, cost: 850000, revenue: 1500000, status: 'ON_TRIP' },
    { reg: 'TN-07-DE-7788', name: 'Hyundai Aura', type: 'Sedan', region: 'South', capacity: 500, odometer: 102450.00, cost: 900000, revenue: 1700000, status: 'AVAILABLE' },
    { reg: 'BR-01-FG-9900', name: 'Skoda Slavia', type: 'Sedan', region: 'East', capacity: 480, odometer: 156200.25, cost: 1100000, revenue: 2800000, status: 'AVAILABLE' },
    // Additional Trucks
    { reg: 'HR-26-HI-2244', name: 'Tata Signa 2823', type: 'Truck', region: 'North', capacity: 13000, odometer: 178900.50, cost: 3300000, revenue: 5100000, status: 'AVAILABLE' },
    { reg: 'KL-11-JK-4466', name: 'Volvo FM Hauler', type: 'Truck', region: 'South', capacity: 14500, odometer: 245600.00, cost: 4200000, revenue: 7100000, status: 'AVAILABLE' },
    { reg: 'AP-28-LM-6688', name: 'BharatBenz 3528', type: 'Truck', region: 'North', capacity: 16000, odometer: 289300.75, cost: 4000000, revenue: 8100000, status: 'ON_TRIP' },
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
    { name: 'Rajesh Kumar', license: 'MH-14-2016-0012345', category: 'HMV', expiry: futureDate(365), contact: '+91-98200-45123', score: 95.5, status: 'AVAILABLE' },
    { name: 'Priya Sharma', license: 'DL-05-2018-0023456', category: 'LMV', expiry: futureDate(180), contact: '+91-98110-32456', score: 92.0, status: 'AVAILABLE' },
    { name: 'Amit Patel', license: 'GJ-01-2015-0034567', category: 'HGMV', expiry: futureDate(540), contact: '+91-97250-11789', score: 88.5, status: 'AVAILABLE' },
    { name: 'Sunita Reddy', license: 'TS-09-2017-0045678', category: 'LMV', expiry: futureDate(420), contact: '+91-90000-40123', score: 96.0, status: 'AVAILABLE' },
    { name: 'Vikram Singh', license: 'RJ-14-2014-0056789', category: 'HMV', expiry: futureDate(90), contact: '+91-99280-50567', score: 85.0, status: 'AVAILABLE' },
    // On trip drivers
    { name: 'Anjali Nair', license: 'KL-07-2019-0067890', category: 'LMV', expiry: futureDate(270), contact: '+91-94470-60890', score: 91.5, status: 'ON_TRIP' },
    { name: 'Ravi Verma', license: 'UP-32-2016-0078901', category: 'HGMV', expiry: futureDate(450), contact: '+91-93350-70234', score: 87.0, status: 'ON_TRIP' },
    { name: 'Deepak Gupta', license: 'MP-04-2018-0089012', category: 'HMV', expiry: futureDate(200), contact: '+91-97550-80567', score: 94.5, status: 'ON_TRIP' },
    // Off duty drivers
    { name: 'Manoj Yadav', license: 'HR-26-2015-0090123', category: 'HTV', expiry: futureDate(150), contact: '+91-98180-90890', score: 82.0, status: 'OFF_DUTY' },
    { name: 'Kavita Desai', license: 'MH-02-2017-0101234', category: 'LMV', expiry: futureDate(330), contact: '+91-98330-01234', score: 90.0, status: 'OFF_DUTY' },
    // Drivers with soon-to-expire licenses (within 30 days)
    { name: 'Suresh Menon', license: 'KA-03-2016-0112345', category: 'HMV', expiry: futureDate(25), contact: '+91-99010-11567', score: 89.5, status: 'AVAILABLE' },
    { name: 'Neha Joshi', license: 'TN-10-2019-0123456', category: 'LMV', expiry: futureDate(15), contact: '+91-99400-21890', score: 93.0, status: 'AVAILABLE' },
    // Drivers with expired licenses
    { name: 'Arjun Rao', license: 'AP-16-2014-0134567', category: 'HMV', expiry: pastDate(10), contact: '+91-90300-32123', score: 75.5, status: 'OFF_DUTY' },
    { name: 'Sanjay Chauhan', license: 'WB-06-2013-0145678', category: 'HGMV', expiry: pastDate(45), contact: '+91-98300-42456', score: 78.0, status: 'OFF_DUTY' },
    { name: 'Rohit Bhat', license: 'PB-10-2015-0156789', category: 'HTV', expiry: pastDate(120), contact: '+91-98140-52789', score: 80.5, status: 'SUSPENDED' },
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
    { source: 'Mumbai', dest: 'Pune', vehicleIdx: 0, driverIdx: 0, weight: 8500, distance: 165.5, finalOdo: 145396.00, fuel: 42.5, status: 'COMPLETED' },
    { source: 'Bengaluru', dest: 'Chennai', vehicleIdx: 3, driverIdx: 2, weight: 9200, distance: 345.2, finalOdo: 312345.20, fuel: 78.3, status: 'COMPLETED' },
    { source: 'Delhi', dest: 'Agra', vehicleIdx: 5, driverIdx: 4, weight: 2800, distance: 233.0, finalOdo: 75433.50, fuel: 28.2, status: 'COMPLETED' },
    { source: 'Ahmedabad', dest: 'Surat', vehicleIdx: 8, driverIdx: 1, weight: 2500, distance: 265.3, finalOdo: 98586.05, fuel: 32.7, status: 'COMPLETED' },
    { source: 'Hyderabad', dest: 'Vijayawada', vehicleIdx: 10, driverIdx: 3, weight: 350, distance: 275.5, finalOdo: 45475.75, fuel: 24.5, status: 'COMPLETED' },
    { source: 'Chennai', dest: 'Coimbatore', vehicleIdx: 13, driverIdx: 10, weight: 420, distance: 500.0, finalOdo: 92600.75, fuel: 45.8, status: 'COMPLETED' },
    // Dispatched trips (on-going)
    { source: 'Jaipur', dest: 'Udaipur', vehicleIdx: 1, driverIdx: 5, weight: 10500, distance: 395.0, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    { source: 'Kolkata', dest: 'Bhubaneswar', vehicleIdx: 6, driverIdx: 6, weight: 3100, distance: 440.5, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    { source: 'Lucknow', dest: 'Kanpur', vehicleIdx: 12, driverIdx: 7, weight: 380, distance: 85.2, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    { source: 'Vijayawada', dest: 'Visakhapatnam', vehicleIdx: 17, driverIdx: 11, weight: 12800, distance: 350.5, finalOdo: null, fuel: null, status: 'DISPATCHED' },
    // Draft trips
    { source: 'Chandigarh', dest: 'Amritsar', vehicleIdx: 15, driverIdx: 9, weight: 11200, distance: 230.0, finalOdo: null, fuel: null, status: 'DRAFT' },
    { source: 'Nagpur', dest: 'Bhopal', vehicleIdx: 7, driverIdx: 8, weight: 3500, distance: 350.3, finalOdo: null, fuel: null, status: 'DRAFT' },
    // Cancelled trips
    { source: 'Kochi', dest: 'Thiruvananthapuram', vehicleIdx: 11, driverIdx: 12, weight: 400, distance: 200.0, finalOdo: null, fuel: null, status: 'CANCELLED' },
    { source: 'Indore', dest: 'Ujjain', vehicleIdx: 14, driverIdx: 13, weight: 450, distance: 55.5, finalOdo: null, fuel: null, status: 'CANCELLED' },
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
    { vehicleIdx: 0, desc: 'Engine oil and filter change', cost: 4500.00, closed: true, openedDaysAgo: 30, closedDaysAgo: 28 },
    { vehicleIdx: 2, desc: 'Brake pad replacement - all wheels', cost: 18500.00, closed: true, openedDaysAgo: 15, closedDaysAgo: 13 },
    { vehicleIdx: 3, desc: 'Tyre rotation and wheel alignment', cost: 3200.00, closed: true, openedDaysAgo: 45, closedDaysAgo: 45 },
    { vehicleIdx: 9, desc: 'Transmission fluid service', cost: 9800.00, closed: true, openedDaysAgo: 60, closedDaysAgo: 58 },
    { vehicleIdx: 15, desc: 'Battery replacement', cost: 8500.00, closed: true, openedDaysAgo: 20, closedDaysAgo: 19 },
    { vehicleIdx: 16, desc: 'AC compressor repair', cost: 14200.00, closed: true, openedDaysAgo: 10, closedDaysAgo: 8 },
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

  // Fuel costs are in INR (diesel ~Rs 92/L for trucks & vans, petrol ~Rs 106/L for sedans).
  const fuelData = [
    { vehicleIdx: 0, liters: 125.5, cost: 11546.00, daysAgo: 5 },
    { vehicleIdx: 0, liters: 130.2, cost: 11978.40, daysAgo: 12 },
    { vehicleIdx: 1, liters: 140.8, cost: 12953.60, daysAgo: 3 },
    { vehicleIdx: 2, liters: 155.0, cost: 14260.00, daysAgo: 8 },
    { vehicleIdx: 3, liters: 148.3, cost: 13643.60, daysAgo: 6 },
    { vehicleIdx: 6, liters: 68.5, cost: 6302.00, daysAgo: 4 },
    { vehicleIdx: 7, liters: 72.0, cost: 6624.00, daysAgo: 10 },
    { vehicleIdx: 8, liters: 65.3, cost: 6007.60, daysAgo: 15 },
    { vehicleIdx: 11, liters: 45.2, cost: 4791.20, daysAgo: 7 },
    { vehicleIdx: 12, liters: 48.0, cost: 5088.00, daysAgo: 9 },
    { vehicleIdx: 13, liters: 42.5, cost: 4505.00, daysAgo: 11 },
    { vehicleIdx: 15, liters: 152.0, cost: 13984.00, daysAgo: 2 },
    { vehicleIdx: 16, liters: 145.7, cost: 13404.40, daysAgo: 14 },
    { vehicleIdx: 17, liters: 158.9, cost: 14618.80, daysAgo: 1 },
    { vehicleIdx: 17, liters: 162.0, cost: 14904.00, daysAgo: 8 },
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
    { vehicleIdx: 0, category: 'toll', cost: 320.00, daysAgo: 5 },
    { vehicleIdx: 1, category: 'toll', cost: 285.00, daysAgo: 3 },
    { vehicleIdx: 2, category: 'maintenance charge', cost: 18500.00, daysAgo: 13 },
    { vehicleIdx: 3, category: 'toll', cost: 450.00, daysAgo: 6 },
    { vehicleIdx: 6, category: 'other', cost: 1200.00, daysAgo: 4 },
    { vehicleIdx: 9, category: 'maintenance charge', cost: 9800.00, daysAgo: 58 },
    { vehicleIdx: 11, category: 'toll', cost: 180.00, daysAgo: 7 },
    { vehicleIdx: 15, category: 'maintenance charge', cost: 8500.00, daysAgo: 19 },
    { vehicleIdx: 16, category: 'maintenance charge', cost: 14200.00, daysAgo: 8 },
    { vehicleIdx: 17, category: 'toll', cost: 520.00, daysAgo: 1 },
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
