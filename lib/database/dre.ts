import prisma from './client';
import { CategoryType } from '@/app/generated/prisma';
import type { Category } from '@/app/generated/prisma';

export interface DRELineData {
  id: string;
  name: string;
  level: number;
  lineType: 'DETAIL' | 'SUBTOTAL' | 'TOTAL' | 'SEPARATOR';
  amount: number;
  isBold: boolean;
  showInReport: boolean;
  children?: DRELineData[];
}

/**
 * Gera DRE para um período específico
 */
export async function generateDRE(year: number, month?: number) {
  const where = {
    year,
    ...(month && { month }),
    isTransfer: false, // Exclui transferências
  };

  // Busca todas as transações do período
  const transactions = await prisma.unifiedTransaction.findMany({
    where,
    include: {
      transaction: true,
      category: {
        include: {
          parent: {
            include: {
              parent: true,
            },
          },
        },
      },
    },
  });

  // Agrupa por categoria
  const categoryTotals = new Map<
    string,
    {
      category: Category & {
        parent?: Category | null;
        parentId?: string | null;
      };
      total: number;
      transactionCount: number;
    }
  >();

  for (const transaction of transactions) {
    const amount = Number(transaction.transaction.amount);
    const categoryId = transaction.categoryId;

    if (categoryTotals.has(categoryId)) {
      const existing = categoryTotals.get(categoryId)!;
      existing.total += amount;
      existing.transactionCount += 1;
    } else {
      categoryTotals.set(categoryId, {
        category: transaction.category,
        total: amount,
        transactionCount: 1,
      });
    }
  }

  // Organiza em hierarquia
  const dreStructure = organizeDREHierarchy(categoryTotals);

  return dreStructure;
}

/**
 * Organiza categorias em estrutura hierárquica do DRE
 */
function organizeDREHierarchy(
  categoryTotals: Map<
    string,
    {
      category: Category & { parent?: Category | null };
      total: number;
      transactionCount: number;
    }
  >
): DRELineData[] {
  const structure: DRELineData[] = [];

  // Separa por tipo de categoria
  const incomeCategories = new Map<
    string,
    {
      category: Category & { parent?: Category | null };
      total: number;
      transactionCount: number;
    }
  >();
  const expenseCategories = new Map<
    string,
    {
      category: Category & { parent?: Category | null };
      total: number;
      transactionCount: number;
    }
  >();

  for (const [categoryId, data] of categoryTotals) {
    const category = data.category;

    if (category.type === CategoryType.INCOME) {
      incomeCategories.set(categoryId, data);
    } else if (category.type === CategoryType.EXPENSE) {
      expenseCategories.set(categoryId, data);
    }
  }

  // 1. RECEITAS
  if (incomeCategories.size > 0) {
    const receitasSection = buildCategorySection(
      'Receitas Operacionais',
      incomeCategories,
      1
    );
    structure.push(...receitasSection.lines);

    // Subtotal de Receitas
    structure.push({
      id: 'subtotal-receitas',
      name: 'Total de Receitas',
      level: 1,
      lineType: 'SUBTOTAL',
      amount: receitasSection.total,
      isBold: true,
      showInReport: true,
    });
  }

  // Separador
  structure.push({
    id: 'separator-1',
    name: '',
    level: 0,
    lineType: 'SEPARATOR',
    amount: 0,
    isBold: false,
    showInReport: true,
  });

  // 2. DESPESAS
  if (expenseCategories.size > 0) {
    const despesasSection = buildCategorySection(
      'Despesas Operacionais',
      expenseCategories,
      1
    );
    structure.push(...despesasSection.lines);

    // Subtotal de Despesas
    structure.push({
      id: 'subtotal-despesas',
      name: 'Total de Despesas',
      level: 1,
      lineType: 'SUBTOTAL',
      amount: despesasSection.total,
      isBold: true,
      showInReport: true,
    });
  }

  // Separador
  structure.push({
    id: 'separator-2',
    name: '',
    level: 0,
    lineType: 'SEPARATOR',
    amount: 0,
    isBold: false,
    showInReport: true,
  });

  // 3. RESULTADO
  const totalReceitas =
    incomeCategories.size > 0
      ? Array.from(incomeCategories.values()).reduce(
          (sum, cat) => sum + cat.total,
          0
        )
      : 0;

  const totalDespesas =
    expenseCategories.size > 0
      ? Array.from(expenseCategories.values()).reduce(
          (sum, cat) => sum + cat.total,
          0
        )
      : 0;

  const resultado = totalReceitas + totalDespesas; // Despesas são negativas

  structure.push({
    id: 'resultado-liquido',
    name: 'Resultado Líquido',
    level: 1,
    lineType: 'TOTAL',
    amount: resultado,
    isBold: true,
    showInReport: true,
  });

  return structure;
}

/**
 * Constrói seção de categoria com hierarquia
 */
function buildCategorySection(
  sectionName: string,
  categories: Map<
    string,
    {
      category: Category & { parent?: Category | null };
      total: number;
      transactionCount: number;
    }
  >,
  level: number
) {
  const lines: DRELineData[] = [];
  let sectionTotal = 0;

  // Título da seção
  lines.push({
    id: `section-${sectionName.toLowerCase().replace(/\s+/g, '-')}`,
    name: sectionName,
    level,
    lineType: 'SUBTOTAL',
    amount: 0,
    isBold: true,
    showInReport: true,
  });

  // Organiza categorias por hierarquia
  const parentCategories = new Map<
    string,
    {
      parent: Category;
      children: Array<{
        category: Category;
        total: number;
        transactionCount: number;
      }>;
      total: number;
    }
  >();

  for (const [categoryId, data] of categories) {
    const category = data.category;
    sectionTotal += data.total;

    if (category.parent) {
      const parentId = category.parent.id;
      if (!parentCategories.has(parentId)) {
        parentCategories.set(parentId, {
          parent: category.parent,
          children: [],
          total: 0,
        });
      }
      const parentData = parentCategories.get(parentId)!;
      parentData.children.push(data);
      parentData.total += data.total;
    } else {
      // Categoria sem pai
      lines.push({
        id: categoryId,
        name: category.name,
        level: level + 1,
        lineType: 'DETAIL',
        amount: data.total,
        isBold: false,
        showInReport: true,
      });
    }
  }

  // Adiciona categorias pai com filhos
  for (const [parentId, parentData] of parentCategories) {
    // Categoria pai
    lines.push({
      id: parentId,
      name: parentData.parent.name,
      level: level + 1,
      lineType: 'DETAIL',
      amount: parentData.total,
      isBold: false,
      showInReport: true,
    });

    // Categorias filhas
    for (const child of parentData.children) {
      lines.push({
        id: child.category.id,
        name: child.category.name,
        level: level + 2,
        lineType: 'DETAIL',
        amount: child.total,
        isBold: false,
        showInReport: true,
      });
    }
  }

  return {
    lines,
    total: sectionTotal,
  };
}

/**
 * Gera comparativo entre períodos
 */
export async function generateDREComparison(
  year1: number,
  month1: number | undefined,
  year2: number,
  month2: number | undefined
) {
  const [dre1, dre2] = await Promise.all([
    generateDRE(year1, month1),
    generateDRE(year2, month2),
  ]);

  // Combina os dados criando um mapa para fácil comparação
  const comparison: Array<{
    name: string;
    level: number;
    lineType: string;
    period1: number;
    period2: number;
    variation: number;
    variationPercent: number;
  }> = [];

  const dre1Map = new Map<string, DRELineData>();
  const dre2Map = new Map<string, DRELineData>();

  dre1.forEach((line) => dre1Map.set(line.name, line));
  dre2.forEach((line) => dre2Map.set(line.name, line));

  // Combina todas as linhas
  const allLines = new Set([...dre1Map.keys(), ...dre2Map.keys()]);

  for (const lineName of allLines) {
    const line1 = dre1Map.get(lineName);
    const line2 = dre2Map.get(lineName);

    const amount1 = line1?.amount || 0;
    const amount2 = line2?.amount || 0;
    const variation = amount2 - amount1;
    const variationPercent =
      amount1 !== 0 ? (variation / Math.abs(amount1)) * 100 : 0;

    comparison.push({
      name: lineName,
      level: line1?.level || line2?.level || 1,
      lineType: line1?.lineType || line2?.lineType || 'DETAIL',
      period1: amount1,
      period2: amount2,
      variation,
      variationPercent,
    });
  }

  return comparison;
}

/**
 * Calcula indicadores financeiros do DRE
 */
export async function calculateFinancialIndicators(
  year: number,
  month?: number
) {
  const dre = await generateDRE(year, month);

  const totalReceitas =
    dre.find((line) => line.id === 'subtotal-receitas')?.amount || 0;
  const totalDespesas =
    dre.find((line) => line.id === 'subtotal-despesas')?.amount || 0;
  const resultadoLiquido =
    dre.find((line) => line.id === 'resultado-liquido')?.amount || 0;

  // Margem líquida
  const margemLiquida =
    totalReceitas !== 0 ? (resultadoLiquido / totalReceitas) * 100 : 0;

  // Índice de despesas sobre receitas
  const indiceDespesas =
    totalReceitas !== 0 ? (Math.abs(totalDespesas) / totalReceitas) * 100 : 0;

  return {
    totalReceitas,
    totalDespesas,
    resultadoLiquido,
    margemLiquida,
    indiceDespesas,
    isLucrative: resultadoLiquido > 0,
  };
}
