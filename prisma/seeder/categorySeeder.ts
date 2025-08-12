import { PrismaClient, CategoryType } from '../../app/generated/prisma'
import categoriesData from './categories.json'

interface CategoryData {
  id: string
  name: string
  type: string
  level: number
  parentId: string | null
}

export async function seedCategories(prisma: PrismaClient) {
  console.log('📂 Creating categories...')
  
  let totalCreated = 0
  
  // First, create all categories in order (level 1, then 2, then 3)
  const sortedCategories = [...categoriesData].sort((a, b) => a.level - b.level)
  
  for (const category of sortedCategories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        type: category.type as CategoryType,
        level: category.level,
        parentId: category.parentId,
      },
      create: {
        id: category.id,
        name: category.name,
        type: category.type as CategoryType,
        level: category.level,
        parentId: category.parentId,
      }
    })
    
    totalCreated++
  }
  
  console.log(`   ✅ Created/updated ${totalCreated} categories`)
}