'use client'

import { useState } from 'react'
import { Category, CategoryType } from '@/app/generated/prisma'
import { createCategory, editCategory } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CategoryWithDetails extends Category {
  parent: Category | null
  children: Category[]
  _count: {
    transactions: number
  }
}

interface CategoryFormProps {
  category?: CategoryWithDetails | null
  categories: CategoryWithDetails[]
  onCancel: () => void
}

export default function CategoryForm({ category, categories, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    type: category?.type || CategoryType.EXPENSE,
    parentId: category?.parentId || '',
    level: category?.level || 1,
    orderIndex: category?.orderIndex || 0
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const categoryTypes = [
    { value: CategoryType.INCOME, label: 'Receita' },
    { value: CategoryType.EXPENSE, label: 'Despesa' },
    { value: CategoryType.TRANSFER, label: 'Transferência' },
    { value: CategoryType.ADJUSTMENT, label: 'Ajuste' }
  ]

  const getAvailableParents = () => {
    return categories.filter(cat => {
      if (category && cat.id === category.id) return false
      if (cat.level >= 3) return false
      if (category && cat.level >= category.level) return false
      if (cat.type !== formData.type) return false
      return true
    })
  }

  const handleParentChange = (parentId: string) => {
    const parent = categories.find(cat => cat.id === parentId)
    const newLevel = parent ? parent.level + 1 : 1
    
    setFormData(prev => ({
      ...prev,
      parentId,
      level: newLevel
    }))
  }

  const handleTypeChange = (newType: CategoryType) => {
    const currentParent = categories.find(cat => cat.id === formData.parentId)
    const shouldResetParent = currentParent && currentParent.type !== newType
    
    setFormData(prev => ({
      ...prev,
      type: newType,
      parentId: shouldResetParent ? '' : prev.parentId,
      level: shouldResetParent ? 1 : prev.level
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const data = {
        ...formData,
        parentId: formData.parentId || undefined
      }

      let result
      if (category) {
        result = await editCategory({ id: category.id, ...data })
      } else {
        result = await createCategory(data)
      }

      if (result.success) {
        window.location.reload()
      } else {
        setError(result.error || 'Erro ao salvar categoria')
      }
    } catch {
      setError('Erro ao salvar categoria')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nome da Categoria
        </label>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo
        </label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => handleTypeChange(e.target.value as CategoryType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          {categoryTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-1">
          Categoria Pai (opcional)
        </label>
        <select
          id="parentId"
          value={formData.parentId}
          onChange={(e) => handleParentChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Nenhuma (categoria raiz)</option>
          {getAvailableParents().map(parent => (
            <option key={parent.id} value={parent.id}>
              {'  '.repeat(parent.level - 1)}{parent.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="orderIndex" className="block text-sm font-medium text-gray-700 mb-1">
          Ordem de Exibição
        </label>
        <Input
          type="number"
          id="orderIndex"
          min="0"
          value={formData.orderIndex}
          onChange={(e) => setFormData(prev => ({ ...prev, orderIndex: parseInt(e.target.value) || 0 }))}
        />
      </div>

      <div className="text-sm text-gray-600">
        <p>Nível da categoria: {formData.level}</p>
        {formData.level === 1 && <p>Esta será uma categoria principal</p>}
        {formData.level === 2 && <p>Esta será uma subcategoria</p>}
        {formData.level === 3 && <p>Esta será uma categoria de detalhamento</p>}
      </div>

      <div className="flex space-x-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : (category ? 'Salvar' : 'Criar')}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}