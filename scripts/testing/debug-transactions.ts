import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

async function debugTransactions() {
  const transactions = await prisma.transaction.findMany()
  
  console.log('Existing transactions:')
  for (const tx of transactions) {
    console.log({
      id: tx.id,
      bankAccountId: tx.bankAccountId,
      date: tx.date.toISOString().slice(0, 10),
      amount: tx.amount,
      balance: tx.balance,
      description: tx.description
    })
  }
  
  const bankAccounts = await prisma.bankAccount.findMany()
  console.log('\nBank accounts:')
  for (const acc of bankAccounts) {
    console.log({
      id: acc.id,
      name: acc.name
    })
  }
}

debugTransactions()
  .catch(console.error)
  .finally(() => prisma.$disconnect())