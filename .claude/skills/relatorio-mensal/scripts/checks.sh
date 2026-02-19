#!/usr/bin/env bash
# Run all monthly verification checks via the REST API
# Usage: ./checks.sh <year> <month>
set -euo pipefail

YEAR="${1:?Usage: $0 <year> <month>}"
MONTH="${2:?Usage: $0 <year> <month>}"
API="${RATC_API_URL:?Set RATC_API_URL env var}"
KEY="${RATC_API_KEY:?Set RATC_API_KEY env var}"

AUTH="Authorization: Bearer $KEY"
PASS=0
FAIL=0

echo "========================================"
echo "  Monthly Checks: $YEAR-$(printf '%02d' $MONTH)"
echo "========================================"
echo ""

# --- Check 1: Transfers Sum to Zero ---
echo "--- Check 1: Transfers Sum to Zero ---"

# Get "Transferência Entre Contas" category ID
TRANSFER_CAT_ID=$(curl -s -H "$AUTH" "$API/categories" \
  | jq -r '.data[] | select(.name == "Transferência Entre Contas") | .id')

if [ -z "$TRANSFER_CAT_ID" ]; then
  echo "WARNING: Could not find 'Transferência Entre Contas' category"
  FAIL=$((FAIL + 1))
else
  TRANSFER_TXS=$(curl -s -H "$AUTH" \
    "$API/transactions?year=$YEAR&month=$MONTH&categoryId=$TRANSFER_CAT_ID&limit=500")

  TRANSFER_SUM=$(echo "$TRANSFER_TXS" | jq '[.data[].amount // 0] | add // 0')
  TRANSFER_COUNT=$(echo "$TRANSFER_TXS" | jq '.data | length')

  # Check if sum is zero (allow tiny floating point difference)
  IS_ZERO=$(echo "$TRANSFER_SUM" | awk '{if ($1 > -0.01 && $1 < 0.01) print "true"; else print "false"}')

  if [ "$IS_ZERO" = "true" ]; then
    echo "PASS: $TRANSFER_COUNT transfers, sum = R$ $(printf '%.2f' $TRANSFER_SUM)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $TRANSFER_COUNT transfers, sum = R$ $(printf '%.2f' $TRANSFER_SUM) (expected 0.00)"
    FAIL=$((FAIL + 1))
    echo ""
    echo "Transfer details:"
    echo "$TRANSFER_TXS" | jq -r '.data[] | "  \(.date) | \(.bankAccount.name // "?") | \(.description // "?") | R$ \(.amount)"'
  fi
fi

echo ""

# --- Check 2: All Transactions Categorized ---
echo "--- Check 2: All Transactions Categorized ---"

UNCATEGORIZED=$(curl -s -H "$AUTH" \
  "$API/transactions?year=$YEAR&month=$MONTH&hasCategory=false&limit=500")

UNCAT_COUNT=$(echo "$UNCATEGORIZED" | jq '.data | length')

if [ "$UNCAT_COUNT" -eq 0 ]; then
  echo "PASS: All transactions categorized"
  PASS=$((PASS + 1))
else
  echo "FAIL: $UNCAT_COUNT uncategorized transactions"
  FAIL=$((FAIL + 1))
  echo ""
  echo "Uncategorized transactions:"
  echo "$UNCATEGORIZED" | jq -r '.data[:10][] | "  \(.date) | \(.bankAccount.name // "?") | \(.description // "?") | R$ \(.amount)"'
  if [ "$UNCAT_COUNT" -gt 10 ]; then
    echo "  ... and $((UNCAT_COUNT - 10)) more"
  fi
fi

echo ""

# --- Check 3: DRE Summary ---
echo "--- Check 3: DRE Summary ---"

DRE=$(curl -s -H "$AUTH" "$API/dre?year=$YEAR&month=$MONTH")
DRE_OK=$(echo "$DRE" | jq '.data | length > 0')

if [ "$DRE_OK" = "true" ]; then
  echo "PASS: DRE generated successfully"
  PASS=$((PASS + 1))
  echo ""
  echo "DRE Summary:"
  echo "$DRE" | jq -r '.data[] | select(.lineType == "TOTAL" or .lineType == "SUBTOTAL") | "  \(.name): R$ \(.amount)"'
else
  echo "FAIL: Could not generate DRE"
  FAIL=$((FAIL + 1))
fi

echo ""

# --- Summary ---
echo "========================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "ACTION REQUIRED: Fix the failing checks before sending the monthly report."
  exit 1
else
  echo ""
  echo "All checks passed! Ready to send monthly report."
  exit 0
fi
