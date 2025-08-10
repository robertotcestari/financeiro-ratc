import { PrismaClient, CategoryType } from '@/app/generated/prisma';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { extractCityCode, parseMonetaryValue, parseDate } from './utils/csv';

const prisma = new PrismaClient();

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

async function importUnifiedCSV() {
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
    const bankAccounts = await prisma.bankAccount.findMany();
    const accountMap = new Map(bankAccounts.map((acc) => [acc.name, acc.id]));

    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map((cat) => [cat.name, cat.id]));

    const properties = await prisma.property.findMany();
    const propertyMap = new Map(properties.map((prop) => [prop.code, prop.id]));

    // 4. Processar transações do CSV e vincular com transações existentes
    console.log('\n🔄 Vinculando transações unificadas...');
    let matched = 0;
    let notMatched = 0;
    let skipped = 0;

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

      const bankAccountId = accountMap.get(accountName);
      const categoryId = categoryMap.get(categoryName);
      const propertyId =
        propertyCode && propertyCode !== '-'
          ? propertyMap.get(propertyCode)
          : null;

      if (!bankAccountId || !categoryId) {
        console.log(
          `⚠️  Conta ou categoria não encontrada: ${accountName} / ${categoryName}`
        );
        skipped++;
        continue;
      }

      // Tentar encontrar a transação bruta correspondente
      // Busca flexível: mesma conta, valor próximo, data próxima
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - 2); // 2 dias antes
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 2); // 2 dias depois

      const matchingTransaction = await prisma.transaction.findFirst({
        where: {
          bankAccountId: bankAccountId,
          amount: {
            gte: amount - 0.01,
            lte: amount + 0.01,
          },
          date: {
            gte: startDate,
            lte: endDate,
          },
          unifiedTransaction: null, // Ainda não vinculada
        },
        orderBy: {
          date: 'asc',
        },
      });

      if (matchingTransaction) {
        // Criar UnifiedTransaction vinculada
        await prisma.unifiedTransaction.create({
          data: {
            transactionId: matchingTransaction.id,
            year: year,
            month: month,
            categoryId: categoryId,
            propertyId: propertyId,
            details: details,
            notes: description || null,
            isTransfer: categoryName === 'Transferência entre Contas',
            isReviewed: true,
          },
        });
        matched++;

        if (matched % 100 === 0) {
          console.log(`  Processadas ${matched} transações...`);
        }
      } else {
        notMatched++;
        if (notMatched <= 5) {
          console.log(
            `  ❌ Não encontrada: ${date.toLocaleDateString(
              'pt-BR'
            )} | ${accountName} | R$ ${amount.toFixed(2)} | ${description}`
          );
        }
      }
    }

    console.log(`\n📊 Resultado da importação:`);
    console.log(`  ✅ Vinculadas: ${matched} transações`);
    console.log(`  ❌ Não encontradas: ${notMatched} transações`);
    console.log(`  ⚠️  Puladas (inválidas): ${skipped} linhas`);

    // 5. Verificar estatísticas finais
    const totalTransactions = await prisma.transaction.count();
    const totalUnified = await prisma.unifiedTransaction.count();
    const uncategorized = totalTransactions - totalUnified;

    console.log(`\n📈 Estatísticas finais:`);
    console.log(`  Total de transações brutas: ${totalTransactions}`);
    console.log(`  Total de transações unificadas: ${totalUnified}`);
    console.log(`  Transações não categorizadas: ${uncategorized}`);

    if (uncategorized > 0) {
      console.log(
        `\n⚠️  Ainda existem ${uncategorized} transações não categorizadas.`
      );
      console.log(
        `  Estas podem ser transações que não estavam no CSV original ou`
      );
      console.log(
        `  que não puderam ser correspondidas devido a diferenças de data/valor.`
      );
    }
  } catch (error) {
    console.error('❌ Erro durante importação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar importação
importUnifiedCSV().catch(console.error);
