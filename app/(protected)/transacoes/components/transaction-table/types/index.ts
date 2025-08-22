export interface Suggestion {
  id: string;
  confidence: number;
  createdAt: Date;
  source?: 'RULE' | 'AI';
  reasoning?: string | null;
  rule?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  suggestedCategory: {
    id: string;
    name: string;
    type: string;
    parent: { name: string } | null;
  } | null;
  suggestedProperty: {
    id: string;
    code: string;
    city: string;
  } | null;
}

export interface Transaction {
  id: string;
  year: number;
  month: number;
  details: string | null;
  isReviewed: boolean;
  isPending: boolean;
  transaction: {
    id: string;
    date: Date;
    description: string;
    amount: number;
    bankAccount: {
      name: string;
      bankName: string;
    };
  };
  category: {
    id: string;
    name: string;
    type: string;
    parent: {
      name: string;
    } | null;
  };
  property: {
    code: string;
    city: string;
  } | null;
  suggestions: Suggestion[];
}

export interface Category {
  id: string;
  name: string;
  level: number;
  type: string;
  parent: { name: string } | null;
}

export interface Property {
  id: string;
  code: string;
  city: string;
}

export interface TransactionTableProps {
  transactions: Transaction[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  categories?: Category[];
  properties?: Property[];
}

export interface EditingState {
  id: string | null;
  categoryId: string;
  propertyCode: string;
}

export interface BulkOperationState {
  categoryId: string;
  propertyCode: string;
}
