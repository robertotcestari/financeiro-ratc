#!/usr/bin/env bash
# Generate and apply rule-based categorization suggestions
# Usage: ./suggestions.sh <year> <month> [--auto-apply]
#
# Without --auto-apply: shows summary and lists suggestions
# With --auto-apply: automatically applies all generated suggestions
set -euo pipefail

YEAR="${1:?Usage: $0 <year> <month> [--auto-apply]}"
MONTH="${2:?Usage: $0 <year> <month> [--auto-apply]}"
AUTO_APPLY="${3:-}"
API="${RATC_API_URL:?Set RATC_API_URL env var}"
KEY="${RATC_API_KEY:?Set RATC_API_KEY env var}"

AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"

echo "=== Step 1: Finding uncategorized transactions for $YEAR-$(printf '%02d' $MONTH) ==="

# Get all uncategorized transaction IDs
UNCAT_RESPONSE=$(curl -s -H "$AUTH" \
  "$API/transactions?year=$YEAR&month=$MONTH&hasCategory=false&limit=500")

UNCAT_COUNT=$(echo "$UNCAT_RESPONSE" | jq '.data | length')
echo "Found $UNCAT_COUNT uncategorized transactions"

if [ "$UNCAT_COUNT" -eq 0 ]; then
  echo "Nothing to do — all transactions are already categorized!"
  exit 0
fi

# Extract IDs as JSON array
IDS_JSON=$(echo "$UNCAT_RESPONSE" | jq '[.data[].id]')

echo ""
echo "=== Step 2: Generating suggestions ==="

GEN_RESULT=$(curl -s -X POST -H "$AUTH" -H "$CT" \
  -d "{\"transactionIds\": $IDS_JSON}" \
  "$API/suggestions/generate")

PROCESSED=$(echo "$GEN_RESULT" | jq '.processed // 0')
SUGGESTED=$(echo "$GEN_RESULT" | jq '.suggested // 0')
MATCHED=$(echo "$GEN_RESULT" | jq '.matched // 0')

echo "Processed: $PROCESSED | Matched: $MATCHED | Suggested: $SUGGESTED"

if [ "$SUGGESTED" -eq 0 ]; then
  echo ""
  echo "No suggestions generated. $UNCAT_COUNT transactions remain uncategorized."
  echo "These need manual categorization."
  exit 0
fi

echo ""
echo "=== Step 3: Listing suggestions ==="

# Get suggestions for each transaction that had matches
SUGGESTION_IDS=""
SUGGESTION_COUNT=0

for TX_ID in $(echo "$UNCAT_RESPONSE" | jq -r '.data[].id'); do
  SUGS=$(curl -s -H "$AUTH" "$API/suggestions/$TX_ID")
  SUG_LIST=$(echo "$SUGS" | jq -r '.data // []')
  COUNT=$(echo "$SUG_LIST" | jq 'length')

  if [ "$COUNT" -gt 0 ]; then
    for i in $(seq 0 $((COUNT - 1))); do
      SUG_ID=$(echo "$SUG_LIST" | jq -r ".[$i].id")
      CONFIDENCE=$(echo "$SUG_LIST" | jq -r ".[$i].confidence // 0")
      CAT_NAME=$(echo "$SUG_LIST" | jq -r ".[$i].suggestedCategory.name // \"?\"")
      PROP_CODE=$(echo "$SUG_LIST" | jq -r ".[$i].suggestedProperty.code // \"-\"")

      # Get transaction description
      TX_DESC=$(echo "$UNCAT_RESPONSE" | jq -r ".data[] | select(.id == \"$TX_ID\") | .description // \"?\"")
      TX_AMOUNT=$(echo "$UNCAT_RESPONSE" | jq -r ".data[] | select(.id == \"$TX_ID\") | .amount // 0")

      echo "  [$CONFIDENCE] $TX_DESC (R$ $TX_AMOUNT) → $CAT_NAME | $PROP_CODE"

      if [ -z "$SUGGESTION_IDS" ]; then
        SUGGESTION_IDS="\"$SUG_ID\""
      else
        SUGGESTION_IDS="$SUGGESTION_IDS, \"$SUG_ID\""
      fi
      SUGGESTION_COUNT=$((SUGGESTION_COUNT + 1))
    done
  fi
done

echo ""
echo "Total suggestions: $SUGGESTION_COUNT"

if [ "$SUGGESTION_COUNT" -eq 0 ]; then
  echo "No applicable suggestions found."
  exit 0
fi

# Apply suggestions
if [ "$AUTO_APPLY" = "--auto-apply" ]; then
  echo ""
  echo "=== Step 4: Applying all $SUGGESTION_COUNT suggestions ==="

  APPLY_RESULT=$(curl -s -X POST -H "$AUTH" -H "$CT" \
    -d "{\"suggestionIds\": [$SUGGESTION_IDS]}" \
    "$API/suggestions/bulk-apply")

  SUCCESSFUL=$(echo "$APPLY_RESULT" | jq '.summary.successful // 0')
  FAILED=$(echo "$APPLY_RESULT" | jq '.summary.failed // 0')

  echo "Applied: $SUCCESSFUL | Failed: $FAILED"

  # Check remaining uncategorized
  REMAINING=$(curl -s -H "$AUTH" \
    "$API/transactions?year=$YEAR&month=$MONTH&hasCategory=false&limit=1" \
    | jq '.meta.total // 0')

  echo ""
  echo "Remaining uncategorized: $REMAINING"
else
  echo ""
  echo "Run with --auto-apply to apply all suggestions:"
  echo "  $0 $YEAR $MONTH --auto-apply"
fi
