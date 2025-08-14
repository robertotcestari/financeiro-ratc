'use server';

import { accountSelectionService } from '@/lib/ofx/account-selection';
import type { CreateBankAccountData } from '@/lib/ofx/account-selection';

export async function validateAccountSelection(bankAccountId: string) {
  const result = await accountSelectionService.validateAccountSelection(bankAccountId);
  return result;
}

export async function createNewBankAccount(accountData: CreateBankAccountData) {
  const result = await accountSelectionService.createNewBankAccount(accountData);
  return result;
}

export async function getAllBankAccounts() {
  const accounts = await accountSelectionService.getAllBankAccounts();
  return accounts;
}