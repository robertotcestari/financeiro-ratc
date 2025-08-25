'use server';

import { prisma } from '@/lib/core/database/client';
import { Prisma } from '@/app/generated/prisma';

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