#!/usr/bin/env npx tsx

import { prisma } from '@/lib/database/client';
// logger not used in this script

async function analyzePatterns() {
  console.log('🔍 Analisando padrões históricos...\n');

  // 1. Contar total de transações processadas com categoria
  const totalCategorized = await prisma.processedTransaction.count({
    where: {
      categoryId: { not: null },
    },
  });

  console.log(`📊 Total de transações categorizadas: ${totalCategorized}\n`);

  // 2. Buscar uma transação de teste
  const testTransaction = await prisma.processedTransaction.findFirst({
    where: {
      categoryId: null,
    },
    include: {
      transaction: true,
    },
  });

  if (!testTransaction) {
    console.log('❌ Nenhuma transação sem categoria encontrada');
    return;
  }

  console.log('🎯 Transação de teste:');
  console.log(`   ID: ${testTransaction.id}`);
  console.log(`   Descrição: ${testTransaction.transaction?.description}`);
  console.log(`   Valor: R$ ${testTransaction.transaction?.amount}\n`);

  // 3. Extrair palavras-chave (mesmo algoritmo do serviço)
  const description = testTransaction.transaction?.description || '';
  const stopWords = [
    'de',
    'da',
    'do',
    'para',
    'com',
    'em',
    'no',
    'na',
    'por',
    'ref',
  ];
  const keywords = description
    .toLowerCase()
    .split(/[\s\-\/]+/)
    .filter((w) => w.length > 3 && !stopWords.includes(w));

  console.log('🔑 Palavras-chave extraídas:');
  console.log(`   ${keywords.join(', ')}\n`);

  // 4. Buscar transações similares para CADA palavra-chave
  console.log('🔍 Buscando padrões para cada palavra-chave:\n');

  for (const keyword of keywords.slice(0, 3)) {
    const count = await prisma.processedTransaction.count({
      where: {
        AND: [
          { categoryId: { not: null } },
          {
            transaction: {
              description: {
                contains: keyword,
              },
            },
          },
        ],
      },
    });

    console.log(`   "${keyword}": ${count} transações encontradas`);

    // Mostrar exemplos
    if (count > 0) {
      const examples = await prisma.processedTransaction.findMany({
        where: {
          AND: [
            { categoryId: { not: null } },
            {
              transaction: {
                description: {
                  contains: keyword,
                },
              },
            },
          ],
        },
        include: {
          transaction: true,
          category: true,
        },
        take: 3,
      });

      for (const ex of examples) {
        console.log(
          `     → ${ex.transaction?.description?.substring(0, 60)}...`
        );
        console.log(`       Categoria: ${ex.category?.name}`);
      }
    }
  }

  // 5. Buscar com OR (como o código atual faz)
  console.log('\n🔄 Buscando com OR (qualquer palavra-chave):');

  const conditions = keywords.slice(0, 3).map((keyword) => ({
    transaction: {
      description: {
        contains: keyword,
      },
    },
  }));

  const similarTransactions = await prisma.processedTransaction.findMany({
    where: {
      AND: [
        { categoryId: { not: null } },
        {
          OR: conditions,
        },
      ],
    },
    include: {
      transaction: true,
      category: true,
      property: true,
    },
    take: 500,
    orderBy: {
      updatedAt: 'desc',
    },
  });

  console.log(`   Total encontrado: ${similarTransactions.length} transações`);

  // 6. Agrupar por padrão único
  type Pattern = {
    description: string;
    categoryName: string;
    propertyCode?: string | null;
    frequency: number;
  };

  const patternMap = new Map<string, Pattern>();

  similarTransactions.forEach((trans) => {
    if (!trans.transaction || !trans.category) return;

    const key = `${trans.transaction.description}_${trans.category.name}_${
      trans.property?.code || ''
    }`;

    if (patternMap.has(key)) {
      const pattern = patternMap.get(key)!;
      pattern.frequency++;
    } else {
      patternMap.set(key, {
        description: trans.transaction.description,
        categoryName: trans.category.name,
        propertyCode: trans.property?.code,
        frequency: 1,
      });
    }
  });

  const patterns = Array.from(patternMap.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 100);

  console.log(`   Padrões únicos: ${patterns.length}\n`);

  // 7. Mostrar top 10 padrões
  console.log('🏆 Top 10 padrões encontrados:');
  patterns.slice(0, 10).forEach((p, i) => {
    console.log(
      `   ${i + 1}. "${p.description.substring(0, 50)}..." → ${
        p.categoryName
      } (${p.frequency}x)`
    );
  });

  // 8. Análise de cobertura
  console.log('\n📈 Análise de cobertura:');

  const categoriesWithCount = await prisma.category.findMany({
    where: {
      transactions: {
        some: {},
      },
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  // order in JS to avoid TypeScript/Prisma ordering types mismatch
  categoriesWithCount.sort(
    (a, b) => b._count.transactions - a._count.transactions
  );

  console.log('   Categorias mais usadas:');
  categoriesWithCount.slice(0, 10).forEach((cat) => {
    console.log(`     - ${cat.name}: ${cat._count.transactions} transações`);
  });

  await prisma.$disconnect();
}

analyzePatterns().catch(console.error);
