import 'dotenv/config';
import { createPrismaClient } from '../src/prisma/prisma-client.factory';
import * as bcrypt from 'bcrypt';

const prisma = createPrismaClient();

async function main() {
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      vatStatus: 'exempt',
      vatRate: 0.23,
      zusMonthly: 1519.19,
      zusType: 'standardowy',
      healthContributionMode: 'auto',
      healthContributionManualMonthly: 432.54,
      healthRateOverrideEnabled: false,
      healthRateOverride: 0.09,
      taxForm: 'ryczalt',
      ryczaltRate: 0.085,
      additionalCosts: 500,
      vatExemptionThreshold: 200000,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { username: adminUsername },
    create: {
      username: adminUsername,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`Seed completed. Admin user: ${adminUsername}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
