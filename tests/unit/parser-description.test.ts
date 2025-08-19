import { describe, it, expect } from 'vitest';
import { OFXParserService } from '@/lib/features/ofx/parser';

describe('OFXParserService - Description Building', () => {
  const parser = new OFXParserService();

  // Access the private method for testing
  const buildDescription = (
    name?: string | null,
    memo?: string | null,
    payee?: string | null,
    orig?: string | null
  ): string => {
    // Use reflection to access private method for testing
    return (parser as any).buildTransactionDescription(name, memo, payee, orig);
  };

  it('should return empty string when no fields are provided', () => {
    expect(buildDescription()).toBe('');
    expect(buildDescription(null, null, null, null)).toBe('');
    expect(buildDescription('', '', '', '')).toBe('');
  });

  it('should return single field when only one is provided', () => {
    expect(buildDescription('Transaction Name')).toBe('Transaction Name');
    expect(buildDescription(null, 'Memo text')).toBe('Memo text');
    expect(buildDescription(null, null, 'Payee Name')).toBe('Payee Name');
    expect(buildDescription(null, null, null, 'Origin')).toBe('Origin');
  });

  it('should combine name and memo when both are different', () => {
    expect(buildDescription('Transfer', 'To savings account')).toBe('Transfer - To savings account');
    expect(buildDescription('Purchase', 'Amazon.com')).toBe('Purchase - Amazon.com');
  });

  it('should prefer payee over name when both are different', () => {
    expect(buildDescription('Payment', 'Monthly fee', 'Bank ABC')).toBe('Bank ABC - Monthly fee');
    expect(buildDescription('Fee', null, 'Service Provider')).toBe('Service Provider');
  });

  it('should handle duplicate content intelligently', () => {
    // Same content in name and memo - should not duplicate
    expect(buildDescription('ATM Withdrawal', 'ATM Withdrawal')).toBe('ATM Withdrawal');
    
    // Case insensitive duplicate detection
    expect(buildDescription('Transfer', 'TRANSFER')).toBe('Transfer');
  });

  it('should combine name and memo when both have useful information', () => {
    // When both name and memo are different, combine them for more context
    expect(buildDescription('Short', 'Much longer description text')).toBe('Short - Much longer description text');
    
    // But when one is clearly not useful, prefer the better one
    expect(buildDescription('ATM', 'ATM WITHDRAWAL LOCATION 123 MAIN ST')).toBe('ATM - ATM WITHDRAWAL LOCATION 123 MAIN ST');
  });

  it('should trim whitespace from all fields', () => {
    expect(buildDescription('  Transfer  ', '  To account  ')).toBe('Transfer - To account');
    expect(buildDescription('   Only field   ')).toBe('Only field');
  });

  it('should handle null and undefined values correctly', () => {
    expect(buildDescription('Valid', null, undefined, '')).toBe('Valid');
    expect(buildDescription(undefined, 'Valid memo', null, '')).toBe('Valid memo');
  });
});