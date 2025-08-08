import { PrismaClient, AccountType, CategoryType } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Criar Contas Bancárias
  console.log('📦 Creating bank accounts...')
  const bankAccounts = await Promise.all([
    prisma.bankAccount.upsert({
      where: { name: 'CC - Sicredi' },
      update: {},
      create: {
        name: 'CC - Sicredi',
        bankName: 'Sicredi',
        accountType: AccountType.CHECKING,
      }
    }),
    prisma.bankAccount.upsert({
      where: { name: 'CC - PJBank' },
      update: {},
      create: {
        name: 'CC - PJBank',
        bankName: 'PJBank',
        accountType: AccountType.CHECKING,
      }
    }),
    prisma.bankAccount.upsert({
      where: { name: 'CI - XP' },
      update: {},
      create: {
        name: 'CI - XP',
        bankName: 'XP',
        accountType: AccountType.INVESTMENT,
      }
    }),
    prisma.bankAccount.upsert({
      where: { name: 'CI - SicrediInvest' },
      update: {},
      create: {
        name: 'CI - SicrediInvest',
        bankName: 'Sicredi',
        accountType: AccountType.INVESTMENT,
      }
    })
  ])

  // 2. Criar Categorias Principais
  console.log('📂 Creating categories...')
  
  // Receitas Operacionais
  const receitasOperacionais = await prisma.category.upsert({
    where: { name: 'Receitas Operacionais' },
    update: {},
    create: {
      name: 'Receitas Operacionais',
      type: CategoryType.INCOME,
      level: 1,
      orderIndex: 10,
      isSystem: true,
    }
  })

  const aluguelCategory = await prisma.category.upsert({
    where: { name: 'Aluguel' },
    update: {},
    create: {
      name: 'Aluguel',
      type: CategoryType.INCOME,
      parentId: receitasOperacionais.id,
      level: 2,
      orderIndex: 11,
    }
  })

  await prisma.category.upsert({
    where: { name: 'Aluguel de Terceiros' },
    update: {},
    create: {
      name: 'Aluguel de Terceiros',
      type: CategoryType.INCOME,
      parentId: receitasOperacionais.id,
      level: 2,
      orderIndex: 12,
    }
  })

  await prisma.category.upsert({
    where: { name: 'Outras Receitas' },
    update: {},
    create: {
      name: 'Outras Receitas',
      type: CategoryType.INCOME,
      parentId: receitasOperacionais.id,
      level: 2,
      orderIndex: 13,
    }
  })

  // Despesas Operacionais
  const despesasOperacionais = await prisma.category.upsert({
    where: { name: 'Despesas Operacionais' },
    update: {},
    create: {
      name: 'Despesas Operacionais',
      type: CategoryType.EXPENSE,
      level: 1,
      orderIndex: 20,
      isSystem: true,
    }
  })

  // Despesas Administrativas
  const despesasAdmin = await prisma.category.upsert({
    where: { name: 'Despesas Administrativas' },
    update: {},
    create: {
      name: 'Despesas Administrativas',
      type: CategoryType.EXPENSE,
      parentId: despesasOperacionais.id,
      level: 2,
      orderIndex: 21,
    }
  })

  const adminCategories = [
    'Tarifas Bancárias',
    'Escritórios e Postagens',
    'Contabilidade',
    'Salários',
    'FGTS',
    'INSS',
    'TI',
    'Documentações e Jurídico'
  ]

  for (let i = 0; i < adminCategories.length; i++) {
    await prisma.category.upsert({
      where: { name: adminCategories[i] },
      update: {},
      create: {
        name: adminCategories[i],
        type: CategoryType.EXPENSE,
        parentId: despesasAdmin.id,
        level: 3,
        orderIndex: 210 + i,
      }
    })
  }

  // Despesas com Imóveis
  const despesasImoveis = await prisma.category.upsert({
    where: { name: 'Despesas com Imóveis' },
    update: {},
    create: {
      name: 'Despesas com Imóveis',
      type: CategoryType.EXPENSE,
      parentId: despesasOperacionais.id,
      level: 2,
      orderIndex: 22,
    }
  })

  const imoveisCategories = [
    'Condomínios',
    'Energia Elétrica',
    'Água e Esgoto',
    'Telefone e Internet',
    'Manutenção',
    'Benfeitorias',
    'IPTU',
    'Repasse de Aluguel'
  ]

  for (let i = 0; i < imoveisCategories.length; i++) {
    await prisma.category.upsert({
      where: { name: imoveisCategories[i] },
      update: {},
      create: {
        name: imoveisCategories[i],
        type: CategoryType.EXPENSE,
        parentId: despesasImoveis.id,
        level: 3,
        orderIndex: 220 + i,
      }
    })
  }

  // Despesas com Impostos
  const despesasImpostos = await prisma.category.upsert({
    where: { name: 'Despesas com Impostos' },
    update: {},
    create: {
      name: 'Despesas com Impostos',
      type: CategoryType.EXPENSE,
      parentId: despesasOperacionais.id,
      level: 2,
      orderIndex: 23,
    }
  })

  const impostosCategories = [
    'IRPJ',
    'CSLL',
    'Taxa de Fiscalização',
    'Outros Impostos',
    'PIS',
    'Cofins'
  ]

  for (let i = 0; i < impostosCategories.length; i++) {
    await prisma.category.upsert({
      where: { name: impostosCategories[i] },
      update: {},
      create: {
        name: impostosCategories[i],
        type: CategoryType.EXPENSE,
        parentId: despesasImpostos.id,
        level: 3,
        orderIndex: 230 + i,
      }
    })
  }

  // Controle Interno
  const controleInterno = await prisma.category.upsert({
    where: { name: 'Controle Interno' },
    update: {},
    create: {
      name: 'Controle Interno',
      type: CategoryType.TRANSFER,
      level: 1,
      orderIndex: 30,
      isSystem: true,
    }
  })

  const transferencia = await prisma.category.upsert({
    where: { name: 'Transferência entre Contas' },
    update: {},
    create: {
      name: 'Transferência entre Contas',
      type: CategoryType.TRANSFER,
      parentId: controleInterno.id,
      level: 2,
      orderIndex: 31,
      isSystem: true,
    }
  })

  await prisma.category.upsert({
    where: { name: 'Ajuste de Saldo' },
    update: {},
    create: {
      name: 'Ajuste de Saldo',
      type: CategoryType.ADJUSTMENT,
      parentId: controleInterno.id,
      level: 2,
      orderIndex: 32,
      isSystem: true,
    }
  })

  await prisma.category.upsert({
    where: { name: 'Aplicação/Resgate Investimentos' },
    update: {},
    create: {
      name: 'Aplicação/Resgate Investimentos',
      type: CategoryType.TRANSFER,
      parentId: controleInterno.id,
      level: 2,
      orderIndex: 33,
      isSystem: true,
    }
  })

  // Outras Categorias
  await prisma.category.upsert({
    where: { name: 'Despesas Pessoais Sócios' },
    update: {},
    create: {
      name: 'Despesas Pessoais Sócios',
      type: CategoryType.EXPENSE,
      level: 1,
      orderIndex: 40,
    }
  })

  await prisma.category.upsert({
    where: { name: 'Reformas' },
    update: {},
    create: {
      name: 'Reformas',
      type: CategoryType.EXPENSE,
      level: 1,
      orderIndex: 41,
    }
  })

  // 3. Criar Imóveis
  console.log('🏠 Creating properties...')
  
  const properties = [
    // Catanduva (CAT)
    { code: 'CAT - Otica - Casa ao Fundo', city: 'CAT', address: 'Otica - Casa ao Fundo' },
    { code: 'CAT - Rua Itapema', city: 'CAT', address: 'Rua Itapema' },
    { code: 'CAT - Rua Brasil', city: 'CAT', address: 'Rua Brasil' },
    { code: 'CAT - Rua Cuiabá', city: 'CAT', address: 'Rua Cuiabá' },
    { code: 'CAT - Rua Bahia Sala 1', city: 'CAT', address: 'Rua Bahia - Sala 1' },
    { code: 'CAT - Rua Bahia Sala 2 e 3', city: 'CAT', address: 'Rua Bahia - Salas 2 e 3' },
    { code: 'CAT - Rua Bahia Sala 4', city: 'CAT', address: 'Rua Bahia - Sala 4' },
    { code: 'CAT - Rua Bahia Sala 5', city: 'CAT', address: 'Rua Bahia - Sala 5' },
    { code: 'CAT - Rua Minas Gerais - 1072', city: 'CAT', address: 'Rua Minas Gerais, 1072' },
    { code: 'CAT - Rua Fortaleza - 494', city: 'CAT', address: 'Rua Fortaleza, 494' },
    { code: 'CAT - Rua Said Tuma', city: 'CAT', address: 'Rua Said Tuma' },
    { code: 'CAT - Terreno Dahma', city: 'CAT', address: 'Terreno Dahma' },
    { code: 'CAT - Rua Monte Aprazível', city: 'CAT', address: 'Rua Monte Aprazível' },
    
    // São José do Rio Preto (SJP)
    { code: 'SJP - Av. Alberto Andaló - 2964', city: 'SJP', address: 'Av. Alberto Andaló, 2964' },
    { code: 'SJP - Av. Alberto Andaló - 2964 - 2', city: 'SJP', address: 'Av. Alberto Andaló, 2964 - 2' },
    { code: 'SJP - Av. Alberto Andaló - 3483', city: 'SJP', address: 'Av. Alberto Andaló, 3483' },
    
    // Ribeirão Preto (RIB)
    { code: 'RIB - Av. Presidente Vargas 1', city: 'RIB', address: 'Av. Presidente Vargas, 1' },
    { code: 'RIB - Av. Independência 1379', city: 'RIB', address: 'Av. Independência, 1379' },
    { code: 'RIB - Av. Independência 1591', city: 'RIB', address: 'Av. Independência, 1591' },
    
    // São Paulo (SAO)
    { code: 'SAO - Rua Pamplona 391 - ap 12', city: 'SAO', address: 'Rua Pamplona, 391 - Apartamento 12' },
    { code: 'SAO - Rua Pamplona - Garagem', city: 'SAO', address: 'Rua Pamplona - Garagem' },
    
    // Sales (SAL)
    { code: 'SAL - Sítio - Sales', city: 'SAL', address: 'Sítio - Sales' },
    { code: 'SAL - Rancho - Sales', city: 'SAL', address: 'Rancho - Sales' },
    { code: 'SAL - Rancho - Sales II', city: 'SAL', address: 'Rancho - Sales II' },
    
    // São Vicente (SVC)
    { code: 'SVC - São Vicente - Apartamento', city: 'SVC', address: 'São Vicente - Apartamento' },
  ]

  for (const property of properties) {
    await prisma.property.upsert({
      where: { code: property.code },
      update: {},
      create: property
    })
  }

  // 4. Criar Regras de Categorização Básicas
  console.log('⚙️  Creating basic categorization rules...')

  // Encontrar IDs das categorias
  const tarifasCategory = await prisma.category.findUnique({ where: { name: 'Tarifas Bancárias' } })
  const energiaCategory = await prisma.category.findUnique({ where: { name: 'Energia Elétrica' } })
  const condominioCategory = await prisma.category.findUnique({ where: { name: 'Condomínios' } })
  const iptuCategory = await prisma.category.findUnique({ where: { name: 'IPTU' } })
  const salariosCategory = await prisma.category.findUnique({ where: { name: 'Salários' } })
  const fgtsCategory = await prisma.category.findUnique({ where: { name: 'FGTS' } })

  if (tarifasCategory) {
    await prisma.categoryRule.upsert({
      where: { name: 'Tarifas Bancárias - Débitos Automáticos' },
      update: {},
      create: {
        name: 'Tarifas Bancárias - Débitos Automáticos',
        categoryId: tarifasCategory.id,
        descriptionPattern: 'DEBITO CONVENIOS|TARIFA|MANUTENCAO|INTEGR.CAPITAL',
        priority: 100,
      }
    })
  }

  if (energiaCategory) {
    await prisma.categoryRule.upsert({
      where: { name: 'Energia Elétrica - ENERGISA' },
      update: {},
      create: {
        name: 'Energia Elétrica - ENERGISA',
        categoryId: energiaCategory.id,
        descriptionPattern: 'ENERGISA',
        priority: 90,
      }
    })
  }

  if (condominioCategory) {
    await prisma.categoryRule.upsert({
      where: { name: 'Condomínios - Administradoras' },
      update: {},
      create: {
        name: 'Condomínios - Administradoras',
        categoryId: condominioCategory.id,
        descriptionPattern: 'CONDOMI|OMA ADM',
        priority: 90,
      }
    })
  }

  if (iptuCategory) {
    await prisma.categoryRule.upsert({
      where: { name: 'IPTU - Municípios' },
      update: {},
      create: {
        name: 'IPTU - Municípios',
        categoryId: iptuCategory.id,
        descriptionPattern: 'MUNICIPIO|PREFEITURA',
        priority: 95,
      }
    })
  }

  if (salariosCategory) {
    await prisma.categoryRule.upsert({
      where: { name: 'Salários - PIX Funcionários' },
      update: {},
      create: {
        name: 'Salários - PIX Funcionários',
        categoryId: salariosCategory.id,
        descriptionPattern: 'BEATRIZ REBELATO|Vagner Bonini',
        priority: 85,
      }
    })
  }

  if (fgtsCategory) {
    await prisma.categoryRule.upsert({
      where: { name: 'FGTS - Débitos Automáticos' },
      update: {},
      create: {
        name: 'FGTS - Débitos Automáticos',
        categoryId: fgtsCategory.id,
        descriptionPattern: 'FGTS',
        priority: 95,
      }
    })
  }

  // Regra para Transferências
  if (transferencia) {
    await prisma.categoryRule.upsert({
      where: { name: 'Transferências - TED' },
      update: {},
      create: {
        name: 'Transferências - TED',
        categoryId: transferencia.id,
        descriptionPattern: 'TED|DEBITO TED',
        priority: 100,
        isTransferRule: true,
      }
    })
  }

  // Regra para Aluguéis
  if (aluguelCategory) {
    await prisma.categoryRule.upsert({
      where: { name: 'Aluguéis - Recebimentos PIX' },
      update: {},
      create: {
        name: 'Aluguéis - Recebimentos PIX',
        categoryId: aluguelCategory.id,
        descriptionPattern: 'RECEBIMENTO PIX.*ISABEL CRISTINA|RECEBIMENTO PIX.*HERBICAT|RECEBIMENTO PIX.*THAIS HELENA|RECEBIMENTO PIX.*LOREN IMOVEIS',
        priority: 80,
      }
    })
  }

  console.log('✅ Seed completed!')
  
  // Mostrar resumo
  const accountCount = await prisma.bankAccount.count()
  const categoryCount = await prisma.category.count()
  const propertyCount = await prisma.property.count()
  const ruleCount = await prisma.categoryRule.count()
  
  console.log(`📊 Summary:`)
  console.log(`   🏦 Bank Accounts: ${accountCount}`)
  console.log(`   📂 Categories: ${categoryCount}`)
  console.log(`   🏠 Properties: ${propertyCount}`)
  console.log(`   ⚙️  Category Rules: ${ruleCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })