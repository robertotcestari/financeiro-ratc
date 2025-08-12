'use server';

import { generateDRE, DRELineData } from '@/lib/database/dre';
import { prisma } from '@/lib/database/client';

export interface DREMonthlyData {
  [key: string]: DRELineData[];
}

export interface DRERowData {
  id: string;
  name: string;
  level: number;
  lineType: 'DETAIL' | 'SUBTOTAL' | 'TOTAL' | 'SEPARATOR' | 'HEADER';
  isBold: boolean;
  monthlyAmounts: { [month: number]: number };
  total?: number;
}

export async function generateMonthlyDRE(year: number, months: number[]): Promise<{
  rows: DRERowData[];
  monthlyTotals: { [month: number]: { receitas: number; despesas: number; resultado: number; lucroOperacional: number } };
}> {
  // Generate DRE for each month
  const monthlyData: DREMonthlyData = {};
  
  for (const month of months) {
    const dreLines = await generateDRE(year, month);
    monthlyData[month] = dreLines;
  }

  // Calculate uncategorized transactions for each month
  const uncategorizedAmounts: { [month: number]: number } = {};
  for (const month of months) {
    const uncategorizedTransactions = await prisma.processedTransaction.findMany({
      where: {
        year,
        month,
        categoryId: null, // Apenas transações não categorizadas
      },
      include: {
        transaction: true,
      },
    });

    uncategorizedAmounts[month] = uncategorizedTransactions.reduce((total, transaction) => {
      if (transaction.transaction) {
        return total + Number(transaction.transaction.amount);
      }
      return total;
    }, 0);
  }

  // Check if we have any uncategorized amounts across all months
  const hasUncategorizedTransactions = Object.values(uncategorizedAmounts).some(amount => amount !== 0);

  // Combine all months into a unified structure
  const allLineNames = new Set<string>();
  Object.values(monthlyData).forEach(lines => {
    lines.forEach(line => allLineNames.add(line.name));
  });

  const rows: DRERowData[] = [];
  const monthlyTotals: { [month: number]: { receitas: number; despesas: number; resultado: number; lucroOperacional: number } } = {};

  // Initialize monthly totals
  months.forEach(month => {
    monthlyTotals[month] = { receitas: 0, despesas: 0, resultado: 0, lucroOperacional: 0 };
  });

  // Add uncategorized line first if there are uncategorized transactions
  if (hasUncategorizedTransactions) {
    const uncategorizedTotal = months.reduce((sum, month) => sum + uncategorizedAmounts[month], 0);
    
    rows.push({
      id: 'nao-categorizados',
      name: 'Não Categorizados',
      level: 1,
      lineType: 'DETAIL',
      isBold: true,
      monthlyAmounts: uncategorizedAmounts,
      total: months.length > 1 ? uncategorizedTotal : undefined
    });

    // Add separator after uncategorized line
    rows.push({
      id: 'separator-nao-categorizados',
      name: '',
      level: 0,
      lineType: 'SEPARATOR',
      isBold: false,
      monthlyAmounts: months.reduce((acc, month) => ({ ...acc, [month]: 0 }), {}),
      total: 0
    });
  }

  // Get the structure from the first month or create a default structure
  const firstMonthLines = monthlyData[months[0]] || [];
  
  for (const line of firstMonthLines) {
    const monthlyAmounts: { [month: number]: number } = {};
    let total = 0;
    
    // Get amounts for each month
    for (const month of months) {
      const monthData = monthlyData[month] || [];
      const monthLine = monthData.find(l => l.name === line.name);
      const amount = monthLine?.amount || 0;
      monthlyAmounts[month] = amount;
      total += amount;
      
      // Update monthly totals based on line type and name
      if (line.name === 'Total de Receitas Operacionais' || 
          line.name === 'Total de Receitas não Operacionais' ||
          (line.lineType === 'SUBTOTAL' && line.name.includes('Receitas'))) {
        monthlyTotals[month].receitas += amount;
      } else if (line.name === 'Total de Despesas Operacionais' || 
                 line.name === 'Total de Despesas não Operacionais' ||
                 (line.lineType === 'SUBTOTAL' && line.name.includes('Despesas'))) {
        monthlyTotals[month].despesas += amount;
      } else if (line.name === 'Lucro Operacional') {
        monthlyTotals[month].lucroOperacional = amount;
      } else if (line.name === 'Resultado de Caixa') {
        monthlyTotals[month].resultado = amount;
      }
    }
    
    rows.push({
      id: line.id,
      name: line.name,
      level: line.level,
      lineType: line.lineType,
      isBold: line.isBold,
      monthlyAmounts,
      total: months.length > 1 ? total : undefined
    });
  }

  return { rows, monthlyTotals };
}

export async function generateDREComparison(
  year1: number, 
  month1: number, 
  year2: number, 
  month2: number
) {
  const [dre1, dre2] = await Promise.all([
    generateDRE(year1, month1),
    generateDRE(year2, month2)
  ]);

  const comparison = [];
  const dre1Map = new Map(dre1.map(line => [line.name, line]));
  const dre2Map = new Map(dre2.map(line => [line.name, line]));
  
  const allLines = new Set([...dre1Map.keys(), ...dre2Map.keys()]);

  for (const lineName of allLines) {
    const line1 = dre1Map.get(lineName);
    const line2 = dre2Map.get(lineName);
    
    const amount1 = line1?.amount || 0;
    const amount2 = line2?.amount || 0;
    const variation = amount2 - amount1;
    const variationPercent = amount1 !== 0 ? (variation / Math.abs(amount1)) * 100 : 0;

    comparison.push({
      name: lineName,
      level: line1?.level || line2?.level || 1,
      lineType: line1?.lineType || line2?.lineType || 'DETAIL',
      period1: amount1,
      period2: amount2,
      variation,
      variationPercent,
      isBold: line1?.isBold || line2?.isBold || false
    });
  }

  return comparison;
}