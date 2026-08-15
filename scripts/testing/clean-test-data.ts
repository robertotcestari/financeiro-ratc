import { createPrismaClient } from '@/lib/core/database/client';
import { PrismaClient } from '@/app/generated/prisma/client'

const prisma = createPrismaClient()

async function cleanTestData() {
  console.log('🧹 Cleaning test data...')
  
  // Delete test transactions
  const deletedTransactions = await prisma.transaction.deleteMany({
    where: {
      OR: [
        { description: { contains: 'OFX Transaction' } },
        { bankAccount: { name: 'Test Bank Account' } }
      ]
    }
  })
  
  console.log(`   Deleted ${deletedTransactions.count} test transactions`)
  
  // Delete test bank accounts
  const deletedAccounts = await prisma.bankAccount.deleteMany({
    where: {
      name: 'Test Bank Account'
    }
  })
  
  console.log(`   Deleted ${deletedAccounts.count} test bank accounts`)
  
  console.log('✅ Test data cleaned!')
}

cleanTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())