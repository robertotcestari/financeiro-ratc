import { createPrismaClient } from '@/lib/core/database/client';
import { PrismaClient } from '@/app/generated/prisma/client'

const prisma = createPrismaClient()

async function showFinalSummary() {
  console.log('📊 RESUMO FINAL DO SEED')
  console.log('========================')
  
  const accountCount = await prisma.bankAccount.count()
  const categoryCount = await prisma.category.count()
  const cityCount = await prisma.city.count()
  const propertyCount = await prisma.property.count()
  const transactionCount = await prisma.transaction.count()
  const processedCount = await prisma.processedTransaction.count()
  const balanceCount = await prisma.accountBalance.count()
  
  console.log(`🏦 Bank Accounts: ${accountCount}`)
  console.log(`📂 Categories: ${categoryCount}`)
  console.log(`🏙️ Cities: ${cityCount}`)
  console.log(`🏠 Properties: ${propertyCount}`)
  console.log(`💳 Transactions: ${transactionCount}`)
  console.log(`🔗 Processed Transactions: ${processedCount}`)
  console.log(`💰 Account Balances: ${balanceCount}`)
  
  console.log('\n✅ LINKING ESTATÍSTICAS')
  console.log('========================')
  
  // Como o transactionId é obrigatório, todas as processed transactions estão linkadas
  console.log(`🔗 Processed Transactions Linkadas: ${processedCount}/${processedCount} (100.0%)`)
  
  // Verificar transações mais recentes
  const latestTransactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      bankAccount: true
    }
  })
  
  console.log('\n📋 ÚLTIMAS 5 TRANSAÇÕES CRIADAS')
  console.log('================================')
  
  for (const tx of latestTransactions) {
    console.log(`💳 ${tx.bankAccount.name}: ${tx.amount} - ${tx.description} (${tx.date.toISOString().slice(0, 10)})`)
  }
}

showFinalSummary()
  .catch(console.error)
  .finally(() => prisma.$disconnect())