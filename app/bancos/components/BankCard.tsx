import { BankAccount, Transaction, AccountType } from '@/app/generated/prisma'
import Link from 'next/link'

type SerializedTransaction = Omit<Transaction, 'amount'> & {
  amount: number
  balance: number | null
}

interface BankCardProps {
  bank: BankAccount & {
    transactions: SerializedTransaction[]
    _count: {
      transactions: number
    }
    totalTransactions: number
    currentBalance: number
    lastTransactionDate?: Date
  }
}

export function BankCard({ bank }: BankCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'Nenhuma transação'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    }).format(new Date(date))
  }

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'CHECKING': return 'Conta Corrente'
      case 'SAVINGS': return 'Poupança'
      case 'INVESTMENT': return 'Investimento'
      default: return type
    }
  }

  const getAccountTypeColor = (type: AccountType) => {
    switch (type) {
      case 'CHECKING': return 'bg-blue-100 text-blue-800'
      case 'SAVINGS': return 'bg-green-100 text-green-800'
      case 'INVESTMENT': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const balanceColor = bank.currentBalance >= 0 
    ? 'text-green-600' 
    : 'text-red-600'

  return (
    <Link href={`/bancos/${bank.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{bank.name}</h3>
            <p className="text-sm text-gray-600">{bank.bankName}</p>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${getAccountTypeColor(bank.accountType)}`}>
            {getAccountTypeLabel(bank.accountType)}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Saldo atual:</span>
            <span className={`text-lg font-semibold ${balanceColor}`}>
              {formatCurrency(bank.currentBalance)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total de transações:</span>
            <span className="text-sm font-medium text-gray-900">
              {bank.totalTransactions}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Última transação:</span>
            <span className="text-sm text-gray-900">
              {formatDate(bank.lastTransactionDate)}
            </span>
          </div>
        </div>

        {bank.transactions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Transações recentes:
            </h4>
            <div className="space-y-1">
              {bank.transactions.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 truncate max-w-[150px]">
                    {transaction.description}
                  </span>
                  <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}