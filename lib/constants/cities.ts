import { prisma } from '../database/client'

export interface CityInfo {
  code: string
  name: string
}

// Fallback cities for backwards compatibility
const FALLBACK_CITIES: CityInfo[] = [
  { code: 'CAT', name: 'Catanduva' },
  { code: 'COS', name: 'Cosmorama' },
  { code: 'SJP', name: 'São José do Rio Preto' },
  { code: 'RIB', name: 'Ribeirão Preto' },
  { code: 'SAO', name: 'São Paulo' },
  { code: 'SAL', name: 'Sales' },
  { code: 'SVC', name: 'São Vicente' }
]

const FALLBACK_CITY_MAP: Record<string, string> = FALLBACK_CITIES.reduce((acc, city) => {
  acc[city.code] = city.name
  return acc
}, {} as Record<string, string>)

export const getCityName = (code: string): string => {
  return FALLBACK_CITY_MAP[code] || code
}

// Server-side function to get cities from database
export const getCitiesFromDB = async () => {
  try {
    return await prisma.city.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    })
  } catch (error) {
    console.error('Error fetching cities:', error)
    return FALLBACK_CITIES
  }
}