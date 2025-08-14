import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBulkOperations } from '@/app/transacoes/components/transaction-table/hooks/useBulkOperations';
import { bulkCategorizeAction, bulkDeleteTransactionsAction } from '@/app/transacoes/actions';

// Mock the server actions
vi.mock('@/app/transacoes/actions', () => ({
  bulkCategorizeAction: vi.fn(),
  bulkDeleteTransactionsAction: vi.fn(),
}));

// Mock React's useTransition
let mockStartTransition: ((callback: () => void) => void) | undefined;
let mockIsPending = false;

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useTransition: () => {
      mockStartTransition = (callback: () => void) => {
        mockIsPending = true;
        callback();
        mockIsPending = false;
      };
      return [mockIsPending, mockStartTransition];
    },
  };
});

describe('useBulkOperations Hook', () => {
  const mockProperties = [
    { id: 'prop-1', code: 'CAT-001', city: 'Catanduva' },
    { id: 'prop-2', code: 'SJP-001', city: 'São José do Rio Preto' },
  ];

  const mockTransactions = [
    {
      id: 'trans-1',
      category: { id: 'cat-1', name: 'Category 1' },
      property: null,
    },
    {
      id: 'trans-2',
      category: { id: 'cat-2', name: 'Category 2' },
      property: { code: 'CAT-001' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  describe('handleBulkDelete', () => {
    it('should delete selected transactions and clear selection on success', async () => {
      vi.mocked(bulkDeleteTransactionsAction).mockResolvedValue({
        success: true,
        deletedCount: 2,
        message: 'Successfully deleted 2 transactions',
      });

      const { result } = renderHook(() =>
        useBulkOperations(mockProperties as any, mockTransactions as any)
      );

      // Select some transactions
      act(() => {
        result.current.setRowSelection({
          'trans-1': true,
          'trans-2': true,
        });
      });

      expect(result.current.rowSelection).toEqual({
        'trans-1': true,
        'trans-2': true,
      });

      // Call handleBulkDelete
      await act(async () => {
        await result.current.handleBulkDelete();
      });

      // Check that the action was called with correct IDs
      expect(bulkDeleteTransactionsAction).toHaveBeenCalledWith({
        ids: ['trans-1', 'trans-2'],
      });

      // Check that selection was cleared after successful deletion
      await waitFor(() => {
        expect(result.current.rowSelection).toEqual({});
      });
    });

    it('should not clear selection if deletion fails', async () => {
      vi.mocked(bulkDeleteTransactionsAction).mockResolvedValue({
        success: false,
        error: 'Failed to delete transactions',
        deletedCount: 0,
      });

      const { result } = renderHook(() =>
        useBulkOperations(mockProperties as any, mockTransactions as any)
      );

      // Select some transactions
      act(() => {
        result.current.setRowSelection({
          'trans-1': true,
          'trans-2': true,
        });
      });

      // Call handleBulkDelete
      await act(async () => {
        await result.current.handleBulkDelete();
      });

      // Check that selection was NOT cleared after failed deletion
      expect(result.current.rowSelection).toEqual({
        'trans-1': true,
        'trans-2': true,
      });
    });

    it('should do nothing if no transactions are selected', async () => {
      const { result } = renderHook(() =>
        useBulkOperations(mockProperties as any, mockTransactions as any)
      );

      // No selection
      expect(result.current.rowSelection).toEqual({});

      // Call handleBulkDelete
      await act(async () => {
        await result.current.handleBulkDelete();
      });

      // Check that the action was NOT called
      expect(bulkDeleteTransactionsAction).not.toHaveBeenCalled();
    });

    it('should handle single transaction deletion', async () => {
      vi.mocked(bulkDeleteTransactionsAction).mockResolvedValue({
        success: true,
        deletedCount: 1,
        message: 'Successfully deleted 1 transaction',
      });

      const { result } = renderHook(() =>
        useBulkOperations(mockProperties as any, mockTransactions as any)
      );

      // Select one transaction
      act(() => {
        result.current.setRowSelection({
          'trans-1': true,
        });
      });

      // Call handleBulkDelete
      await act(async () => {
        await result.current.handleBulkDelete();
      });

      // Check that the action was called with correct ID
      expect(bulkDeleteTransactionsAction).toHaveBeenCalledWith({
        ids: ['trans-1'],
      });

      // Check that selection was cleared
      await waitFor(() => {
        expect(result.current.rowSelection).toEqual({});
      });
    });
  });

  describe('handleBulkCategorize', () => {
    it('should categorize selected transactions', async () => {
      vi.mocked(bulkCategorizeAction).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() =>
        useBulkOperations(mockProperties as any, mockTransactions as any)
      );

      // Set up selection and category
      act(() => {
        result.current.setRowSelection({
          'trans-1': true,
          'trans-2': true,
        });
        result.current.setBulkCategory('cat-3');
        result.current.setBulkProperty('CAT-001');
      });

      // Call handleBulkCategorize
      await act(async () => {
        await result.current.handleBulkCategorize();
      });

      // Check that the action was called correctly
      expect(bulkCategorizeAction).toHaveBeenCalledWith({
        ids: ['trans-1', 'trans-2'],
        categoryId: 'cat-3',
        propertyId: 'prop-1', // Should find the property ID from code
        markReviewed: false,
      });

      // Check that selection and form were cleared
      await waitFor(() => {
        expect(result.current.rowSelection).toEqual({});
        expect(result.current.bulkCategory).toBe('');
        expect(result.current.bulkProperty).toBe('');
      });
    });
  });

  describe('handleBulkMarkReviewed', () => {
    it('should mark selected transactions as reviewed', async () => {
      vi.mocked(bulkCategorizeAction).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() =>
        useBulkOperations(mockProperties as any, mockTransactions as any)
      );

      // Select transactions
      act(() => {
        result.current.setRowSelection({
          'trans-1': true,
        });
      });

      // Call handleBulkMarkReviewed
      await act(async () => {
        await result.current.handleBulkMarkReviewed();
      });

      // Check that the action was called with markReviewed: true
      expect(bulkCategorizeAction).toHaveBeenCalledWith({
        ids: ['trans-1'],
        categoryId: 'cat-1', // Should use existing category from transaction
        markReviewed: true,
      });

      // Check that selection was cleared
      await waitFor(() => {
        expect(result.current.rowSelection).toEqual({});
      });
    });
  });

  describe('clearSelection', () => {
    it('should clear the row selection', () => {
      const { result } = renderHook(() =>
        useBulkOperations(mockProperties as any, mockTransactions as any)
      );

      // Set selection
      act(() => {
        result.current.setRowSelection({
          'trans-1': true,
          'trans-2': true,
        });
      });

      expect(result.current.rowSelection).toEqual({
        'trans-1': true,
        'trans-2': true,
      });

      // Clear selection
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.rowSelection).toEqual({});
    });
  });
});