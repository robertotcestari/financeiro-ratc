import { PrismaClient } from '@/app/generated/prisma'
import properties from './properties.json'

type PropertyData = {
  code: string
  city: string
  address: string
  status?: string
}

export async function seedProperties(prisma: PrismaClient) {
  console.log('🏠 Creating properties...')
  
  const results = []
  for (const property of properties as PropertyData[]) {
    const isActive = property.status !== 'inactive'
    const result = await prisma.property.upsert({
      where: { code: property.code },
      update: {
        city: property.city,
        address: property.address,
        isActive
      },
      create: {
        code: property.code,
        city: property.city,
        address: property.address,
        isActive
      }
    })
    results.push(result)
  }
  
  console.log(`   ✅ Created/updated ${results.length} properties`)
  return results
}