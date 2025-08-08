'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/formatters'

interface Transaction {
  id: string
  year: number
  month: number
  details: string | null
  notes: string | null
  isTransfer: boolean
  isReviewed: boolean
  autoCategorized: boolean
  transaction: {
    id: string
    date: Date
    description: string
  amount: number
    bankAccount: {
      name: string
      bankName: string
    }
  }
  category: {
    id: string
    name: string
    type: string
    parent: {
      name: string
    } | null
  }
  property: {
    code: string
    city: string
  } | null
  transfer: {
    originAccount: { name: string }
    destinationAccount: { name: string }
  amount: number
  } | null
}

interface Props {
  transactions: Transaction[]
  currentPage: number
  totalPages: number
  totalCount: number
}

export default function TransactionTable({ transactions, currentPage, totalPages, totalCount }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/transacoes?${params.toString()}`)
  }

  const getCategoryDisplay = (category: Transaction['category']) => {
    if (category.parent) {
      return `${category.parent.name} > ${category.name}`
    }
    return category.name
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-600 bg-green-50'
      case 'EXPENSE':
        return 'text-red-600 bg-red-50'
      case 'TRANSFER':
        return 'text-blue-600 bg-blue-50'
      case 'ADJUSTMENT':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME': return 'Receita'
      case 'EXPENSE': return 'Despesa'
      case 'TRANSFER': return 'Transferência'
      case 'ADJUSTMENT': return 'Ajuste'
      default: return type
    }
  }

  return (
    <div className="overflow-hidden">
      {/* Header da tabela */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Transações
          </h3>
          <div className="text-sm text-gray-500">
            Página {currentPage} de {totalPages}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propriedade
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(transaction.transaction.date)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={transaction.transaction.description}>
                    {transaction.transaction.description}
                  </div>
                  {transaction.details && (
                    <div className="text-xs text-gray-500 mt-1" title={transaction.details}>
                      {transaction.details}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{transaction.transaction.bankAccount.name}</div>
                  <div className="text-xs text-gray-500">
                    {transaction.transaction.bankAccount.bankName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.category.type)}`}>
                    {getTypeLabel(transaction.category.type)}
                  </span>
                  <div className="text-sm text-gray-900 mt-1">
                    {getCategoryDisplay(transaction.category)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.property ? (
                    <div>
                      <div className="font-medium">{transaction.property.code}</div>
                      <div className="text-xs text-gray-500">{transaction.property.city}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <div className={`font-medium ${
                    transaction.transaction.amount >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(transaction.transaction.amount)}
                  </div>
                  {transaction.isTransfer && transaction.transfer && (
                    <div className="text-xs text-gray-500 mt-1">
                      {transaction.transfer.originAccount.name} → {transaction.transfer.destinationAccount.name}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center space-y-1">
                    {transaction.autoCategorized && (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Auto
                      </span>
                    )}
                    {transaction.isReviewed ? (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Revisado
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pendente
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * 50) + 1} até {Math.min(currentPage * 50, totalCount)} de {totalCount.toLocaleString('pt-BR')} transações
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              {/* Páginas */}
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem quando não há transações */}
      {transactions.length === 0 && (
        <div className="px-6 py-12 text-center">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">Nenhuma transação encontrada</p>
            <p className="text-gray-500">
              Tente ajustar os filtros ou verifique se há dados importados no sistema.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}