import { prisma } from '@/lib/core/database/client'
import { BankCard } from './components/BankCard'
import { getCurrentBalance } from '@/lib/features/financial/financial-calculations'

export default async function BancosPage() {
  const bankAccounts = await prisma.bankAccount.findMany({
    where: {
      isActive: true
    },
    include: {
      transactions: {
        orderBy: {
          date: 'desc'
        },
        take: 10
      },
      _count: {
        select: {
          transactions: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  const bankStats = await Promise.all(
    bankAccounts.map(async (bank) => {
      const totalTransactions = await prisma.transaction.count({
        where: { bankAccountId: bank.id }
      })

      const currentBalance = await getCurrentBalance(bank.id)

      const lastTransaction = await prisma.transaction.findFirst({
        where: { bankAccountId: bank.id },
        orderBy: { date: 'desc' }
      })

      return {
        ...bank,
        transactions: bank.transactions.map(transaction => ({
          ...transaction,
          amount: transaction.amount.toNumber(),
          balance: null // Balance not needed for preview, will be calculated when needed
        })),
        totalTransactions,
        currentBalance,
        lastTransactionDate: lastTransaction?.date
      }
    })
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bancos</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankStats.map((bank) => (
          <BankCard 
            key={bank.id} 
            bank={bank}
          />
        ))}
      </div>
      </div>
    </div>
  )
}