'use server'

import { prisma } from '@/lib/core/database/client'
import { Property } from '@/app/generated/prisma'
import { revalidatePath } from 'next/cache'

export async function getProperties(): Promise<Property[]> {
  try {
    const properties = await prisma.property.findMany({
      orderBy: [
        { city: 'asc' },
        { code: 'asc' }
      ]
    })
    return properties
  } catch (error) {
    console.error('Erro ao buscar imóveis:', error)
    throw new Error('Erro ao buscar imóveis')
  }
}

export async function createProperty(
  data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Property> {
  try {
    const property = await prisma.property.create({
      data
    })
    revalidatePath('/imoveis')
    return property
  } catch (error) {
    console.error('Erro ao criar imóvel:', error)
    throw new Error('Erro ao criar imóvel')
  }
}

export async function updateProperty(
  id: string,
  data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Property> {
  try {
    const property = await prisma.property.update({
      where: { id },
      data
    })
    revalidatePath('/imoveis')
    return property
  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error)
    throw new Error('Erro ao atualizar imóvel')
  }
}

export async function deleteProperty(id: string): Promise<void> {
  try {
    await prisma.property.delete({
      where: { id }
    })
    revalidatePath('/imoveis')
  } catch (error) {
    console.error('Erro ao excluir imóvel:', error)
    throw new Error('Erro ao excluir imóvel')
  }
}