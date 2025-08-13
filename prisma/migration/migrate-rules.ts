import { PrismaClient } from '@/app/generated/prisma';
import mysql from 'mysql2/promise';

const prisma = new PrismaClient();

interface OldRule {
  id: number;
  transactionCategoryId: number;
  string: string;
  unitId: number | null;
  additionalRules: any;
}

interface OldCategory {
  id: number;
  name: string;
  description: string | null;
  type: string | null;
}

interface OldUnit {
  id: number;
  uniqueName: string;
  name: string;
  status: string;
}

// Mapeamento de categorias antigas para novas
const CATEGORY_MAPPING: Record<number, string> = {
  5: 'cat-tarifas-bancarias',      // Tarifas Bancárias
  8: 'cat-salarios',               // Salários
  9: 'cat-fgts',                   // FGTS
  10: 'cat-inss',                  // INSS
  11: 'cat-ti',                    // TI
  12: 'cat-documentacoes-juridico', // Documentações e Jurídico
  14: 'cat-condominios',           // Condomínios
  15: 'cat-energia',               // Energia Elétrica
  18: 'cat-internet',              // Telefone e Internet
  19: 'cat-manutencao',            // Manutenção
  22: 'cat-iptu',                  // IPTU
  24: 'cat-irpj',                  // IRPJ
  35: 'cat-aluguel',               // Aluguel
  37: 'cat-aluguel-terceiros',     // Aluguel de Terceiros
  38: 'cat-transferencia-entre-contas', // Transferência entre Contas
};

// Mapeamento de propriedades - convertendo ID para código único
const PROPERTY_CODE_MAPPING: Record<number, string> = {
  1: 'CAT - Rua Belo Horizonte',
  2: 'CAT - Rua Bahia Sala 1',
  3: 'CAT - Rua Bahia Sala 4',
  4: 'CAT - Rua Bahia Sala 2 e 3',
  5: 'CAT - Rua Bahia Sala 5',
  6: 'CAT - Rua Cuiabá',
  7: 'CAT - Otica - Casa ao Fundo',
  8: 'CAT - Rua Fortaleza - 504',
  9: 'CAT - Rua Minas Gerais - 1072',
  10: 'CAT - Rua Fortaleza - 494',
  11: 'CAT - Rua Itapema',
  12: 'CAT - Rua Monte Aprazível',
  13: 'CAT - Rua Brasil',
  14: 'SJP - Av. Alberto Andaló - 2964',
  15: 'SJP - Av. Alberto Andaló - 2964 - 2',
  16: 'RIB - Av. Presidente Vargas 1',
  17: 'RIB - Av. Independência 1379',
  18: 'RIB - Av. Independência 1591',
  20: 'RIB - Av. Independência 1589',
  21: 'SAO - Rua Pamplona 391 - ap 12',
  22: 'SAO - Rua Pamplona - Garagem',
  23: 'CAT - Rua Said Tuma',
  26: 'SVC - São Vicente - Apartamento',
  27: 'SJP - Rua Brasilusa 669',
  28: 'CAT - Rua Piauí - 317',
  34: 'SAL - Rancho - Sales',
  36: 'CAT - Chácara Nova',
  49: 'COS - Sítio Cosmorama - Pasto',
  50: 'COS - Sítio Cosmorama - Cana',
  51: 'COS - Sítio Cosmorama - Casa ao Fundo',
  52: 'SAO - Eduardo Apartamento Pamplona',
  9999: null, // Sem propriedade específica
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

async function fetchOldData(connection: mysql.Connection) {
  console.log('📚 Buscando dados do sistema antigo...');
  
  const [rules] = await connection.execute(
    'SELECT * FROM StringToCategoryMapping ORDER BY id'
  ) as any[];
  
  const [categories] = await connection.execute(
    'SELECT * FROM TransactionCategory ORDER BY id'
  ) as any[];
  
  const [units] = await connection.execute(
    'SELECT * FROM Unit ORDER BY id'
  ) as any[];
  
  console.log(`📊 Encontrados: ${rules.length} regras, ${categories.length} categorias, ${units.length} unidades`);
  
  return {
    rules: rules as OldRule[],
    categories: categories as OldCategory[],
    units: units as OldUnit[]
  };
}

async function validateNewSystemData() {
  console.log('🔍 Validando dados do novo sistema...');
  
  const categories = await prisma.category.findMany({
    select: { id: true, name: true }
  });
  
  const properties = await prisma.property.findMany({
    select: { id: true, code: true, address: true }
  });
  
  console.log(`✅ Novo sistema tem: ${categories.length} categorias, ${properties.length} propriedades`);
  
  return { categories, properties };
}

async function migrateRules() {
  console.log('🚀 Iniciando migração das regras...');
  
  const oldConnection = await connectToOldDatabase();
  const { rules, categories, units } = await fetchOldData(oldConnection);
  const { categories: newCategories, properties: newProperties } = await validateNewSystemData();
  
  // Criar mapas para busca rápida
  const categoryMap = new Map(newCategories.map(c => [c.id, c]));
  const propertyMap = new Map(newProperties.map(p => [p.code, p]));
  
  const migratedRules = [];
  const unmappedRules = [];
  
  console.log('🔄 Processando regras...');
  
  for (const rule of rules) {
    const oldCategory = categories.find(c => c.id === rule.transactionCategoryId);
    const oldUnit = rule.unitId ? units.find(u => u.id === rule.unitId) : null;
    
    // Mapear categoria
    const newCategoryId = CATEGORY_MAPPING[rule.transactionCategoryId];
    const newCategory = newCategoryId ? categoryMap.get(newCategoryId) : null;
    
    // Mapear propriedade
    const propertyCode = rule.unitId ? PROPERTY_CODE_MAPPING[rule.unitId] : null;
    const newProperty = propertyCode ? propertyMap.get(propertyCode) : null;
    
    if (!newCategory) {
      unmappedRules.push({
        id: rule.id,
        string: rule.string,
        oldCategory: oldCategory?.name,
        oldCategoryId: rule.transactionCategoryId,
        reason: 'Categoria não mapeada'
      });
      continue;
    }
    
    // Se há unitId mas não conseguiu mapear a propriedade, registrar problema
    if (rule.unitId && rule.unitId !== 9999 && !newProperty) {
      unmappedRules.push({
        id: rule.id,
        string: rule.string,
        oldCategory: oldCategory?.name,
        oldUnit: oldUnit?.uniqueName,
        reason: 'Propriedade não mapeada'
      });
      continue;
    }
    
    const newRule = {
      name: `Regra: ${rule.string}`,
      description: `Migrada do sistema antigo - Categoria: ${oldCategory?.name}${oldUnit ? `, Unidade: ${oldUnit.uniqueName}` : ''}`,
      isActive: true,
      priority: rule.string.length > 20 ? 10 : 5, // Strings mais específicas têm prioridade maior
      categoryId: newCategory.id,
      propertyId: newProperty?.id || null,
      criteria: {
        description: {
          contains: rule.string,
          caseSensitive: false
        }
      }
    };
    
    migratedRules.push(newRule);
  }
  
  console.log(`✅ ${migratedRules.length} regras mapeadas com sucesso`);
  console.log(`⚠️ ${unmappedRules.length} regras não puderam ser mapeadas`);
  
  if (unmappedRules.length > 0) {
    console.log('\n❌ Regras não mapeadas:');
    unmappedRules.forEach(rule => {
      console.log(`  ID ${rule.id}: "${rule.string}" - ${rule.reason}`);
      if (rule.oldCategory) console.log(`    Categoria antiga: ${rule.oldCategory} (ID: ${rule.oldCategoryId})`);
      if (rule.oldUnit) console.log(`    Unidade antiga: ${rule.oldUnit}`);
    });
  }
  
  // Salvar regras migradas
  if (migratedRules.length > 0) {
    console.log('\n💾 Salvando regras no novo sistema...');
    
    for (const rule of migratedRules) {
      await prisma.categorizationRule.create({
        data: rule
      });
    }
    
    console.log(`✅ ${migratedRules.length} regras salvas com sucesso!`);
  }
  
  await oldConnection.end();
  await prisma.$disconnect();
  
  console.log('\n🎉 Migração concluída!');
  console.log(`📊 Resumo: ${migratedRules.length} migradas, ${unmappedRules.length} não mapeadas`);
}

// Executar migração
if (require.main === module) {
  migrateRules()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Erro na migração:', error);
      process.exit(1);
    });
}

export { migrateRules };