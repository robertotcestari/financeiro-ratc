'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Category {
  id: string
  name: string
  level: number
  parent: { name: string } | null
}

interface BankAccount {
  id: string
  name: string
  bankName: string
}

interface Props {
  categories: Category[]
  bankAccounts: BankAccount[]
  searchParams: {
    categoria?: string
    conta?: string
    mes?: string
    ano?: string
    status?: string
    origem?: string
    page?: string
  }
}

export default function TransactionFilters({ categories, bankAccounts, searchParams }: Props) {
  const router = useRouter()
  
  const currentMonth = new Date().getMonth() + 1
  const [filters, setFilters] = useState({
    categoria: searchParams.categoria || '',
    conta: searchParams.conta || '',
    mes: searchParams.mes || currentMonth.toString(),
    ano: searchParams.ano || new Date().getFullYear().toString(),
    status: searchParams.status || 'pendentes',
    origem: searchParams.origem || ''
  })

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = [
    { value: '', label: 'Todos os meses' },
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ]

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Construir nova URL
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    
    // Reset page quando filtros mudarem
    params.delete('page')
    
    const queryString = params.toString()
    router.push(`/transacoes${queryString ? `?${queryString}` : ''}`)
  }

  const clearFilters = () => {
    setFilters({
      categoria: '',
      conta: '',
      mes: '',
      ano: currentYear.toString(),
      status: '',
      origem: ''
    })
    router.push('/transacoes')
  }

  // Organizar categorias por hierarquia
  const groupedCategories = categories.reduce((acc, category) => {
    const categoryDisplay = category.level === 1 
      ? category.name
      : `${category.parent?.name} > ${category.name}`
    
    if (!acc[category.level]) {
      acc[category.level] = []
    }
    acc[category.level].push({
      ...category,
      displayName: categoryDisplay
    })
    return acc
  }, {} as Record<number, Array<Category & { displayName: string }>>)

  const sortedCategories = Object.keys(groupedCategories)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .flatMap(level => groupedCategories[parseInt(level)])

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Filtro de Categoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria
          </label>
          <select
            value={filters.categoria}
            onChange={(e) => updateFilter('categoria', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as categorias</option>
            {sortedCategories.map(category => (
              <option key={category.id} value={category.id}>
                {'  '.repeat(category.level - 1) + category.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Conta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conta Bancária
          </label>
          <select
            value={filters.conta}
            onChange={(e) => updateFilter('conta', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as contas</option>
            {bankAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Ano */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ano
          </label>
          <select
            value={filters.ano}
            onChange={(e) => updateFilter('ano', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Mês */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mês
          </label>
          <select
            value={filters.mes}
            onChange={(e) => updateFilter('mes', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="pendentes">Pendentes</option>
            <option value="revisados">Revisados</option>
          </select>
        </div>

        {/* Filtro de Origem */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Origem
          </label>
          <select
            value={filters.origem}
            onChange={(e) => updateFilter('origem', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="auto">Somente auto</option>
            <option value="manual">Somente manual</option>
          </select>
        </div>
      </div>

      {/* Botão Limpar Filtros */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  )
}