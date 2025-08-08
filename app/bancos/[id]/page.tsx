import { prisma } from '@/lib/database/client'
import { notFound } from 'next/navigation'
import { TransactionList } from './components/TransactionList'
import { BankStats } from './components/BankStats'
import Link from 'next/link'
import { calculateRunningBalance } from '@/lib/financial-calculations'

interface BankPageProps {
  params: Promise<{ id: string }>
}

export default async function BankPage({ params }: BankPageProps) {
  const { id } = await params

  const bankAccountRaw = await prisma.bankAccount.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: {
          date: 'asc'
        }
      }
    }
  })
  
  if (!bankAccountRaw) {
    notFound()
  }

  // Calculate running balances for transactions
  const transactionsWithBalance = calculateRunningBalance(bankAccountRaw.transactions)

  const bankAccount = {
    ...bankAccountRaw,
    transactions: transactionsWithBalance.map(transaction => ({
      ...transaction,
      amount: transaction.amount.toNumber(),
      balance: transaction.balance
    }))
  }


  const stats = await prisma.transaction.aggregate({
    where: { bankAccountId: id },
    _sum: {
      amount: true
    },
    _count: true
  })

  const monthlyStatsRaw = await prisma.$queryRaw`
    SELECT 
      YEAR(date) as year,
      MONTH(date) as month,
      SUM(amount) as total,
      COUNT(*) as count
    FROM transactions 
    WHERE bankAccountId = ${id}
    GROUP BY YEAR(date), MONTH(date)
    ORDER BY year DESC, month DESC
    LIMIT 12
  ` as Array<{
    year: bigint | number
    month: bigint | number
    total: string | number
    count: bigint
  }>

  const monthlyStats = monthlyStatsRaw.map(stat => ({
    year: Number(stat.year),
    month: Number(stat.month),
    total: typeof stat.total === 'string' ? parseFloat(stat.total) : Number(stat.total),
    count: Number(stat.count)
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/bancos" 
          className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
        >
          ← Voltar para Bancos
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {bankAccount.name}
        </h1>
        <p className="text-gray-600">{bankAccount.bankName}</p>
      </div>

      <BankStats 
        bankAccount={bankAccount}
        totalBalance={stats._sum.amount ? Number(stats._sum.amount) : 0}
        totalTransactions={stats._count}
        monthlyStats={monthlyStats}
      />

      <div className="mt-8">
        <TransactionList 
          transactions={bankAccount.transactions}
        />
      </div>
    </div>
  )
}