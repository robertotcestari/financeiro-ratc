'use client';

import { useState, useEffect } from 'react';
import { City } from '@/app/generated/prisma';
import CityForm from './CityForm';
import CityList from './CityList';
import { createCity, updateCity, deleteCity } from '../actions';
import { Button } from '@/components/ui/button';

type CityWithCount = City & { _count?: { properties: number } };

interface CitiesManagerProps {
  initialCities: CityWithCount[];
}

export default function CitiesManager({ initialCities }: CitiesManagerProps) {
  const [cities, setCities] = useState<CityWithCount[]>(initialCities);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCities(initialCities);
  }, [initialCities]);

  const handleCreateCity = async (
    cityData: Omit<City, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading(true);
    try {
      const newCity = await createCity(cityData);
      setCities([...cities, newCity]);
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao criar cidade:', error);
      alert('Erro ao criar cidade. Verifique se o código não está duplicado.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCity = async (
    id: string,
    cityData: Omit<City, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading(true);
    try {
      const updatedCity = await updateCity(id, cityData);
      setCities(cities.map((c) => (c.id === id ? updatedCity : c)));
      setEditingCity(null);
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao atualizar cidade:', error);
      alert(
        'Erro ao atualizar cidade. Verifique se o código não está duplicado.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCity = async (id: string) => {
    const city = cities.find((c) => c.id === id);
    if (confirm(`Tem certeza que deseja excluir a cidade ${city?.name}?`)) {
      setLoading(true);
      try {
        await deleteCity(id);
        setCities(cities.filter((c) => c.id !== id));
      } catch (error) {
        console.error('Erro ao excluir cidade:', error);
        alert(
          error instanceof Error ? error.message : 'Erro ao excluir cidade'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditCity = (city: City) => {
    setEditingCity(city);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingCity(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciar Cidades
            </h1>
            <p className="text-gray-600 mt-2">
              Adicione, edite e gerencie as cidades do sistema
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            variant="default"
            disabled={loading}
          >
            Adicionar Cidade
          </Button>
        </div>

        {showForm && (
          <div className="mb-8">
            <CityForm
              city={editingCity}
              onSubmit={
                editingCity
                  ? (data) => handleUpdateCity(editingCity.id, data)
                  : handleCreateCity
              }
              onCancel={handleCancelEdit}
            />
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-600">Processando...</div>
        )}

        <CityList
          cities={cities}
          onEdit={handleEditCity}
          onDelete={handleDeleteCity}
        />
      </div>
    </div>
  );
}
