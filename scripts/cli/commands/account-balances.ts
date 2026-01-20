/**
 * Account Balances Command
 * Lists balances and last transaction date per account
 */

import { prisma } from '@/lib/core/database/client';
import {
  printHeader,
  printTable,
  printJson,
  printWarning,
  printInfo,
  formatCurrency,
  formatDate,
} from '../utils/output';

export interface ListAccountBalancesOptions {
  json?: boolean;
  all?: boolean;
}

export async function listAccountBalances(
  options: ListAccountBalancesOptions = {}
): Promise<void> {
  const accounts = await prisma.bankAccount.findMany({
    where: options.all ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });

  if (accounts.length === 0) {
    printWarning('Nenhuma conta bancaria encontrada.');
    return;
  }

  const results = [];
  for (const account of accounts) {
    // Get last transaction date
    const lastTransaction = await prisma.transaction.findFirst({
      where: { bankAccountId: account.id },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });

    // Calculate actual balance by summing all transactions
    const balanceAgg = await prisma.transaction.aggregate({
      where: { bankAccountId: account.id },
      _sum: { amount: true },
      _count: true,
    });

    const calculatedBalance = balanceAgg._sum.amount
      ? Number(balanceAgg._sum.amount)
      : 0;
    const transactionCount = balanceAgg._count;

    results.push({
      bankAccountId: account.id,
      accountName: account.name,
      bankName: account.bank || '-',
      balance: calculatedBalance,
      transactionCount,
      lastTransactionDate: lastTransaction?.date ?? null,
    });
  }

  if (options.json) {
    printJson(results);
    return;
  }

  printHeader('Saldos por Conta');
  const headers = ['Conta', 'Banco', 'Saldo', 'Transacoes', 'Ultima transacao'];
  const rows = results.map((row) => [
    row.accountName,
    row.bankName,
    formatCurrency(row.balance),
    row.transactionCount.toString(),
    row.lastTransactionDate ? formatDate(row.lastTransactionDate) : '-',
  ]);
  printTable(headers, rows);
  printInfo(`Total: ${results.length} conta(s)`);
}
