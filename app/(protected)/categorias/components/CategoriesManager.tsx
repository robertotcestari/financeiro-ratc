'use client'

import { useState } from 'react'
import { Category } from '@/app/generated/prisma'
import CategoryList from './CategoryList'
import CategoryForm from './CategoryForm'
import { Button } from '@/components/ui/button'

interface CategoryWithDetails extends Category {
  parent: Category | null
  children: Category[]
  _count: {
    transactions: number
  }
}

interface CategoriesManagerProps {
  initialCategories: CategoryWithDetails[]
}

export default function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [editingCategory, setEditingCategory] = useState<CategoryWithDetails | null>(null)
  const [showForm, setShowForm] = useState(false)


  const handleCategoryDeleted = (deletedId: string) => {
    setCategories(categories.filter(cat => cat.id !== deletedId))
  }

  const handleEditCategory = (category: CategoryWithDetails) => {
    setEditingCategory(category)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setShowForm(false)
  }

  const buildHierarchy = (categories: CategoryWithDetails[]) => {
    const categoryMap = new Map(categories.map(cat => [cat.id, { 
      ...cat, 
      children: [] as CategoryWithDetails[] 
    }]))
    const rootCategories: CategoryWithDetails[] = []

    categories.forEach(category => {
      const cat = categoryMap.get(category.id)!
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children.push(cat)
        }
      } else {
        rootCategories.push(cat)
      }
    })

    return rootCategories.sort((a, b) => a.orderIndex - b.orderIndex)
  }

  const hierarchicalCategories = buildHierarchy(categories)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Categorias</h2>
          <p className="text-sm text-gray-600">
            Total: {categories.length} categorias
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
        >
          Nova Categoria
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <CategoryForm
            category={editingCategory}
            categories={categories}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

      <CategoryList
        categories={hierarchicalCategories}
        onEdit={handleEditCategory}
        onDelete={handleCategoryDeleted}
      />
    </div>
  )
}