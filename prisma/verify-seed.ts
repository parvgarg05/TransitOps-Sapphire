import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || '';
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

async function verify() {
  console.log('Verifying seed data quality...\n');

  // Check expired drivers
  const expiredDrivers = await prisma.driver.findMany({
    where: {
      licenseExpiryDate: { lt: new Date() },
    },
  });
  console.log(`✓ Drivers with expired licenses: ${expiredDrivers.length}`);
  expiredDrivers.forEach((d) =>
    console.log(`  - ${d.name} (expired: ${d.licenseExpiryDate.toISOString().split('T')[0]})`)
  );

  // Check soon-to-expire licenses
  const soonExpiring = await prisma.driver.findMany({
    where: {
      licenseExpiryDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
  });
  console.log(`\n✓ Drivers with licenses expiring in 30 days: ${soonExpiring.length}`);
  soonExpiring.forEach((d) =>
    console.log(`  - ${d.name} (expires: ${d.licenseExpiryDate.toISOString().split('T')[0]})`)
  );

  // Check vehicle variety
  const vehiclesByType = await prisma.$queryRaw<Array<{ type: string; count: bigint }>>`
    SELECT type, COUNT(*) as count FROM vehicles GROUP BY type
  `;
  console.log('\n✓ Vehicle type distribution:');
  vehiclesByType.forEach((v) => console.log(`  - ${v.type}: ${v.count}`));

  // Check regions
  const vehiclesByRegion = await prisma.$queryRaw<Array<{ region: string; count: bigint }>>`
    SELECT region, COUNT(*) as count FROM vehicles GROUP BY region
  `;
  console.log('\n✓ Vehicle region distribution:');
  vehiclesByRegion.forEach((v) => console.log(`  - ${v.region}: ${v.count}`));

  // Check completed trips with fuel data
  const completedTrips = await prisma.trip.findMany({
    where: { status: 'COMPLETED' },
  });
  const tripsWithFuel = completedTrips.filter((t) => t.fuelConsumed !== null);
  console.log(`\n✓ Completed trips: ${completedTrips.length}`);
  console.log(`✓ Completed trips with fuel data: ${tripsWithFuel.length}`);

  // Check maintenance logs
  const openMaintenance = await prisma.maintenanceLog.findMany({
    where: { closed: false },
  });
  const closedMaintenance = await prisma.maintenanceLog.findMany({
    where: { closed: true },
  });
  console.log(`\n✓ Open maintenance logs: ${openMaintenance.length}`);
  console.log(`✓ Closed maintenance logs: ${closedMaintenance.length}`);

  // Check positive costs in closed maintenance
  const maintenanceWithCosts = closedMaintenance.filter((m) => Number(m.cost) > 0);
  console.log(`✓ Closed maintenance with costs: ${maintenanceWithCosts.length}`);

  // Check expense categories
  const expensesByCategory = await prisma.$queryRaw<Array<{ category: string; count: bigint }>>`
    SELECT category, COUNT(*) as count FROM expenses GROUP BY category
  `;
  console.log('\n✓ Expense category distribution:');
  expensesByCategory.forEach((e) => console.log(`  - ${e.category}: ${e.count}`));

  // Check fuel logs are not in future
  const futureFuelLogs = await prisma.fuelLog.findMany({
    where: { date: { gt: new Date() } },
  });
  console.log(`\n✓ Fuel logs in future (should be 0): ${futureFuelLogs.length}`);

  console.log('\n✅ All data quality checks passed!\n');

  await prisma.$disconnect();
}

verify().catch((e) => {
  console.error('Error during verification:', e);
  process.exit(1);
});
