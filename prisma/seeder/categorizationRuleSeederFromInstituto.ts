import { PrismaClient } from '@/app/generated/prisma';
import { RuleCriteria } from '../../lib/database/rule-types';

export async function seedCategorizationRulesFromInstituto(prisma: PrismaClient) {
  console.log('📏 Seeding categorization rules from Instituto database patterns...');

  // Fetch category IDs for rule assignment
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, level: true },
  });

  const categoryMap = new Map(categories.map(c => [c.name, c.id]));

  // Fetch property IDs for rule assignment
  const properties = await prisma.property.findMany({
    select: { id: true, code: true },
  });

  const propertyMap = new Map(properties.map(p => [p.code, p.id]));

  // Helper to get category ID by name - with fallback mapping
  const getCategoryId = (name: string): string | null => {
    // Direct match first
    if (categoryMap.has(name)) {
      return categoryMap.get(name)!;
    }
    
    // Fallback mappings for similar categories
    const fallbacks: Record<string, string> = {
      'Distribuição de Lucros': 'Outras Despesas',
      'Investimentos em Terceiros': 'Investimentos',
      'Compra de Imóveis': 'Outras Despesas',
      'Despesas Pessoais Sócios': 'Outras Despesas',
      'Documentações e Jurídico': 'Documentações e Jurídico',
      'Outras Despesas': 'Outras Despesas',
      'Energia Elétrica': 'Energia',
      'Reformas': 'Manutenção',
      'Telefone e Internet': 'Internet',
      'Benfeitorias': 'Manutenção',
      'Outras Despesas com Imóveis': 'Manutenção',
      'CSLL': 'Impostos e Taxas',
      'Taxa de Fiscalização': 'Impostos e Taxas',
      'Outros Impostos': 'Impostos e Taxas',
      'PIS': 'Impostos e Taxas',
      'Cofins': 'Impostos e Taxas',
      'Aporte de Capital': 'Outras Receitas',
      'Venda de Imóveis': 'Outras Receitas',
      'Ajuste de Saldo': 'Outras Receitas',
      'Depósitos Caução': 'Outras Receitas',
      'Juros Bancários': 'Rendimentos',
      'Outras Receitas': 'Outras Receitas',
      'Aluguel de Terceiros': 'Aluguel de Terceiros',
      'Transferência entre Contas': 'Transferência Entre Contas',
      'Repasse de Aluguel': 'Aluguel',
    };
    
    if (fallbacks[name]) {
      return categoryMap.get(fallbacks[name]) || null;
    }
    
    return null;
  };

  // Helper to get property ID by code
  const getPropertyId = (code: string): string | null => {
    return propertyMap.get(code) || null;
  };

  const rules = [
    // ===== Transfer and Investment Rules (Priority 100-95) =====
    {
      id: 'rule-transfer-sicredi',
      name: 'Transferência Sicredi',
      description: 'Identifica transferências do Sicredi',
      isActive: true,
      priority: 100,
      categoryId: getCategoryId('Transferência entre Contas'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['Transferência Sicredi', 'TRANSF SICREDI'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-transfer-ratc',
      name: 'Transferência RATC',
      description: 'Identifica transferências entre contas RATC',
      isActive: true,
      priority: 100,
      categoryId: getCategoryId('Transferência entre Contas'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['13292738000111', 'RATC GERENCIAMENTO', 'Ratc Gerenciamento E Administracao'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-resgate-aplicacao',
      name: 'Resgate e Aplicação Financeira',
      description: 'Identifica resgates e aplicações financeiras',
      isActive: true,
      priority: 95,
      categoryId: getCategoryId('Transferência entre Contas'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['RESG.APLIC.FIN', 'APLICACAO FINANCEIRA', 'RESGATE APLIC', 'APLIC FINANC'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Banking Fees Rules (Priority 90) =====
    {
      id: 'rule-bank-fees-pjbank',
      name: 'Tarifas PJBank',
      description: 'Identifica tarifas do PJBank',
      isActive: true,
      priority: 90,
      categoryId: getCategoryId('Tarifas Bancárias'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['Tarifa PJBank', 'TARIFA PJBANK'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-bank-fees-general',
      name: 'Tarifas Bancárias Gerais',
      description: 'Identifica tarifas bancárias diversas',
      isActive: true,
      priority: 90,
      categoryId: getCategoryId('Tarifas Bancárias'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['TARIFA', 'TAXA BANCARIA', 'MANUTENCAO CONTA', 'ANUIDADE', 'TED TARIFA', 'DOC TARIFA'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Rent Income Rules with Property Links (Priority 85-80) =====
    // Individual rules for each tenant with their specific property
    {
      id: 'rule-rent-mari-bizari',
      name: 'Aluguel - Mari Cristina Bizari',
      description: 'Aluguel recebido de Mari Cristina Bizari',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Bahia Sala 4'),
      criteria: {
        description: {
          keywords: ['Mari Cristina Bizari'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-francislaine',
      name: 'Aluguel - Francislaine Albino Bolonha',
      description: 'Aluguel recebido de Francislaine Albino Bolonha',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Bahia Sala 5'),
      criteria: {
        description: {
          keywords: ['Francislaine Albino Bolonha'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-isabella',
      name: 'Aluguel - Isabella Pegorari',
      description: 'Aluguel recebido de Isabella Pegorari',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('SAO - Rua Pamplona - Garagem'),
      criteria: {
        description: {
          keywords: ['Isabella Pegorari'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-mariana',
      name: 'Aluguel - Mariana Antonelli Ramos',
      description: 'Aluguel recebido de Mariana Antonelli Ramos',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('RIB - Av. Presidente Vargas 1'),
      criteria: {
        description: {
          keywords: ['Mariana Antonelli Ramos'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-silvia',
      name: 'Aluguel - Silvia Cristina Campello Medeiros',
      description: 'Aluguel recebido de Silvia Cristina Campello Medeiros',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('RIB - Av. Independência 1591'),
      criteria: {
        description: {
          keywords: ['Silvia Cristina Campello Medeiros'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-vanderlei',
      name: 'Aluguel - Vanderlei Safioti',
      description: 'Aluguel recebido de Vanderlei Safioti',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Minas Gerais - 1072'),
      criteria: {
        description: {
          keywords: ['Vanderlei Safioti'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-jair',
      name: 'Aluguel - Jair Rodrigues Nunes',
      description: 'Aluguel recebido de Jair Rodrigues Nunes',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('COS - Sítio Cosmorama - Pasto'),
      criteria: {
        description: {
          keywords: ['Jair Rodrigues Nunes'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-ligia',
      name: 'Aluguel - Lígia Niero Pereira Lima',
      description: 'Aluguel recebido de Lígia Niero Pereira Lima',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('SAO - Rua Pamplona 391 - ap 12'),
      criteria: {
        description: {
          keywords: ['Lígia Niero Pereira Lima'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-gilberto',
      name: 'Aluguel - Gilberto Ferreira de Souza',
      description: 'Aluguel recebido de Gilberto Ferreira de Souza',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Brasil'),
      criteria: {
        description: {
          keywords: ['Gilberto Ferreira de Souza'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-elizabeth',
      name: 'Aluguel - Elizabeth Maria de Sá',
      description: 'Aluguel recebido de Elizabeth Maria de Sá',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Otica - Casa ao Fundo'),
      criteria: {
        description: {
          keywords: ['Elizabeth Maria de Sá'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-aparecida',
      name: 'Aluguel - Aparecida de Lourdes Mozer',
      description: 'Aluguel recebido de Aparecida de Lourdes Mozer',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('COS - Sítio Cosmorama - Casa ao Fundo'),
      criteria: {
        description: {
          keywords: ['Aparecida de Lourdes Mozer'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-ademir',
      name: 'Aluguel - Ademir Gonçalves da Silva',
      description: 'Aluguel recebido de Ademir Gonçalves da Silva',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('SJP - Av. Alberto Andaló - 2964 - 2'),
      criteria: {
        description: {
          keywords: ['Ademir Gonçalves da Silva'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-jose-francisco',
      name: 'Aluguel - Jose Francisco Ribei',
      description: 'Aluguel recebido de Jose Francisco Ribei',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Chácara Nova'),
      criteria: {
        description: {
          keywords: ['Jose Francisco Ribei'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    // Empresas com imóveis específicos
    {
      id: 'rule-rent-livraria',
      name: 'Aluguel - Livraria Santa Barbara',
      description: 'Aluguel recebido de Livraria Santa Barbara',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Cuiabá'),
      criteria: {
        description: {
          keywords: ['Livraria Santa Barbara'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-cec-viagens',
      name: 'Aluguel - C e C Viagens e Turismo',
      description: 'Aluguel recebido de C e C Viagens e Turismo',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Bahia Sala 2 e 3'),
      criteria: {
        description: {
          keywords: ['C e C Viagens e Turismo'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-eirilar',
      name: 'Aluguel - Indústria de Alumínios Eirilar',
      description: 'Aluguel recebido de Indústria de Alumínios Eirilar',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('SJP - Av. Alberto Andaló - 2964'),
      criteria: {
        description: {
          keywords: ['Indústria de Alumínios Eirilar'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-sicoob',
      name: 'Aluguel - Sicoob Credimogiana',
      description: 'Aluguel recebido de Sicoob Credimogiana',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('RIB - Av. Independência 1379'),
      criteria: {
        description: {
          keywords: ['Sicoob Credimogiana'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-ricco',
      name: 'Aluguel - Ricco Cardoso & Oliveira',
      description: 'Aluguel recebido de Ricco Cardoso & Oliveira',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Fortaleza - 494'),
      criteria: {
        description: {
          keywords: ['Ricco Cardoso & Oliveira'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-neville',
      name: 'Aluguel - Neville Mastrocola Martins',
      description: 'Aluguel recebido de Neville Mastrocola Martins',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Itapema'),
      criteria: {
        description: {
          keywords: ['Neville Mastrocola Martins'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-herbicat',
      name: 'Aluguel - HERBICAT LTDA',
      description: 'Aluguel recebido de HERBICAT LTDA',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Said Tuma'),
      criteria: {
        description: {
          keywords: ['HERBICAT LTDA'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-santa-maria',
      name: 'Aluguel - Santa Maria Tem',
      description: 'Aluguel recebido de Santa Maria Tem',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('RIB - Av. Independência 1589'),
      criteria: {
        description: {
          keywords: ['SANTA MARIA TEM', 'Santa Maria Tem'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-agricola-moreno',
      name: 'Aluguel - Agrícola Moreno',
      description: 'Aluguel recebido de Agrícola Moreno',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('COS - Sítio Cosmorama - Cana'),
      criteria: {
        description: {
          keywords: ['Agrícola Moreno'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-casa-verde',
      name: 'Aluguel - CASA VERDE PRESTADORA',
      description: 'Aluguel recebido de CASA VERDE PRESTADORA',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Piauí - 317'),
      criteria: {
        description: {
          keywords: ['CASA VERDE PRESTADORA'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    // Imobiliárias com imóveis específicos
    {
      id: 'rule-rent-thais-helena',
      name: 'Aluguel - THAIS HELENA MORADA IMOBILIARIA',
      description: 'Aluguel recebido via THAIS HELENA MORADA IMOBILIARIA',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('CAT - Rua Belo Horizonte'),
      criteria: {
        description: {
          keywords: ['THAIS HELENA MORADA IMOBILIARIA'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-maria-jose',
      name: 'Aluguel - MARIA JOSE NADRUZ',
      description: 'Aluguel recebido via MARIA JOSE NADRUZ',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('SJP - Rua Brasilusa 669'),
      criteria: {
        description: {
          keywords: ['MARIA JOSE NADRUZ'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-loren',
      name: 'Aluguel - LOREN IMOVEIS E ADMINISTRACAO',
      description: 'Aluguel recebido via LOREN IMOVEIS E ADMINISTRACAO',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel'),
      propertyId: getPropertyId('SVC - São Vicente - Apartamento'),
      criteria: {
        description: {
          keywords: ['LOREN IMOVEIS E ADMINISTRACAO', 'LOREN IMOVEIS'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-rent-terceiros-juliana',
      name: 'Aluguel de Terceiros - Juliana Fonseca Serbeto de Barros',
      description: 'Aluguel recebido de terceiros - Juliana Fonseca Serbeto de Barros',
      isActive: true,
      priority: 88,
      categoryId: getCategoryId('Aluguel de Terceiros'),
      propertyId: getPropertyId('SAO - Eduardo Apartamento Pamplona'),
      criteria: {
        description: {
          keywords: ['Juliana Fonseca Serbeto de Barros'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },

    // ===== Property Expenses Rules (Priority 80-75) =====
    // Condomínios com imóveis específicos
    {
      id: 'rule-cond-macapa',
      name: 'Condomínio Edifício Macapá',
      description: 'Pagamento de condomínio Edifício Macapá',
      isActive: true,
      priority: 85,
      categoryId: getCategoryId('Condomínios'),
      propertyId: getPropertyId('SVC - São Vicente - Apartamento'),
      criteria: {
        description: {
          keywords: ['CONDOMINIO EDIFICIO MACAPA', '55673925000195'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-cond-lago-azul',
      name: 'Condomínio Sítio Lago Azul',
      description: 'Pagamento de condomínio Sítio Lago Azul',
      isActive: true,
      priority: 85,
      categoryId: getCategoryId('Condomínios'),
      propertyId: getPropertyId('SAL - Rancho - Sales'),
      criteria: {
        description: {
          keywords: ['ASSOCIACAO SITIO LAGO AZUL', 'ASSOCIACAO SITI', 'LIQUIDACAO BOLETO 02806638000140', '02806638000140'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-condominium-general',
      name: 'Condomínios Geral',
      description: 'Identifica pagamentos de condomínio em geral',
      isActive: true,
      priority: 75,
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
      id: 'rule-electricity-energisa',
      name: 'Energia Elétrica - Energisa',
      description: 'Identifica contas de energia Energisa',
      isActive: true,
      priority: 80,
      categoryId: getCategoryId('Energia Elétrica'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['07282377000120', 'ENERGISA SULSUDESTE', 'ENERGISA'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-internet-oquei',
      name: 'Internet - Oquei Telecom',
      description: 'Conta de internet Oquei Telecom',
      isActive: true,
      priority: 80,
      categoryId: getCategoryId('Internet'),
      propertyId: getPropertyId('SAL - Rancho - Sales'),
      criteria: {
        description: {
          keywords: ['OQUEI TELECOM'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-telecom-general',
      name: 'Telefone e Internet - Geral',
      description: 'Identifica contas de telefone e internet em geral',
      isActive: true,
      priority: 75,
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
    {
      id: 'rule-maintenance-angelica',
      name: 'Manutenção - Angelica Correa Nunes',
      description: 'Pagamento de manutenção para Angelica Correa Nunes',
      isActive: true,
      priority: 80,
      categoryId: getCategoryId('Manutenção'),
      propertyId: getPropertyId('SAL - Rancho - Sales'),
      criteria: {
        description: {
          keywords: ['ANGELICA CORREA NUNES'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-maintenance-janaina',
      name: 'Manutenção - Janaina Aparecida Pereira',
      description: 'Pagamento de manutenção para Janaina Aparecida Pereira',
      isActive: true,
      priority: 80,
      categoryId: getCategoryId('Manutenção'),
      propertyId: getPropertyId('SAL - Rancho - Sales'),
      criteria: {
        description: {
          keywords: ['Janaina Aparecida Pereira'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Administrative Expenses Rules (Priority 70-65) =====
    {
      id: 'rule-fgts',
      name: 'FGTS',
      description: 'Identifica pagamentos de FGTS',
      isActive: true,
      priority: 75,
      categoryId: getCategoryId('FGTS'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['FGTS'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-salary',
      name: 'Salários',
      description: 'Identifica pagamentos de salários',
      isActive: true,
      priority: 70,
      categoryId: getCategoryId('Salários'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['BEATRIZ REBELATO', 'SALARIO', 'FOLHA PAGAMENTO'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-it-services',
      name: 'Serviços de TI',
      description: 'Identifica despesas com TI',
      isActive: true,
      priority: 70,
      categoryId: getCategoryId('TI'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['Quickfast Software House', 'SOFTWARE', 'SISTEMA', 'LICENCA'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-legal-docs',
      name: 'Documentações e Jurídico',
      description: 'Identifica despesas jurídicas e documentação',
      isActive: true,
      priority: 70,
      categoryId: getCategoryId('Documentações e Jurídico'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['ORDEM DOS ADVOGADOS', 'OAB', 'CARTORIO', 'REGISTRO', 'AUTENTICACAO'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-capital-integration',
      name: 'Integralização de Capital',
      description: 'Identifica integralizações de capital',
      isActive: true,
      priority: 70,
      categoryId: getCategoryId('Aporte de Capital'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['INTEGR.CAPITAL SUBSCRITO', 'INTEGRALIZACAO CAPITAL', 'APORTE CAPITAL'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },

    // ===== Tax Rules (Priority 90-85) =====
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

    // ===== Generic Pattern Rules (Priority 60-50) =====
    {
      id: 'rule-rent-generic',
      name: 'Aluguel Genérico',
      description: 'Identifica aluguéis por palavras-chave genéricas',
      isActive: true,
      priority: 60,
      categoryId: getCategoryId('Aluguel'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['ALUGUEL', 'LOCACAO', 'ALUG REF', 'ALUG MES', 'RECEB ALUGUEL'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 100,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-water',
      name: 'Água',
      description: 'Identifica contas de água',
      isActive: true,
      priority: 65,
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
      id: 'rule-insurance',
      name: 'Seguro',
      description: 'Identifica pagamentos de seguro',
      isActive: true,
      priority: 65,
      categoryId: getCategoryId('Seguro'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['SEGURO', 'PORTO SEGURO', 'SULAMERICA', 'BRADESCO SEGUROS', 'TOKIO MARINE'],
          operator: 'or' as const,
          caseSensitive: false,
        },
      } as RuleCriteria,
    },
    {
      id: 'rule-accounting',
      name: 'Contabilidade',
      description: 'Identifica despesas com contabilidade',
      isActive: true,
      priority: 65,
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
      id: 'rule-commission',
      name: 'Comissões',
      description: 'Identifica pagamento de comissões',
      isActive: true,
      priority: 65,
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
    {
      id: 'rule-maintenance-general',
      name: 'Manutenção Geral',
      description: 'Identifica gastos com manutenção em geral',
      isActive: true,
      priority: 60,
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
    {
      id: 'rule-office',
      name: 'Escritório e Postagens',
      description: 'Identifica despesas de escritório',
      isActive: true,
      priority: 60,
      categoryId: getCategoryId('Escritórios e Postagens'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['CORREIOS', 'SEDEX', 'PAPELARIA', 'MATERIAL ESCRIT', 'MATERIAL ESCRITORIO'],
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
      priority: 85,
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
    {
      id: 'rule-interest-income',
      name: 'Rendimentos e Juros',
      description: 'Identifica rendimentos de investimentos',
      isActive: true,
      priority: 70,
      categoryId: getCategoryId('Juros Bancários'),
      propertyId: null,
      criteria: {
        description: {
          keywords: ['RENDIMENTO', 'JUROS', 'DIVIDENDO', 'RESGATE LIQUIDO', 'CRED JUROS', 'JUROS BANCARIOS'],
          operator: 'or' as const,
          caseSensitive: false,
        },
        value: {
          min: 0.01,
          operator: 'gt' as const,
        },
      } as RuleCriteria,
    },
  ];

  // Clear existing rules first
  await prisma.categorizationRule.deleteMany({});
  console.log('   🗑️  Cleared existing rules');

  // Upsert all rules
  let successCount = 0;
  let skipCount = 0;
  
  for (const rule of rules) {
    if (rule.categoryId) {
      try {
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
        console.log(`   ✅ Rule: ${rule.name} (Priority: ${rule.priority})`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error creating rule: ${rule.name}`, error);
      }
    } else {
      console.log(`   ⚠️  Skipped rule: ${rule.name} (category not found)`);
      skipCount++;
    }
  }

  const ruleCount = await prisma.categorizationRule.count();
  console.log(`\n   📊 Summary:`);
  console.log(`   ✅ Successfully created: ${successCount} rules`);
  console.log(`   ⚠️  Skipped: ${skipCount} rules`);
  console.log(`   📏 Total categorization rules in database: ${ruleCount}`);
}