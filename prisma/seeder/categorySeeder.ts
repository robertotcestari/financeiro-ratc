import { PrismaClient, CategoryType } from '../../app/generated/prisma'
import categoriesData from './categories.json'

interface CategoryData {
  name: string
  type: string
  level: number
  orderIndex: number
  isSystem?: boolean
  children?: CategoryData[]
}

export async function seedCategories(prisma: PrismaClient) {
  console.log('📂 Creating categories...')
  
  let totalCreated = 0
  
  async function createCategory(
    category: CategoryData, 
    parentId: string | null = null
  ): Promise<string> {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        type: category.type as CategoryType,
        parentId,
        level: category.level,
        orderIndex: category.orderIndex,
        isSystem: category.isSystem || false,
      }
    })
    
    totalCreated++
    
    if (category.children && category.children.length > 0) {
      for (const child of category.children) {
        await createCategory(child, created.id)
      }
    }
    
    return created.id
  }
  
  for (const rootCategory of categoriesData.rootCategories) {
    await createCategory(rootCategory)
  }
  
  console.log(`   ✅ Created/updated ${totalCreated} categories`)
}