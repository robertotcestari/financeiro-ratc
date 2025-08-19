import type { ProcessedTransaction } from '@/app/generated/prisma';

// Transaction context to be sent to LLM
export interface TransactionContext {
  transactionId: string; // Added to match transaction with response
  description: string;
  amount: number;
  date: Date;
  bankAccountName: string;
  bankAccountType: string;
  availableCategories: CategoryInfo[];
  availableProperties: PropertyInfo[];
  historicalPatterns?: HistoricalPattern[];
}

// Simplified category info for LLM context
export interface CategoryInfo {
  id: string;
  name: string;
  type: string;
  parentName?: string;
  level: number;
}

// Simplified property info for LLM context
export interface PropertyInfo {
  id: string;
  code: string;
  city: string;
  address: string;
}

// Historical pattern for learning from past categorizations
export interface HistoricalPattern {
  description: string;
  categoryName: string;
  propertyCode?: string;
  frequency: number;
}

// Response from LLM
export interface CategorySuggestion {
  transactionId: string; // Required to match with the transaction
  categoryId: string;
  categoryName: string;
  propertyId?: string;
  propertyCode?: string;
  reasoning: string;
  confidence?: number;
}

// AI suggestion data structure
export interface AISuggestionData {
  processedTransactionId: string;
  suggestedCategoryId: string;
  suggestedPropertyId?: string;
  confidence: number;
  reasoning: string;
  metadata: AIMetadata;
}

// Metadata about AI processing
export interface AIMetadata {
  modelUsed: string;
  processingTime: number;
  tokensUsed?: number;
  temperature?: number;
  timestamp: Date;
}

// Batch processing request
export interface BatchCategorizationRequest {
  transactions: ProcessedTransactionWithContext[];
  maxTokensPerRequest?: number;
  modelOverride?: string;
}

// Transaction with additional context
export interface ProcessedTransactionWithContext extends ProcessedTransaction {
  transaction?: {
    description: string;
    amount: number;
    date: Date;
    bankAccount: {
      name: string;
      accountType: string;
    };
  };
}

// AI response format
export interface AIResponse {
  suggestion: {
    categoryId: string;
    categoryName: string;
    propertyId?: string;
    propertyCode?: string;
    reasoning: string;
  };
  metadata: {
    processingTime: number;
    modelUsed: string;
  };
}

// Batch AI response format
export interface BatchAIResponse {
  suggestions: AIResponse[];
}

// Error handling
export interface AIError {
  code: 'RATE_LIMIT' | 'INVALID_RESPONSE' | 'API_ERROR' | 'VALIDATION_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
}