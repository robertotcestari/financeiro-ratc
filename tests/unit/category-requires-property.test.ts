import { describe, expect, it } from 'vitest';
import { categoryRequiresProperty } from '@/app/(protected)/transacoes/components/transaction-table/utils/category-requires-property';

describe('categoryRequiresProperty', () => {
  it('returns true for categories that require a property', () => {
    const required = [
      'Aluguel',
      'Aluguel de Terceiros',
      'Repasse de Aluguel',
      'Aluguel Pago',
      'Manutenção',
      'Condomínios',
    ];

    for (const category of required) {
      expect(categoryRequiresProperty(category)).toBe(true);
    }
  });

  it('returns false for categories that do not require a property', () => {
    const optional = ['Receita', 'IPTU', 'Energia', ''];

    for (const category of optional) {
      expect(categoryRequiresProperty(category)).toBe(false);
    }
  });

  it('returns false for null or undefined', () => {
    expect(categoryRequiresProperty(null)).toBe(false);
    expect(categoryRequiresProperty(undefined)).toBe(false);
  });
});
