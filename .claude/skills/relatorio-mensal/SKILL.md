---
name: Relatório Mensal (API)
description: End-to-end monthly financial closing workflow via REST API. Covers importing OFX bank files, categorizing transactions, balancing investment accounts, running verification checks, and sending the monthly report email. Use this skill at the beginning of each month to process the previous month's bank statements. Triggers on requests to "fechar o mês", "relatório mensal", "importar OFX", "categorizar transações", "monthly report", "monthly closing", or any mention of the monthly financial workflow.
---

# Relatório Mensal — Workflow via API

End-to-end workflow for monthly financial closing using the REST API.

## Prerequisites

Set these environment variables before running scripts:

```bash
export RATC_API_URL="https://financeiro.ratc.com.br/api/v1"
export RATC_API_KEY="<your-api-key>"
```

For local development:
```bash
export RATC_API_URL="http://localhost:3000/api/v1"
export RATC_API_KEY="ratc-dev-api-key-2026"
```

Scripts require `curl` and `jq`.

## First: Determine Target Month

**ALWAYS ask the user which month to process before starting.** Default is the previous month.

Example: If today is February 19, 2026, the default target is January 2026 (`YEAR=2026, MONTH=1`).

```bash
YEAR=2026
MONTH=1
```

Confirm with the user: "Vou processar o mês **janeiro/2026**. Correto?"

All scripts and commands below use `$YEAR` and `$MONTH`.

## Workflow Overview

```
0. Ask month       → Confirm with user
1. Backup          → SSH to production
2. Import OFX      → scripts/import-ofx.sh + confirm balance
3. Suggestions     → scripts/suggestions.sh
4. Categorize      → scripts/categorize.sh + heuristics
5. Investments     → scripts/create-transaction.sh (ask user for balances)
6. Checks          → scripts/checks.sh
7. Send Report     → scripts/send-report.sh
```

## Step 0: Database Backup (MANDATORY)

```bash
ssh robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && npm run cli -- backup"
```

**DO NOT PROCEED without a successful backup.**

## Step 1: List Bank Accounts

```bash
curl -s -H "Authorization: Bearer $RATC_API_KEY" "$RATC_API_URL/bank-accounts" | jq '.data[] | {id, name, bankName, balance}'
```

### Account Types

| Account | Type | Import Method |
|---------|------|---------------|
| CC - Sicredi | Checking | OFX file |
| CC - PJBank | Checking | **Imobzi** (not OFX) — web UI `/importacao-imobzi` |
| CC - BTG | Checking | OFX file |
| CI - SicrediInvest | Investment | Manual (Step 5) |
| CI - BTG | Investment | Manual (Step 5) |
| CI - XP | Investment | Manual (Step 5) |

## Step 2: Import OFX Files

For each account with an OFX file:

```bash
./scripts/import-ofx.sh <ofx-file-path> <bank-account-id>
```

### MANDATORY: Confirm Balance After Each Import

After importing, check the account balance in the app:

```bash
curl -s -H "Authorization: Bearer $RATC_API_KEY" "$RATC_API_URL/bank-accounts" \
  | jq '.data[] | select(.name == "CC - Sicredi") | {name, balance, balanceDate}'
```

**ASK THE USER**: "O saldo da conta **CC - Sicredi** no app é **R$ X.XXX,XX**. Confere com o extrato bancário?"

- If **YES** → proceed to next account
- If **NO** → investigate: missing transactions, duplicates, or wrong import. DO NOT continue until resolved.

**Repeat for each imported account.**

**CC - PJBank**: Do NOT use OFX. Import via Imobzi web UI — it has individual rental receipts with property identification.

## Step 3: Generate and Apply Suggestions

Use the suggestions script:

```bash
./scripts/suggestions.sh $YEAR $MONTH --auto-apply
```

This will:
1. Find all uncategorized transactions for the month
2. Generate rule-based suggestions
3. Show each suggestion with confidence level
4. Apply all suggestions automatically (with `--auto-apply`)

Without `--auto-apply`, it shows suggestions without applying (for review first).

## Step 4: Categorize Remaining Transactions

### 4.1: List uncategorized

```bash
curl -s -H "Authorization: Bearer $RATC_API_KEY" \
  "$RATC_API_URL/transactions?year=$YEAR&month=$MONTH&hasCategory=false&limit=500" \
  | jq '.data[] | {id, date, description, amount, bank: .bankAccount.name}'
```

### 4.2: Categorize using heuristics

For each uncategorized transaction, analyze the description and apply the correct category. See `references/categorization-guide.md` for pattern matching rules.

**Decision flow:**
1. Is it a transfer between RATC accounts? → "Transferência Entre Contas"
2. Does the description match a known pattern? → Use the matching category (see guide)
3. Is it a recurring transaction seen in previous months? → Use same category
4. Can't determine? → **Ask the user**

```bash
./scripts/categorize.sh <transaction-id> <category-id> [property-id]
```

### 4.3: When to ask the user

Present unidentified transactions in this format:
```
Transação não identificada:
- Data: 2025-12-15
- Descrição: PIX RECEBIDO - FULANO DE TAL
- Valor: R$ 1.500,00
- Conta: CC - Sicredi

Qual categoria? (se aplicável, qual imóvel?)
```

## Step 5: Balance Investment Accounts

Investment accounts (CI-*) don't have OFX. They need manual balancing with transfers and interest.

### 5.1: Identify Transfers from Checking Accounts

Search for transfer-related transactions in CC accounts for the month:

```bash
# Find APLICACAO FINANCEIRA and RESG.APLIC.FIN in CC - Sicredi
curl -s -H "Authorization: Bearer $RATC_API_KEY" \
  "$RATC_API_URL/transactions?year=$YEAR&month=$MONTH&bankAccountId=<cc-sicredi-id>&limit=500" \
  | jq '[.data[] | select(.description | test("APLIC|RESG|APLICACAO|RESGATE"; "i"))] | .[] | {date, description, amount}'
```

Calculate the net:
- **Aplicações** (negative in CC = money sent to CI): Sum absolute values
- **Resgates** (positive in CC = money received from CI): Sum absolute values
- **Net transfer** = Aplicações - Resgates

### 5.2: Create Transfer Transaction on CI Account

```bash
./scripts/create-transaction.sh \
  --account-id "<ci-account-id>" \
  --date "$YEAR-$(printf '%02d' $MONTH)-$(cal $MONTH $YEAR | awk 'NF{last=$NF}END{print last}')" \
  --description "Ajuste transferência - Saldo aplicações $(date -j -f '%Y-%m-%d' "$YEAR-$(printf '%02d' $MONTH)-01" '+%b/%Y' 2>/dev/null || echo "$MONTH/$YEAR")" \
  --amount <net-amount> \
  --category-id "<transfer-category-id>"
```

Use positive amount if net flow INTO investment, negative if OUT.

### 5.3: Ask User for Actual Bank Balance

**THIS REQUIRES USER INPUT.** Ask:

"Qual é o **saldo atual** da conta **CI - SicrediInvest** no extrato do banco/corretora no último dia do mês?"

### 5.4: Calculate and Add Interest

```bash
# Check app balance after adding transfers
APP_BALANCE=$(curl -s -H "Authorization: Bearer $RATC_API_KEY" "$RATC_API_URL/bank-accounts" \
  | jq -r '.data[] | select(.name == "CI - SicrediInvest") | .balance')

echo "Saldo no app: R$ $APP_BALANCE"
echo "Saldo no banco: R$ <user-provided-balance>"
echo "Rendimentos: R$ $(echo "<user-balance> - $APP_BALANCE" | bc)"
```

Create the interest transaction:

```bash
./scripts/create-transaction.sh \
  --account-id "<ci-account-id>" \
  --date "$YEAR-$(printf '%02d' $MONTH)-31" \
  --description "Rendimentos $(date -j -f '%Y-%m-%d' "$YEAR-$(printf '%02d' $MONTH)-01" '+%b/%Y' 2>/dev/null || echo "$MONTH/$YEAR")" \
  --amount <interest> \
  --category-id "<rendimentos-category-id>"
```

### 5.5: Confirm Balance Matches

After adding transfers + interest, verify:

```bash
curl -s -H "Authorization: Bearer $RATC_API_KEY" "$RATC_API_URL/bank-accounts" \
  | jq '.data[] | select(.name == "CI - SicrediInvest") | {name, balance}'
```

**ASK THE USER**: "O saldo da CI - SicrediInvest agora é R$ X.XXX,XX. Confere com o extrato?"

### 5.6: Repeat for CI - BTG and CI - XP

Apply the same process (5.1–5.5) for each investment account that had activity.

## Step 6: Verification Checks (MANDATORY)

```bash
./scripts/checks.sh $YEAR $MONTH
```

Verifies:
1. **Transfers sum to zero** — "Transferência Entre Contas" must net R$ 0,00
2. **All categorized** — No uncategorized transactions remain
3. **DRE summary** — Shows financial results for review

**All checks MUST pass before proceeding.**

## Step 7: Send Monthly Report

```bash
./scripts/send-report.sh $YEAR $MONTH "roberto@ratc.com.br,fernanda@ratc.com.br"
```

## Complete Checklist

1. [ ] Ask user: which month?
2. [ ] Backup database
3. [ ] Import OFX: CC - Sicredi → **confirm balance**
4. [ ] Import Imobzi: CC - PJBank (web UI) → **confirm balance**
5. [ ] Import OFX: CC - BTG → **confirm balance**
6. [ ] Generate and apply suggestions (`scripts/suggestions.sh`)
7. [ ] Categorize remaining transactions (heuristics + ask user)
8. [ ] Balance CI - SicrediInvest → ask user for actual balance → add transfers + interest → **confirm balance**
9. [ ] Balance CI - BTG → same process
10. [ ] Balance CI - XP → same process
11. [ ] CHECK: Transfers sum = 0
12. [ ] CHECK: No uncategorized transactions
13. [ ] CHECK: DRE summary correct
14. [ ] Send monthly report email

## References

- **API Endpoints**: See `references/api-endpoints.md` for complete endpoint documentation
- **Categories**: See `references/categories.md` for the full category hierarchy
- **Categorization Guide**: See `references/categorization-guide.md` for description-to-category mapping patterns
