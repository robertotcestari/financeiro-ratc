import { PrismaClient } from '../../app/generated/prisma'
import properties from './properties.json'

export async function seedProperties(prisma: PrismaClient) {
  console.log('🏠 Creating properties...')
  
  const results = []
  for (const property of properties) {
    const result = await prisma.property.upsert({
      where: { code: property.code },
      update: {},
      create: {
        code: property.code,
        city: property.city,
        address: property.address
      }
    })
    results.push(result)
  }
  
  console.log(`   ✅ Created/updated ${results.length} properties`)
  return results
}