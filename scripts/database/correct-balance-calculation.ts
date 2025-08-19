import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('=== CORRECT BALANCE CALCULATION ===\n')
  
  const sicrediAccount = await prisma.bankAccount.findUnique({
    where: { name: 'CC - Sicredi' }
  })
  
  if (!sicrediAccount) {
    console.log('CC - Sicredi account not found')
    return
  }
  
  // Get all transactions ordered by date
  const transactions = await prisma.transaction.findMany({
    where: { bankAccountId: sicrediAccount.id },
    orderBy: { date: 'asc' }
  })
  
  console.log(`Total transactions: ${transactions.length}`)
  
  // Separate initial balance from other transactions
  const initialBalanceTx = transactions.find(tx => 
    tx.description.toLowerCase().includes('saldo inicial')
  )
  
  const regularTransactions = transactions.filter(tx => 
    !tx.description.toLowerCase().includes('saldo inicial')
  )
  
  console.log(`Initial balance transaction: ${initialBalanceTx ? 'Found' : 'Not found'}`)
  console.log(`Regular transactions: ${regularTransactions.length}`)
  
  if (!initialBalanceTx) {
    console.log('ERROR: No initial balance found!')
    return
  }
  
  const initialBalance = initialBalanceTx.amount?.toNumber() || 0
  console.log(`Initial balance: R$ ${initialBalance.toFixed(2)}`)
  
  // Calculate total of regular transactions (excluding initial balance)
  let transactionSum = 0
  for (const tx of regularTransactions) {
    transactionSum += tx.amount?.toNumber() || 0
  }
  
  console.log(`Sum of regular transactions: R$ ${transactionSum.toFixed(2)}`)
  
  const finalBalance = initialBalance + transactionSum
  console.log(`\nFinal balance calculation:`)
  console.log(`  Initial balance: R$ ${initialBalance.toFixed(2)}`)
  console.log(`  + Transaction sum: R$ ${transactionSum.toFixed(2)}`)
  console.log(`  = Final balance: R$ ${finalBalance.toFixed(2)}`)
  
  console.log(`\nExpected final balance: R$ 1.00`)
  console.log(`Difference: R$ ${(1.00 - finalBalance).toFixed(2)}`)
  
  if (Math.abs(finalBalance - 1.00) < 0.01) {
    console.log('✅ Balance calculation is CORRECT!')
  } else {
    console.log('❌ Balance calculation is WRONG!')
    console.log('\nPossible issues:')
    console.log('1. Missing transactions in our database')
    console.log('2. CSV data has inconsistencies') 
    console.log('3. Initial balance is not being handled correctly')
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)