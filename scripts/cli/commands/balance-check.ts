/**
 * Balance Check Command
 * Verifies that: Previous Month Balance + Cash Flow Result = Current Month Balance
 */

import { prisma } from '@/lib/core/database/client';
import {
  printHeader,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printJson,
  formatCurrency,
} from '../utils/output';

export interface BalanceCheckOptions {
  month?: string; // formato: YYYY-MM (month to check, defaults to previous month)
  json?: boolean;
}

interface MonthlyResult {
  month: string;
  cashFlowResult: number;
  transactionCount: number;
}

interface BalanceCheckResult {
  targetMonth: string;
  previousMonth: string;
  previousMonthBalance: number;
  cashFlowResult: number;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  isValid: boolean;
}

/**
 * Get the previous month in YYYY-MM format
 */
function getPreviousMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed, so this is already "previous" if we use current date

  if (month === 0) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Parse YYYY-MM string to start and end dates
 */
function parseMonth(monthStr: string): { start: Date; end: Date } {
  const [year, month] = monthStr.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Get the month before a given YYYY-MM string
 */
function getMonthBefore(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Calculate cash flow result for a specific month
 */
async function getMonthlyResult(monthStr: string): Promise<MonthlyResult> {
  const { start, end } = parseMonth(monthStr);

  const result = await prisma.transaction.aggregate({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    _sum: { amount: true },
    _count: true,
  });

  return {
    month: monthStr,
    cashFlowResult: result._sum.amount ? Number(result._sum.amount) : 0,
    transactionCount: result._count,
  };
}

/**
 * Calculate total balance up to end of a specific month
 */
async function getBalanceAtEndOfMonth(monthStr: string): Promise<number> {
  const { end } = parseMonth(monthStr);

  const result = await prisma.transaction.aggregate({
    where: {
      date: {
        lte: end,
      },
    },
    _sum: { amount: true },
  });

  return result._sum.amount ? Number(result._sum.amount) : 0;
}

/**
 * Run the balance check for a specific month
 */
export async function balanceCheck(options: BalanceCheckOptions = {}): Promise<void> {
  const targetMonth = options.month || getPreviousMonth();
  const previousMonth = getMonthBefore(targetMonth);

  // Get data
  const [previousBalance, monthlyResult, actualBalance] = await Promise.all([
    getBalanceAtEndOfMonth(previousMonth),
    getMonthlyResult(targetMonth),
    getBalanceAtEndOfMonth(targetMonth),
  ]);

  const expectedBalance = previousBalance + monthlyResult.cashFlowResult;
  const difference = Math.abs(actualBalance - expectedBalance);
  const isValid = difference < 0.01; // Allow for floating point errors

  const result: BalanceCheckResult = {
    targetMonth,
    previousMonth,
    previousMonthBalance: previousBalance,
    cashFlowResult: monthlyResult.cashFlowResult,
    expectedBalance,
    actualBalance,
    difference,
    isValid,
  };

  if (options.json) {
    printJson(result);
    return;
  }

  printHeader(`Verificação de Saldo - ${targetMonth}`);
  console.log('');

  console.log('  Equação: Saldo Anterior + Resultado = Saldo Atual');
  console.log('');
  console.log(`  Saldo ${previousMonth}:       ${formatCurrency(previousBalance)}`);
  console.log(`  Resultado ${targetMonth}:     ${formatCurrency(monthlyResult.cashFlowResult)}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Esperado:                ${formatCurrency(expectedBalance)}`);
  console.log(`  Atual:                   ${formatCurrency(actualBalance)}`);
  console.log('');

  if (isValid) {
    printSuccess(`✓ Saldo verificado! A equação está correta.`);
  } else {
    printError(`✗ Diferença encontrada: ${formatCurrency(difference)}`);
    printWarning('Possíveis causas:');
    console.log('  - Transações faltando em um dos meses');
    console.log('  - Transações duplicadas');
    console.log('  - Importação incompleta');
  }

  console.log('');
  printInfo(`Transações em ${targetMonth}: ${monthlyResult.transactionCount}`);
}
