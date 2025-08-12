import { describe, it, expect } from 'vitest';
import { isPendingTransaction } from '../../lib/database/transactions';

describe('isPendingTransaction', () => {
  it('returns true when isReviewed is false even with category and transaction', () => {
    const result = isPendingTransaction({
      isReviewed: false,
      categoryId: 'cat1',
      transactionId: 'tx1',
    });
    expect(result).toBe(true);
  });

  it('returns true when categoryId is null and reviewed true', () => {
    const result = isPendingTransaction({
      isReviewed: true,
      categoryId: null,
      transactionId: 'tx1',
    });
    expect(result).toBe(true);
  });

  it('returns true when transactionId is null and reviewed true', () => {
    const result = isPendingTransaction({
      isReviewed: true,
      categoryId: 'cat1',
      transactionId: null,
    });
    expect(result).toBe(true);
  });

  it('returns false when reviewed true with category and transaction present', () => {
    const result = isPendingTransaction({
      isReviewed: true,
      categoryId: 'cat1',
      transactionId: 'tx1',
    });
    expect(result).toBe(false);
  });
});
