#!/usr/bin/env bash
# Import an OFX file via the REST API
# Usage: ./import-ofx.sh <ofx-file-path> <bank-account-id>
#
# Steps: parse → preview (show duplicates) → confirm import
set -euo pipefail

OFX_FILE="${1:?Usage: $0 <ofx-file-path> <bank-account-id>}"
BANK_ACCOUNT_ID="${2:?Usage: $0 <ofx-file-path> <bank-account-id>}"
API="${RATC_API_URL:?Set RATC_API_URL env var}"
KEY="${RATC_API_KEY:?Set RATC_API_KEY env var}"

AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"

# Read file content
if [ ! -f "$OFX_FILE" ]; then
  echo "ERROR: File not found: $OFX_FILE" >&2
  exit 1
fi

FILE_CONTENT=$(cat "$OFX_FILE")

# Escape for JSON (handles newlines, quotes, backslashes)
JSON_CONTENT=$(printf '%s' "$FILE_CONTENT" | jq -Rs .)

echo "=== Step 1: Parsing OFX ==="
PARSE_RESULT=$(curl -s -X POST -H "$AUTH" -H "$CT" \
  -d "{\"fileContent\": $JSON_CONTENT}" \
  "$API/ofx/parse")

TX_COUNT=$(echo "$PARSE_RESULT" | jq '.transactions | length')
echo "Transactions found: $TX_COUNT"

if [ "$TX_COUNT" -eq 0 ]; then
  echo "No transactions found in OFX file."
  echo "$PARSE_RESULT" | jq '.errors'
  exit 1
fi

echo ""
echo "=== Step 2: Preview Import ==="
PREVIEW_RESULT=$(curl -s -X POST -H "$AUTH" -H "$CT" \
  -d "{\"fileContent\": $JSON_CONTENT, \"bankAccountId\": \"$BANK_ACCOUNT_ID\"}" \
  "$API/ofx/preview")

echo "$PREVIEW_RESULT" | jq '.summary'

DUPS=$(echo "$PREVIEW_RESULT" | jq '.summary.duplicateTransactions // 0')
UNIQUE=$(echo "$PREVIEW_RESULT" | jq '.summary.uniqueTransactions // 0')

echo ""
echo "Unique: $UNIQUE | Duplicates: $DUPS"

if [ "$UNIQUE" -eq 0 ]; then
  echo "All transactions are duplicates. Nothing to import."
  exit 0
fi

echo ""
echo "=== Step 3: Importing $UNIQUE transactions ==="

# Build transactionActions: import all non-duplicates
ACTIONS=$(echo "$PREVIEW_RESULT" | jq '[.transactions[] | {key: .id, value: (if .isDuplicate then "skip" else "import" end)}] | from_entries')

IMPORT_RESULT=$(curl -s -X POST -H "$AUTH" -H "$CT" \
  -d "{\"fileContent\": $JSON_CONTENT, \"bankAccountId\": \"$BANK_ACCOUNT_ID\", \"transactionActions\": $ACTIONS}" \
  "$API/ofx/import")

echo "$IMPORT_RESULT" | jq '{success, importBatchId, importedCount, skippedCount, failedCount}'

SUCCESS=$(echo "$IMPORT_RESULT" | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  echo ""
  echo "Import completed successfully!"
else
  echo ""
  echo "ERROR: Import failed"
  echo "$IMPORT_RESULT" | jq '.error // .message'
  exit 1
fi
