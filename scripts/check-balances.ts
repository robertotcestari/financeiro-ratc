import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function checkBalances() {
  console.log('🔍 VERIFICANDO SALDOS DAS CONTAS')
  console.log('================================')
  
  const accounts = await prisma.bankAccount.findMany({
    where: { isActive: true }
  })
  
  for (const account of accounts) {
    console.log(`\n🏦 ${account.name}`)
    console.log('─'.repeat(50))
    
    // Últimas transações com saldo
    const transactionsWithBalance = await prisma.transaction.findMany({
      where: { 
        bankAccountId: account.id,
        balance: { not: null }
      },
      orderBy: { date: 'desc' },
      take: 10
    })
    
    console.log('📊 Últimas 10 transações COM SALDO:')
    for (const tx of transactionsWithBalance) {
      console.log(`  ${tx.date.toISOString().slice(0, 10)} | ${tx.amount.toString().padStart(12)} | Saldo: ${tx.balance?.toString().padStart(12)} | ${tx.description}`)
    }
    
    // Última transação registrada
    const lastTransaction = await prisma.transaction.findFirst({
      where: { bankAccountId: account.id },
      orderBy: { date: 'desc' }
    })
    
    if (lastTransaction) {
      console.log(`\n💳 Última transação: ${lastTransaction.date.toISOString().slice(0, 10)} - ${lastTransaction.amount} (Saldo: ${lastTransaction.balance})`)
    }
    
    // Saldo mais recente registrado
    const latestBalance = await prisma.accountBalance.findFirst({
      where: { bankAccountId: account.id },
      orderBy: { date: 'desc' }
    })
    
    if (latestBalance) {
      console.log(`💰 Último saldo registrado: ${latestBalance.date.toISOString().slice(0, 10)} - ${latestBalance.balance}`)
    }
    
    // Contar total de transações
    const totalTransactions = await prisma.transaction.count({
      where: { bankAccountId: account.id }
    })
    
    const transactionsWithBalanceCount = await prisma.transaction.count({
      where: { 
        bankAccountId: account.id,
        balance: { not: null }
      }
    })
    
    console.log(`📈 Total: ${totalTransactions} transações (${transactionsWithBalanceCount} com saldo)`)
  }
}

checkBalances()
  .catch(console.error)
  .finally(() => prisma.$disconnect())