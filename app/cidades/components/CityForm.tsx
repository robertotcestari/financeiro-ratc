'use client'

import { useState, useEffect } from 'react'
import { City } from '@/app/generated/prisma'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CityFormProps {
  city?: City | null
  onSubmit: (data: Omit<City, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onCancel: () => void
}

export default function CityForm({ city, onSubmit, onCancel }: CityFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    isActive: true
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (city) {
      setFormData({
        code: city.code,
        name: city.name,
        isActive: city.isActive
      })
    }
  }, [city])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Erro ao salvar cidade:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value.toUpperCase()
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {city ? 'Editar Cidade' : 'Adicionar Nova Cidade'}
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
              maxLength={3}
              className="uppercase"
              placeholder="Ex: CAT"
            />
            <p className="text-xs text-gray-500 mt-1">Máximo 3 letras, será convertido para maiúsculas</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="Ex: Catanduva"
            />
          </div>
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
            Cidade ativa
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
            {loading ? 'Salvando...' : (city ? 'Atualizar' : 'Criar')}
          </Button>
        </div>
      </form>
    </div>
  )
}