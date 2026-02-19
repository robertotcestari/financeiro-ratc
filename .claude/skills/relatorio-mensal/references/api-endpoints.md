# API Endpoints Reference

Base URL: `$RATC_API_URL` (e.g., `https://financeiro.ratc.com.br/api/v1`)

All endpoints require: `Authorization: Bearer $RATC_API_KEY`

## Transactions

### List Transactions
```
GET /transactions?year=2025&month=12&hasCategory=false&limit=500
```
Query params: `year`, `month`, `bankAccountId`, `categoryId`, `hasCategory` (true/false), `isReviewed` (true/false), `page`, `limit` (max 500)

### Get Transaction Detail
```
GET /transactions/{id}
```

### Create Manual Transaction
```
POST /transactions
Body: { bankAccountId, date: "YYYY-MM-DD", description, amount, categoryId?, propertyId?, details? }
```

### Categorize Transaction
```
PUT /transactions/{id}/categorize
Body: { categoryId?: string|null, propertyId?: string|null, markReviewed?: boolean }
```

### Bulk Categorize
```
POST /transactions/bulk-categorize
Body: { ids: string[], categoryId?, propertyId?, markReviewed? }
```

### Mark Reviewed
```
PUT /transactions/{id}/review
Body: { reviewed: boolean }
```

### Update Details
```
PUT /transactions/{id}/details
Body: { details: string|null }
```

### Bulk Delete
```
POST /transactions/bulk-delete
Body: { ids: string[] }
```

## OFX Import

### Parse OFX
```
POST /ofx/parse
Body: { fileContent: string }
Returns: { success, version, format, accounts[], transactions[], errors[] }
```

### Preview Import
```
POST /ofx/preview
Body: { fileContent: string, bankAccountId: string }
Returns: { success, transactions[], summary: { totalTransactions, validTransactions, duplicateTransactions, uniqueTransactions } }
```

### Execute Import
```
POST /ofx/import
Body: {
  fileContent: string,
  bankAccountId: string,
  transactionActions: Record<id, "import"|"skip"|"review">,
  transactionCategories?: Record<id, categoryId|null>,
  transactionProperties?: Record<id, propertyId|null>
}
Returns: { success, importBatchId, importedCount, skippedCount, failedCount }
```

## Suggestions

### Generate Suggestions
```
POST /suggestions/generate
Body: { transactionIds: string[], ruleIds?: string[] }
Returns: { processed, suggested, matched }
```

### Get Suggestions for Transaction
```
GET /suggestions/{transactionId}
Returns: { data: Suggestion[] }
```

### Apply Suggestion
```
POST /suggestions/{id}/apply
```

### Bulk Apply
```
POST /suggestions/bulk-apply
Body: { suggestionIds: string[] }
```

### Dismiss Suggestion
```
DELETE /suggestions/{id}
```

### Bulk Dismiss
```
POST /suggestions/bulk-dismiss
Body: { suggestionIds: string[] }
```

## Reports

### Send Monthly Report Email
```
POST /reports/monthly/send
Body: { year: number, month: number, recipients: string[] }
Returns: { success, messageId? }
```

## Reference Data

### Categories
```
GET /categories
Returns: { data: [{ id, name, level, orderIndex, parentId }] }
```

### Bank Accounts
```
GET /bank-accounts
Returns: { data: [{ id, name, bankName, accountType, isActive, balance, balanceDate }] }
```

### Properties
```
GET /properties
Returns: { data: [{ id, code, description, city, address }] }
```

### DRE
```
GET /dre?year=2025&month=12
Returns: { data: [{ id, name, level, lineType, amount, isBold, showInReport }], period: { year, month } }
```

## Rules

### List Rules
```
GET /rules?isActive=true&page=1&limit=50
```

### Create Rule
```
POST /rules
Body: { name, description?, isActive, priority, criteria, categoryId?, propertyId? }
```

### Apply Rule Retroactively
```
POST /rules/{id}/apply
Body: { transactionIds: string[] }
```

## Transfers

### Detect Potential Transfers
```
POST /transfers/detect
Body: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
```

### Confirm Transfer
```
POST /transfers/confirm
Body: { originTransactionId, destinationTransactionId }
```

## Health Check (no auth)
```
GET /health
Returns: { status: "ok", version: "1.0.0" }
```
