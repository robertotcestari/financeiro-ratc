# Design Document - OFX Importer

## Overview

The OFX Importer feature will integrate with the existing financial management system to provide seamless import of OFX (Open Financial Exchange) files. The design leverages the current database schema and transaction processing patterns while adding OFX-specific parsing and validation capabilities.

The system will support both OFX 1.x (SGML) and OFX 2.x (XML) formats, providing a robust import pipeline that handles file validation, account mapping, duplicate detection, and automatic categorization.

## Architecture

### High-Level Flow

1. **File Upload & Validation**: User uploads OFX file through web interface
2. **Parsing & Extraction**: System parses OFX data and extracts transaction information
3. **Account Selection**: User manually selects which bank account to associate with the OFX transactions
4. **Duplicate Detection**: Check for existing transactions to prevent duplicates
5. **Preview & Review**: Display parsed transactions for user review and modification
6. **Import Execution**: Save validated transactions to database
7. **Summary Report**: Provide detailed import results

### Component Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Upload UI     │───▶│  OFX Parser     │───▶│ Import Service  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Account Selector│    │ Duplicate Check │
                       └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Categorization  │    │   Database      │
                       └─────────────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. OFX Parser Service

**Purpose**: Parse OFX files and extract transaction data

**Interface**:

```typescript
interface OFXParserService {
  parseFile(file: File): Promise<OFXParseResult>;
  validateFormat(content: string): OFXValidationResult;
  detectVersion(content: string): OFXVersion;
}

interface OFXParseResult {
  success: boolean;
  version: OFXVersion;
  accounts: OFXAccount[];
  transactions: OFXTransaction[];
  errors: ParseError[];
}

interface OFXAccount {
  accountId: string;
  bankId: string;
  accountType: 'CHECKING' | 'INVESTMENT';
  accountNumber?: string;
  routingNumber?: string;
}

interface OFXTransaction {
  transactionId: string;
  accountId: string;
  date: Date;
  amount: number;
  description: string;
  type: string;
  checkNumber?: string;
  memo?: string;
}
```

### 2. Account Selection Service

**Purpose**: Handle user selection of bank accounts for OFX imports

**Interface**:

```typescript
interface AccountSelectionService {
  getAllBankAccounts(): Promise<BankAccount[]>;
  validateAccountSelection(bankAccountId: string): Promise<boolean>;
  createNewBankAccount(
    accountData: CreateBankAccountData
  ): Promise<BankAccount>;
}
```

### 3. Duplicate Detection Service

**Purpose**: Identify potential duplicate transactions

**Interface**:

```typescript
interface DuplicateDetectionService {
  findDuplicates(
    transactions: OFXTransaction[],
    bankAccountId: string
  ): Promise<DuplicateMatch[]>;
  checkSingleTransaction(
    transaction: OFXTransaction,
    bankAccountId: string
  ): Promise<boolean>;
}

interface DuplicateMatch {
  ofxTransaction: OFXTransaction;
  existingTransaction: Transaction;
  confidence: number;
  matchCriteria: string[];
}
```

### 4. Import Service

**Purpose**: Orchestrate the import process

**Interface**:

```typescript
interface ImportService {
  processImport(file: File, bankAccountId: string): Promise<ImportResult>;
  previewImport(file: File, bankAccountId: string): Promise<ImportPreview>;
  executeImport(
    preview: ImportPreview,
    options: ImportOptions
  ): Promise<ImportResult>;
}

interface ImportPreview {
  accounts: AccountPreview[];
  transactions: TransactionPreview[];
  duplicates: DuplicateMatch[];
  summary: ImportSummary;
}

interface ImportResult {
  success: boolean;
  importBatchId: string;
  imported: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}
```

## Data Models

### Extended Database Schema

The existing schema will be extended with OFX-specific fields and tables:

```sql
-- Add OFX-specific fields to Transaction table
ALTER TABLE transactions ADD COLUMN ofx_trans_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN ofx_account_id VARCHAR(255);

-- Extend ImportBatch for OFX metadata
ALTER TABLE import_batches ADD COLUMN file_type ENUM('CSV', 'OFX') DEFAULT 'CSV';
ALTER TABLE import_batches ADD COLUMN ofx_version VARCHAR(10);
ALTER TABLE import_batches ADD COLUMN ofx_bank_id VARCHAR(255);
```

### TypeScript Models

```typescript
interface ExtendedTransaction extends Transaction {
  ofxTransId?: string;
  ofxAccountId?: string;
}

interface ExtendedImportBatch extends ImportBatch {
  fileType: 'CSV' | 'OFX';
  ofxVersion?: string;
  ofxBankId?: string;
}
```

## Error Handling

### Error Categories

1. **File Format Errors**

   - Invalid OFX format
   - Unsupported OFX version
   - Corrupted file content

2. **Parsing Errors**

   - Missing required fields
   - Invalid date formats
   - Invalid amount formats

3. **Account Selection Errors**

   - Invalid account selection
   - Account not accessible to user
   - Account creation failures

4. **Database Errors**
   - Constraint violations
   - Connection failures
   - Transaction rollback scenarios

### Error Handling Strategy

```typescript
interface ImportError {
  type:
    | 'FILE_FORMAT'
    | 'PARSING'
    | 'ACCOUNT_SELECTION'
    | 'DATABASE'
    | 'VALIDATION';
  code: string;
  message: string;
  details?: any;
  transactionIndex?: number;
  recoverable: boolean;
}

class OFXImportError extends Error {
  constructor(
    public type: ImportError['type'],
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}
```

## Testing Strategy

### Unit Tests

1. **OFX Parser Tests**

   - Test parsing of OFX 1.x and 2.x formats
   - Test error handling for malformed files
   - Test extraction of different transaction types

2. **Account Selection Tests**

   - Test account retrieval and validation logic
   - Test new account creation during import
   - Test account selection error handling

3. **Duplicate Detection Tests**
   - Test duplicate identification algorithms
   - Test confidence scoring
   - Test edge cases (same amount, different dates)

### Integration Tests

1. **End-to-End Import Flow**

   - Test complete import process with sample OFX files
   - Test error scenarios and recovery
   - Test database consistency after import

2. **UI Integration Tests**
   - Test file upload functionality
   - Test preview and review interfaces
   - Test user interaction flows

### Test Data

Create sample OFX files representing:

- Different OFX versions (1.x SGML, 2.x XML)
- Different account types (checking, investment)
- Various transaction types and edge cases
- Files with parsing errors for negative testing

## Security Considerations

1. **File Upload Security**

   - Validate file size limits
   - Scan for malicious content
   - Sanitize file names

2. **Data Validation**

   - Validate all parsed data before database insertion
   - Prevent SQL injection through parameterized queries
   - Validate date ranges and amount limits

3. **Access Control**
   - Ensure users can only import to their own accounts
   - Implement proper authentication checks
   - Log all import activities for audit

## Performance Considerations

1. **Large File Handling**

   - Stream processing for large OFX files
   - Batch database operations
   - Progress reporting for long-running imports

2. **Memory Management**

   - Avoid loading entire file into memory
   - Use generators/iterators for transaction processing
   - Implement cleanup for temporary data

3. **Database Optimization**
   - Use transactions for atomic imports
   - Optimize duplicate detection queries
   - Index OFX-specific fields for performance
