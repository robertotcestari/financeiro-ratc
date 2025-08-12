import { prisma } from './client';
import { CategoryType } from '@/app/generated/prisma';
import type { Category, BankAccount } from '@/app/generated/prisma';

export interface DRELineData {
  id: string;
  name: string;
  level: number;
  lineType: 'DETAIL' | 'SUBTOTAL' | 'TOTAL' | 'SEPARATOR' | 'HEADER';
  amount: number;
  isBold: boolean;
  showInReport: boolean;
  children?: DRELineData[];
}

interface AccountBalanceForDRE {
  bankAccount: BankAccount;
  balance: number;
}

/**
 * Obter saldos bancários para inclusão no DRE
 */
async function getAccountBalancesForDRE(year: number, month?: number): Promise<AccountBalanceForDRE[]> {
  // Busca todas as contas bancárias ativas
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const balances: AccountBalanceForDRE[] = [];

  for (const account of bankAccounts) {
    let balance = 0;

    if (month) {
      // Para um mês específico, usa o saldo de fechamento do snapshot
      const snapshot = await prisma.accountSnapshot.findUnique({
        where: {
          bankAccountId_year_month: {
            bankAccountId: account.id,
            year,
            month,
          },
        },
      });

      balance = snapshot?.closingBalance ? Number(snapshot.closingBalance) : 0;
    } else {
      // Para o ano todo, usa o último snapshot disponível no ano
      const latestSnapshot = await prisma.accountSnapshot.findFirst({
        where: {
          bankAccountId: account.id,
          year,
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
        ],
      });

      balance = latestSnapshot?.closingBalance ? Number(latestSnapshot.closingBalance) : 0;
    }

    // Se não encontrar snapshot, usa o método anterior (transação mais recente)
    if (balance === 0) {
      // Determina a data final do período (último dia do mês/ano)
      let targetDate: Date;
      if (month) {
        // Último dia do mês específico
        targetDate = new Date(year, month, 0, 23, 59, 59); // month é 1-based, Date() espera 0-based
      } else {
        // Último dia do ano
        targetDate = new Date(year, 11, 31, 23, 59, 59); // Dezembro (11) dia 31
      }

      const latestTransaction = await prisma.transaction.findFirst({
        where: {
          bankAccountId: account.id,
          date: { lte: targetDate },
          balance: { not: null },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      });

      balance = latestTransaction?.balance ? Number(latestTransaction.balance) : 0;
    }

    balances.push({
      bankAccount: account,
      balance,
    });
  }

  return balances;
}

/**
 * Gera DRE para um período específico
 */
export async function generateDRE(year: number, month?: number) {
  const where = {
    year,
    ...(month && { month }),
  };

  // Busca saldos bancários, todas as categorias e transações em paralelo
  const [accountBalances, allCategories, transactions] = await Promise.all([
    getAccountBalancesForDRE(year, month),
    prisma.category.findMany({
      include: {
        parent: {
          include: {
            parent: true,
          },
        },
      },
    }),
    prisma.processedTransaction.findMany({
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
    })
  ]);

  // Inicializa todas as categorias ativas com valor zero
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

  // Adiciona todas as categorias com valor zero
  for (const category of allCategories) {
    categoryTotals.set(category.id, {
      category,
      total: 0,
      transactionCount: 0,
    });
  }

  // Atualiza os valores das categorias que têm transações
  for (const transaction of transactions) {
    // Guardas de nulidade para relações opcionais
    if (!transaction.transaction) continue;
    if (!transaction.category || !transaction.categoryId) continue;

    const amount = Number(transaction.transaction.amount);
    const categoryId = transaction.categoryId;

    if (categoryTotals.has(categoryId)) {
      const existing = categoryTotals.get(categoryId)!;
      existing.total += amount;
      existing.transactionCount += 1;
    }
  }

  // Organiza em hierarquia incluindo saldos bancários
  const dreStructure = organizeDREHierarchy(categoryTotals, accountBalances);

  return dreStructure;
}

/**
 * Verifica se uma categoria é não operacional
 */
function isNonOperationalCategory(category: Category & { parent?: Category | null }): boolean {
  // Verifica se a categoria raiz é "Receitas não Operacionais" ou "Despesas não Operacionais"
  const rootCategory = getRootCategory(category);
  return rootCategory.name === 'Receitas não Operacionais' || 
         rootCategory.name === 'Despesas não Operacionais';
}

/**
 * Obtém a categoria raiz (nível 1) de uma categoria
 */
function getRootCategory(category: Category & { parent?: Category | null }): Category {
  if (!category.parent) {
    return category;
  }
  
  let current = category;
  while (current.parent) {
    current = current.parent;
  }
  
  return current;
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
  >,
  accountBalances: AccountBalanceForDRE[]
): DRELineData[] {
  const structure: DRELineData[] = [];

  // 0. SALDOS BANCÁRIOS
  if (accountBalances.length > 0) {
    // Título da seção
    structure.push({
      id: 'saldos-bancarios-header',
      name: 'Saldos Bancários',
      level: 1,
      lineType: 'HEADER',
      amount: 0,
      isBold: true,
      showInReport: true,
    });

    let totalSaldos = 0;

    // Cada conta bancária
    for (const accountBalance of accountBalances) {
      structure.push({
        id: `saldo-${accountBalance.bankAccount.id}`,
        name: accountBalance.bankAccount.name,
        level: 2,
        lineType: 'DETAIL',
        amount: accountBalance.balance,
        isBold: false,
        showInReport: true,
      });
      totalSaldos += accountBalance.balance;
    }

    // Subtotal de Saldos
    structure.push({
      id: 'total-saldos-bancarios',
      name: 'Total Saldos Bancários',
      level: 1,
      lineType: 'SUBTOTAL',
      amount: totalSaldos,
      isBold: true,
      showInReport: true,
    });

    // Separador
    structure.push({
      id: 'separator-saldos',
      name: '',
      level: 0,
      lineType: 'SEPARATOR',
      amount: 0,
      isBold: false,
      showInReport: true,
    });
  }

  // Separa por tipo de categoria
  const operationalIncomeCategories = new Map<
    string,
    {
      category: Category & { parent?: Category | null };
      total: number;
      transactionCount: number;
    }
  >();
  const nonOperationalIncomeCategories = new Map<
    string,
    {
      category: Category & { parent?: Category | null };
      total: number;
      transactionCount: number;
    }
  >();
  const operationalExpenseCategories = new Map<
    string,
    {
      category: Category & { parent?: Category | null };
      total: number;
      transactionCount: number;
    }
  >();
  const nonOperationalExpenseCategories = new Map<
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
      // Verifica se é uma categoria não operacional
      const isNonOperational = isNonOperationalCategory(category);
      if (isNonOperational) {
        nonOperationalIncomeCategories.set(categoryId, data);
      } else {
        operationalIncomeCategories.set(categoryId, data);
      }
    } else if (category.type === CategoryType.EXPENSE) {
      // Verifica se é uma categoria não operacional
      const isNonOperational = isNonOperationalCategory(category);
      if (isNonOperational) {
        nonOperationalExpenseCategories.set(categoryId, data);
      } else {
        operationalExpenseCategories.set(categoryId, data);
      }
    }
  }

  // 1. RECEITAS OPERACIONAIS
  let totalReceitasOperacionais = 0;
  if (operationalIncomeCategories.size > 0) {
    const receitasSection = buildCategorySection(
      'Receitas Operacionais',
      operationalIncomeCategories,
      1
    );
    structure.push(...receitasSection.lines);
    totalReceitasOperacionais = receitasSection.total;

    // Subtotal de Receitas Operacionais
    structure.push({
      id: 'subtotal-receitas-operacionais',
      name: 'Total de Receitas Operacionais',
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

  // 2. DESPESAS OPERACIONAIS
  let totalDespesasOperacionais = 0;
  if (operationalExpenseCategories.size > 0) {
    const despesasSection = buildCategorySection(
      'Despesas Operacionais',
      operationalExpenseCategories,
      1
    );
    structure.push(...despesasSection.lines);
    totalDespesasOperacionais = despesasSection.total;

    // Subtotal de Despesas Operacionais
    structure.push({
      id: 'subtotal-despesas-operacionais',
      name: 'Total de Despesas Operacionais',
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

  // 3. RECEITAS NÃO OPERACIONAIS
  let totalReceitasNaoOperacionais = 0;
  if (nonOperationalIncomeCategories.size > 0) {
    const receitasNaoOpSection = buildCategorySection(
      'Receitas não Operacionais',
      nonOperationalIncomeCategories,
      1
    );
    structure.push(...receitasNaoOpSection.lines);
    totalReceitasNaoOperacionais = receitasNaoOpSection.total;

    // Subtotal de Receitas não Operacionais
    structure.push({
      id: 'subtotal-receitas-nao-operacionais',
      name: 'Total de Receitas não Operacionais',
      level: 1,
      lineType: 'SUBTOTAL',
      amount: receitasNaoOpSection.total,
      isBold: true,
      showInReport: true,
    });

    // Separador
    structure.push({
      id: 'separator-3',
      name: '',
      level: 0,
      lineType: 'SEPARATOR',
      amount: 0,
      isBold: false,
      showInReport: true,
    });
  }

  // 4. DESPESAS NÃO OPERACIONAIS
  let totalDespesasNaoOperacionais = 0;
  if (nonOperationalExpenseCategories.size > 0) {
    const despesasNaoOpSection = buildCategorySection(
      'Despesas não Operacionais',
      nonOperationalExpenseCategories,
      1
    );
    structure.push(...despesasNaoOpSection.lines);
    totalDespesasNaoOperacionais = despesasNaoOpSection.total;

    // Subtotal de Despesas não Operacionais
    structure.push({
      id: 'subtotal-despesas-nao-operacionais',
      name: 'Total de Despesas não Operacionais',
      level: 1,
      lineType: 'SUBTOTAL',
      amount: despesasNaoOpSection.total,
      isBold: true,
      showInReport: true,
    });

    // Separador
    structure.push({
      id: 'separator-4',
      name: '',
      level: 0,
      lineType: 'SEPARATOR',
      amount: 0,
      isBold: false,
      showInReport: true,
    });
  }

  // 5. LUCRO OPERACIONAL
  const lucroOperacional = totalReceitasOperacionais + totalDespesasOperacionais; // Despesas são negativas
  
  structure.push({
    id: 'lucro-operacional',
    name: 'Lucro Operacional',
    level: 1,
    lineType: 'SUBTOTAL',
    amount: lucroOperacional,
    isBold: true,
    showInReport: true,
  });

  // Separador
  structure.push({
    id: 'separator-5',
    name: '',
    level: 0,
    lineType: 'SEPARATOR',
    amount: 0,
    isBold: false,
    showInReport: true,
  });

  // 6. RESULTADO DE CAIXA
  const totalReceitas = totalReceitasOperacionais + totalReceitasNaoOperacionais;
  const totalDespesas = totalDespesasOperacionais + totalDespesasNaoOperacionais;
  const resultadoDeCaixa = totalReceitas + totalDespesas; // Despesas são negativas

  structure.push({
    id: 'resultado-de-caixa',
    name: 'Resultado de Caixa',
    level: 1,
    lineType: 'TOTAL',
    amount: resultadoDeCaixa,
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
  const sectionId = sectionName.toLowerCase().replace(/\s+/g, '-');
  const lines: DRELineData[] = [];
  let sectionTotal = 0;

  // Título da seção
  lines.push({
    id: `section-${sectionId}`,
    name: sectionName,
    level,
    lineType: 'HEADER',
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
      // Categoria sem pai - só mostra se não tem o mesmo nome da seção
      if (category.name !== sectionName) {
        lines.push({
          id: `${sectionId}-root-${categoryId}`,
          name: category.name,
          level: level + 1,
          lineType: 'DETAIL',
          amount: data.total,
          isBold: false,
          showInReport: true,
        });
      }
    }
  }

  // Adiciona categorias pai com filhos
  for (const [parentId, parentData] of parentCategories) {
    if (parentData.parent.name === sectionName) {
      // Se a categoria pai tem o mesmo nome da seção, mostra apenas as filhas
      for (const child of parentData.children) {
        lines.push({
          id: `${sectionId}-child-${child.category.id}`,
          name: child.category.name,
          level: level + 1,
          lineType: 'DETAIL',
          amount: child.total,
          isBold: false,
          showInReport: true,
        });
      }
    } else {
      // Categoria pai diferente da seção - mostra pai e filhas
      lines.push({
        id: `${sectionId}-parent-${parentId}`,
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
          id: `${sectionId}-child-${child.category.id}`,
          name: child.category.name,
          level: level + 2,
          lineType: 'DETAIL',
          amount: child.total,
          isBold: false,
          showInReport: true,
        });
      }
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

  const totalReceitasOperacionais =
    dre.find((line) => line.id === 'subtotal-receitas-operacionais')?.amount || 0;
  const totalReceitasNaoOperacionais =
    dre.find((line) => line.id === 'subtotal-receitas-nao-operacionais')?.amount || 0;
  const totalDespesasOperacionais =
    dre.find((line) => line.id === 'subtotal-despesas-operacionais')?.amount || 0;
  const totalDespesasNaoOperacionais =
    dre.find((line) => line.id === 'subtotal-despesas-nao-operacionais')?.amount || 0;
  const resultadoOperacional =
    dre.find((line) => line.id === 'resultado-operacional')?.amount || 0;
  const lucroOperacional =
    dre.find((line) => line.id === 'lucro-operacional')?.amount || 0;
  const resultadoDeCaixa =
    dre.find((line) => line.id === 'resultado-de-caixa')?.amount || 0;

  const totalReceitas = totalReceitasOperacionais + totalReceitasNaoOperacionais;
  const totalDespesas = totalDespesasOperacionais + totalDespesasNaoOperacionais;

  // Margem líquida (baseada no resultado de caixa)
  const margemLiquida =
    totalReceitas !== 0 ? (resultadoDeCaixa / totalReceitas) * 100 : 0;

  // Margem operacional (baseada no lucro operacional)
  const margemOperacional =
    totalReceitasOperacionais !== 0 ? (lucroOperacional / totalReceitasOperacionais) * 100 : 0;

  // Índice de despesas sobre receitas
  const indiceDespesas =
    totalReceitas !== 0 ? (Math.abs(totalDespesas) / totalReceitas) * 100 : 0;

  return {
    totalReceitas,
    totalReceitasOperacionais,
    totalReceitasNaoOperacionais,
    totalDespesas,
    totalDespesasOperacionais,
    totalDespesasNaoOperacionais,
    resultadoOperacional,
    lucroOperacional,
    resultadoDeCaixa,
    margemLiquida,
    margemOperacional,
    indiceDespesas,
    isLucrative: resultadoDeCaixa > 0,
  };
}
