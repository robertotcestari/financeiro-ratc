#!/usr/bin/env bash
# Send the monthly report email via the REST API
# Usage: ./send-report.sh <year> <month> [recipients]
# Recipients: comma-separated emails (default: roberto@ratc.com.br,fernanda@ratc.com.br)
set -euo pipefail

YEAR="${1:?Usage: $0 <year> <month> [recipients]}"
MONTH="${2:?Usage: $0 <year> <month> [recipients]}"
RECIPIENTS="${3:-roberto@ratc.com.br,fernanda@ratc.com.br}"
API="${RATC_API_URL:?Set RATC_API_URL env var}"
KEY="${RATC_API_KEY:?Set RATC_API_KEY env var}"

AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"

# Convert comma-separated to JSON array
RECIPIENTS_JSON=$(echo "$RECIPIENTS" | jq -R 'split(",")')

BODY=$(jq -n \
  --argjson year "$YEAR" \
  --argjson month "$MONTH" \
  --argjson recipients "$RECIPIENTS_JSON" \
  '{year: $year, month: $month, recipients: $recipients}')

echo "Sending monthly report for $YEAR-$(printf '%02d' $MONTH)..."
echo "Recipients: $RECIPIENTS"
echo ""

RESULT=$(curl -s -X POST -H "$AUTH" -H "$CT" \
  -d "$BODY" \
  "$API/reports/monthly/send")

SUCCESS=$(echo "$RESULT" | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  MSG_ID=$(echo "$RESULT" | jq -r '.messageId // "N/A"')
  echo "Email sent successfully! Message ID: $MSG_ID"
else
  ERROR=$(echo "$RESULT" | jq -r '.error // "Unknown error"')
  echo "ERROR: Failed to send email: $ERROR" >&2
  exit 1
fi
