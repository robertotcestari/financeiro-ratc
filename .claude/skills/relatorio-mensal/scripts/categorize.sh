#!/usr/bin/env bash
# Categorize a single transaction via the REST API
# Usage: ./categorize.sh <transaction-id> <category-id> [property-id]
set -euo pipefail

TX_ID="${1:?Usage: $0 <transaction-id> <category-id> [property-id]}"
CATEGORY_ID="${2:?Usage: $0 <transaction-id> <category-id> [property-id]}"
PROPERTY_ID="${3:-}"
API="${RATC_API_URL:?Set RATC_API_URL env var}"
KEY="${RATC_API_KEY:?Set RATC_API_KEY env var}"

AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"

BODY="{\"categoryId\": \"$CATEGORY_ID\", \"markReviewed\": true"
if [ -n "$PROPERTY_ID" ]; then
  BODY="$BODY, \"propertyId\": \"$PROPERTY_ID\""
fi
BODY="$BODY}"

RESULT=$(curl -s -X PUT -H "$AUTH" -H "$CT" \
  -d "$BODY" \
  "$API/transactions/$TX_ID/categorize")

echo "$RESULT" | jq '{id: .data.id, description: .data.description, category: .data.category.name, property: .data.property.code}'
