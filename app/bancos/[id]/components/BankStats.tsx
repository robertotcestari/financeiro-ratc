import { BankAccount, AccountType } from '@/app/generated/prisma'

interface BankStatsProps {
  bankAccount: BankAccount
  totalBalance: number
  totalTransactions: number
  monthlyStats: Array<{
    year: number
    month: number
    total: number
    count: number
  }>
}

export function BankStats({ bankAccount, totalBalance, totalTransactions, monthlyStats }: BankStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
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

  const getMonthName = (month: number) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    return months[month - 1]
  }

  const balanceColor = totalBalance >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Account Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações da Conta</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Tipo:</span>
            <span className={`px-2 py-1 text-xs rounded-full ${getAccountTypeColor(bankAccount.accountType)}`}>
              {getAccountTypeLabel(bankAccount.accountType)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Status:</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              bankAccount.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {bankAccount.isActive ? 'Ativa' : 'Inativa'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Criada em:</span>
            <span className="text-sm text-gray-900">
              {new Intl.DateTimeFormat('pt-BR').format(new Date(bankAccount.createdAt))}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo Geral</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Saldo Total:</span>
            <span className={`text-lg font-semibold ${balanceColor}`}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total de Transações:</span>
            <span className="text-lg font-medium text-gray-900">
              {totalTransactions.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Média por Transação:</span>
            <span className="text-sm text-gray-900">
              {totalTransactions > 0 
                ? formatCurrency(totalBalance / totalTransactions)
                : formatCurrency(0)
              }
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimos Meses</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {monthlyStats.map((stat) => (
            <div key={`${stat.year}-${stat.month}`} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
              <span className="text-sm text-gray-600">
                {getMonthName(stat.month)} {stat.year}
              </span>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  stat.total >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(stat.total)}
                </div>
                <div className="text-xs text-gray-500">
                  {stat.count} transações
                </div>
              </div>
            </div>
          ))}
          {monthlyStats.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma transação encontrada
            </p>
          )}
        </div>
      </div>
    </div>
  )
}