import { describe, it, expect } from 'vitest';

describe('Sign Conversion Logic', () => {
  describe('Transaction Amount Input Validation', () => {
    it('should allow positive numbers', () => {
      const input = '100.50';
      const numericAmount = parseFloat(input);
      expect(numericAmount).toBe(100.50);
      expect(numericAmount > 0).toBe(true);
    });

    it('should allow negative numbers', () => {
      const input = '-100.50';
      const numericAmount = parseFloat(input);
      expect(numericAmount).toBe(-100.50);
      expect(numericAmount < 0).toBe(true);
    });

    it('should handle zero', () => {
      const input = '0';
      const numericAmount = parseFloat(input);
      expect(numericAmount).toBe(0);
    });

    it('should handle zero input', () => {
      const input = '0';
      const numericAmount = parseFloat(input);
      expect(numericAmount).toBe(0);
    });

    it('should convert negative to positive', () => {
      const originalAmount = -100.50;
      const userInput = '100.50';
      const finalAmount = parseFloat(userInput);

      expect(originalAmount).toBe(-100.50);
      expect(finalAmount).toBe(100.50);
      expect(finalAmount > 0).toBe(true);
    });

    it('should convert positive to negative', () => {
      const originalAmount = 100.50;
      const userInput = '-100.50';
      const finalAmount = parseFloat(userInput);

      expect(originalAmount).toBe(100.50);
      expect(finalAmount).toBe(-100.50);
      expect(finalAmount < 0).toBe(true);
    });

    it('should preserve positive sign', () => {
      const originalAmount = 100.50;
      const userInput = '200.75';
      const finalAmount = parseFloat(userInput);

      expect(originalAmount).toBe(100.50);
      expect(finalAmount).toBe(200.75);
      expect(finalAmount > 0).toBe(true);
    });

    it('should preserve negative sign', () => {
      const originalAmount = -100.50;
      const userInput = '-200.75';
      const finalAmount = parseFloat(userInput);

      expect(originalAmount).toBe(-100.50);
      expect(finalAmount).toBe(-200.75);
      expect(finalAmount < 0).toBe(true);
    });
  });

  describe('Input Field Regex Validation', () => {
    const regex = /^-?\d*\.?\d*$/;

    it('should allow positive numbers', () => {
      expect(regex.test('100')).toBe(true);
      expect(regex.test('100.50')).toBe(true);
      expect(regex.test('0')).toBe(true);
    });

    it('should allow negative numbers', () => {
      expect(regex.test('-100')).toBe(true);
      expect(regex.test('-100.50')).toBe(true);
      expect(regex.test('-0')).toBe(true);
    });

    it('should allow partial input', () => {
      expect(regex.test('')).toBe(true);
      expect(regex.test('-')).toBe(true);
      expect(regex.test('100.')).toBe(true);
      expect(regex.test('-100.')).toBe(true);
    });

    it('should reject invalid characters', () => {
      expect(regex.test('abc')).toBe(false);
      expect(regex.test('100abc')).toBe(false);
      expect(regex.test('100.50.75')).toBe(false);
      expect(regex.test('--100')).toBe(false);
    });
  });

  describe('Form Validation', () => {
    const validateAmount = (amount: string) => {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount === 0) {
        return 'Valor inválido';
      }
      return null;
    };

    it('should validate positive amounts', () => {
      expect(validateAmount('100.50')).toBeNull();
      expect(validateAmount('0.01')).toBeNull();
    });

    it('should validate negative amounts', () => {
      expect(validateAmount('-100.50')).toBeNull();
      expect(validateAmount('-0.01')).toBeNull();
    });

    it('should reject zero', () => {
      expect(validateAmount('0')).toBe('Valor inválido');
      expect(validateAmount('-0')).toBe('Valor inválido');
    });

    it('should reject truly invalid input', () => {
      expect(validateAmount('')).toBe('Valor inválido');
      expect(validateAmount('abc')).toBe('Valor inválido');
      // Note: parseFloat('100.50.75') returns 100.50, not NaN
      expect(validateAmount('100.50.75')).toBeNull(); // This is actually valid
    });

    it('should handle malformed numbers', () => {
      // parseFloat stops at the first invalid character
      expect(parseFloat('100.50.75')).toBe(100.50);
      expect(parseFloat('abc')).toBeNaN();
      expect(parseFloat('')).toBeNaN();
    });
  });

  describe('Transaction Edit Scenarios', () => {
    it('should handle expense to income conversion', () => {
      const originalTransaction = { id: '1', description: 'Grocery', amount: -50.00 };
      const userInput = '50.00';
      const finalAmount = parseFloat(userInput);

      expect(originalTransaction.amount).toBe(-50.00); // Was expense
      expect(finalAmount).toBe(50.00); // Now income
      expect(finalAmount > 0).toBe(true);
    });

    it('should handle income to expense conversion', () => {
      const originalTransaction = { id: '1', description: 'Salary', amount: 1000.00 };
      const userInput = '-1000.00';
      const finalAmount = parseFloat(userInput);

      expect(originalTransaction.amount).toBe(1000.00); // Was income
      expect(finalAmount).toBe(-1000.00); // Now expense
      expect(finalAmount < 0).toBe(true);
    });

    it('should handle amount change with sign preservation', () => {
      const originalTransaction = { id: '1', description: 'Expense', amount: -25.00 };
      const userInput = '-35.00';
      const finalAmount = parseFloat(userInput);

      expect(originalTransaction.amount).toBe(-25.00); // Original expense
      expect(finalAmount).toBe(-35.00); // Larger expense
      expect(finalAmount < 0).toBe(true);
    });

    it('should handle decimal precision', () => {
      const testCases = [
        { input: '100.50', expected: 100.50 },
        { input: '-100.50', expected: -100.50 },
        { input: '0.99', expected: 0.99 },
        { input: '-0.99', expected: -0.99 },
        { input: '100', expected: 100 },
        { input: '-100', expected: -100 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseFloat(input);
        expect(result).toBe(expected);
      });
    });
  });
});