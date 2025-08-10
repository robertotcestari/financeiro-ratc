'use client'

import { useState, useEffect } from 'react'
import { Property, City } from '@/app/generated/prisma'
import PropertyForm from './components/PropertyForm'
import PropertyList from './components/PropertyList'
import { createProperty, updateProperty, deleteProperty, getProperties } from './actions'
import { getCities } from '../cidades/actions'
import { Button } from '@/components/ui/button'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [propertiesData, citiesData] = await Promise.all([
        getProperties(),
        getCities()
      ])
      setProperties(propertiesData)
      setCities(citiesData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProperty = await createProperty(propertyData)
      setProperties([...properties, newProperty])
      setShowForm(false)
    } catch (error) {
      console.error('Erro ao criar imóvel:', error)
    }
  }

  const handleUpdateProperty = async (id: string, propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const updatedProperty = await updateProperty(id, propertyData)
      setProperties(properties.map(p => p.id === id ? updatedProperty : p))
      setEditingProperty(null)
      setShowForm(false)
    } catch (error) {
      console.error('Erro ao atualizar imóvel:', error)
    }
  }

  const handleDeleteProperty = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este imóvel?')) {
      try {
        await deleteProperty(id)
        setProperties(properties.filter(p => p.id !== id))
      } catch (error) {
        console.error('Erro ao excluir imóvel:', error)
      }
    }
  }

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property)
    setShowForm(true)
  }

  const handleCancelEdit = () => {
    setEditingProperty(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciar Imóveis</h1>
            <p className="text-gray-600 mt-2">
              Adicione, edite e gerencie os imóveis do sistema
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            variant="default"
          >
            Adicionar Imóvel
          </Button>
        </div>

        {showForm && (
          <div className="mb-8">
            <PropertyForm
              property={editingProperty}
              cities={cities}
              onSubmit={editingProperty ? 
                (data) => handleUpdateProperty(editingProperty.id, data) : 
                handleCreateProperty
              }
              onCancel={handleCancelEdit}
            />
          </div>
        )}

        <PropertyList
          properties={properties}
          onEdit={handleEditProperty}
          onDelete={handleDeleteProperty}
        />
      </div>
    </div>
  )
}