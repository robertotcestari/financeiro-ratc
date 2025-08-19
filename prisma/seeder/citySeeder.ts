import { PrismaClient } from '@/app/generated/prisma';
import cities from './cities.json';

interface CityData {
  code: string;
  name: string;
}

export async function seedCities(prisma: PrismaClient) {
  console.log('🏙️ Creating cities...');

  const results = [];
  for (const city of cities.cities) {
    const result = await prisma.city.upsert({
      where: { code: city.code },
      update: {},
      create: {
        code: city.code,
        name: city.name,
        isActive: true,
      },
    });
    results.push(result);
  }

  console.log(`   ✅ Created/updated ${results.length} cities`);
  return results;
}
