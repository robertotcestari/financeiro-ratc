import { prisma } from './database/client'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Calculate running balance for transactions
 * Returns transactions with calculated balance field
 */
export function calculateRunningBalance<T extends { date: Date; amount: Decimal }>(
  transactions: T[]
): (T & { balance: number })[] {
  if (transactions.length === 0) return []

  // Sort transactions by date (oldest first) to calculate running balance
  const sortedTransactions = [...transactions].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  )

  let runningBalance = new Decimal(0)
  
  return sortedTransactions.map((transaction) => {
    runningBalance = runningBalance.plus(transaction.amount)
    return {
      ...transaction,
      balance: runningBalance.toNumber()
    }
  })
}

/**
 * Calculate current balance for a bank account
 */
export async function getCurrentBalance(bankAccountId: string): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { bankAccountId },
    _sum: {
      amount: true
    }
  })

  return result._sum.amount ? result._sum.amount.toNumber() : 0
}

/**
 * Calculate balance at a specific date
 */
export async function getBalanceAtDate(
  bankAccountId: string, 
  date: Date
): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { 
      bankAccountId,
      date: {
        lte: date
      }
    },
    _sum: {
      amount: true
    }
  })

  return result._sum.amount ? result._sum.amount.toNumber() : 0
}

