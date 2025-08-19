import { PrismaClient } from '../app/generated/prisma/index.js'

async function main() {
  const prisma = new PrismaClient()
  try {
    const nameArg = process.argv[2] || 'CI - XP'
    const account = await prisma.bankAccount.findUnique({ where: { name: nameArg } })
    if (!account) {
      console.error('Account not found:', nameArg)
      process.exit(1)
    }
    const stats = await prisma.transaction.aggregate({
      where: { bankAccountId: account.id },
      _sum: { amount: true },
      _count: true
    })
    const last = await prisma.transaction.findFirst({
      where: { bankAccountId: account.id },
      orderBy: { date: 'desc' }
    })
  console.log(`${nameArg} transactions:`, stats._count)
  console.log(`${nameArg} sum(amount):`, Number(stats._sum.amount || 0).toFixed(2))
    if (last) {
      console.log('Latest transaction date:', last.date.toISOString().slice(0,10))
    }
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

main()
