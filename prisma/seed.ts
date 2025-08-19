import { PrismaClient } from '@/app/generated/prisma';
import { seedBankAccounts } from './seeder/bankAccountSeeder';
import { seedCategories } from './seeder/categorySeeder';
import { seedCities } from './seeder/citySeeder';
import { seedProperties } from './seeder/propertySeeder';
import { seedTransactions } from './seeder/transactionSeeder';
import { seedCSVTransactions } from './seeder/csvTransactionSeeder';
import { seedLinkedProcessedTransactions } from './seeder/linkedProcessedTransactionSeeder';
import { seedAllProcessedTransactions } from './seeder/allProcessedTransactionSeeder';
import { seedCategorizationRulesFromInstituto } from './seeder/categorizationRuleSeederFromInstituto';

const prisma = new PrismaClient();

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
