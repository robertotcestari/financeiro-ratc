'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/database/client'
import { CategoryType } from '@/app/generated/prisma'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.nativeEnum(CategoryType),
  parentId: z.string().optional(),
  level: z.number().min(1).max(3),
  orderIndex: z.number().min(0)
})

const editCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.nativeEnum(CategoryType),
  parentId: z.string().optional(),
  orderIndex: z.number().min(0)
})

export async function getCategoriesHierarchy() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [
        { level: 'asc' },
        { orderIndex: 'asc' }
      ],
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            transactions: true
          }
        }
      }
    })
    
    return categories
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return []
  }
}

export async function createCategory(data: z.infer<typeof createCategorySchema>) {
  try {
    const validatedData = createCategorySchema.parse(data)
    
    await prisma.category.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        parentId: validatedData.parentId || null,
        level: validatedData.level,
        orderIndex: validatedData.orderIndex,
        isSystem: false
      }
    })
    
    revalidatePath('/categorias')
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Erro ao criar categoria' }
  }
}

export async function editCategory(data: z.infer<typeof editCategorySchema>) {
  try {
    const validatedData = editCategorySchema.parse(data)
    
    const category = await prisma.category.findUnique({
      where: { id: validatedData.id }
    })
    
    if (!category) {
      return { success: false, error: 'Categoria não encontrada' }
    }
    
    if (category.isSystem) {
      return { success: false, error: 'Categorias do sistema não podem ser editadas' }
    }
    
    await prisma.category.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        type: validatedData.type,
        parentId: validatedData.parentId || null,
        orderIndex: validatedData.orderIndex
      }
    })
    
    revalidatePath('/categorias')
    return { success: true }
  } catch (error) {
    console.error('Erro ao editar categoria:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Erro ao editar categoria' }
  }
}

export async function deleteCategory(id: string) {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: {
          select: {
            transactions: true
          }
        }
      }
    })
    
    if (!category) {
      return { success: false, error: 'Categoria não encontrada' }
    }
    
    if (category.isSystem) {
      return { success: false, error: 'Categorias do sistema não podem ser excluídas' }
    }
    
    if (category.children.length > 0) {
      return { success: false, error: 'Não é possível excluir uma categoria que possui subcategorias' }
    }
    
    if (category._count.transactions > 0) {
      return { success: false, error: 'Não é possível excluir uma categoria que possui transações associadas' }
    }
    
    
    await prisma.category.delete({
      where: { id }
    })
    
    revalidatePath('/categorias')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir categoria:', error)
    return { success: false, error: 'Erro ao excluir categoria' }
  }
}