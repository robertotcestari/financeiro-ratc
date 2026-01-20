'use client'

import { useState } from 'react'
import { Category, CategoryType } from '@/app/generated/prisma'
import { deleteCategory } from '../actions'
import { Button } from '@/components/ui/button'

interface CategoryWithDetails extends Category {
  parent: Category | null
  children: Category[]
  _count: {
    transactions: number
  }
}

interface CategoryListProps {
  categories: CategoryWithDetails[]
  onEdit: (category: CategoryWithDetails) => void
  onDelete: (categoryId: string) => void
}

interface CategoryItemProps {
  category: CategoryWithDetails
  level: number
  onEdit: (category: CategoryWithDetails) => void
  onDelete: (categoryId: string) => void
}

function CategoryItem({ category, level, onEdit, onDelete }: CategoryItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteCategory(category.id)
      if (result.success) {
        onDelete(category.id)
      } else {
        alert(result.error)
      }
    } catch {
      alert('Erro ao excluir categoria')
    } finally {
      setIsDeleting(false)
    }
  }

  const getCategoryTypeLabel = (type: CategoryType) => {
    switch (type) {
      case CategoryType.INCOME:
        return 'Receita'
      case CategoryType.EXPENSE:
        return 'Despesa'
      case CategoryType.TRANSFER:
        return 'Transferência'
      case CategoryType.ADJUSTMENT:
        return 'Ajuste'
      default:
        return type
    }
  }

  const getCategoryTypeColor = (type: CategoryType) => {
    switch (type) {
      case CategoryType.INCOME:
        return 'bg-green-100 text-green-800'
      case CategoryType.EXPENSE:
        return 'bg-red-100 text-red-800'
      case CategoryType.TRANSFER:
        return 'bg-blue-100 text-blue-800'
      case CategoryType.ADJUSTMENT:
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <tr className="border-b border-gray-200">
        <td className="py-3 px-4">
          <div 
            className="flex items-center"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {level > 0 && (
              <span className="text-gray-400 mr-2">
                {'└'.repeat(level)}
              </span>
            )}
            <span className={`font-medium ${level === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
              {category.name}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryTypeColor(category.type)}`}>
            {getCategoryTypeLabel(category.type)}
          </span>
        </td>
        <td className="py-3 px-4 text-center">
          <span className="text-gray-600">
            {category._count.transactions}
          </span>
        </td>
        <td className="py-3 px-4">
          <div className="flex space-x-2">
            <Button
              onClick={() => onEdit(category)}
              disabled={category.isSystem}
              variant="outline"
              size="sm"
            >
              Editar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting || category.isSystem || category.children.length > 0 || category._count.transactions > 0}
              variant="outline"
              size="sm"
              className={isDeleting || category.isSystem || category.children.length > 0 || category._count.transactions > 0 ? '' : 'text-red-600 hover:text-red-700'}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </td>
      </tr>
      {category.children.map(child => (
        <CategoryItem
          key={child.id}
          category={child as CategoryWithDetails}
          level={level + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  )
}

export default function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden"
      style={{ contentVisibility: 'auto' }}
    >
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
              Nome
            </th>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
              Tipo
            </th>
            <th className="py-3 px-4 text-center text-sm font-medium text-gray-700">
              Transações
            </th>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 px-4 text-center text-gray-500">
                Nenhuma categoria encontrada
              </td>
            </tr>
          ) : (
            categories.map(category => (
              <CategoryItem
                key={category.id}
                category={category}
                level={0}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
