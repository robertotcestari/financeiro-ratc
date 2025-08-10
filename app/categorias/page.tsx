import { Suspense } from 'react'
import { getCategoriesHierarchy } from './actions'
import CategoriesManager from './components/CategoriesManager'

export default async function CategoriasPage() {
  const categories = await getCategoriesHierarchy()

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gerenciamento de Categorias
        </h1>
        <p className="text-gray-600">
          Adicione, edite ou exclua categorias para organizar suas transações financeiras
        </p>
      </div>

      <Suspense fallback={<div>Carregando...</div>}>
        <CategoriesManager initialCategories={categories} />
      </Suspense>
    </div>
  )
}