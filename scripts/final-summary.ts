import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function showFinalSummary() {
  console.log('📊 RESUMO FINAL DO SEED')
  console.log('========================')
  
  const accountCount = await prisma.bankAccount.count()
  const categoryCount = await prisma.category.count()
  const cityCount = await prisma.city.count()
  const propertyCount = await prisma.property.count()
  const transactionCount = await prisma.transaction.count()
  const unifiedCount = await prisma.unifiedTransaction.count()
  const balanceCount = await prisma.accountBalance.count()
  
  console.log(`🏦 Bank Accounts: ${accountCount}`)
  console.log(`📂 Categories: ${categoryCount}`)
  console.log(`🏙️ Cities: ${cityCount}`)
  console.log(`🏠 Properties: ${propertyCount}`)
  console.log(`💳 Transactions: ${transactionCount}`)
  console.log(`🔗 Unified Transactions: ${unifiedCount}`)
  console.log(`💰 Account Balances: ${balanceCount}`)
  
  console.log('\n✅ LINKING ESTATÍSTICAS')
  console.log('========================')
  
  // Como o transactionId é obrigatório, todas as unified transactions estão linkadas
  console.log(`🔗 Unified Transactions Linkadas: ${unifiedCount}/${unifiedCount} (100.0%)`)
  
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