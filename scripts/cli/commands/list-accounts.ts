/**
 * List Accounts Command
 * Lists all available bank accounts
 */

import { prisma } from '@/lib/core/database/client';
import { printHeader, printTable, printJson, printWarning } from '../utils/output';

export interface ListAccountsOptions {
  json?: boolean;
  all?: boolean;
}

export async function listAccounts(options: ListAccountsOptions = {}): Promise<void> {
  const accounts = await prisma.bankAccount.findMany({
    where: options.all ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });

  if (accounts.length === 0) {
    printWarning('Nenhuma conta bancaria encontrada.');
    return;
  }

  if (options.json) {
    printJson(accounts);
    return;
  }

  printHeader('Contas Bancarias');

  const headers = ['ID', 'Nome', 'Tipo', 'Banco', 'Status'];
  const rows = accounts.map((acc) => [
    acc.id.slice(0, 8) + '...',
    acc.name,
    acc.type,
    acc.bank || '-',
    acc.isActive ? 'Ativa' : 'Inativa',
  ]);

  printTable(headers, rows);

  console.log(`\nTotal: ${accounts.length} conta(s)`);
}

/**
 * Find a bank account by name or ID
 */
export async function findBankAccount(nameOrId: string): Promise<{
  id: string;
  name: string;
  type: string;
  bank: string | null;
  isActive: boolean;
} | null> {
  // Try to find by exact ID first
  let account = await prisma.bankAccount.findUnique({
    where: { id: nameOrId },
  });

  if (account) return account;

  // Try to find by name (case-insensitive contains)
  account = await prisma.bankAccount.findFirst({
    where: {
      name: { contains: nameOrId },
      isActive: true,
    },
  });

  return account;
}

/**
 * Get all active bank accounts
 */
export async function getActiveBankAccounts(): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    bank: string | null;
  }>
> {
  return prisma.bankAccount.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      bank: true,
    },
    orderBy: { name: 'asc' },
  });
}
