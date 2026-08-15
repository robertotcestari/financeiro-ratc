import { seedBankAccounts } from './seeds/seeders/bankAccountSeeder';
import { seedCategories } from './seeds/seeders/categorySeeder';
import { seedCities } from './seeds/seeders/citySeeder';
import { seedProperties } from './seeds/seeders/propertySeeder';
import { seedTransactions } from './seeds/seeders/transactionSeeder';
import { seedCSVTransactions } from './seeds/seeders/csvTransactionSeeder';
import { seedLinkedProcessedTransactions } from './seeds/seeders/linkedProcessedTransactionSeeder';
import { seedAllProcessedTransactions } from './seeds/seeders/allProcessedTransactionSeeder';
import { seedCategorizationRulesFromInstituto } from './seeds/seeders/categorizationRuleSeederFromInstituto';
import { createPrismaClient } from '@/lib/core/database/client';

const prisma = createPrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  await seedBankAccounts(prisma);

  await seedCategories(prisma);

  await seedCities(prisma);

  await seedProperties(prisma);

  // Choose one: either seedTransactions OR seedCSVTransactions, not both
  // seedTransactions imports from both regular and _no_balance CSV files
  // seedCSVTransactions imports only from _no_balance CSV files with custom IDs
  
  // Option 1: Use regular transaction seeder (imports all CSVs)
  // await seedTransactions(prisma);
  
  // Option 2: Use CSV transaction seeder with custom IDs (only _no_balance files)
  await seedCSVTransactions();

  // Import all processed transactions (with and without transactionId)
  await seedAllProcessedTransactions(prisma);

  // Seed categorization rules based on Instituto database patterns
  await seedCategorizationRulesFromInstituto(prisma);

  console.log('✅ Seed completed!');

  const accountCount = await prisma.bankAccount.count();
  const categoryCount = await prisma.category.count();
  const cityCount = await prisma.city.count();
  const propertyCount = await prisma.property.count();
  const transactionCount = await prisma.transaction.count();
  const processedCount = await prisma.processedTransaction.count();
  const ruleCount = await prisma.categorizationRule.count();

  console.log(`📊 Summary:`);
  console.log(`   🏦 Bank Accounts: ${accountCount}`);
  console.log(`   📂 Categories: ${categoryCount}`);
  console.log(`   🏙️ Cities: ${cityCount}`);
  console.log(`   � 🏠 Properties: ${propertyCount}`);
  console.log(`   💳 Transactions: ${transactionCount}`);
  console.log(`   🔗 Processed Transactions: ${processedCount}`);
  console.log(`   📏 Categorization Rules: ${ruleCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
