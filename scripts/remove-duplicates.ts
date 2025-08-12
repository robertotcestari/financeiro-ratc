import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('=== REMOVING DUPLICATE TRANSACTIONS ===\n')
  
  // Find duplicate transactions (keeping the first one, removing others)
  console.log('Finding duplicate transaction groups...')
  
  const duplicateGroups = await prisma.transaction.groupBy({
    by: ['bankAccountId', 'date', 'amount', 'description'],
    having: { id: { _count: { gt: 1 } } },
    _count: { id: true },
    _max: { id: true },
    _min: { id: true }
  })
  
  console.log(`Found ${duplicateGroups.length} duplicate groups`)
  
  let totalDeleted = 0
  
  for (const group of duplicateGroups) {
    // Get all transaction IDs in this duplicate group
    const duplicateTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId: group.bankAccountId,
        date: group.date,
        amount: group.amount,
        description: group.description
      },
      select: { id: true },
      orderBy: { id: 'asc' }
    })
    
    // Keep the first transaction, delete the rest
    const transactionsToDelete = duplicateTransactions.slice(1)
    
    if (transactionsToDelete.length > 0) {
      // First, delete any ProcessedTransactions that reference these duplicates
      await prisma.processedTransaction.deleteMany({
        where: {
          transactionId: {
            in: transactionsToDelete.map(t => t.id)
          }
        }
      })
      
      // Then delete the duplicate transactions
      const deleteResult = await prisma.transaction.deleteMany({
        where: {
          id: {
            in: transactionsToDelete.map(t => t.id)
          }
        }
      })
      
      totalDeleted += deleteResult.count
      
      if (totalDeleted % 100 === 0) {
        console.log(`Deleted ${totalDeleted} duplicate transactions so far...`)
      }
    }
  }
  
  console.log(`\n✅ Removed ${totalDeleted} duplicate transactions`)
  
  // Verify the cleanup
  console.log('\n=== VERIFICATION ===')
  
  const remainingDuplicates = await prisma.transaction.groupBy({
    by: ['bankAccountId', 'date', 'amount', 'description'],
    having: { id: { _count: { gt: 1 } } },
    _count: { id: true }
  })
  
  console.log(`Remaining duplicate groups: ${remainingDuplicates.length}`)
  
  // Show new transaction counts
  const accounts = await prisma.bankAccount.findMany()
  console.log('\nTransaction counts by account:')
  for (const account of accounts) {
    const count = await prisma.transaction.count({
      where: { bankAccountId: account.id }
    })
    console.log(`  ${account.name}: ${count} transactions`)
  }
  
  // Calculate new CC - Sicredi balance
  const sicrediAccount = await prisma.bankAccount.findUnique({
    where: { name: 'CC - Sicredi' }
  })
  
  if (sicrediAccount) {
    const transactions = await prisma.transaction.findMany({
      where: { bankAccountId: sicrediAccount.id },
      orderBy: { date: 'asc' }
    })
    
    let calculatedBalance = 0
    for (const tx of transactions) {
      calculatedBalance += tx.amount?.toNumber() || 0
    }
    
    console.log(`\nCC - Sicredi calculated balance: R$ ${calculatedBalance.toFixed(2)}`)
    console.log('Expected: R$ 1.00')
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)