import { PrismaClient } from '../app/generated/prisma';
import { seedBankAccounts } from './seeder/bankAccountSeeder';
import { seedCategories } from './seeder/categorySeeder';
import { seedCities } from './seeder/citySeeder';
import { seedProperties } from './seeder/propertySeeder';
import { seedTransactions } from './seeder/transactionSeeder';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  await seedBankAccounts(prisma);

  await seedCategories(prisma);

  await seedCities(prisma);

  await seedProperties(prisma);

  await seedTransactions(prisma);

  console.log('✅ Seed completed!');

  const accountCount = await prisma.bankAccount.count();
  const categoryCount = await prisma.category.count();
  const cityCount = await prisma.city.count();
  const propertyCount = await prisma.property.count();
  const transactionCount = await prisma.transaction.count();
  const unifiedCount = await prisma.unifiedTransaction.count();

  console.log(`📊 Summary:`);
  console.log(`   🏦 Bank Accounts: ${accountCount}`);
  console.log(`   📂 Categories: ${categoryCount}`);
  console.log(`   🏙️ Cities: ${cityCount}`);
  console.log(`   � 🏠 Properties: ${propertyCount}`);
  console.log(`   💳 Transactions: ${transactionCount}`);
  console.log(`   🔗 Unified Transactions: ${unifiedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
