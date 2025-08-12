'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  categorizeTransaction,
  bulkCategorizeTransactions,
} from '@/lib/database/categorization';
import { findPotentialTransfers } from '@/lib/database/transactions';
import { prisma } from '@/lib/database/client';

const categorizeOneSchema = z.object({
  id: z.string(),
  categoryId: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  markReviewed: z.boolean().optional(),
});

export async function categorizeOneAction(
  input: z.infer<typeof categorizeOneSchema>
) {
  const validated = categorizeOneSchema.parse(input);

  try {
    await categorizeTransaction(
      validated.id,
      validated.categoryId ?? null,
      validated.propertyId ?? null
    );

    if (validated.markReviewed) {
      await prisma.processedTransaction.update({
        where: { id: validated.id },
        data: { isReviewed: true },
      });
    }

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in categorizeOneAction:', error);
    return { success: false, error: 'Failed to categorize transaction' };
  }
}

const bulkCategorizeSchema = z.object({
  ids: z.array(z.string()),
  categoryId: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  markReviewed: z.boolean().optional(),
});

export async function bulkCategorizeAction(
  input: z.infer<typeof bulkCategorizeSchema>
) {
  const validated = bulkCategorizeSchema.parse(input);

  try {
    await bulkCategorizeTransactions(
      validated.ids,
      validated.categoryId ?? null,
      validated.propertyId ?? null
    );

    if (validated.markReviewed) {
      await prisma.processedTransaction.updateMany({
        where: { id: { in: validated.ids } },
        data: { isReviewed: true },
      });
    }

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in bulkCategorizeAction:', error);
    return { success: false, error: 'Failed to categorize transactions' };
  }
}

const markReviewedSchema = z.object({
  id: z.string(),
  reviewed: z.boolean(),
  note: z.string().optional(),
});

export async function markReviewedAction(
  input: z.infer<typeof markReviewedSchema>
) {
  const validated = markReviewedSchema.parse(input);

  try {
    const updateData: { isReviewed: boolean; notes?: string } = {
      isReviewed: validated.reviewed,
    };

    if (validated.note) {
      const transaction = await prisma.processedTransaction.findUnique({
        where: { id: validated.id },
        select: { notes: true },
      });

      const timestamp = new Date().toISOString();
      const noteWithTimestamp = `[${timestamp}] ${validated.note}`;

      updateData.notes = transaction?.notes
        ? `${transaction.notes}\n${noteWithTimestamp}`
        : noteWithTimestamp;
    }

    await prisma.processedTransaction.update({
      where: { id: validated.id },
      data: updateData,
    });

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in markReviewedAction:', error);
    return { success: false, error: 'Failed to mark as reviewed' };
  }
}

const potentialTransfersSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export async function potentialTransfersAction(
  input: z.infer<typeof potentialTransfersSchema>
) {
  const validated = potentialTransfersSchema.parse(input);

  try {
    const transfers = await findPotentialTransfers({
      start: new Date(validated.start),
      end: new Date(validated.end),
    });
    return { success: true, transfers };
  } catch (error) {
    console.error('Error in potentialTransfersAction:', error);
    return {
      success: false,
      error: 'Failed to find potential transfers',
      transfers: [],
    };
  }
}

const confirmTransferSchema = z.object({
  originTransactionId: z.string(),
  destinationTransactionId: z.string(),
  description: z.string().optional(),
});

export async function confirmTransferAction(
  input: z.infer<typeof confirmTransferSchema>
) {
  const validated = confirmTransferSchema.parse(input);

  try {
    // Buscar as transações processadas e garantir vínculo com transações bancárias
    const originProcessed = await prisma.processedTransaction.findUnique({
      where: { id: validated.originTransactionId },
      include: { transaction: true },
    });

    const destProcessed = await prisma.processedTransaction.findUnique({
      where: { id: validated.destinationTransactionId },
      include: { transaction: true },
    });

    if (!originProcessed || !destProcessed) {
      throw new Error('Transactions not found');
    }

    // Ensure both ProcessedTransactions are linked to raw Transactions
    if (
      !originProcessed.transaction ||
      !destProcessed.transaction ||
      !originProcessed.transactionId ||
      !destProcessed.transactionId
    ) {
      throw new Error(
        'Linked raw transactions are required to confirm transfer'
      );
    }

    // Localiza uma categoria do tipo TRANSFER
    const transferCategory = await prisma.category.findFirst({
      where: { type: 'TRANSFER' as const },
      select: { id: true },
    });

    if (!transferCategory) {
      throw new Error('Transfer category not found');
    }

    // Marca ambos como categoria de Transferência e como revisados
    await prisma.processedTransaction.updateMany({
      where: {
        id: {
          in: [
            validated.originTransactionId,
            validated.destinationTransactionId,
          ],
        },
      },
      data: {
        categoryId: transferCategory.id,
        isReviewed: true,
      },
    });

    // Opcional: adicionar uma anotação com a descrição (mantém notas existentes)
    if (validated.description && validated.description.trim().length > 0) {
      const timestamp = new Date().toISOString();
      const noteWithTimestamp = `[${timestamp}] ${validated.description.trim()}`;

      const affected = await prisma.processedTransaction.findMany({
        where: {
          id: {
            in: [
              validated.originTransactionId,
              validated.destinationTransactionId,
            ],
          },
        },
        select: { id: true, notes: true },
      });

      for (const t of affected) {
        await prisma.processedTransaction.update({
          where: { id: t.id },
          data: {
            notes: t.notes
              ? `${t.notes}\n${noteWithTimestamp}`
              : noteWithTimestamp,
          },
        });
      }
    }

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in confirmTransferAction:', error);
    return { success: false, error: 'Failed to confirm transfer' };
  }
}
