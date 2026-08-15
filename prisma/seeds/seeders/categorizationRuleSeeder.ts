import { PrismaClient } from '@/app/generated/prisma/client';
import { RuleCriteria } from '../../lib/database/rule-types';

export async function seedCategorizationRules(prisma: PrismaClient) {
  console.log('📏 Seeding categorization rules...');

  // Fetch category IDs for rule assignment
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, level: true },
  });

  const categoryMap = new Map(categories.map(c => [c.name, c.id]));

  // Helper to get category ID by name
  const getCategoryId = (name: string): string | null => {
    return categoryMap.get(name) || null;
  };

  const rules = [
    // ===== Banking and Financial Rules =====
    {
      id: 'rule-bank-fees',
      name: 'Tarifas Bancárias',
      description: 'Identifica tarifas e taxas bancárias',
      isActive: true,
      priority: 90,
      categoryId: getCategoryId('Tarifas Bancárias'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['TARIFA', 'TAXA', 'MANUTENCAO CONTA', 'ANUIDADE', 'TED', 'DOC', 'PIX TARIFA'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-iof',
      name: 'IOF',
      description: 'Identifica cobranças de IOF',
      isActive: true,
      priority: 95,
      categoryId: getCategoryId('IOF'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['IOF', 'IMPOSTO OPERACAO', 'I.O.F'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Rent Income Rules =====
    {
      id: 'rule-rent-income',
      name: 'Aluguel Recebido',
      description: 'Identifica recebimentos de aluguel',
      isActive: true,
      priority: 85,
      categoryId: getCategoryId('Aluguel'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['ALUGUEL', 'LOCACAO', 'ALUG REF', 'ALUG MES'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },

    // ===== Property Expenses Rules =====
    {
      id: 'rule-condominium',
      name: 'Condomínio',
      description: 'Identifica pagamentos de condomínio',
      isActive: true,
      priority: 80,
      categoryId: getCategoryId('Condomínios'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['CONDOMINIO', 'COND ', 'TAXA COND', 'DESPESA COND'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-iptu',
      name: 'IPTU',
      description: 'Identifica pagamentos de IPTU',
      isActive: true,
      priority: 85,
      categoryId: getCategoryId('IPTU'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['IPTU', 'IMPOSTO PREDIAL', 'I.P.T.U'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-electricity',
      name: 'Energia Elétrica',
      description: 'Identifica contas de energia',
      isActive: true,
      priority: 75,
      categoryId: getCategoryId('Energia'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['CPFL', 'ELEKTRO', 'ENEL', 'ENERGISA', 'CEMIG', 'LIGHT', 'ENERGIA', 'LUZ'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-water',
      name: 'Água',
      description: 'Identifica contas de água',
      isActive: true,
      priority: 75,
      categoryId: getCategoryId('Água'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['SABESP', 'AGUA', 'SANEAMENTO', 'DAE', 'SANASA', 'COPASA', 'CEDAE'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-internet',
      name: 'Internet',
      description: 'Identifica contas de internet',
      isActive: true,
      priority: 70,
      categoryId: getCategoryId('Internet'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['VIVO', 'CLARO', 'TIM', 'OI', 'NET', 'VIRTUA', 'INTERNET', 'FIBRA', 'TELECOM'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Administrative Expenses Rules =====
    {
      id: 'rule-accounting',
      name: 'Contabilidade',
      description: 'Identifica despesas com contabilidade',
      isActive: true,
      priority: 70,
      categoryId: getCategoryId('Contabilidade'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['CONTABILIDADE', 'CONTADOR', 'HONORARIOS CONT', 'SERVICOS CONT'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-office',
      name: 'Escritório',
      description: 'Identifica despesas de escritório',
      isActive: true,
      priority: 60,
      categoryId: getCategoryId('Escritórios e Postagens'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['CORREIOS', 'SEDEX', 'PAPELARIA', 'MATERIAL ESCRIT', 'CARTORIO'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Tax Rules =====
    {
      id: 'rule-darf',
      name: 'DARF',
      description: 'Identifica pagamentos de DARF',
      isActive: true,
      priority: 90,
      categoryId: getCategoryId('DARF IRPF'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['DARF', 'REC FEDERAL', 'RECEITA FEDERAL', 'GPS', 'DAS'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-irpj',
      name: 'IRPJ',
      description: 'Identifica pagamentos de IRPJ',
      isActive: true,
      priority: 90,
      categoryId: getCategoryId('IRPJ'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['IRPJ', 'IMP RENDA PJ', 'IMPOSTO RENDA PJ'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Transfer Rules =====
    {
      id: 'rule-transfer',
      name: 'Transferências',
      description: 'Identifica transferências entre contas',
      isActive: true,
      priority: 100,
      categoryId: getCategoryId('Transferência Entre Contas'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['TRANSF ENTRE CONTAS', 'TED MESMA TITULARIDADE', 'TRANSF CC', 'RESGATE', 'APLICACAO'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Investment Rules =====
    {
      id: 'rule-investment-income',
      name: 'Rendimentos',
      description: 'Identifica rendimentos de investimentos',
      isActive: true,
      priority: 80,
      categoryId: getCategoryId('Rendimentos'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['RENDIMENTO', 'JUROS', 'DIVIDENDO', 'RESGATE LIQUIDO', 'CRED JUROS'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 0.01,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },

    // ===== Maintenance Rules =====
    {
      id: 'rule-maintenance',
      name: 'Manutenção de Imóveis',
      description: 'Identifica gastos com manutenção',
      isActive: true,
      priority: 65,
      categoryId: getCategoryId('Manutenção'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['MANUTENCAO', 'REPARO', 'CONSERTO', 'REFORMA', 'PINTURA', 'HIDRAULICA', 'ELETRICA', 'PEDREIRO'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Commission Rules =====
    {
      id: 'rule-commission',
      name: 'Comissões',
      description: 'Identifica pagamento de comissões',
      isActive: true,
      priority: 70,
      categoryId: getCategoryId('Comissões'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['COMISSAO', 'CORRETAGEM', 'INTERMEDIACAO', 'HONORARIO ADM'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
  ];

  // Upsert all rules
  for (const rule of rules) {
    if (rule.categoryId) {
      await prisma.categorizationRule.upsert({
        where: { id: rule.id },
        update: {
          name: rule.name,
          description: rule.description,
          isActive: rule.isActive,
          priority: rule.priority,
          categoryId: rule.categoryId,
          propertyId: rule.propertyId,
          criteria: rule.criteria as any,
          updatedAt: new Date(),
        },
        create: {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          isActive: rule.isActive,
          priority: rule.priority,
          categoryId: rule.categoryId,
          propertyId: rule.propertyId,
          criteria: rule.criteria as any,
        },
      });
      console.log(`   ✅ Rule: ${rule.name}`);
    } else {
      console.log(`   ⚠️  Skipped rule: ${rule.name} (category not found)`);
    }
  }

  const ruleCount = await prisma.categorizationRule.count();
  console.log(`   📏 Total categorization rules: ${ruleCount}`);
}