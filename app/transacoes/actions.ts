"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { 
  categorizeTransaction, 
  bulkCategorizeTransactions
} from "@/lib/database/categorization"
import { findPotentialTransfers } from "@/lib/database/transactions"
import { prisma } from "@/lib/database/client"

const categorizeOneSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  propertyId: z.string().optional(),
  markReviewed: z.boolean().optional()
})

export async function categorizeOneAction(input: z.infer<typeof categorizeOneSchema>) {
  const validated = categorizeOneSchema.parse(input)
  
  try {
    await categorizeTransaction(
      validated.id,
      validated.categoryId,
      validated.propertyId
    )
    
    if (validated.markReviewed) {
      await prisma.unifiedTransaction.update({
        where: { id: validated.id },
        data: { isReviewed: true }
      })
    }
    
    try {
      revalidatePath("/transacoes")
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn("Revalidation error (non-critical):", revalidateError)
    }
    return { success: true }
  } catch (error) {
    console.error("Error in categorizeOneAction:", error)
    return { success: false, error: "Failed to categorize transaction" }
  }
}

const bulkCategorizeSchema = z.object({
  ids: z.array(z.string()),
  categoryId: z.string(),
  propertyId: z.string().optional(),
  markReviewed: z.boolean().optional()
})

export async function bulkCategorizeAction(input: z.infer<typeof bulkCategorizeSchema>) {
  const validated = bulkCategorizeSchema.parse(input)
  
  try {
    await bulkCategorizeTransactions(
      validated.ids,
      validated.categoryId,
      validated.propertyId
    )
    
    if (validated.markReviewed) {
      await prisma.unifiedTransaction.updateMany({
        where: { id: { in: validated.ids } },
        data: { isReviewed: true }
      })
    }
    
    try {
      revalidatePath("/transacoes")
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn("Revalidation error (non-critical):", revalidateError)
    }
    return { success: true }
  } catch (error) {
    console.error("Error in bulkCategorizeAction:", error)
    return { success: false, error: "Failed to categorize transactions" }
  }
}

const markReviewedSchema = z.object({
  id: z.string(),
  reviewed: z.boolean(),
  note: z.string().optional()
})

export async function markReviewedAction(input: z.infer<typeof markReviewedSchema>) {
  const validated = markReviewedSchema.parse(input)
  
  try {
    const updateData: { isReviewed: boolean; notes?: string } = { isReviewed: validated.reviewed }
    
    if (validated.note) {
      const transaction = await prisma.unifiedTransaction.findUnique({
        where: { id: validated.id },
        select: { notes: true }
      })
      
      const timestamp = new Date().toISOString()
      const noteWithTimestamp = `[${timestamp}] ${validated.note}`
      
      updateData.notes = transaction?.notes 
        ? `${transaction.notes}\n${noteWithTimestamp}`
        : noteWithTimestamp
    }
    
    await prisma.unifiedTransaction.update({
      where: { id: validated.id },
      data: updateData
    })
    
    try {
      revalidatePath("/transacoes")
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn("Revalidation error (non-critical):", revalidateError)
    }
    return { success: true }
  } catch (error) {
    console.error("Error in markReviewedAction:", error)
    return { success: false, error: "Failed to mark as reviewed" }
  }
}



const potentialTransfersSchema = z.object({
  start: z.string(),
  end: z.string()
})

export async function potentialTransfersAction(input: z.infer<typeof potentialTransfersSchema>) {
  const validated = potentialTransfersSchema.parse(input)
  
  try {
    const transfers = await findPotentialTransfers({
      start: new Date(validated.start),
      end: new Date(validated.end)
    })
    return { success: true, transfers }
  } catch (error) {
    console.error("Error in potentialTransfersAction:", error)
    return { success: false, error: "Failed to find potential transfers", transfers: [] }
  }
}

const confirmTransferSchema = z.object({
  originTransactionId: z.string(),
  destinationTransactionId: z.string(),
  description: z.string().optional()
})

export async function confirmTransferAction(input: z.infer<typeof confirmTransferSchema>) {
  const validated = confirmTransferSchema.parse(input)
  
  try {
    // Buscar as transações raw para criar o transfer correto
    const originUnified = await prisma.unifiedTransaction.findUnique({
      where: { id: validated.originTransactionId },
      include: { transaction: true }
    })
    
    const destUnified = await prisma.unifiedTransaction.findUnique({
      where: { id: validated.destinationTransactionId }, 
      include: { transaction: true }
    })
    
    if (!originUnified || !destUnified) {
      throw new Error("Transactions not found")
    }
    
    const existingTransfer = await prisma.transfer.findFirst({
      where: {
        OR: [
          { originTransactionId: originUnified.transactionId },
          { destinationTransactionId: destUnified.transactionId }
        ]
      }
    })
    
    if (existingTransfer) {
      await prisma.transfer.update({
        where: { id: existingTransfer.id },
        data: {
          originTransactionId: originUnified.transactionId,
          destinationTransactionId: destUnified.transactionId,
          description: validated.description || existingTransfer.description,
          isComplete: true
        }
      })
    } else {
      await prisma.transfer.create({
        data: {
          originTransactionId: originUnified.transactionId,
          destinationTransactionId: destUnified.transactionId,
          originAccountId: originUnified.transaction.bankAccountId,
          destinationAccountId: destUnified.transaction.bankAccountId,
          amount: Math.abs(Number(originUnified.transaction.amount)),
          date: originUnified.transaction.date,
          description: validated.description || "Transferência entre contas",
          isComplete: true
        }
      })
    }
    
    await prisma.unifiedTransaction.updateMany({
      where: {
        id: { in: [validated.originTransactionId, validated.destinationTransactionId] }
      },
      data: { isTransfer: true }
    })
    
    try {
      revalidatePath("/transacoes")
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn("Revalidation error (non-critical):", revalidateError)
    }
    return { success: true }
  } catch (error) {
    console.error("Error in confirmTransferAction:", error)
    return { success: false, error: "Failed to confirm transfer" }
  }
}