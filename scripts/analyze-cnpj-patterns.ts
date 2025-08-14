#!/usr/bin/env npx tsx

import { prisma } from '@/lib/database/client';

async function analyzeCNPJPatterns() {
  console.log('🔍 Analisando padrões de CNPJ nas transações...\n');

  // Buscar todas as transações com CNPJ
  const transactions = await prisma.processedTransaction.findMany({
    where: {
      categoryId: { not: null },
      transaction: {
        description: {
          contains: '28979546000155' // CNPJ da PartnerBank
        }
      }
    },
    include: {
      transaction: true,
      category: true,
      property: true
    }
  });

  console.log(`📊 Transações com CNPJ 28979546000155: ${transactions.length}\n`);

  if (transactions.length > 0) {
    console.log('📝 Detalhes das transações encontradas:');
    transactions.forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.transaction?.description}`);
      console.log(`   Categoria: ${t.category?.name}`);
      console.log(`   Propriedade: ${t.property?.code || 'Nenhuma'}`);
      console.log(`   Data: ${t.transaction?.date.toISOString().split('T')[0]}`);
      console.log(`   Valor: R$ ${t.transaction?.amount}`);
    });
  }

  // Analisar padrão mais amplo de liquidação de boletos
  console.log('\n\n🔍 Analisando padrões de LIQUIDACAO BOLETO...\n');

  const liquidacaoTransactions = await prisma.processedTransaction.findMany({
    where: {
      categoryId: { not: null },
      transaction: {
        description: {
          contains: 'LIQUIDACAO BOLETO'
        }
      }
    },
    include: {
      category: true
    },
    take: 50
  });

  // Agrupar por categoria
  const categoryCount = new Map<string, number>();
  liquidacaoTransactions.forEach(t => {
    const catName = t.category?.name || 'Sem categoria';
    categoryCount.set(catName, (categoryCount.get(catName) || 0) + 1);
  });

  console.log('📊 Distribuição de categorias para LIQUIDACAO BOLETO:');
  const sortedCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1]);
  
  sortedCategories.forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} transações`);
  });

  // Analisar CNPJs únicos
  console.log('\n\n🔍 Analisando CNPJs únicos nas transações...\n');

  const allTransactions = await prisma.transaction.findMany({
    select: {
      description: true
    },
    take: 1000
  });

  const cnpjRegex = /\b\d{14}\b/g;
  const cnpjSet = new Set<string>();

  allTransactions.forEach(t => {
    const matches = t.description.match(cnpjRegex);
    if (matches) {
      matches.forEach(cnpj => cnpjSet.add(cnpj));
    }
  });

  console.log(`📊 Total de CNPJs únicos encontrados: ${cnpjSet.size}`);
  console.log('\n📝 Primeiros 20 CNPJs:');
  Array.from(cnpjSet).slice(0, 20).forEach(cnpj => {
    console.log(`   ${cnpj}`);
  });

  await prisma.$disconnect();
}

analyzeCNPJPatterns().catch(console.error);