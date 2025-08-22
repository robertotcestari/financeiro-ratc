import { describe, it, expect } from 'vitest';

type Transaction = {
  id: string;
  description: string;
  amount: number;
  isProcessed: boolean;
  ofxTransId: string;
};

type FilterType = 'all' | 'income' | 'expense' | 'unprocessed';

describe('Filter Interactions', () => {
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

  // Simulate the complete filtering logic from TransactionList
  const applyFilters = (transactions: Transaction[], filterType: FilterType, searchText: string = '') => {
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

    // Then apply text filter (simulating TanStack Table global filter)
    if (searchText.trim()) {
      const searchTerms = searchText.toLowerCase().trim().split(/\s+/);
      filtered = filtered.filter(transaction => {
        const description = transaction.description.toLowerCase();
        const ofxTransId = transaction.ofxTransId.toLowerCase();
        const amount = transaction.amount.toFixed(2);

        // Check if all search terms are found in any of the fields
        return searchTerms.every(term =>
          description.includes(term) ||
          ofxTransId.includes(term) ||
          amount.includes(term)
        );
      });
    }

    return filtered;
  };

  describe('Type Filter + Text Filter Combinations', () => {
    it('should filter expenses by description', () => {
      const filtered = applyFilters(mockTransactions, 'expense', 'supermercado');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Supermercado Extra');
      expect(filtered[0].amount).toBe(-150.50);
    });

    it('should filter income by transaction ID', () => {
      const filtered = applyFilters(mockTransactions, 'income', 'TXN002');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Salário Empresa XYZ');
      expect(filtered[0].amount).toBe(2500.00);
    });

    it('should filter unprocessed by amount', () => {
      const filtered = applyFilters(mockTransactions, 'unprocessed', '1200.00');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Freelance');
      expect(filtered[0].amount).toBe(1200.00);
    });

    it('should return empty when no matches in filtered type', () => {
      const filtered = applyFilters(mockTransactions, 'income', 'supermercado');
      expect(filtered).toHaveLength(0);
    });

    it('should handle partial matches within filtered type', () => {
      const filtered = applyFilters(mockTransactions, 'expense', 'conta');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Conta de Luz');
    });

    it('should handle multiple matches within filtered type', () => {
      const filtered = applyFilters(mockTransactions, 'expense', 'TXN');
      expect(filtered).toHaveLength(4); // All expenses have TXN in ID
    });
  });

  describe('Complex Filter Scenarios', () => {
    it('should find unprocessed expenses', () => {
      const filtered = applyFilters(mockTransactions, 'unprocessed', 'conta');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Conta de Luz');
      expect(filtered[0].isProcessed).toBe(false);
      expect(filtered[0].amount).toBe(-89.90);
    });

    it('should find processed income', () => {
      const filtered = applyFilters(mockTransactions, 'income', 'pix');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Transferência PIX');
      expect(filtered[0].isProcessed).toBe(true);
      expect(filtered[0].amount).toBe(300.00);
    });

    it('should handle case insensitive search with type filter', () => {
      const filtered = applyFilters(mockTransactions, 'expense', 'FARMÁCIA');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Farmácia Drogasil');
    });

    it('should handle numeric search with type filter', () => {
      const filtered = applyFilters(mockTransactions, 'expense', '800');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Aluguel');
      expect(filtered[0].amount).toBe(-800.00);
    });

    it('should handle decimal search with type filter', () => {
      const filtered = applyFilters(mockTransactions, 'expense', '89.90');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Conta de Luz');
      expect(filtered[0].amount).toBe(-89.90);
    });
  });

  describe('Filter State Changes', () => {
    it('should handle switching between filter types', () => {
      // Start with all transactions
      const allFiltered = applyFilters(mockTransactions, 'all', '');
      expect(allFiltered).toHaveLength(7);

      // Switch to income only
      const incomeFiltered = applyFilters(mockTransactions, 'income', '');
      expect(incomeFiltered).toHaveLength(3);

      // Switch to expense only
      const expenseFiltered = applyFilters(mockTransactions, 'expense', '');
      expect(expenseFiltered).toHaveLength(4);

      // Switch to unprocessed only
      const unprocessedFiltered = applyFilters(mockTransactions, 'unprocessed', '');
      expect(unprocessedFiltered).toHaveLength(3);
    });

    it('should maintain text filter when switching types', () => {
      const searchTerm = 'TXN';

      const allWithSearch = applyFilters(mockTransactions, 'all', searchTerm);
      const incomeWithSearch = applyFilters(mockTransactions, 'income', searchTerm);
      const expenseWithSearch = applyFilters(mockTransactions, 'expense', searchTerm);
      const unprocessedWithSearch = applyFilters(mockTransactions, 'unprocessed', searchTerm);

      expect(allWithSearch).toHaveLength(7);
      expect(incomeWithSearch).toHaveLength(3); // All income transactions have TXN
      expect(expenseWithSearch).toHaveLength(4); // All expense transactions have TXN
      expect(unprocessedWithSearch).toHaveLength(3); // All unprocessed transactions have TXN
    });

    it('should handle clearing text filter', () => {
      // Apply both filters
      const withBothFilters = applyFilters(mockTransactions, 'expense', 'conta');
      expect(withBothFilters).toHaveLength(1);

      // Clear text filter
      const withTypeOnly = applyFilters(mockTransactions, 'expense', '');
      expect(withTypeOnly).toHaveLength(4);

      // Clear type filter
      const withTextOnly = applyFilters(mockTransactions, 'all', 'conta');
      expect(withTextOnly).toHaveLength(1);
    });
  });

  describe('Edge Cases with Combined Filters', () => {
    it('should handle empty results with combined filters', () => {
      const filtered = applyFilters(mockTransactions, 'income', 'supermercado');
      expect(filtered).toHaveLength(0);
    });

    it('should handle very specific combined filters', () => {
      const filtered = applyFilters(mockTransactions, 'unprocessed', 'freelance');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Freelance');
      expect(filtered[0].isProcessed).toBe(false);
      expect(filtered[0].amount).toBe(1200.00);
    });

    it('should handle whitespace in search with type filter', () => {
      const filtered = applyFilters(mockTransactions, 'expense', '   luz   ');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Conta de Luz');
    });

    it('should handle multiple words in search with type filter', () => {
      const filtered = applyFilters(mockTransactions, 'income', 'empresa xyz');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Salário Empresa XYZ');
    });

    it('should handle special characters with type filter', () => {
      // Add a transaction with special characters
      const transactionsWithSpecial = [
        ...mockTransactions,
        {
          id: '8',
          description: 'Compra @ Mercado Online',
          amount: -75.50,
          isProcessed: true,
          ofxTransId: 'TXN008',
        }
      ];

      const filtered = applyFilters(transactionsWithSpecial, 'expense', '@');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Compra @ Mercado Online');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', () => {
      // Create a larger dataset
      const largeDataset: Transaction[] = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          id: `txn-${i}`,
          description: i % 2 === 0 ? 'Income Transaction' : 'Expense Transaction',
          amount: i % 2 === 0 ? 100 + i : -100 - i,
          isProcessed: i % 3 === 0,
          ofxTransId: `TXN${i.toString().padStart(3, '0')}`,
        });
      }

      const filtered = applyFilters(largeDataset, 'income', 'transaction');
      expect(filtered).toHaveLength(500); // Half of the dataset
    });

    it('should handle very long search terms', () => {
      const longSearchTerm = 'a'.repeat(1000);
      const filtered = applyFilters(mockTransactions, 'all', longSearchTerm);
      expect(filtered).toHaveLength(0);
    });

    it('should handle search terms with many spaces', () => {
      const spacedSearchTerm = '   empresa   xyz   ';
      const filtered = applyFilters(mockTransactions, 'income', spacedSearchTerm);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Salário Empresa XYZ');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should simulate user workflow: find unprocessed expenses', () => {
      // User wants to find unprocessed expenses
      const step1 = applyFilters(mockTransactions, 'unprocessed', '');
      expect(step1).toHaveLength(3);

      // User then searches for a specific one
      const step2 = applyFilters(mockTransactions, 'unprocessed', 'farmácia');
      expect(step2).toHaveLength(1);
      expect(step2[0].description).toBe('Farmácia Drogasil');
    });

    it('should simulate user workflow: find large income transactions', () => {
      // User wants to find income transactions
      const step1 = applyFilters(mockTransactions, 'income', '');
      expect(step1).toHaveLength(3);

      // User searches for large amounts
      const step2 = applyFilters(mockTransactions, 'income', '2500');
      expect(step2).toHaveLength(1);
      expect(step2[0].description).toBe('Salário Empresa XYZ');
    });

    it('should simulate user workflow: find specific expense by ID', () => {
      // User wants to find expenses
      const step1 = applyFilters(mockTransactions, 'expense', '');
      expect(step1).toHaveLength(4);

      // User searches by transaction ID
      const step2 = applyFilters(mockTransactions, 'expense', 'TXN006');
      expect(step2).toHaveLength(1);
      expect(step2[0].description).toBe('Aluguel');
    });

    it('should handle switching filters mid-search', () => {
      // User starts with all transactions
      const allResults = applyFilters(mockTransactions, 'all', 'TXN');
      expect(allResults).toHaveLength(7);

      // User switches to income only
      const incomeResults = applyFilters(mockTransactions, 'income', 'TXN');
      expect(incomeResults).toHaveLength(3);

      // User switches to expenses only
      const expenseResults = applyFilters(mockTransactions, 'expense', 'TXN');
      expect(expenseResults).toHaveLength(4);

      // User goes back to all
      const backToAll = applyFilters(mockTransactions, 'all', 'TXN');
      expect(backToAll).toHaveLength(7);
    });
  });
});