import { describe, it, expect } from 'vitest';

type Transaction = {
  id: string;
  description: string;
  amount: number;
  isProcessed: boolean;
  ofxTransId: string;
};

type FilterType = 'all' | 'income' | 'expense' | 'unprocessed';

describe('Select Filters Logic', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      description: 'Supermercado Extra',
      amount: -150.50,
      isProcessed: true,
      ofxTransId: 'TXN001',
    },
    {
      id: '2',
      description: 'Salário Empresa XYZ',
      amount: 2500.00,
      isProcessed: true,
      ofxTransId: 'TXN002',
    },
    {
      id: '3',
      description: 'Conta de Luz',
      amount: -89.90,
      isProcessed: false,
      ofxTransId: 'TXN003',
    },
    {
      id: '4',
      description: 'Transferência PIX',
      amount: 300.00,
      isProcessed: true,
      ofxTransId: 'TXN004',
    },
    {
      id: '5',
      description: 'Farmácia Drogasil',
      amount: -45.75,
      isProcessed: false,
      ofxTransId: 'TXN005',
    },
    {
      id: '6',
      description: 'Aluguel',
      amount: -800.00,
      isProcessed: true,
      ofxTransId: 'TXN006',
    },
    {
      id: '7',
      description: 'Freelance',
      amount: 1200.00,
      isProcessed: false,
      ofxTransId: 'TXN007',
    },
  ];

  // Simulate the filtering logic from TransactionList
  const filterTransactionsByType = (transactions: Transaction[], filterType: FilterType) => {
    let filtered = transactions;

    if (filterType === 'income') {
      filtered = transactions.filter((t) => t.amount > 0);
    } else if (filterType === 'expense') {
      filtered = transactions.filter((t) => t.amount < 0);
    } else if (filterType === 'unprocessed') {
      filtered = transactions.filter((t) => !t.isProcessed);
    }
    // filterType === 'all' returns all transactions

    return filtered;
  };

  describe('Filter: All', () => {
    it('should show all transactions when filter is "all"', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'all');
      expect(filtered).toHaveLength(7);
      expect(filtered.map(t => t.id)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    });

    it('should include both income and expense transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'all');
      const incomeTransactions = filtered.filter(t => t.amount > 0);
      const expenseTransactions = filtered.filter(t => t.amount < 0);

      expect(incomeTransactions).toHaveLength(3); // 2500, 300, 1200
      expect(expenseTransactions).toHaveLength(4); // -150.50, -89.90, -45.75, -800
    });

    it('should include both processed and unprocessed transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'all');
      const processedTransactions = filtered.filter(t => t.isProcessed);
      const unprocessedTransactions = filtered.filter(t => !t.isProcessed);

      expect(processedTransactions).toHaveLength(4); // 1, 2, 4, 6
      expect(unprocessedTransactions).toHaveLength(3); // 3, 5, 7
    });
  });

  describe('Filter: Income', () => {
    it('should show only positive amount transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'income');
      expect(filtered).toHaveLength(3);

      filtered.forEach(transaction => {
        expect(transaction.amount).toBeGreaterThan(0);
      });
    });

    it('should include specific income transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'income');
      const transactionIds = filtered.map(t => t.id);

      expect(transactionIds).toEqual(['2', '4', '7']);
      expect(filtered[0].description).toBe('Salário Empresa XYZ');
      expect(filtered[1].description).toBe('Transferência PIX');
      expect(filtered[2].description).toBe('Freelance');
    });

    it('should exclude all negative amount transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'income');
      const negativeTransactions = filtered.filter(t => t.amount < 0);

      expect(negativeTransactions).toHaveLength(0);
    });

    it('should exclude zero amount transactions', () => {
      const transactionsWithZero = [
        ...mockTransactions,
        { id: '8', description: 'Zero Transaction', amount: 0, isProcessed: true, ofxTransId: 'TXN008' }
      ];

      const filtered = filterTransactionsByType(transactionsWithZero, 'income');
      expect(filtered).toHaveLength(3); // Same as before, zero is excluded
    });
  });

  describe('Filter: Expense', () => {
    it('should show only negative amount transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'expense');
      expect(filtered).toHaveLength(4);

      filtered.forEach(transaction => {
        expect(transaction.amount).toBeLessThan(0);
      });
    });

    it('should include specific expense transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'expense');
      const transactionIds = filtered.map(t => t.id);

      expect(transactionIds).toEqual(['1', '3', '5', '6']);
      expect(filtered[0].description).toBe('Supermercado Extra');
      expect(filtered[1].description).toBe('Conta de Luz');
      expect(filtered[2].description).toBe('Farmácia Drogasil');
      expect(filtered[3].description).toBe('Aluguel');
    });

    it('should exclude all positive amount transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'expense');
      const positiveTransactions = filtered.filter(t => t.amount > 0);

      expect(positiveTransactions).toHaveLength(0);
    });

    it('should exclude zero amount transactions', () => {
      const transactionsWithZero = [
        ...mockTransactions,
        { id: '8', description: 'Zero Transaction', amount: 0, isProcessed: true, ofxTransId: 'TXN008' }
      ];

      const filtered = filterTransactionsByType(transactionsWithZero, 'expense');
      expect(filtered).toHaveLength(4); // Same as before, zero is excluded
    });
  });

  describe('Filter: Unprocessed', () => {
    it('should show only unprocessed transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'unprocessed');
      expect(filtered).toHaveLength(3);

      filtered.forEach(transaction => {
        expect(transaction.isProcessed).toBe(false);
      });
    });

    it('should include specific unprocessed transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'unprocessed');
      const transactionIds = filtered.map(t => t.id);

      expect(transactionIds).toEqual(['3', '5', '7']);
      expect(filtered[0].description).toBe('Conta de Luz');
      expect(filtered[1].description).toBe('Farmácia Drogasil');
      expect(filtered[2].description).toBe('Freelance');
    });

    it('should exclude all processed transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'unprocessed');
      const processedTransactions = filtered.filter(t => t.isProcessed);

      expect(processedTransactions).toHaveLength(0);
    });

    it('should include both income and expense unprocessed transactions', () => {
      const filtered = filterTransactionsByType(mockTransactions, 'unprocessed');

      const unprocessedIncome = filtered.filter(t => t.amount > 0);
      const unprocessedExpense = filtered.filter(t => t.amount < 0);

      expect(unprocessedIncome).toHaveLength(1); // Freelance
      expect(unprocessedExpense).toHaveLength(2); // Conta de Luz, Farmácia
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction list', () => {
      const filtered = filterTransactionsByType([], 'all');
      expect(filtered).toHaveLength(0);
    });

    it('should handle empty transaction list with different filters', () => {
      expect(filterTransactionsByType([], 'income')).toHaveLength(0);
      expect(filterTransactionsByType([], 'expense')).toHaveLength(0);
      expect(filterTransactionsByType([], 'unprocessed')).toHaveLength(0);
    });

    it('should handle transactions with zero amount', () => {
      const transactionsWithZero = [
        { id: '1', description: 'Zero Income', amount: 0, isProcessed: true, ofxTransId: 'TXN001' },
        { id: '2', description: 'Zero Expense', amount: 0, isProcessed: false, ofxTransId: 'TXN002' },
      ];

      expect(filterTransactionsByType(transactionsWithZero, 'all')).toHaveLength(2);
      expect(filterTransactionsByType(transactionsWithZero, 'income')).toHaveLength(0);
      expect(filterTransactionsByType(transactionsWithZero, 'expense')).toHaveLength(0);
      expect(filterTransactionsByType(transactionsWithZero, 'unprocessed')).toHaveLength(1);
    });

    it('should handle very small amounts', () => {
      const transactionsWithSmallAmounts = [
        { id: '1', description: 'Tiny Income', amount: 0.01, isProcessed: true, ofxTransId: 'TXN001' },
        { id: '2', description: 'Tiny Expense', amount: -0.01, isProcessed: true, ofxTransId: 'TXN002' },
      ];

      const allFiltered = filterTransactionsByType(transactionsWithSmallAmounts, 'all');
      const incomeFiltered = filterTransactionsByType(transactionsWithSmallAmounts, 'income');
      const expenseFiltered = filterTransactionsByType(transactionsWithSmallAmounts, 'expense');

      expect(allFiltered).toHaveLength(2);
      expect(incomeFiltered).toHaveLength(1);
      expect(expenseFiltered).toHaveLength(1);
    });

    it('should handle very large amounts', () => {
      const transactionsWithLargeAmounts = [
        { id: '1', description: 'Large Income', amount: 1000000.00, isProcessed: true, ofxTransId: 'TXN001' },
        { id: '2', description: 'Large Expense', amount: -1000000.00, isProcessed: true, ofxTransId: 'TXN002' },
      ];

      const allFiltered = filterTransactionsByType(transactionsWithLargeAmounts, 'all');
      const incomeFiltered = filterTransactionsByType(transactionsWithLargeAmounts, 'income');
      const expenseFiltered = filterTransactionsByType(transactionsWithLargeAmounts, 'expense');

      expect(allFiltered).toHaveLength(2);
      expect(incomeFiltered).toHaveLength(1);
      expect(expenseFiltered).toHaveLength(1);
    });
  });

  describe('Filter Combinations', () => {
    it('should work with text filtering simulation', () => {
      // Simulate combining type filter with text filter
      const typeFiltered = filterTransactionsByType(mockTransactions, 'expense');

      // Then apply text filter
      const textFiltered = typeFiltered.filter(t =>
        t.description.toLowerCase().includes('conta')
      );

      expect(textFiltered).toHaveLength(1);
      expect(textFiltered[0].description).toBe('Conta de Luz');
    });

    it('should handle multiple filter applications', () => {
      // Apply income filter first
      const incomeFiltered = filterTransactionsByType(mockTransactions, 'income');

      // Then filter by processed status
      const processedIncome = incomeFiltered.filter(t => t.isProcessed);

      expect(processedIncome).toHaveLength(2); // Salário and PIX are processed
      expect(processedIncome.map(t => t.id)).toEqual(['2', '4']);
    });

    it('should handle unprocessed income transactions', () => {
      const incomeFiltered = filterTransactionsByType(mockTransactions, 'income');
      const unprocessedIncome = incomeFiltered.filter(t => !t.isProcessed);

      expect(unprocessedIncome).toHaveLength(1);
      expect(unprocessedIncome[0].description).toBe('Freelance');
    });
  });

  describe('Filter Statistics', () => {
    it('should calculate correct statistics for each filter', () => {
      const allFiltered = filterTransactionsByType(mockTransactions, 'all');
      const incomeFiltered = filterTransactionsByType(mockTransactions, 'income');
      const expenseFiltered = filterTransactionsByType(mockTransactions, 'expense');
      const unprocessedFiltered = filterTransactionsByType(mockTransactions, 'unprocessed');

      // All transactions
      expect(allFiltered).toHaveLength(7);

      // Income transactions (amount > 0)
      expect(incomeFiltered).toHaveLength(3);
      const totalIncome = incomeFiltered.reduce((sum, t) => sum + t.amount, 0);
      expect(totalIncome).toBe(2500 + 300 + 1200); // 4000

      // Expense transactions (amount < 0)
      expect(expenseFiltered).toHaveLength(4);
      const totalExpense = expenseFiltered.reduce((sum, t) => sum + t.amount, 0);
      expect(totalExpense).toBe(-150.50 - 89.90 - 45.75 - 800); // -1086.15

      // Unprocessed transactions
      expect(unprocessedFiltered).toHaveLength(3);
      const unprocessedIncome = unprocessedFiltered.filter(t => t.amount > 0);
      const unprocessedExpense = unprocessedFiltered.filter(t => t.amount < 0);
      expect(unprocessedIncome).toHaveLength(1);
      expect(unprocessedExpense).toHaveLength(2);
    });

    it('should handle balance calculations with filters', () => {
      const incomeFiltered = filterTransactionsByType(mockTransactions, 'income');
      const expenseFiltered = filterTransactionsByType(mockTransactions, 'expense');

      const totalIncome = incomeFiltered.reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = expenseFiltered.reduce((sum, t) => sum + t.amount, 0);
      const netBalance = totalIncome + totalExpense;

      expect(totalIncome).toBe(4000);
      expect(totalExpense).toBe(-1086.15);
      expect(netBalance).toBe(4000 - 1086.15); // 2913.85
    });
  });
});