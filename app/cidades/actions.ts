'use server'

import { prisma } from '@/lib/database/client'
import { City } from '@/app/generated/prisma'
import { revalidatePath } from 'next/cache'

export async function getCities(): Promise<City[]> {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { properties: true }
        }
      }
    })
    return cities
  } catch (error) {
    console.error('Erro ao buscar cidades:', error)
    throw new Error('Erro ao buscar cidades')
  }
}

export async function createCity(
  data: Omit<City, 'id' | 'createdAt' | 'updatedAt'>
): Promise<City> {
  try {
    const city = await prisma.city.create({
      data
    })
    revalidatePath('/cidades')
    return city
  } catch (error) {
    console.error('Erro ao criar cidade:', error)
    throw new Error('Erro ao criar cidade')
  }
}

export async function updateCity(
  id: string,
  data: Omit<City, 'id' | 'createdAt' | 'updatedAt'>
): Promise<City> {
  try {
    const city = await prisma.city.update({
      where: { id },
      data
    })
    revalidatePath('/cidades')
    return city
  } catch (error) {
    console.error('Erro ao atualizar cidade:', error)
    throw new Error('Erro ao atualizar cidade')
  }
}

export async function deleteCity(id: string): Promise<void> {
  try {
    // Check if city has associated properties
    const propertiesCount = await prisma.property.count({
      where: { cityId: id }
    })
    
    if (propertiesCount > 0) {
      throw new Error(`Não é possível excluir a cidade. Existem ${propertiesCount} imóveis vinculados a ela.`)
    }

    await prisma.city.delete({
      where: { id }
    })
    revalidatePath('/cidades')
  } catch (error) {
    console.error('Erro ao excluir cidade:', error)
    throw error
  }
}