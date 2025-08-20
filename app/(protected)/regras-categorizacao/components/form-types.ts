import type { UseFormReturn } from 'react-hook-form';

export interface RuleFormValues {
  name: string;
  description?: string;
  categoryId: string;
  propertyId?: string | null;
  priority: number;
  criteria: {
    date?: {
      dayRange?: { start: number; end: number };
      months?: number[];
    };
    value?: {
      min?: number;
      max?: number;
      operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
    };
    description?: {
      keywords: string[];
      operator: 'and' | 'or';
      caseSensitive?: boolean;
    };
    accounts?: string[];
  };
}

export type RuleFormReturn = UseFormReturn<RuleFormValues>;
