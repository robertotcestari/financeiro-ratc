#!/usr/bin/env bash
# Create a manual transaction via the REST API
# Usage: ./create-transaction.sh --account-id <id> --date <YYYY-MM-DD> --description <desc> --amount <value> [--category-id <id>] [--property-id <id>]
set -euo pipefail

API="${RATC_API_URL:?Set RATC_API_URL env var}"
KEY="${RATC_API_KEY:?Set RATC_API_KEY env var}"

AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"

# Parse arguments
ACCOUNT_ID=""
DATE=""
DESCRIPTION=""
AMOUNT=""
CATEGORY_ID=""
PROPERTY_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --account-id) ACCOUNT_ID="$2"; shift 2 ;;
    --date) DATE="$2"; shift 2 ;;
    --description) DESCRIPTION="$2"; shift 2 ;;
    --amount) AMOUNT="$2"; shift 2 ;;
    --category-id) CATEGORY_ID="$2"; shift 2 ;;
    --property-id) PROPERTY_ID="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [ -z "$ACCOUNT_ID" ] || [ -z "$DATE" ] || [ -z "$DESCRIPTION" ] || [ -z "$AMOUNT" ]; then
  echo "Usage: $0 --account-id <id> --date <YYYY-MM-DD> --description <desc> --amount <value> [--category-id <id>] [--property-id <id>]" >&2
  exit 1
fi

# Build JSON body
BODY=$(jq -n \
  --arg accountId "$ACCOUNT_ID" \
  --arg date "$DATE" \
  --arg desc "$DESCRIPTION" \
  --argjson amount "$AMOUNT" \
  --arg catId "$CATEGORY_ID" \
  --arg propId "$PROPERTY_ID" \
  '{
    bankAccountId: $accountId,
    date: $date,
    description: $desc,
    amount: $amount
  }
  + (if $catId != "" then {categoryId: $catId} else {} end)
  + (if $propId != "" then {propertyId: $propId} else {} end)')

RESULT=$(curl -s -X POST -H "$AUTH" -H "$CT" \
  -d "$BODY" \
  "$API/transactions")

STATUS=$(echo "$RESULT" | jq -r '.data.id // empty')
if [ -n "$STATUS" ]; then
  echo "Transaction created successfully:"
  echo "$RESULT" | jq '{id: .data.id, date: .data.date, description: .data.description, amount: .data.amount, category: .data.category.name, bankAccount: .data.bankAccount.name}'
else
  echo "ERROR: Failed to create transaction" >&2
  echo "$RESULT" | jq . >&2
  exit 1
fi
