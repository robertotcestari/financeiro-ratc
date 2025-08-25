'use server';

import { prisma } from '@/lib/core/database/client';
import { Prisma } from '@/app/generated/prisma';
import { getImobziPendingInvoices, markInvoiceAsPaid, type ImobziInvoiceFormatted } from '@/lib/features/imobzi/invoices';

interface RentFilters {
  month?: number;
  year?: number;
}

export async function getRentTransactions(filters: RentFilters) {
  const where: Prisma.ProcessedTransactionWhereInput = {
    category: {
      OR: [
        { name: { equals: 'Aluguel' } },
        { name: { equals: 'Aluguel de Terceiros' } }
      ]
    }
  };

  if (filters.year) {
    where.year = filters.year;
  }

  if (filters.month) {
    where.month = filters.month;
  }

  const transactions = await prisma.processedTransaction.findMany({
    where,
    include: {
      transaction: {
        include: {
          bankAccount: true
        }
      },
      category: {
        include: {
          parent: true
        }
      },
      property: true
    },
    orderBy: [
      { transaction: { date: 'asc' } },
      { transaction: { id: 'asc' } }
    ]
  });

  return transactions.map(t => ({
    id: t.id,
    date: t.transaction?.date || new Date(),
    property: t.property ? `${t.property.code} - ${t.property.city}` : t.details || 'N/A',
    description: t.transaction?.description || t.details || '',
    amount: Number(t.transaction?.amount || 0),
    bankAccount: t.transaction?.bankAccount?.name || 'N/A',
    category: t.category?.name || 'N/A'
  }));
}

export async function getRentStats(filters: RentFilters) {
  const currentWhere: Prisma.ProcessedTransactionWhereInput = {
    category: {
      OR: [
        { name: { equals: 'Aluguel' } },
        { name: { equals: 'Aluguel de Terceiros' } }
      ]
    }
  };

  if (filters.year) {
    currentWhere.year = filters.year;
  }

  if (filters.month) {
    currentWhere.month = filters.month;
  }

  // Buscar transações do período atual
  const currentTransactions = await prisma.processedTransaction.findMany({
    where: currentWhere,
    include: {
      transaction: true
    }
  });

  // Calcular estatísticas do período atual
  const totalAmount = currentTransactions.reduce((sum, t) => 
    sum + Number(t.transaction?.amount || 0), 0
  );
  const count = currentTransactions.length;
  const average = count > 0 ? totalAmount / count : 0;

  // Buscar transações do mês anterior para comparação
  let previousMonth = filters.month || new Date().getMonth() + 1;
  let previousYear = filters.year || new Date().getFullYear();
  
  if (previousMonth === 1) {
    previousMonth = 12;
    previousYear -= 1;
  } else {
    previousMonth -= 1;
  }

  const previousWhere: Prisma.ProcessedTransactionWhereInput = {
    category: {
      OR: [
        { name: { equals: 'Aluguel' } },
        { name: { equals: 'Aluguel de Terceiros' } }
      ]
    },
    year: previousYear,
    month: previousMonth
  };

  const previousTransactions = await prisma.processedTransaction.findMany({
    where: previousWhere,
    include: {
      transaction: true
    }
  });

  const previousTotal = previousTransactions.reduce((sum, t) => 
    sum + Number(t.transaction?.amount || 0), 0
  );

  const percentageChange = previousTotal > 0 
    ? ((totalAmount - previousTotal) / previousTotal) * 100 
    : 0;

  // Calcular média dos últimos 3 meses
  const last3MonthsData = [];
  let tempMonth = filters.month || new Date().getMonth() + 1;
  let tempYear = filters.year || new Date().getFullYear();
  
  for (let i = 1; i <= 3; i++) {
    tempMonth--;
    if (tempMonth < 1) {
      tempMonth = 12;
      tempYear--;
    }
    
    const monthWhere: Prisma.ProcessedTransactionWhereInput = {
      category: {
        OR: [
          { name: { equals: 'Aluguel' } },
          { name: { equals: 'Aluguel de Terceiros' } }
        ]
      },
      year: tempYear,
      month: tempMonth
    };
    
    const monthTransactions = await prisma.processedTransaction.findMany({
      where: monthWhere,
      include: {
        transaction: true
      }
    });
    
    const monthTotal = monthTransactions.reduce((sum, t) => 
      sum + Number(t.transaction?.amount || 0), 0
    );
    
    last3MonthsData.push(monthTotal);
  }
  
  const last3MonthsAverage = last3MonthsData.reduce((sum, val) => sum + val, 0) / 3;
  const percentageChangeLast3Months = last3MonthsAverage > 0 
    ? ((totalAmount - last3MonthsAverage) / last3MonthsAverage) * 100 
    : 0;

  return {
    totalAmount,
    count,
    average,
    previousTotal,
    percentageChange,
    previousMonth,
    previousYear,
    last3MonthsAverage,
    percentageChangeLast3Months
  };
}

export async function getImobziPendingRents(filters: RentFilters): Promise<ImobziInvoiceFormatted[]> {
  try {
    const month = filters.month || new Date().getMonth() + 1;
    const year = filters.year || new Date().getFullYear();
    
    const invoices = await getImobziPendingInvoices(month, year);
    return invoices;
  } catch (error) {
    console.error('Error fetching Imobzi pending rents:', error);
    // Return empty array on error to allow the page to still render
    return [];
  }
}

export async function markImobziInvoiceAsPaid(
  invoiceId: string,
  paidDate: string,
  invoiceData: ImobziInvoiceFormatted
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await markInvoiceAsPaid(invoiceId, paidDate, invoiceData);
    return result;
  } catch (error) {
    console.error('Error marking Imobzi invoice as paid:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao processar quitação',
    };
  }
}

// Helper function to normalize text for matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ') // Keep only alphanumeric and spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

export interface TransactionMatch {
  invoiceId: string;
  transactionId: string;
  transactionDate: Date;
  transactionDescription: string;
  transactionAmount: number;
  matchedBy: string[]; // What matched (e.g., ["inquilino: herbicat", "propriedade: said tuma"])
}

export async function findTextMatches(
  month: number,
  year: number
): Promise<TransactionMatch[]> {
  // Get both rent transactions and pending invoices
  const [transactions, invoices] = await Promise.all([
    getRentTransactions({ month, year }),
    getImobziPendingRents({ month, year })
  ]);

  const matches: TransactionMatch[] = [];

  // For each invoice, try to find matching transactions
  for (const invoice of invoices) {
    const invoiceTenantNorm = normalizeText(invoice.tenantName);
    const invoicePropertyNorm = normalizeText(invoice.propertyName);
    
    // Extract key parts from property name (street name, number)
    const propertyParts = invoicePropertyNorm.split(' ').filter(part => 
      part.length > 2 && !['rua', 'avenida', 'av', 'apartamento', 'ap', 'sala'].includes(part)
    );

    for (const transaction of transactions) {
      const transDescNorm = normalizeText(transaction.description);
      const transPropNorm = normalizeText(transaction.property);
      const matchedBy: string[] = [];

      // Check tenant name match
      if (invoiceTenantNorm.length > 3) {
        // Split tenant name into words and check if any significant word matches
        const tenantWords = invoiceTenantNorm.split(' ').filter(w => w.length > 3);
        for (const word of tenantWords) {
          if (transDescNorm.includes(word) || transPropNorm.includes(word)) {
            matchedBy.push(`inquilino: ${word}`);
            break;
          }
        }
      }

      // Check property match
      for (const part of propertyParts) {
        if (transDescNorm.includes(part) || transPropNorm.includes(part)) {
          matchedBy.push(`propriedade: ${part}`);
          break;
        }
      }

      // If we found any match, add to results
      if (matchedBy.length > 0) {
        matches.push({
          invoiceId: invoice.id,
          transactionId: transaction.id,
          transactionDate: transaction.date,
          transactionDescription: transaction.description,
          transactionAmount: transaction.amount,
          matchedBy
        });
        break; // Only one match per invoice
      }
    }
  }

  return matches;
}