import type { UseFormReturn } from 'react-hook-form';

export interface RuleFormValues {
  name: string;
  description?: string;
  categoryId: string;
  propertyId?: string;
  priority: number;
  criteria: {
    date?: {
      dayRange?: { start: number; end: number };
      months?: number[];
    };
    value?: {
      min?: number;
      max?: number;
      operator?: string;
    };
    description?: {
      keywords: string[];
      operator: string;
      caseSensitive?: boolean;
    };
    accounts?: string[];
  };
}

export type RuleFormReturn = UseFormReturn<RuleFormValues>;
