'use client';

import { useState } from 'react';
import { Property, City } from '@/app/generated/prisma';
import PropertyForm from './PropertyForm';
import PropertyList from './PropertyList';
import { createProperty, updateProperty, deleteProperty } from '../actions';
import { Button } from '@/components/ui/button';

interface PropertiesManagerProps {
  initialProperties: Property[];
  initialCities: City[];
}

export default function PropertiesManager({
  initialProperties,
  initialCities,
}: PropertiesManagerProps) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateProperty = async (
    propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading(true);
    try {
      const newProperty = await createProperty(propertyData);
      setProperties([...properties, newProperty]);
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao criar imóvel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProperty = async (
    id: string,
    propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading(true);
    try {
      const updatedProperty = await updateProperty(id, propertyData);
      setProperties(properties.map((p) => (p.id === id ? updatedProperty : p)));
      setEditingProperty(null);
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao atualizar imóvel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este imóvel?')) {
      setLoading(true);
      try {
        await deleteProperty(id);
        setProperties(properties.filter((p) => p.id !== id));
      } catch (error) {
        console.error('Erro ao excluir imóvel:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingProperty(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciar Imóveis
            </h1>
            <p className="text-gray-600 mt-2">
              Adicione, edite e gerencie os imóveis do sistema
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            variant="default"
            disabled={loading}
          >
            Adicionar Imóvel
          </Button>
        </div>

        {showForm && (
          <div className="mb-8">
            <PropertyForm
              property={editingProperty}
              cities={initialCities}
              onSubmit={
                editingProperty
                  ? (data) => handleUpdateProperty(editingProperty.id, data)
                  : handleCreateProperty
              }
              onCancel={handleCancelEdit}
            />
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-600">Processando...</div>
        )}

        <PropertyList
          properties={properties}
          onEdit={handleEditProperty}
          onDelete={handleDeleteProperty}
        />
      </div>
    </div>
  );
}
