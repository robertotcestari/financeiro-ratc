import { prisma } from '../lib/database/client'

const CITIES_DATA = [
  { code: 'CAT', name: 'Catanduva' },
  { code: 'COS', name: 'Cosmorama' },
  { code: 'SJP', name: 'São José do Rio Preto' },
  { code: 'RIB', name: 'Ribeirão Preto' },
  { code: 'SAO', name: 'São Paulo' },
  { code: 'SAL', name: 'Sales' },
  { code: 'SVC', name: 'São Vicente' }
]

async function migrateCities() {
  try {
    console.log('🏙️  Iniciando migração das cidades...')

    // 1. Criar a tabela cities e inserir as cidades
    console.log('Criando cidades...')
    for (const cityData of CITIES_DATA) {
      await prisma.city.upsert({
        where: { code: cityData.code },
        update: { name: cityData.name },
        create: cityData
      })
      console.log(`✓ Cidade criada: ${cityData.code} - ${cityData.name}`)
    }

    // 2. Buscar todas as propriedades
    console.log('\nMigrando propriedades...')
    const properties = await prisma.$queryRaw`
      SELECT id, city FROM properties
    ` as Array<{ id: string, city: string }>

    // 3. Atualizar cada propriedade para referenciar a cidade correta
    for (const property of properties) {
      const cityData = CITIES_DATA.find(c => c.code === property.city)
      if (cityData) {
        const city = await prisma.city.findUnique({
          where: { code: cityData.code }
        })
        
        if (city) {
          await prisma.$executeRaw`
            UPDATE properties SET cityId = ${city.id} WHERE id = ${property.id}
          `
          console.log(`✓ Propriedade ${property.id} atualizada para cidade ${cityData.name}`)
        }
      }
    }

    console.log('\n✅ Migração concluída com sucesso!')
  } catch (error) {
    console.error('❌ Erro durante a migração:', error)
    throw error
  }
}

// Execute if run directly
if (require.main === module) {
  migrateCities()
    .then(() => {
      console.log('Migração finalizada')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Erro:', error)
      process.exit(1)
    })
}

export default migrateCities