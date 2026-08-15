import { createPrismaClient } from '@/lib/core/database/client';
import { PrismaClient, CategoryType } from '@/app/generated/prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { extractCityCode, parseMonetaryValue, parseDate } from './utils/csv';

const prisma = createPrismaClient();

// Mapeamento de categorias para tipo
const categoryTypeMap: Record<string, CategoryType> = {
  'Ajuste de Saldo': CategoryType.ADJUSTMENT,
  'Transferência entre Contas': CategoryType.TRANSFER,
  Aluguel: CategoryType.INCOME,
  'Repasse de Aluguel': CategoryType.EXPENSE,
  'Aluguel de Terceiros': CategoryType.EXPENSE,
  'Tarifas Bancárias': CategoryType.EXPENSE,
  'Despesas Pessoais Sócios': CategoryType.EXPENSE,
  'Energia Elétrica': CategoryType.EXPENSE,
  Salários: CategoryType.EXPENSE,
  Condomínios: CategoryType.EXPENSE,
  FGTS: CategoryType.EXPENSE,
  Reformas: CategoryType.EXPENSE,
  IPTU: CategoryType.EXPENSE,
  'Água e Esgoto': CategoryType.EXPENSE,
  Manutenção: CategoryType.EXPENSE,
  INSS: CategoryType.EXPENSE,
  'Documentações e Jurídico': CategoryType.EXPENSE,
  Contabilidade: CategoryType.EXPENSE,
  'Escritórios e Postagens': CategoryType.EXPENSE,
  'Outras Despesas': CategoryType.EXPENSE,
  'Depósitos Caução': CategoryType.EXPENSE,
  'Compra de Imóveis': CategoryType.EXPENSE,
  'Investimentos em Terceiros': CategoryType.EXPENSE,
  'Aporte de Capital': CategoryType.INCOME,
  'Juros Bancários': CategoryType.EXPENSE,
  IRPJ: CategoryType.EXPENSE,
  CSLL: CategoryType.EXPENSE,
  PIS: CategoryType.EXPENSE,
  Cofins: CategoryType.EXPENSE,
  'Outros Impostos': CategoryType.EXPENSE,
};

// Helpers moved to ./utils/csv

async function updateUnifiedFromCSV() {
  const csvPath = path.join(
    process.cwd(),
    'old_implementation',
    'Contratos de Locação - Contas Unificadas.csv'
  );

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Arquivo CSV não encontrado:', csvPath);
    return;
  }

  console.log('📂 Lendo arquivo CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
    relax_quotes: true,
    trim: true,
  });

  console.log(`📊 Total de registros no CSV: ${records.length}`);

  try {
    // 1. Primeiro, criar todas as categorias únicas
    console.log('\n🏷️  Importando categorias...');
    const uniqueCategories = new Set<string>();

    for (const record of records) {
      if (record.Categoria && record.Categoria !== 'Categoria') {
        uniqueCategories.add(record.Categoria);
      }
    }

    for (const categoryName of uniqueCategories) {
      const type = categoryTypeMap[categoryName] || CategoryType.EXPENSE;

      await prisma.category.upsert({
        where: { name: categoryName },
        update: {},
        create: {
          name: categoryName,
          type: type,
          level: 1,
          orderIndex: 0,
          isSystem: false,
        },
      });
    }

    console.log(
      `✅ ${uniqueCategories.size} categorias importadas/atualizadas`
    );

    // 2. Importar imóveis únicos
    console.log('\n🏠 Importando imóveis...');
    const uniqueProperties = new Set<string>();

    for (const record of records) {
      const propertyName = record['Imóvel Referência'];
      if (
        propertyName &&
        propertyName !== '-' &&
        propertyName !== 'Imóvel Referência'
      ) {
        uniqueProperties.add(propertyName);
      }
    }

    for (const propertyName of uniqueProperties) {
      const cityCode = extractCityCode(propertyName);

      await prisma.property.upsert({
        where: { code: propertyName },
        update: {},
        create: {
          code: propertyName,
          city: cityCode || 'OUTROS',
          address: propertyName.replace(/^[A-Z]{3}\s*-\s*/, ''),
          description: null,
          isActive: true,
        },
      });
    }

    console.log(`✅ ${uniqueProperties.size} imóveis importados/atualizados`);

    // 3. Buscar mapeamento de contas e categorias
    await prisma.bankAccount.findMany();

    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map((cat) => [cat.name, cat.id]));

    const properties = await prisma.property.findMany();
    const propertyMap = new Map(properties.map((prop) => [prop.code, prop.id]));

    // 4. Atualizar transações unificadas existentes
    console.log('\n🔄 Atualizando transações unificadas...');
    let updated = 0;
    let notFound = 0;
    let skipped = 0;

    // Buscar todas as transações unificadas com suas transações brutas
    const allUnified = await prisma.processedTransaction.findMany({
      include: {
        transaction: {
          include: {
            bankAccount: true,
          },
        },
      },
    });

    console.log(
      `📊 Total de transações unificadas no banco: ${allUnified.length}`
    );

    // Criar índice para busca rápida
    const unifiedIndex = new Map<string, (typeof allUnified)[0]>();
    for (const unified of allUnified) {
      const key = `${unified.transaction.bankAccount.name}_${
        unified.transaction.date.toISOString().split('T')[0]
      }_${unified.transaction.amount}`;
      unifiedIndex.set(key, unified);
    }

    for (const record of records) {
      // Pular header duplicado se houver
      if (record.Ano === 'Ano') continue;

      const year = parseInt(record.Ano);
      const month = parseInt(record.Mês);
      const amount = parseMonetaryValue(record.Valor);
      const date = parseDate(record.Data);
      const accountName = record.Conta;
      const categoryName = record.Categoria;
      const propertyCode = record['Imóvel Referência'];
      const details = record.Detalhes || null;
      const description = record.Descrição || '';

      // Validações básicas
      if (!year || !month || !accountName || !categoryName) {
        console.log(`⚠️  Pulando registro inválido: ${JSON.stringify(record)}`);
        skipped++;
        continue;
      }

      const categoryId = categoryMap.get(categoryName);
      const propertyId =
        propertyCode && propertyCode !== '-'
          ? propertyMap.get(propertyCode)
          : null;

      if (!categoryId) {
        console.log(`⚠️  Categoria não encontrada: ${categoryName}`);
        skipped++;
        continue;
      }

      // Tentar encontrar a transação unificada correspondente
      // Busca por múltiplas chaves com tolerância de data
      let foundUnified = null;

      for (let dayOffset = -2; dayOffset <= 2; dayOffset++) {
        const searchDate = new Date(date);
        searchDate.setDate(searchDate.getDate() + dayOffset);
        const dateStr = searchDate.toISOString().split('T')[0];

        // Tentar com valor exato
        const key1 = `${accountName}_${dateStr}_${amount.toFixed(2)}`;
        foundUnified = unifiedIndex.get(key1);

        if (!foundUnified) {
          // Tentar com pequenas variações no valor (arredondamento)
          for (let cents = -1; cents <= 1; cents++) {
            const adjustedAmount = (amount + cents * 0.01).toFixed(2);
            const key2 = `${accountName}_${dateStr}_${adjustedAmount}`;
            foundUnified = unifiedIndex.get(key2);
            if (foundUnified) break;
          }
        }

        if (foundUnified) break;
      }

      if (foundUnified) {
        // Atualizar a transação unificada
        await prisma.processedTransaction.update({
          where: { id: foundUnified.id },
          data: {
            year: year,
            month: month,
            categoryId: categoryId,
            propertyId: propertyId,
            details: details || foundUnified.details,
            notes: description || foundUnified.notes,
            isTransfer: categoryName === 'Transferência entre Contas',
            isReviewed: true,
          },
        });
        updated++;

        if (updated % 100 === 0) {
          console.log(`  Atualizadas ${updated} transações...`);
        }

        // Remover do índice para evitar duplicatas
        for (const [key, value] of unifiedIndex.entries()) {
          if (value.id === foundUnified.id) {
            unifiedIndex.delete(key);
            break;
          }
        }
      } else {
        notFound++;
        if (notFound <= 10) {
          console.log(
            `  ❌ Não encontrada no banco: ${date.toLocaleDateString(
              'pt-BR'
            )} | ${accountName} | R$ ${amount.toFixed(2)} | ${categoryName}`
          );
        }
      }
    }

    console.log(`\n📊 Resultado da atualização:`);
    console.log(`  ✅ Atualizadas: ${updated} transações`);
    console.log(`  ❌ Não encontradas: ${notFound} transações`);
    console.log(`  ⚠️  Puladas (inválidas): ${skipped} linhas`);

    // 5. Verificar estatísticas finais
    const totalCategories = await prisma.category.count();
    const totalProperties = await prisma.property.count();
    const reviewedTransactions = await prisma.processedTransaction.count({
      where: { isReviewed: true },
    });
    const withProperty = await prisma.processedTransaction.count({
      where: { propertyId: { not: null } },
    });

    console.log(`\n📈 Estatísticas finais:`);
    console.log(`  Total de categorias: ${totalCategories}`);
    console.log(`  Total de imóveis: ${totalProperties}`);
    console.log(`  Transações revisadas: ${reviewedTransactions}`);
    console.log(`  Transações com imóvel: ${withProperty}`);

    // Listar categorias com contagem
    console.log(`\n📊 Top 10 categorias por quantidade de transações:`);
    const categoryStats = await prisma.processedTransaction.groupBy({
      by: ['categoryId'],
      _count: true,
      orderBy: {
        _count: {
          categoryId: 'desc',
        },
      },
      take: 10,
    });

    for (const stat of categoryStats) {
      const category = categories.find((c) => c.id === stat.categoryId);
      console.log(
        `  ${category?.name?.padEnd(30)} | ${stat._count} transações`
      );
    }
  } catch (error) {
    console.error('❌ Erro durante atualização:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar atualização
updateUnifiedFromCSV().catch(console.error);
