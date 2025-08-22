import { describe, it, expect } from 'vitest';

describe('Text Filter Logic', () => {
  const mockTransactions = [
    {
      id: '1',
      description: 'Supermercado Extra',
      amount: -150.50,
      ofxTransId: 'TXN001',
    },
    {
      id: '2',
      description: 'Salário Empresa XYZ',
      amount: 2500.00,
      ofxTransId: 'TXN002',
    },
    {
      id: '3',
      description: 'Conta de Luz',
      amount: -89.90,
      ofxTransId: 'TXN003',
    },
    {
      id: '4',
      description: 'Transferência PIX',
      amount: 300.00,
      ofxTransId: 'TXN004',
    },
    {
      id: '5',
      description: 'Farmácia Drogasil',
      amount: -45.75,
      ofxTransId: 'TXN005',
    },
  ];

  // Simulate TanStack Table's default global filter function
  const defaultGlobalFilter = (row: any, columnId: string, filterValue: string) => {
    const searchTerm = filterValue.toLowerCase().trim();

    // Search in all relevant fields
    const description = (row.getValue('description') as string || '').toLowerCase();
    const ofxTransId = (row.getValue('ofxTransId') as string || '').toLowerCase();
    const amount = String(row.getValue('amount') || '').toLowerCase();

    return description.includes(searchTerm) ||
           ofxTransId.includes(searchTerm) ||
           amount.includes(searchTerm);
  };

  // Helper function to filter transactions
  const filterTransactions = (transactions: typeof mockTransactions, filterValue: string) => {
    if (!filterValue.trim()) {
      return transactions;
    }

    return transactions.filter(transaction => {
      const searchTerm = filterValue.toLowerCase().trim();

      // Mock row object for the filter function
      const mockRow = {
        getValue: (columnId: string) => {
          switch (columnId) {
            case 'description': return transaction.description;
            case 'amount': return transaction.amount.toFixed(2);
            case 'ofxTransId': return transaction.ofxTransId;
            default: return '';
          }
        }
      };

      return defaultGlobalFilter(mockRow, '', searchTerm);
    });
  };

  it('should filter by description (case insensitive)', () => {
    const filtered = filterTransactions(mockTransactions, 'supermercado');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe('Supermercado Extra');
  });

  it('should filter by partial description', () => {
    const filtered = filterTransactions(mockTransactions, 'mercado');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe('Supermercado Extra');
  });

  it('should filter by transaction ID', () => {
    const filtered = filterTransactions(mockTransactions, 'TXN002');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ofxTransId).toBe('TXN002');
  });

  it('should filter by partial transaction ID', () => {
    const filtered = filterTransactions(mockTransactions, 'TXN');
    expect(filtered).toHaveLength(5);
  });

  it('should show no results for non-matching filter', () => {
    const filtered = filterTransactions(mockTransactions, 'nonexistent');
    expect(filtered).toHaveLength(0);
  });

  it('should show all results when filter is empty', () => {
    const filtered = filterTransactions(mockTransactions, '');
    expect(filtered).toHaveLength(5);
  });

  it('should show all results when filter is only spaces', () => {
    const filtered = filterTransactions(mockTransactions, '   ');
    expect(filtered).toHaveLength(5);
  });

  it('should handle mixed case search', () => {
    const filtered = filterTransactions(mockTransactions, 'SUPER');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe('Supermercado Extra');
  });

  it('should handle multiple words in search', () => {
    const filtered = filterTransactions(mockTransactions, 'empresa xyz');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe('Salário Empresa XYZ');
  });

  it('should handle search with spaces', () => {
    const filtered = filterTransactions(mockTransactions, '   supermercado   ');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe('Supermercado Extra');
  });

  it('should handle numbers in search', () => {
    const filtered = filterTransactions(mockTransactions, '150');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].amount).toBe(-150.50);
  });

  it('should handle special characters in search', () => {
    const transactionsWithSpecialChars = [
      {
        id: '1',
        description: 'Compra @ Mercado',
        amount: -50.00,
        ofxTransId: 'TXN001',
      },
    ];

    const filtered = filterTransactions(transactionsWithSpecialChars, '@');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe('Compra @ Mercado');
  });

  it('should handle empty transaction list', () => {
    const filtered = filterTransactions([], 'anything');
    expect(filtered).toHaveLength(0);
  });

  it('should handle transactions with null or undefined values', () => {
    const transactionsWithNulls = [
      {
        id: '1',
        description: 'Test Transaction',
        amount: -100.00,
        ofxTransId: '' as any, // Simulate null/undefined
      },
      {
        id: '2',
        description: '' as any, // Simulate null/undefined
        amount: 50.00,
        ofxTransId: 'TXN002',
      },
    ];

    const filtered = filterTransactions(transactionsWithNulls, 'test');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe('Test Transaction');
  });

  it('should handle very long search terms', () => {
    const filtered = filterTransactions(mockTransactions, 'a'.repeat(1000));
    expect(filtered).toHaveLength(0);
  });

  it('should handle search with unicode characters', () => {
    const transactionsWithUnicode = [
      {
        id: '1',
        description: 'Compra café ☕',
        amount: -5.50,
        ofxTransId: 'TXN001',
      },
    ];

    const filtered = filterTransactions(transactionsWithUnicode, '☕');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe('Compra café ☕');
  });

  it('should handle decimal numbers in search', () => {
    const filtered = filterTransactions(mockTransactions, '150.50');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].amount).toBe(-150.50);
  });

  it('should handle negative numbers in search', () => {
    const filtered = filterTransactions(mockTransactions, '-150.50');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].amount).toBe(-150.50);
  });

  it('should handle partial number matches', () => {
    const filtered = filterTransactions(mockTransactions, '250');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].amount).toBe(2500.00);
  });

  it('should handle multiple matches across different fields', () => {
    const transactionsWithMultipleMatches = [
      {
        id: '1',
        description: 'Test 123',
        amount: 456.00,
        ofxTransId: 'TXN123',
      },
      {
        id: '2',
        description: 'Another Test',
        amount: 123.00,
        ofxTransId: 'TXN456',
      },
    ];

    const filtered = filterTransactions(transactionsWithMultipleMatches, '123');
    expect(filtered).toHaveLength(2);
    expect(filtered.map(t => t.id)).toEqual(['1', '2']);
  });
});