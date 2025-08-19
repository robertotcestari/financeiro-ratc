'use server';

import { AccountType } from '@/app/generated/prisma';
import { prisma } from '@/lib/core/database/client';
import { revalidatePath } from 'next/cache';

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
  } catch (error) {
    console.error('Erro ao buscar contas bancárias:', error);
    throw error;
  }
}

export async function getBankAccount(id: string) {
  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id },
    });

    return account;
  } catch (error) {
    console.error('Erro ao buscar conta bancária:', error);
    throw error;
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
  }
}
