import { PrismaClient } from '@/app/generated/prisma/client';
import mysql from 'mysql2/promise';
import { createPrismaClient } from '@/lib/core/database/client';

const prisma = createPrismaClient();

// Regras que faltaram mapear
const MISSING_RULES = [
  {
    id: 22,
    string: "ORDEM DOS ADVOGADOS DO BRASIL SECCAO",
    categoryId: "cat-juridico", // Usar Jurídico específico
    propertyId: null
  }
];

// Propriedades que faltaram no mapeamento
const MISSING_PROPERTY_MAPPING: Record<number, string> = {
  27: 'SJP - Rua Brasilusa 669',  // Esta já deveria existir
  1: 'CAT - Rua Belo Horizonte',  // Esta já deveria existir
};

async function connectToOldDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'instituto'
  });
  return connection;
}

async function fixMissingRules() {
  console.log('🔧 Corrigindo regras não mapeadas...');
  
  const oldConnection = await connectToOldDatabase();
  
  // Buscar dados das regras não mapeadas
  const unmappedRuleIds = [9, 14, 22, 25, 26, 30, 40, 45, 51, 54, 56];
  
  const [rules] = await oldConnection.execute(
    `SELECT * FROM StringToCategoryMapping WHERE id IN (${unmappedRuleIds.join(',')})`
  ) as any[];
  
  const [categories] = await oldConnection.execute(
    'SELECT * FROM TransactionCategory'
  ) as any[];
  
  const [units] = await oldConnection.execute(
    'SELECT * FROM Unit'
  ) as any[];
  
  // Buscar categorias e propriedades do novo sistema
  const newCategories = await prisma.category.findMany();
  const newProperties = await prisma.property.findMany();
  
  console.log('🔍 Analisando regras não mapeadas:');
  
  for (const rule of rules) {
    const oldCategory = categories.find((c: any) => c.id === rule.transactionCategoryId);
    const oldUnit = rule.unitId ? units.find((u: any) => u.id === rule.unitId) : null;
    
    console.log(`\n📝 Regra ID ${rule.id}: "${rule.string}"`);
    console.log(`   Categoria antiga: ${oldCategory?.name} (ID: ${rule.transactionCategoryId})`);
    console.log(`   Unidade antiga: ${oldUnit?.uniqueName} (ID: ${rule.unitId})`);
    
    let newCategoryId = null;
    let newPropertyId = null;
    
    // Mapear categoria específica para regra 22 (OAB)
    if (rule.id === 22) {
      newCategoryId = 'cat-juridico';
    } else if (rule.transactionCategoryId === 35) { // Aluguel
      newCategoryId = 'cat-aluguel';
    } else if (rule.transactionCategoryId === 37) { // Aluguel de Terceiros
      newCategoryId = 'cat-aluguel-terceiros';
    }
    
    // Mapear propriedade
    if (oldUnit) {
      const property = newProperties.find(p => p.code === oldUnit.uniqueName);
      if (property) {
        newPropertyId = property.id;
      } else {
        console.log(`   ⚠️ Propriedade "${oldUnit.uniqueName}" não encontrada no novo sistema`);
      }
    }
    
    if (newCategoryId) {
      const category = newCategories.find(c => c.id === newCategoryId);
      if (category) {
        console.log(`   ✅ Mapeando para categoria: ${category.name} (${newCategoryId})`);
        if (newPropertyId) {
          const property = newProperties.find(p => p.id === newPropertyId);
          console.log(`   🏢 Propriedade: ${property?.code}`);
        }
        
        // Criar a regra
        await prisma.categorizationRule.create({
          data: {
            name: `Regra: ${rule.string}`,
            description: `Migrada do sistema antigo (corrigida) - Categoria: ${oldCategory?.name}${oldUnit ? `, Unidade: ${oldUnit.uniqueName}` : ''}`,
            isActive: true,
            priority: rule.string.length > 20 ? 10 : 5,
            categoryId: newCategoryId,
            propertyId: newPropertyId,
            criteria: {
              description: {
                contains: rule.string,
                caseSensitive: false
              }
            }
          }
        });
        
        console.log(`   ✅ Regra criada com sucesso!`);
      } else {
        console.log(`   ❌ Categoria ${newCategoryId} não encontrada`);
      }
    } else {
      console.log(`   ❌ Não foi possível mapear a categoria`);
    }
  }
  
  await oldConnection.end();
  await prisma.$disconnect();
  
  console.log('\n🎉 Correção concluída!');
}

// Executar correção
if (require.main === module) {
  fixMissingRules()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Erro na correção:', error);
      process.exit(1);
    });
}

export { fixMissingRules };