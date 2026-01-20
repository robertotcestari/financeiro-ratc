# Scripts Directory Organization

## 📁 Structure

### `/analysis/`
Scripts for analyzing data and generating reports:
- `analyze-*.ts/js` - Pattern analysis scripts
- `calc-sum-sicredi.js` - Calculate Sicredi account sums
- `check-results.js` - Verify operation results
- `count-ids.js` - Count transaction IDs
- `final-summary.ts` - Generate final summary reports
- `find-missing-transactions.js` - Find missing transactions
- `list-*.js` - List various missing items

### `/database/`
Database management and verification scripts:
- `backup-database.js` - Database backup utility
- `check-balance*.ts/js` - Balance verification scripts
- `check-financial-integrity.ts` - Financial data integrity checks
- `check-transaction*.ts/js` - Transaction verification
- `correct-balance-calculation.ts` - Balance correction utilities
- `generate-snapshots.ts` - Generate account snapshots
- `verify-balance.ts` - Balance verification

### `/import/`
Data import and transformation scripts:
- `add-*.js/py` - Add IDs to CSV files
- `convert-unified-accounts.js` - Convert account data format
- `duplicate_csv_remove_balance.py` - Remove balance from CSV duplicates
- `import-unified-csv.ts` - Import unified CSV data
- `link-transactions.ts` - Link related transactions
- `update-unified-from-csv.ts` - Update data from CSV

### `/maintenance/`
System maintenance scripts:
- `remove-duplicates.ts` - Remove duplicate records
- `verify-categorization-rules.ts` - Verify categorization rules

### `/migration/`
Data migration and setup scripts:
- `category-mapping.js` - Map categories
- `create-sample-categories.js` - Create sample category data
- `fix-*.js` - Fix various data issues
- `migrate-cities.ts` - Migrate city data

### `/testing/`
Test and debug scripts:
- `clean-test-data.ts` - Clean test database
- `debug-*.ts` - Debug various components
- `test-*.ts` - Test specific features

### `/utils/`
Shared utilities:
- `csv.ts` - CSV parsing utilities

## Usage

Most scripts can be run with `tsx` (TypeScript) or `node` (JavaScript):

```bash
# TypeScript scripts
npx tsx scripts/database/check-balances.ts

# JavaScript scripts
node scripts/analysis/calc-sum-sicredi.js

# Python scripts
python scripts/import/add_nanoid_to_csv.py
```

## Important Scripts

### Database Backup
```bash
npm run db:backup
# or
node scripts/database/backup-database.js
```

### Generate Snapshots
```bash
npm run snapshots:generate
# or
npx tsx scripts/database/generate-snapshots.ts
```
