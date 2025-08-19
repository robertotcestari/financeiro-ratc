export type ValueOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';

export interface RuleCriteria {
  date?: {
    dayRange?: { start: number; end: number }; // inclusive, 1-31
    months?: number[]; // 1-12 (Jan=1)
  };
  value?: {
    min?: number;
    max?: number;
    operator?: ValueOperator;
  };
  description?: {
    keywords: string[];
    operator: 'and' | 'or';
    caseSensitive?: boolean;
  };
  accounts?: string[]; // BankAccount IDs
}

/**
 * Lightweight validation for RuleCriteria shape and ranges.
 * Intent: defensive checks before evaluation. Does not enforce "at least one criterion".
 */
export function validateRuleCriteria(criteria: RuleCriteria): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (criteria.date?.dayRange) {
    const { start, end } = criteria.date.dayRange;
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      errors.push('date.dayRange.start and end must be integers');
    }
    if (start < 1 || start > 31 || end < 1 || end > 31) {
      errors.push('date.dayRange values must be in 1..31');
    }
    if (start > end) {
      errors.push('date.dayRange.start must be <= end');
    }
  }

  if (criteria.date?.months) {
    const invalid = criteria.date.months.filter(
      (m) => !Number.isInteger(m) || m < 1 || m > 12
    );
    if (invalid.length > 0) {
      errors.push(
        `date.months must be integers in 1..12. Invalid: ${invalid.join(', ')}`
      );
    }
  }

  if (criteria.value) {
    const { min, max, operator } = criteria.value;
    if (min != null && typeof min !== 'number')
      errors.push('value.min must be a number');
    if (max != null && typeof max !== 'number')
      errors.push('value.max must be a number');
    if (
      operator &&
      !['gt', 'gte', 'lt', 'lte', 'eq', 'between'].includes(operator)
    ) {
      errors.push(`value.operator must be one of gt|gte|lt|lte|eq|between`);
    }
    if (operator === 'between') {
      if (min == null || max == null)
        errors.push('value.operator=between requires min and max');
      if (min != null && max != null && min > max)
        errors.push('value.min must be <= value.max for between');
    }
    if (min != null && max != null && min > max) {
      errors.push('value.min must be <= value.max');
    }
  }

  if (criteria.description) {
    const { keywords, operator, caseSensitive } = criteria.description;
    if (!Array.isArray(keywords) || keywords.length === 0) {
      errors.push('description.keywords must be a non-empty string array');
    } else {
      const hasBad = keywords.some(
        (k) => typeof k !== 'string' || k.trim().length === 0
      );
      if (hasBad)
        errors.push('description.keywords must contain non-empty strings');
    }
    if (!['and', 'or'].includes(operator)) {
      errors.push('description.operator must be "and" or "or"');
    }
    if (caseSensitive != null && typeof caseSensitive !== 'boolean') {
      errors.push('description.caseSensitive must be boolean when provided');
    }
  }

  if (criteria.accounts) {
    if (!Array.isArray(criteria.accounts)) {
      errors.push('accounts must be an array of strings (BankAccount IDs)');
    } else {
      const bad = criteria.accounts.some(
        (id) => typeof id !== 'string' || id.trim().length === 0
      );
      if (bad) errors.push('accounts must contain non-empty string IDs');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Utility: normalize keywords array based on case sensitivity
 */
export function prepareKeywords(
  keywords: string[],
  caseSensitive: boolean | undefined
): string[] {
  return (keywords ?? [])
    .map((k) => (caseSensitive ? k : k.toLowerCase()).trim())
    .filter(Boolean);
}

/**
 * Utility: determines if a string contains a whole-word match for a given keyword.
 * Whole word defined by boundaries: start/end or non-alphanumeric separators.
 */
export function containsWholeWord(
  haystack: string,
  needle: string,
  caseSensitive?: boolean
): boolean {
  const h = caseSensitive ? haystack : haystack.toLowerCase();
  const n = caseSensitive ? needle : needle.toLowerCase();
  // Escape regex special chars in needle
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(^|[^\\p{L}\\p{N}_])${escaped}($|[^\\p{L}\\p{N}_])`,
    'u'
  );
  return re.test(h);
}

/**
 * Utility: simple "contains" check for partial matches
 */
export function containsSubstring(
  haystack: string,
  needle: string,
  caseSensitive?: boolean
): boolean {
  const h = caseSensitive ? haystack : haystack.toLowerCase();
  const n = caseSensitive ? needle : needle.toLowerCase();
  return h.includes(n);
}
