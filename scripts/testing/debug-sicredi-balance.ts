import { createPrismaClient } from '@/lib/core/database/client';
import { PrismaClient } from '@/app/generated/prisma/client'

const prisma = createPrismaClient()

async function debugSicrediBalance() {
  console.log('🔍 DEBUGGING CC - SICREDI BALANCE')
  console.log('==================================')
  
  const sicrediAccount = await prisma.bankAccount.findFirst({
    where: { name: 'CC - Sicredi' }
  })
  
  if (!sicrediAccount) {
    console.log('❌ Conta CC - Sicredi não encontrada')
    return
  }
  
  // Verificar as últimas transações cronologicamente
  console.log('\n📅 ÚLTIMAS 20 TRANSAÇÕES (CRONOLÓGICAMENTE):')
  console.log('─'.repeat(80))
  
  const lastTransactions = await prisma.transaction.findMany({
    where: { bankAccountId: sicrediAccount.id },
    orderBy: { date: 'desc' },
    take: 20
  })
  
  for (const tx of lastTransactions) {
    const balanceStr = tx.balance ? tx.balance.toString().padStart(12) : '        null'
    console.log(`${tx.date.toISOString().slice(0, 10)} | ${tx.amount.toString().padStart(10)} | ${balanceStr} | ${tx.description.slice(0, 50)}`)
  }
  
  // Verificar os AccountBalances
  console.log('\n💰 ÚLTIMOS 10 ACCOUNT BALANCES:')
  console.log('─'.repeat(50))
  
  const accountBalances = await prisma.accountBalance.findMany({
    where: { bankAccountId: sicrediAccount.id },
    orderBy: { date: 'desc' },
    take: 10
  })
  
  for (const balance of accountBalances) {
    console.log(`${balance.date.toISOString().slice(0, 10)} | ${balance.balance.toString().padStart(12)}`)
  }
  
  // Verificar se há transações duplicadas ou problemas
  console.log('\n🔍 ANÁLISE:')
  console.log('─'.repeat(30))
  
  const totalTransactions = await prisma.transaction.count({
    where: { bankAccountId: sicrediAccount.id }
  })
  
  const transactionsWithBalance = await prisma.transaction.count({
    where: { 
      bankAccountId: sicrediAccount.id,
      balance: { not: null }
    }
  })
  
  console.log(`📊 Total de transações: ${totalTransactions}`)
  console.log(`📊 Transações com saldo: ${transactionsWithBalance}`)
  
  // Verificar se há alguma inconsistência nas datas mais recentes
  const latestTransactionWithBalance = await prisma.transaction.findFirst({
    where: { 
      bankAccountId: sicrediAccount.id,
      balance: { not: null }
    },
    orderBy: { date: 'desc' }
  })
  
  const latestAccountBalance = await prisma.accountBalance.findFirst({
    where: { bankAccountId: sicrediAccount.id },
    orderBy: { date: 'desc' }
  })
  
  if (latestTransactionWithBalance && latestAccountBalance) {
    console.log(`\n🔍 COMPARAÇÃO:`)
    console.log(`   Última Transaction: ${latestTransactionWithBalance.date.toISOString().slice(0, 10)} - Saldo: ${latestTransactionWithBalance.balance}`)
    console.log(`   Último AccountBalance: ${latestAccountBalance.date.toISOString().slice(0, 10)} - Saldo: ${latestAccountBalance.balance}`)
    
    const discrepancia = Math.abs(Number(latestTransactionWithBalance.balance || 0) - Number(latestAccountBalance.balance))
    if (discrepancia > 0.01) {
      console.log(`❌ DISCREPÂNCIA DETECTADA: ${discrepancia}`)
    } else {
      console.log(`✅ Saldos consistentes`)
    }
  }
}

debugSicrediBalance()
  .catch(console.error)
  .finally(() => prisma.$disconnect())