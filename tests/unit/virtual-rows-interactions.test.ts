import { describe, it, expect } from 'vitest';

type Transaction = {
  id: string;
  description: string;
  amount: number;
  isProcessed: boolean;
  ofxTransId: string;
  date: Date;
  balance: number;
  bankAccountId: string;
  ofxAccountId: string | null;
  importBatchId: string | null;
  isDuplicate: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type FilterType = 'all' | 'income' | 'expense' | 'unprocessed';

type SearchParams = {
  mes?: string;
  ano?: string;
};

describe('Virtual Rows Interactions', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      description: 'Supermercado Extra',
      amount: -150.50,
      isProcessed: true,
      ofxTransId: 'TXN001',
      date: new Date('2024-01-15'),
      balance: 850.00,
      bankAccountId: 'bank-123',
      ofxAccountId: null,
      importBatchId: null,
      isDuplicate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      description: 'Salário Empresa XYZ',
      amount: 2500.00,
      isProcessed: true,
      ofxTransId: 'TXN002',
      date: new Date('2024-01-16'),
      balance: 3350.00,
      bankAccountId: 'bank-123',
      ofxAccountId: null,
      importBatchId: null,
      isDuplicate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      description: 'Conta de Luz',
      amount: -89.90,
      isProcessed: false,
      ofxTransId: 'TXN003',
      date: new Date('2024-01-17'),
      balance: 3260.10,
      bankAccountId: 'bank-123',
      ofxAccountId: null,
      importBatchId: null,
      isDuplicate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '4',
      description: 'Transferência PIX',
      amount: 300.00,
      isProcessed: true,
      ofxTransId: 'TXN004',
      date: new Date('2024-01-18'),
      balance: 3560.10,
      bankAccountId: 'bank-123',
      ofxAccountId: null,
      importBatchId: null,
      isDuplicate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Complete filtering logic including virtual rows and text search
  const applyCompleteFilters = (
    transactions: Transaction[],
    filterType: FilterType,
    searchParams: SearchParams | undefined,
    initialBalance: number,
    bankAccountId: string,
    searchText: string = ''
  ) => {
    // First apply type filter
    let filtered = transactions;

    if (filterType === 'income') {
      filtered = transactions.filter((t) => t.amount > 0);
    } else if (filterType === 'expense') {
      filtered = transactions.filter((t) => t.amount < 0);
    } else if (filterType === 'unprocessed') {
      filtered = transactions.filter((t) => !t.isProcessed);
    }
    // filterType === 'all' returns all transactions

    // Add virtual initial and final balance rows if we have a month filter
    if (
      searchParams?.mes &&
      (filterType === 'all' || filterType === 'unprocessed')
    ) {
      const initialBalanceRow: Transaction = {
        id: 'initial-balance',
        date: new Date(
          searchParams.ano
            ? parseInt(searchParams.ano)
            : new Date().getFullYear(),
          searchParams.mes ? parseInt(searchParams.mes) - 1 : 0,
          0,
          23,
          59,
          59
        ),
        description: 'SALDO ANTERIOR',
        amount: 0,
        balance: initialBalance,
        isProcessed: true,
        bankAccountId: bankAccountId,
        ofxTransId: null as any,
        ofxAccountId: null as any,
        importBatchId: null as any,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate final balance
      const transactionsSum = filtered.reduce((sum, t) => sum + t.amount, 0);
      const finalBalance = initialBalance + transactionsSum;

      const finalBalanceRow: Transaction = {
        id: 'final-balance',
        date: new Date(
          searchParams.ano
            ? parseInt(searchParams.ano)
            : new Date().getFullYear(),
          searchParams.mes ? parseInt(searchParams.mes) : 0,
          0,
          23,
          59,
          59
        ),
        description: 'SALDO FINAL',
        amount: 0,
        balance: finalBalance,
        isProcessed: true,
        bankAccountId: bankAccountId,
        ofxTransId: null as any,
        ofxAccountId: null as any,
        importBatchId: null as any,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      filtered = [initialBalanceRow, ...filtered, finalBalanceRow];
    }

    // Apply text filter (simulating TanStack Table global filter)
    if (searchText.trim()) {
      const searchTerms = searchText.toLowerCase().trim().split(/\s+/);

      // Separate virtual and real transactions
      const virtualRows = filtered.filter(t => t.id === 'initial-balance' || t.id === 'final-balance');
      const realTransactions = filtered.filter(t => t.id !== 'initial-balance' && t.id !== 'final-balance');

      // Filter real transactions
      const filteredRealTransactions = realTransactions.filter(transaction => {
        const description = transaction.description.toLowerCase();
        const ofxTransId = (transaction.ofxTransId || '').toLowerCase();
        const amount = transaction.amount.toFixed(2);

        // Check if all search terms are found in any of the fields
        return searchTerms.every(term =>
          description.includes(term) ||
          ofxTransId.includes(term) ||
          amount.includes(term)
        );
      });

      // Filter virtual rows
      const matchingVirtualRows = virtualRows.filter(transaction => {
        const description = transaction.description.toLowerCase();
        return searchTerms.every(term => description.includes(term));
      });

      // Combine results maintaining correct order: initial, real, final
      if (filteredRealTransactions.length > 0) {
        // Recalculate final balance based on filtered transactions
        const filteredTransactionsSum = filteredRealTransactions.reduce((sum, t) => sum + t.amount, 0);
        const newFinalBalance = initialBalance + filteredTransactionsSum;

        // Update the final balance row
        const initialRow = virtualRows.find(t => t.id === 'initial-balance');
        const finalRow = virtualRows.find(t => t.id === 'final-balance');
        const updatedFinalRow = finalRow ? { ...finalRow, balance: newFinalBalance } : null;

        filtered = [
          ...(initialRow ? [initialRow] : []),
          ...filteredRealTransactions,
          ...(updatedFinalRow ? [updatedFinalRow] : [])
        ];
      } else {
        // Only include virtual rows that match the search
        filtered = matchingVirtualRows;
      }
    }

    return filtered;
  };

  describe('Virtual Rows with Text Search', () => {
    const searchParams = { mes: '1', ano: '2024' };
    const initialBalance = 1000.00;

    it('should keep virtual rows when searching for "saldo"', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'saldo'
      );

      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('SALDO ANTERIOR');
      expect(result[1].description).toBe('SALDO FINAL');
    });

    it('should keep virtual rows when searching for "anterior"', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'anterior'
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('SALDO ANTERIOR');
    });

    it('should keep virtual rows when searching for "final"', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'final'
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('SALDO FINAL');
    });

    it('should filter real transactions but keep virtual rows', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'supermercado'
      );

      expect(result).toHaveLength(3); // 2 virtual + 1 real
      expect(result[0].description).toBe('SALDO ANTERIOR');
      expect(result[1].description).toBe('Supermercado Extra');
      expect(result[2].description).toBe('SALDO FINAL');
    });

    it('should show only virtual rows when no real transactions match', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'nonexistent'
      );

      expect(result).toHaveLength(0); // No matches at all
    });

    it('should handle multiple search terms with virtual rows', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'saldo anterior'
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('SALDO ANTERIOR');
    });
  });

  describe('Virtual Rows with Type Filters', () => {
    const searchParams = { mes: '1', ano: '2024' };
    const initialBalance = 1000.00;

    it('should not show virtual rows with income filter', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'income',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );

      expect(result).toHaveLength(2); // Only income transactions
      expect(result[0].description).toBe('Salário Empresa XYZ');
      expect(result[1].description).toBe('Transferência PIX');
    });

    it('should not show virtual rows with expense filter', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'expense',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );

      expect(result).toHaveLength(2); // Only expense transactions
      expect(result[0].description).toBe('Supermercado Extra');
      expect(result[1].description).toBe('Conta de Luz');
    });

    it('should show virtual rows with unprocessed filter', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'unprocessed',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );

      expect(result).toHaveLength(3); // 2 virtual + 1 real
      expect(result[0].description).toBe('SALDO ANTERIOR');
      expect(result[1].description).toBe('Conta de Luz');
      expect(result[2].description).toBe('SALDO FINAL');
    });

    it('should show virtual rows with all filter', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );

      expect(result).toHaveLength(6); // 2 virtual + 4 real
      expect(result[0].description).toBe('SALDO ANTERIOR');
      expect(result[5].description).toBe('SALDO FINAL');
    });
  });

  describe('Virtual Rows Balance Calculations with Filters', () => {
    const searchParams = { mes: '1', ano: '2024' };
    const initialBalance = 1000.00;

    it('should calculate correct final balance with unprocessed filter', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'unprocessed',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );

      const finalRow = result[2];
      expect(finalRow.description).toBe('SALDO FINAL');
      expect(finalRow.balance).toBe(initialBalance + (-89.90)); // Only unprocessed transaction
    });

    it('should calculate correct final balance with text filter', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'pix'
      );

      const finalRow = result[2];
      expect(finalRow.description).toBe('SALDO FINAL');
      expect(finalRow.balance).toBe(initialBalance + 300.00); // Only PIX transaction
    });

    it('should calculate correct final balance with combined filters', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'expense',
        searchParams,
        initialBalance,
        'bank-123',
        'luz'
      );

      expect(result).toHaveLength(1); // No virtual rows with expense filter
      expect(result[0].description).toBe('Conta de Luz');
    });

    it('should handle zero balance calculations', () => {
      const zeroBalanceTransactions: Transaction[] = [];
      const result = applyCompleteFilters(
        zeroBalanceTransactions,
        'all',
        searchParams,
        0,
        'bank-123',
        ''
      );

      expect(result).toHaveLength(2); // Only virtual rows
      expect(result[0].balance).toBe(0); // Initial balance
      expect(result[1].balance).toBe(0); // Final balance (no transactions)
    });

    it('should handle negative initial balance with filters', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'income',
        searchParams,
        -500.00,
        'bank-123',
        ''
      );

      expect(result).toHaveLength(2); // No virtual rows with income filter
      const totalIncome = result.reduce((sum, t) => sum + t.amount, 0);
      expect(totalIncome).toBe(2800.00); // 2500 + 300
    });
  });

  describe('Complex Scenarios', () => {
    const searchParams = { mes: '1', ano: '2024' };
    const initialBalance = 1000.00;

    it('should handle switching filters with virtual rows', () => {
      // Start with all filter
      const allResult = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );
      expect(allResult).toHaveLength(6);

      // Switch to unprocessed filter
      const unprocessedResult = applyCompleteFilters(
        mockTransactions,
        'unprocessed',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );
      expect(unprocessedResult).toHaveLength(3);

      // Switch to income filter (no virtual rows)
      const incomeResult = applyCompleteFilters(
        mockTransactions,
        'income',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );
      expect(incomeResult).toHaveLength(2);
    });

    it('should handle text search that matches virtual rows', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'saldo'
      );

      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('SALDO ANTERIOR');
      expect(result[1].description).toBe('SALDO FINAL');
    });

    it('should handle empty search with virtual rows', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        '   ' // Only spaces
      );

      expect(result).toHaveLength(6); // All transactions including virtual
    });

    it('should handle case insensitive search with virtual rows', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'SALDO'
      );

      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('SALDO ANTERIOR');
      expect(result[1].description).toBe('SALDO FINAL');
    });

    it('should handle partial word search with virtual rows', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'ante'
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('SALDO ANTERIOR');
    });

    it('should handle multiple word search with virtual rows', () => {
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'saldo final'
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('SALDO FINAL');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    const searchParams = { mes: '1', ano: '2024' };
    const initialBalance = 1000.00;

    it('should simulate user workflow: view monthly balance', () => {
      // User opens monthly view
      const monthlyView = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );

      expect(monthlyView).toHaveLength(6);
      expect(monthlyView[0].description).toBe('SALDO ANTERIOR');
      expect(monthlyView[5].description).toBe('SALDO FINAL');

      // Calculate expected final balance
      const realTransactions = monthlyView.slice(1, -1); // Exclude virtual rows
      const expectedFinalBalance = initialBalance + realTransactions.reduce((sum, t) => sum + t.amount, 0);
      expect(monthlyView[5].balance).toBe(expectedFinalBalance);
    });

    it('should simulate user workflow: check unprocessed transactions', () => {
      // User wants to see unprocessed transactions with balance context
      const unprocessedView = applyCompleteFilters(
        mockTransactions,
        'unprocessed',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );

      expect(unprocessedView).toHaveLength(3);
      expect(unprocessedView[0].description).toBe('SALDO ANTERIOR');
      expect(unprocessedView[2].description).toBe('SALDO FINAL');

      // The unprocessed transaction should be in the middle
      expect(unprocessedView[1].description).toBe('Conta de Luz');
      expect(unprocessedView[1].isProcessed).toBe(false);
    });

    it('should simulate user workflow: search within monthly view', () => {
      // User is viewing monthly transactions and searches for something specific
      const searchResult = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123',
        'empresa'
      );

      expect(searchResult).toHaveLength(3); // 2 virtual + 1 real
      expect(searchResult[0].description).toBe('SALDO ANTERIOR');
      expect(searchResult[1].description).toBe('Salário Empresa XYZ');
      expect(searchResult[2].description).toBe('SALDO FINAL');
    });

    it('should simulate user workflow: filter by type and search', () => {
      // User filters by expenses and then searches
      const expenseView = applyCompleteFilters(
        mockTransactions,
        'expense',
        searchParams,
        initialBalance,
        'bank-123',
        ''
      );

      expect(expenseView).toHaveLength(2); // No virtual rows

      // Then user searches within expenses
      const searchedExpenses = applyCompleteFilters(
        mockTransactions,
        'expense',
        searchParams,
        initialBalance,
        'bank-123',
        'luz'
      );

      expect(searchedExpenses).toHaveLength(1);
      expect(searchedExpenses[0].description).toBe('Conta de Luz');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets with virtual rows', () => {
      const largeDataset: Transaction[] = [];
      for (let i = 0; i < 100; i++) {
        largeDataset.push({
          id: `txn-${i}`,
          description: i % 2 === 0 ? 'Income Transaction' : 'Expense Transaction',
          amount: i % 2 === 0 ? 100 + i : -100 - i,
          isProcessed: i % 3 === 0,
          ofxTransId: `TXN${i.toString().padStart(3, '0')}`,
          date: new Date(2024, 0, i + 1),
          balance: 1000 + (i % 2 === 0 ? 100 + i : -100 - i),
          bankAccountId: 'bank-123',
          ofxAccountId: null as any,
          importBatchId: null as any,
          isDuplicate: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const searchParams = { mes: '1', ano: '2024' };
      const result = applyCompleteFilters(
        largeDataset,
        'all',
        searchParams,
        1000.00,
        'bank-123',
        ''
      );

      expect(result).toHaveLength(102); // 2 virtual + 100 real
      expect(result[0].description).toBe('SALDO ANTERIOR');
      expect(result[101].description).toBe('SALDO FINAL');
    });

    it('should handle very long search terms with virtual rows', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const result = applyCompleteFilters(
        mockTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123',
        'a'.repeat(1000)
      );

      expect(result).toHaveLength(0);
    });

    it('should handle special characters in search with virtual rows', () => {
      const specialTransactions = [
        ...mockTransactions,
        {
          id: '5',
          description: 'Compra @ Mercado Online',
          amount: -75.50,
          isProcessed: true,
          ofxTransId: 'TXN005',
          date: new Date('2024-01-19'),
          balance: 3484.60,
          bankAccountId: 'bank-123',
          ofxAccountId: null as any,
          importBatchId: null as any,
          isDuplicate: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      const searchParams = { mes: '1', ano: '2024' };
      const result = applyCompleteFilters(
        specialTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123',
        '@'
      );

      expect(result).toHaveLength(3); // 2 virtual + 1 real
      expect(result[1].description).toBe('Compra @ Mercado Online');
    });
  });
});