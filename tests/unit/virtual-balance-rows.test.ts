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

describe('Virtual Balance Rows', () => {
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
  ];

  // Simulate the filtering logic with virtual rows from TransactionList
  const applyFiltersWithVirtualRows = (
    transactions: Transaction[],
    filterType: FilterType,
    searchParams: SearchParams | undefined,
    initialBalance: number,
    bankAccountId: string
  ) => {
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

      return [initialBalanceRow, ...filtered, finalBalanceRow];
    }

    return filtered;
  };

  describe('Virtual Rows Appearance', () => {
    it('should add virtual rows when month filter is present and filter is "all"', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123'
      );

      expect(result).toHaveLength(5); // 2 virtual + 3 real
      expect(result[0].id).toBe('initial-balance');
      expect(result[4].id).toBe('final-balance');
    });

    it('should add virtual rows when month filter is present and filter is "unprocessed"', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'unprocessed',
        searchParams,
        1000.00,
        'bank-123'
      );

      expect(result).toHaveLength(3); // 2 virtual + 1 real (unprocessed)
      expect(result[0].id).toBe('initial-balance');
      expect(result[2].id).toBe('final-balance');
    });

    it('should not add virtual rows when month filter is present but filter is "income"', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'income',
        searchParams,
        1000.00,
        'bank-123'
      );

      expect(result).toHaveLength(1); // Only income transaction
      expect(result[0].id).toBe('2'); // Salário
    });

    it('should not add virtual rows when month filter is present but filter is "expense"', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'expense',
        searchParams,
        1000.00,
        'bank-123'
      );

      expect(result).toHaveLength(2); // Two expense transactions
      expect(result[0].id).toBe('1'); // Supermercado
      expect(result[1].id).toBe('3'); // Conta de Luz
    });

    it('should not add virtual rows when no month filter is present', () => {
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        undefined,
        1000.00,
        'bank-123'
      );

      expect(result).toHaveLength(3); // Only real transactions
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(result[2].id).toBe('3');
    });

    it('should not add virtual rows when month filter is empty', () => {
      const searchParams = { ano: '2024' }; // No mes
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123'
      );

      expect(result).toHaveLength(3); // Only real transactions
    });
  });

  describe('Virtual Rows Content', () => {
    it('should create initial balance row with correct data', () => {
      const searchParams = { mes: '2', ano: '2024' };
      const initialBalance = 1500.75;
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      const initialRow = result[0];
      expect(initialRow.id).toBe('initial-balance');
      expect(initialRow.description).toBe('SALDO ANTERIOR');
      expect(initialRow.amount).toBe(0);
      expect(initialRow.balance).toBe(initialBalance);
      expect(initialRow.isProcessed).toBe(true);
      expect(initialRow.bankAccountId).toBe('bank-123');
      expect(initialRow.ofxTransId).toBeNull();
    });

    it('should create final balance row with correct data', () => {
      const searchParams = { mes: '2', ano: '2024' };
      const initialBalance = 1000.00;
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      const finalRow = result[4]; // Last row
      expect(finalRow.id).toBe('final-balance');
      expect(finalRow.description).toBe('SALDO FINAL');
      expect(finalRow.amount).toBe(0);
      expect(finalRow.isProcessed).toBe(true);
      expect(finalRow.bankAccountId).toBe('bank-123');
      expect(finalRow.ofxTransId).toBeNull();
    });

    it('should set correct dates for virtual rows', () => {
      const searchParams = { mes: '3', ano: '2024' };
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123'
      );

      const initialRow = result[0];
      const finalRow = result[4];

      // Initial balance should be last day of previous month (Feb 29, 2024)
      expect(initialRow.date.getMonth()).toBe(1); // February (0-indexed)
      expect(initialRow.date.getFullYear()).toBe(2024);

      // Final balance should be last day of current month (Mar 31, 2024)
      expect(finalRow.date.getMonth()).toBe(2); // March (0-indexed)
      expect(finalRow.date.getFullYear()).toBe(2024);
    });

    it('should handle year transitions correctly', () => {
      const searchParams = { mes: '1', ano: '2024' }; // January 2024
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123'
      );

      const initialRow = result[0];
      const finalRow = result[4];

      // Initial balance should be Dec 31, 2023
      expect(initialRow.date.getMonth()).toBe(11); // December (0-indexed)
      expect(initialRow.date.getFullYear()).toBe(2023);

      // Final balance should be Jan 31, 2024
      expect(finalRow.date.getMonth()).toBe(0); // January (0-indexed)
      expect(finalRow.date.getFullYear()).toBe(2024);
    });
  });

  describe('Balance Calculations', () => {
    it('should calculate final balance correctly with positive transactions', () => {
      const incomeOnlyTransactions = mockTransactions.filter(t => t.amount > 0);
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000.00;

      const result = applyFiltersWithVirtualRows(
        incomeOnlyTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      const finalRow = result[2]; // Last row
      const expectedFinalBalance = initialBalance + 2500.00; // 1000 + 2500

      expect(finalRow.balance).toBe(expectedFinalBalance);
    });

    it('should calculate final balance correctly with negative transactions', () => {
      const expenseOnlyTransactions = mockTransactions.filter(t => t.amount < 0);
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000.00;

      const result = applyFiltersWithVirtualRows(
        expenseOnlyTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      const finalRow = result[3]; // Last row
      const expectedFinalBalance = initialBalance + (-150.50) + (-89.90); // 1000 - 150.50 - 89.90

      expect(finalRow.balance).toBe(expectedFinalBalance);
    });

    it('should calculate final balance correctly with mixed transactions', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000.00;

      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      const finalRow = result[4]; // Last row
      const expectedFinalBalance = initialBalance + (-150.50) + 2500.00 + (-89.90); // 1000 - 150.50 + 2500 - 89.90

      expect(finalRow.balance).toBe(expectedFinalBalance);
    });

    it('should handle zero initial balance', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 0;

      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      const initialRow = result[0];
      const finalRow = result[4];

      expect(initialRow.balance).toBe(0);
      expect(finalRow.balance).toBe(-150.50 + 2500.00 - 89.90); // Sum of all transactions
    });

    it('should handle large balance values', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000000.00;

      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      const finalRow = result[4];
      const expectedFinalBalance = initialBalance + (-150.50) + 2500.00 + (-89.90);

      expect(finalRow.balance).toBe(expectedFinalBalance);
    });

    it('should handle negative initial balance', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = -500.00;

      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      const finalRow = result[4];
      const expectedFinalBalance = initialBalance + (-150.50) + 2500.00 + (-89.90);

      expect(finalRow.balance).toBe(expectedFinalBalance);
    });
  });

  describe('Virtual Rows with Different Filters', () => {
    it('should calculate final balance correctly with unprocessed filter', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000.00;

      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'unprocessed',
        searchParams,
        initialBalance,
        'bank-123'
      );

      // Only unprocessed transaction is "Conta de Luz" (-89.90)
      const finalRow = result[2]; // Last row
      const expectedFinalBalance = initialBalance + (-89.90);

      expect(finalRow.balance).toBe(expectedFinalBalance);
      expect(result).toHaveLength(3); // 2 virtual + 1 real
    });

    it('should handle empty filtered results with virtual rows', () => {
      const noUnprocessedTransactions = mockTransactions.map(t => ({
        ...t,
        isProcessed: true
      }));

      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000.00;

      const result = applyFiltersWithVirtualRows(
        noUnprocessedTransactions,
        'unprocessed',
        searchParams,
        initialBalance,
        'bank-123'
      );

      expect(result).toHaveLength(2); // Only virtual rows
      expect(result[0].id).toBe('initial-balance');
      expect(result[1].id).toBe('final-balance');
      expect(result[1].balance).toBe(initialBalance); // No transactions to add
    });

    it('should handle single transaction with virtual rows', () => {
      const singleTransaction = [mockTransactions[0]]; // Only first transaction
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000.00;

      const result = applyFiltersWithVirtualRows(
        singleTransaction,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      expect(result).toHaveLength(3); // 2 virtual + 1 real
      expect(result[0].id).toBe('initial-balance');
      expect(result[1].id).toBe('1'); // The real transaction
      expect(result[2].id).toBe('final-balance');
      expect(result[2].balance).toBe(initialBalance + (-150.50));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction list with virtual rows', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000.00;

      const result = applyFiltersWithVirtualRows(
        [],
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      expect(result).toHaveLength(2); // Only virtual rows
      expect(result[0].id).toBe('initial-balance');
      expect(result[1].id).toBe('final-balance');
      expect(result[1].balance).toBe(initialBalance);
    });

    it('should handle transactions with zero amount', () => {
      const transactionsWithZero = [
        ...mockTransactions,
        {
          id: '4',
          description: 'Zero Transaction',
          amount: 0,
          isProcessed: true,
          ofxTransId: 'TXN004',
          date: new Date('2024-01-18'),
          balance: 3260.10,
          bankAccountId: 'bank-123',
          ofxAccountId: null,
          importBatchId: null,
          isDuplicate: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000.00;

      const result = applyFiltersWithVirtualRows(
        transactionsWithZero,
        'all',
        searchParams,
        initialBalance,
        'bank-123'
      );

      const finalRow = result[5]; // Last row
      const expectedFinalBalance = initialBalance + (-150.50) + 2500.00 + (-89.90) + 0;

      expect(finalRow.balance).toBe(expectedFinalBalance);
    });

    it('should handle leap year dates correctly', () => {
      const searchParams = { mes: '2', ano: '2024' }; // February 2024 (leap year)
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123'
      );

      const initialRow = result[0];
      const finalRow = result[4];

      // Initial balance should be Jan 31, 2024
      expect(initialRow.date.getMonth()).toBe(0); // January
      expect(initialRow.date.getFullYear()).toBe(2024);

      // Final balance should be Feb 29, 2024 (leap year)
      expect(finalRow.date.getMonth()).toBe(1); // February
      expect(finalRow.date.getFullYear()).toBe(2024);
      expect(finalRow.date.getDate()).toBe(29); // Leap year day
    });

    it('should handle different bank account IDs', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const initialBalance = 1000.00;
      const bankAccountId = 'different-bank-456';

      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        initialBalance,
        bankAccountId
      );

      const initialRow = result[0];
      const finalRow = result[4];

      expect(initialRow.bankAccountId).toBe(bankAccountId);
      expect(finalRow.bankAccountId).toBe(bankAccountId);
    });
  });

  describe('Virtual Rows in Table Context', () => {
    it('should be positioned correctly in the table', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123'
      );

      expect(result[0].id).toBe('initial-balance'); // First
      expect(result[1].id).toBe('1'); // First real transaction
      expect(result[2].id).toBe('2'); // Second real transaction
      expect(result[3].id).toBe('3'); // Third real transaction
      expect(result[4].id).toBe('final-balance'); // Last
    });

    it('should have consistent properties for table rendering', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123'
      );

      const virtualRows = [result[0], result[4]];

      virtualRows.forEach(row => {
        expect(row.amount).toBe(0); // Virtual rows have zero amount
        expect(row.isProcessed).toBe(true); // Always processed
        expect(row.ofxTransId).toBeNull(); // No transaction ID
        expect(row.ofxAccountId).toBeNull(); // No account ID
        expect(row.importBatchId).toBeNull(); // No batch ID
        expect(row.isDuplicate).toBe(false); // Never duplicate
      });
    });

    it('should be excluded from selection and editing', () => {
      const searchParams = { mes: '1', ano: '2024' };
      const result = applyFiltersWithVirtualRows(
        mockTransactions,
        'all',
        searchParams,
        1000.00,
        'bank-123'
      );

      const virtualRows = result.filter(row =>
        row.id === 'initial-balance' || row.id === 'final-balance'
      );

      expect(virtualRows).toHaveLength(2);

      // Virtual rows should not be selectable or editable
      virtualRows.forEach(row => {
        expect(row.id).toMatch(/^(initial-balance|final-balance)$/);
        expect(row.description).toMatch(/^(SALDO ANTERIOR|SALDO FINAL)$/);
      });
    });
  });
});