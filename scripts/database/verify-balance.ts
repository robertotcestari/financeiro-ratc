import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('=== BALANCE VERIFICATION ===\n')
  
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
  
  // Check for initial balance transaction
  const initialBalanceTx = transactions.find(tx => 
    tx.description.toLowerCase().includes('saldo inicial') ||
    tx.description.toLowerCase().includes('saldo anterior')
  )
  
  if (initialBalanceTx) {
    console.log(`Initial balance transaction found: R$ ${initialBalanceTx.amount?.toFixed(2)}`)
    console.log(`Date: ${initialBalanceTx.date.toISOString().slice(0, 10)}`)
    console.log(`Description: ${initialBalanceTx.description}`)
  } else {
    console.log('No initial balance transaction found')
  }
  
  // Calculate running balance
  let runningBalance = 0
  let initialBalance = 0
  
  console.log('\nFirst 10 transactions:')
  for (let i = 0; i < Math.min(10, transactions.length); i++) {
    const tx = transactions[i]
    const amount = tx.amount?.toNumber() || 0
    
    if (tx.description.toLowerCase().includes('saldo inicial')) {
      initialBalance = amount
      runningBalance = amount
      console.log(`${tx.date.toISOString().slice(0, 10)} - INITIAL: R$ ${amount.toFixed(2)} -> Balance: R$ ${runningBalance.toFixed(2)}`)
    } else {
      runningBalance += amount
      console.log(`${tx.date.toISOString().slice(0, 10)} - ${amount >= 0 ? '+' : ''}R$ ${amount.toFixed(2)} -> Balance: R$ ${runningBalance.toFixed(2)} | ${tx.description.slice(0, 40)}...`)
    }
  }
  
  // Calculate total of all transactions
  let totalAmount = 0
  for (const tx of transactions) {
    totalAmount += tx.amount?.toNumber() || 0
  }
  
  console.log(`\nTotal of all transactions: R$ ${totalAmount.toFixed(2)}`)
  console.log(`Expected final balance: R$ 1.00`)
  console.log(`Difference: R$ ${(1.00 - totalAmount).toFixed(2)}`)
  
  // Check last few transactions
  console.log('\nLast 5 transactions:')
  const lastTransactions = transactions.slice(-5)
  runningBalance = totalAmount
  
  for (let i = lastTransactions.length - 5; i >= 0; i--) {
    if (i < 0) continue
    const tx = lastTransactions[i]
    const amount = tx.amount?.toNumber() || 0
    console.log(`${tx.date.toISOString().slice(0, 10)} - ${amount >= 0 ? '+' : ''}R$ ${amount.toFixed(2)} | ${tx.description.slice(0, 50)}...`)
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)