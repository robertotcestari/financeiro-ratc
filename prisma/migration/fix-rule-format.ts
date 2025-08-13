import { PrismaClient } from '@/app/generated/prisma';

const prisma = new PrismaClient();

async function fixRuleFormat() {
  console.log('🔧 Corrigindo formato dos critérios das regras...');
  
  // Buscar todas as regras com critério "contains"
  const rules = await prisma.categorizationRule.findMany({
    where: {
      name: {
        startsWith: 'Regra:'
      }
    }
  });
  
  console.log(`📊 Encontradas ${rules.length} regras para corrigir`);
  
  for (const rule of rules) {
    const currentCriteria = rule.criteria as any;
    
    if (currentCriteria.description?.contains) {
      const searchText = currentCriteria.description.contains;
      
      // Converter para o formato de keywords
      const newCriteria = {
        description: {
          keywords: [searchText],
          operator: "or" as const,
          caseSensitive: false
        }
      };
      
      await prisma.categorizationRule.update({
        where: { id: rule.id },
        data: {
          criteria: newCriteria
        }
      });
      
      console.log(`✅ Corrigida regra: "${searchText}"`);
    }
  }
  
  console.log('🎉 Correção concluída!');
}

// Executar correção
if (require.main === module) {
  fixRuleFormat()
    .then(() => {
      console.log('✅ Todas as regras foram corrigidas!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na correção:', error);
      process.exit(1);
    });
}

export { fixRuleFormat };