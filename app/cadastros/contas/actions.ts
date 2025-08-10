'use server';

import { PrismaClient, AccountType } from '@/app/generated/prisma';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export interface BankAccountFormData {
  name: string;
  bankName: string;
  accountType: AccountType;
  isActive: boolean;
}

export async function getBankAccounts() {
  try {
    const accounts = await prisma.bankAccount.findMany({
      orderBy: [{ isActive: 'desc' }, { bankName: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    return accounts;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getBankAccount(id: string) {
  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id },
    });

    return account;
  } finally {
    await prisma.$disconnect();
  }
}

export async function createBankAccount(data: BankAccountFormData) {
  try {
    const account = await prisma.bankAccount.create({
      data,
    });

    revalidatePath('/cadastros/contas');
    return { success: true, account };
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return { success: false, error: 'Já existe uma conta com esse nome' };
    }
    return { success: false, error: 'Erro ao criar conta bancária' };
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateBankAccount(id: string, data: BankAccountFormData) {
  try {
    const account = await prisma.bankAccount.update({
      where: { id },
      data,
    });

    revalidatePath('/cadastros/contas');
    return { success: true, account };
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return { success: false, error: 'Já existe uma conta com esse nome' };
    }
    return { success: false, error: 'Erro ao atualizar conta bancária' };
  } finally {
    await prisma.$disconnect();
  }
}

export async function deleteBankAccount(id: string) {
  try {
    // Verificar se há transações associadas
    const transactionCount = await prisma.transaction.count({
      where: { bankAccountId: id },
    });

    if (transactionCount > 0) {
      return {
        success: false,
        error: `Não é possível excluir. Existem ${transactionCount} transações associadas a esta conta.`,
      };
    }

    await prisma.bankAccount.delete({
      where: { id },
    });

    revalidatePath('/cadastros/contas');
    return { success: true };
  } catch {
    return { success: false, error: 'Erro ao excluir conta bancária' };
  } finally {
    await prisma.$disconnect();
  }
}
