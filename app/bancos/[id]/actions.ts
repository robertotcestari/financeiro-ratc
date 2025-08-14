'use server'

import { prisma } from '@/lib/database/client'
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