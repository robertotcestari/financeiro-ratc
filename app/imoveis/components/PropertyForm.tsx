'use client'

import { useState, useEffect } from 'react'
import { Property, City } from '@/app/generated/prisma'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PropertyFormProps {
  property?: Property | null
  cities: City[]
  onSubmit: (data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onCancel: () => void
}

export default function PropertyForm({ property, cities, onSubmit, onCancel }: PropertyFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    city: '',
    cityId: '',
    address: '',
    description: '',
    isActive: true
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (property) {
      setFormData({
        code: property.code,
        city: property.city,
        cityId: property.cityId || '',
        address: property.address,
        description: property.description || '',
        isActive: property.isActive
      })
    }
  }, [property])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Erro ao salvar imóvel:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {property ? 'Editar Imóvel' : 'Adicionar Novo Imóvel'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Código *
            </label>
            <Input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              placeholder="Ex: CAT - Rua Brasil"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              Cidade *
            </label>
            <select
              id="cityId"
              name="cityId"
              value={formData.cityId}
              onChange={(e) => {
                const cityId = e.target.value
                const selectedCity = cities.find(c => c.id === cityId)
                setFormData(prev => ({
                  ...prev,
                  cityId,
                  city: selectedCity?.code || ''
                }))
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma cidade</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name} ({city.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Endereço *
          </label>
          <Input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            placeholder="Ex: Rua Brasil, 123"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descrição adicional do imóvel"
          />
        </div>

        <div className="flex items-center">
          <Input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
            Imóvel ativo
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            variant="default"
          >
            {loading ? 'Salvando...' : (property ? 'Atualizar' : 'Criar')}
          </Button>
        </div>
      </form>
    </div>
  )
}