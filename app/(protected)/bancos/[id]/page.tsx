import { prisma } from '@/lib/core/database/client'
import { notFound, redirect } from 'next/navigation'
import { TransactionList } from './components/TransactionList'
import Link from 'next/link'
import { calculateRunningBalance } from '@/lib/features/financial/financial-calculations'

interface SearchParams {
  mes?: string
  ano?: string
}

interface BankPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}

export default async function BankPage({ params, searchParams }: BankPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams

  // Check if we need to apply default filters (previous month)
  const hasFilters = resolvedSearchParams.mes || resolvedSearchParams.ano
  
  if (!hasFilters) {
    // Calculate previous month as default
    const now = new Date()
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    const year = previousMonth.getFullYear()
    const month = previousMonth.getMonth() + 1
    
    const params = new URLSearchParams()
    params.set('ano', year.toString())
    params.set('mes', month.toString())
    
    redirect(`/bancos/${id}?${params.toString()}`)
  }

  // Parse month and year from search params
  const currentYear = new Date().getFullYear()
  const month = resolvedSearchParams.mes ? parseInt(resolvedSearchParams.mes) : null
  const year = resolvedSearchParams.ano ? parseInt(resolvedSearchParams.ano) : currentYear

  // Build date filter for transactions
  let dateFilter = {}
  if (month && year) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)
    dateFilter = {
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  } else if (year && !month) {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999)
    dateFilter = {
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  }

  // Calculate initial balance (sum of all transactions before the filtered period)
  let initialBalance = 0
  if (month && year) {
    const startDate = new Date(year, month - 1, 1)
    const balanceResult = await prisma.transaction.aggregate({
      where: {
        bankAccountId: id,
        date: {
          lt: startDate
        }
      },
      _sum: {
        amount: true
      }
    })
    initialBalance = balanceResult._sum.amount ? Number(balanceResult._sum.amount) : 0
  }

  const bankAccountRaw = await prisma.bankAccount.findUnique({
    where: { id },
    include: {
      transactions: {
        where: dateFilter,
        orderBy: {
          date: 'asc'
        },
        include: {
          processedTransaction: true
        }
      }
    }
  })
  
  if (!bankAccountRaw) {
    notFound()
  }

  // Calculate running balances for transactions with initial balance
  const transactionsWithBalance = calculateRunningBalance(bankAccountRaw.transactions, initialBalance)

  const bankAccount = {
    ...bankAccountRaw,
    transactions: transactionsWithBalance.map(transaction => ({
      ...transaction,
      amount: transaction.amount.toNumber(),
      balance: transaction.balance,
      isProcessed: !!transaction.processedTransaction
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

        <TransactionList 
          transactions={bankAccount.transactions}
          bankAccountId={id}
          searchParams={{
            mes: resolvedSearchParams.mes,
            ano: resolvedSearchParams.ano
          }}
          initialBalance={initialBalance}
        />
      </div>
    </div>
  )
}