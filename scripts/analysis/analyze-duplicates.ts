import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('=== DUPLICATE ANALYSIS ===\n')
  
  // Get CC - Sicredi account ID first
  const sicrediAccount = await prisma.bankAccount.findUnique({
    where: { name: 'CC - Sicredi' }
  })
  
  if (!sicrediAccount) {
    console.log('CC - Sicredi account not found')
    return
  }
  
  // Show transaction count by import batch for CC - Sicredi
  console.log('Import batches for CC - Sicredi:')
  const batches = await prisma.importBatch.findMany({
    where: { bankAccountId: sicrediAccount.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: 'asc' }
  })
  
  for (const batch of batches) {
    console.log(`  ${batch.fileName}: ${batch._count.transactions} transactions (created: ${batch.createdAt.toISOString()})`)
  }
  
  console.log(`\nTotal batches: ${batches.length}`)
  console.log('Expected: Only 1 batch should exist for CC - Sicredi')
  
  // Check duplicate transactions
  console.log('\n=== CHECKING DUPLICATES ===')
  
  const duplicates = await prisma.transaction.groupBy({
    by: ['bankAccountId', 'date', 'amount', 'description'],
    having: { id: { _count: { gt: 1 } } },
    _count: { id: true },
    where: { bankAccountId: sicrediAccount.id }
  })
  
  console.log(`Found ${duplicates.length} groups of duplicate transactions in CC - Sicredi`)
  
  if (duplicates.length > 0) {
    console.log('\nFirst 10 duplicate groups:')
    for (let i = 0; i < Math.min(10, duplicates.length); i++) {
      const dup = duplicates[i]
      console.log(`  ${dup.date.toISOString().slice(0,10)} - R$ ${dup.amount?.toFixed(2)} - ${dup.description.slice(0,50)}... (${dup._count.id} copies)`)
    }
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)