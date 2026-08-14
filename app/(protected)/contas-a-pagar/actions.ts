'use server';

import { revalidatePath } from 'next/cache';
import { checkAuth } from '@/lib/core/auth/auth-helpers';
import { PayableError } from '@/lib/core/payables/errors';
import {
  createVendor,
  deactivateVendor,
  listVendors,
  updateVendor,
  type VendorInput,
} from '@/lib/core/database/vendors';
import {
  cancelPayable,
  createPayable,
  getPayableById,
  getPayableSummary,
  listAgendaInstallments,
  listInstallments,
  serializePayable,
  updatePayable,
  type CreatePayableInput,
  type ListInstallmentsParams,
  type UpdatePayableInput,
} from '@/lib/core/database/payables';
import {
  listMatchableDebits,
  reverseSettlement,
  settleInstallment,
  suggestInstallmentsForTransaction,
  type SettleInstallmentInput,
} from '@/lib/core/database/payable-settlements';
import {
  createRecurrence,
  generateDueRecurrences,
  generateRecurrenceForPeriod,
  listRecurrences,
  setRecurrenceActive,
  updateRecurrence,
  type RecurrenceInput,
} from '@/lib/core/database/payable-recurrences';
import {
  createPayableAttachment,
  deletePayableAttachment,
} from '@/lib/core/database/payable-attachments';
import { getFormBankAccounts, getFormCategories, getFormProperties } from '@/lib/core/database/form-data';
import { toNumber } from '@/lib/core/payables/money';
import { utcDateFromIso } from '@/lib/core/payables/dates';

function revalidatePayables() {
  revalidatePath('/contas-a-pagar');
  revalidatePath('/contas-a-pagar/agenda');
  revalidatePath('/contas-a-pagar/fornecedores');
  revalidatePath('/contas-a-pagar/recorrentes');
  revalidatePath('/transacoes');
}

function actionError(error: unknown): { success: false; error: string } {
  if (error instanceof PayableError) {
    return { success: false, error: error.message };
  }
  console.error(error);
  return { success: false, error: 'Erro inesperado' };
}

async function currentUserId() {
  const session = await checkAuth();
  return session.user.id;
}

export async function getPayablesFormData() {
  const [vendors, categories, properties, bankAccounts] = await Promise.all([
    listVendors({ isActive: true }),
    getFormCategories(),
    getFormProperties(),
    getFormBankAccounts(),
  ]);

  return {
    vendors: vendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      defaultCategoryId: vendor.defaultCategoryId,
      defaultPropertyId: vendor.defaultPropertyId,
    })),
    categories,
    properties,
    bankAccounts: bankAccounts.filter((account) => account.isActive),
  };
}

export async function listVendorsAction(search?: string) {
  return listVendors({ search });
}

export async function createVendorAction(input: VendorInput) {
  try {
    await checkAuth();
    const vendor = await createVendor(input);
    revalidatePayables();
    return { success: true as const, vendor };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateVendorAction(id: string, input: VendorInput) {
  try {
    await checkAuth();
    const vendor = await updateVendor(id, input);
    revalidatePayables();
    return { success: true as const, vendor };
  } catch (error) {
    return actionError(error);
  }
}

export async function deactivateVendorAction(id: string) {
  try {
    await checkAuth();
    await deactivateVendor(id);
    revalidatePayables();
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function listInstallmentsAction(params?: ListInstallmentsParams) {
  await generateDueRecurrences();
  return listInstallments(params);
}

export async function getPayableSummaryAction() {
  return getPayableSummary();
}

export async function getPayableAction(id: string) {
  const payable = await getPayableById(id);
  return payable ? serializePayable(payable) : null;
}

export async function createPayableAction(input: CreatePayableInput) {
  try {
    const userId = await currentUserId();
    const payable = await createPayable({ ...input, createdById: userId });
    revalidatePayables();
    return { success: true as const, id: payable.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updatePayableAction(id: string, input: UpdatePayableInput) {
  try {
    await checkAuth();
    await updatePayable(id, input);
    revalidatePayables();
    revalidatePath(`/contas-a-pagar/${id}`);
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function cancelPayableAction(id: string, reason?: string) {
  try {
    await checkAuth();
    await cancelPayable(id, reason);
    revalidatePayables();
    revalidatePath(`/contas-a-pagar/${id}`);
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function settleInstallmentAction(
  input: Omit<SettleInstallmentInput, 'createdById'>
) {
  try {
    const userId = await currentUserId();
    const result = await settleInstallment({ ...input, createdById: userId });
    revalidatePayables();
    if (result.payable) {
      revalidatePath(`/contas-a-pagar/${result.payable.id}`);
    }
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function reverseSettlementAction(id: string, reason?: string) {
  try {
    const userId = await currentUserId();
    const payable = await reverseSettlement(id, {
      reason,
      reversedById: userId,
    });
    revalidatePayables();
    if (payable) {
      revalidatePath(`/contas-a-pagar/${payable.id}`);
    }
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function listMatchableDebitsAction(amount: number, dueDate: string) {
  const rows = await listMatchableDebits({
    amount,
    dueDate: utcDateFromIso(dueDate),
  });
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    amount: toNumber(row.amount),
    bankAccountId: row.bankAccountId,
    bankAccountName: row.bankAccount.name,
  }));
}

export async function suggestInstallmentsForTransactionAction(
  amount: number,
  dateIso: string
) {
  const rows = await suggestInstallmentsForTransaction({
    amount,
    date: utcDateFromIso(dateIso),
  });
  return rows.map((row) => ({
    id: row.id,
    payableId: row.payableId,
    dueDate: row.dueDate,
    remainingAmount: toNumber(row.remainingAmount),
    description: row.payable.description,
    vendorName: row.payable.vendor.name,
    propertyCode: row.payable.property?.code ?? null,
  }));
}

export async function getAgendaAction(year: number, month: number) {
  await generateDueRecurrences(new Date(year, month - 1, 15));
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return listAgendaInstallments(from, to);
}

export async function listRecurrencesAction() {
  return listRecurrences();
}

export async function createRecurrenceAction(input: RecurrenceInput) {
  try {
    await checkAuth();
    await createRecurrence(input);
    revalidatePayables();
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateRecurrenceAction(id: string, input: RecurrenceInput) {
  try {
    await checkAuth();
    await updateRecurrence(id, input);
    revalidatePayables();
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function setRecurrenceActiveAction(id: string, isActive: boolean) {
  try {
    await checkAuth();
    await setRecurrenceActive(id, isActive);
    revalidatePayables();
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function generateRecurrenceAction(
  id: string,
  year: number,
  month: number
) {
  try {
    await checkAuth();
    const result = await generateRecurrenceForPeriod(id, year, month);
    revalidatePayables();
    return {
      success: true as const,
      created: result.created,
      payableId: result.payable?.id ?? null,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function uploadPayableAttachmentAction(formData: FormData) {
  try {
    const userId = await currentUserId();
    const payableId = String(formData.get('payableId') ?? '');
    const installmentId = String(formData.get('installmentId') ?? '') || null;
    const file = formData.get('file');
    if (!payableId || !(file instanceof File)) {
      return { success: false as const, error: 'Arquivo inválido' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await createPayableAttachment({
      payableId,
      installmentId,
      title: file.name,
      fileName: file.name,
      contentType: file.type || null,
      sizeBytes: file.size,
      body: buffer,
      purpose: 'SOURCE_DOCUMENT',
      createdById: userId,
    });
    revalidatePath(`/contas-a-pagar/${payableId}`);
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function deletePayableAttachmentAction(
  id: string,
  payableId: string
) {
  try {
    await checkAuth();
    await deletePayableAttachment(id);
    revalidatePath(`/contas-a-pagar/${payableId}`);
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}
