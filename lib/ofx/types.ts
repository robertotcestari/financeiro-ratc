/**
 * OFX (Open Financial Exchange) Type Definitions
 */

export type OFXVersion = '1.x' | '2.x';
export type OFXFormat = 'SGML' | 'XML';

export interface OFXAccount {
  accountId: string;
  bankId: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'CREDITCARD';
  accountNumber?: string;
  routingNumber?: string;
}

export interface OFXTransaction {
  transactionId: string;
  accountId: string;
  date: Date;
  amount: number;
  description: string;
  type: string;
  checkNumber?: string;
  memo?: string;
}

export interface ParseError {
  type: 'FILE_FORMAT' | 'PARSING' | 'VALIDATION';
  code: string;
  message: string;
  line?: number;
  details?: any;
}

export interface OFXParseResult {
  success: boolean;
  version: OFXVersion;
  format: OFXFormat;
  accounts: OFXAccount[];
  transactions: OFXTransaction[];
  errors: ParseError[];
}

export interface OFXValidationResult {
  isValid: boolean;
  format: OFXFormat | null;
  version: OFXVersion | null;
  errors: ParseError[];
}

export interface OFXFormatDetectionResult {
  format: OFXFormat;
  version: OFXVersion;
  confidence: number;
}

// Duplicate Detection Types
export interface DuplicateMatch {
  ofxTransaction: OFXTransaction;
  existingTransaction: any; // Transaction from Prisma
  confidence: number;
  matchCriteria: string[];
  isExactMatch: boolean;
}

export interface DuplicateDetectionResult {
  duplicates: DuplicateMatch[];
  uniqueTransactions: OFXTransaction[];
  summary: {
    total: number;
    duplicates: number;
    unique: number;
    exactMatches: number;
    potentialMatches: number;
  };
}

export interface DuplicatePreview {
  transaction: OFXTransaction;
  matches: DuplicateMatch[];
  recommendation: 'skip' | 'import' | 'review';
  reason: string;
}
