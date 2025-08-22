'use server'

import { prisma } from '@/lib/core/database/client'
import { revalidatePath } from 'next/cache'

export async function processUnprocessedTransactions(bankAccountId: string) {
  try {
    // Find all unprocessed transactions for this bank account
    const unprocessedTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId,
        processedTransaction: null
      }
    })

    if (unprocessedTransactions.length === 0) {
      return { 
        success: true, 
        processedCount: 0,
        message: 'Nenhuma transação não processada encontrada'
      }
    }

    // Create ProcessedTransaction records for each unprocessed transaction
    const processedTransactions = await Promise.all(
      unprocessedTransactions.map(transaction => 
        prisma.processedTransaction.create({
          data: {
            transactionId: transaction.id,
            year: transaction.date.getFullYear(),
            month: transaction.date.getMonth() + 1,
            // categoryId and propertyId will be null initially
            categoryId: null,
            propertyId: null,
          }
        })
      )
    )

    // Revalidate the page to show updated data
    revalidatePath(`/bancos/${bankAccountId}`)

    return { 
      success: true, 
      processedCount: processedTransactions.length,
      message: `${processedTransactions.length} transações processadas com sucesso`
    }
  } catch (error) {
    console.error('Erro ao processar transações:', error)
    return { 
      success: false, 
      processedCount: 0,
      error: error instanceof Error ? error.message : 'Erro ao processar transações'
    }
  }
}

export async function processTransaction(transactionId: string) {
  try {
    // Check if transaction exists and is not already processed
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        processedTransaction: true
      }
    })

    if (!transaction) {
      throw new Error('Transação não encontrada')
    }

    if (transaction.processedTransaction) {
      throw new Error('Transação já foi processada')
    }

    // Create ProcessedTransaction record
    const processedTransaction = await prisma.processedTransaction.create({
      data: {
        transactionId: transaction.id,
        year: transaction.date.getFullYear(),
        month: transaction.date.getMonth() + 1,
        categoryId: null,
        propertyId: null,
      }
    })

    // Revalidate the page
    revalidatePath(`/bancos/${transaction.bankAccountId}`)

    return { 
      success: true, 
      processedTransactionId: processedTransaction.id 
    }
  } catch (error) {
    console.error('Erro ao processar transação:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao processar transação'
    }
  }
}

export async function deleteTransactions(transactionIds: string[], bankAccountId: string) {
  try {
    if (!transactionIds || transactionIds.length === 0) {
      return {
        success: false,
        error: 'Nenhuma transação selecionada'
      }
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // First, delete related ProcessedTransaction records
      const deletedProcessed = await tx.processedTransaction.deleteMany({
        where: {
          transactionId: {
            in: transactionIds
          }
        }
      })

      // Then delete the transactions themselves
      const deletedTransactions = await tx.transaction.deleteMany({
        where: {
          id: {
            in: transactionIds
          },
          bankAccountId: bankAccountId // Extra safety check
        }
      })

      return {
        deletedTransactions: deletedTransactions.count,
        deletedProcessed: deletedProcessed.count
      }
    })

    // Revalidate the page to show updated data
    revalidatePath(`/bancos/${bankAccountId}`)

    return {
      success: true,
      deletedCount: result.deletedTransactions,
      message: `${result.deletedTransactions} transações removidas com sucesso`
    }
  } catch (error) {
    console.error('Erro ao deletar transações:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao deletar transações'
    }
  }
}

export async function updateTransactionAction(
  transactionId: string,
  description: string,
  amount: number,
  bankAccountId: string
) {
  try {
    // Validate inputs
    if (!transactionId || !bankAccountId) {
      return {
        success: false,
        error: 'ID da transação ou conta bancária inválido'
      }
    }

    if (!description || description.trim().length === 0) {
      return {
        success: false,
        error: 'Descrição não pode estar vazia'
      }
    }

    if (isNaN(amount) || amount === 0) {
      return {
        success: false,
        error: 'Valor inválido'
      }
    }

    // Update the transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { 
        id: transactionId,
        bankAccountId: bankAccountId // Extra safety check
      },
      data: {
        description: description.trim(),
        amount: amount
      }
    })

    // Revalidate the page to show updated data
    revalidatePath(`/bancos/${bankAccountId}`)

    return {
      success: true,
      transaction: updatedTransaction,
      message: 'Transação atualizada com sucesso'
    }
  } catch (error) {
    console.error('Erro ao atualizar transação:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar transação'
    }
  }
}