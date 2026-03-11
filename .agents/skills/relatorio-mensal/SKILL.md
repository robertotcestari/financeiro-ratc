---
name: Relatório Mensal (API)
description: End-to-end monthly financial closing workflow via REST API. Covers importing OFX bank files, categorizing transactions, balancing investment accounts, running verification checks, and sending the monthly report email. Use this skill at the beginning of each month to process the previous month's bank statements. Triggers on requests to "fechar o mês", "relatório mensal", "importar OFX", "categorizar transações", "monthly report", "monthly closing", or any mention of the monthly financial workflow.
---

# Relatório Mensal — Workflow via API

End-to-end workflow for monthly financial closing using the REST API.

## MANDATORY: Create Task List

**At the very start of the workflow, after confirming the target month, use `TaskCreate` to create one task for each step below.** This tracks progress and keeps the user informed.

Create these tasks (adjust month/year in subjects):

1. "Backup do banco de dados" — activeForm: "Fazendo backup do banco"
2. "Importar OFX: CC - Sicredi" — activeForm: "Importando OFX do Sicredi"
3. "Confirmar saldo: CC - Sicredi" — activeForm: "Confirmando saldo do Sicredi"
4. "Importar Imobzi: CC - PJBank" — activeForm: "Importando Imobzi do PJBank"
5. "Confirmar saldo: CC - PJBank" — activeForm: "Confirmando saldo do PJBank"
6. "Importar OFX: CC - BTG" — activeForm: "Importando OFX do BTG"
7. "Confirmar saldo: CC - BTG" — activeForm: "Confirmando saldo do BTG"
8. "Gerar e aplicar sugestões de categorização" — activeForm: "Aplicando sugestões automáticas"
9. "Categorizar transações restantes" — activeForm: "Categorizando transações"
10. "Balancear CI - SicrediInvest" — activeForm: "Balanceando SicrediInvest"
11. "Balancear CI - BTG" — activeForm: "Balanceando CI - BTG"
12. "Balancear CI - XP" — activeForm: "Balanceando CI - XP"
13. "Verificações finais (checks)" — activeForm: "Rodando verificações"
14. "Enviar relatório mensal por email" — activeForm: "Enviando relatório"

**Rules:**
- Use `TaskUpdate` to set status `in_progress` BEFORE starting each step
- Use `TaskUpdate` to set status `completed` AFTER finishing each step
- If a step is blocked (e.g., user hasn't provided OFX file), skip to the next unblocked task
- If a step fails, keep it `in_progress` and explain the issue to the user
- **NEVER mark transactions as "reviewed" (`isReviewed`).** Reviewing is a human-only step done manually after the workflow. Do not pass `markReviewed: true` when categorizing.
- **NEVER create transfers or transfer adjustments.** Transfers already exist in the bank statements (OFX/Imobzi) — they are imported, not created. Do not use `create-transaction.sh` or `POST /transactions` to fabricate transfer transactions. Every "Transferência Entre Contas" entry must have a real counterpart in another account — the net of ALL transfer transactions for the month must be exactly R$0,00.
- **CI-SicrediInvest: NEVER use a single lump-sum "ajuste".** Each APLICACAO FINANCEIRA in CC-Sicredi must have an individual mirror transaction (opposite sign) in CI-SicrediInvest, and each RESG.APLIC likewise. Do NOT create one aggregate "Ajuste transferencia" — create one transaction per APLIC/RESG entry.

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
| CC - BTG | Checking | **CSV file (not OFX)** — BTG exports CSV, must be imported manually via `POST /transactions` |
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

**CC - PJBank**: Do NOT use OFX. Follow these steps in order:

### 2a. Reconcile PJBank PDF vs Imobzi

**Ask the user to provide the PJBank PDF extract.** Then run the reconciliation:

```bash
# 1. Authenticate with Imobzi
TOKEN=$(curl -s -X POST \
  "https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=AIzaSyAFwmj0iszcf433EvcZ2bxs-XrK49ma4xA" \
  -H "Content-Type: application/json" \
  -d '{"email":"robertotcestari@gmail.com","password":"Ratc12345","returnSecureToken":true}' \
  | jq -r '.idToken')

# 2. Fetch Imobzi transactions for the month
curl -s "https://api.imobzi.app/v1/financial/transactions?start_at=$YEAR-$MONTH_PADDED-01&end_at=$YEAR-$MONTH_PADDED-31&periodType=this_month&order_by=due_date&sort_by=asc&page=1&account_id=6029003447074816" \
  -H "Authorization: $TOKEN" \
  | jq '[.transactions[] | {date: .paid_at, value: .total_value, type: .transaction_type, contact: .contact.name}]'
```

**Compare Imobzi totals per day against the PJBank PDF:**
- Imobzi income − Imobzi expenses (fees) per day = PJBank net per day
- The PJBank groups boletos by day; Imobzi has individual transactions per tenant
- If totals match → all receipts are recorded in Imobzi ✅

### 2b. Register PJBank Outgoing Transfers in Imobzi (MANDATORY)

The PJBank PDF will show **Pix debits** (transfers to Sicredi). These are NOT automatically in Imobzi and must be created manually so the Imobzi balance matches PJBank.

**For each Pix debit in the PDF, create a transfer in Imobzi:**

```bash
TOKEN=$(curl -s -X POST \
  "https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=AIzaSyAFwmj0iszcf433EvcZ2bxs-XrK49ma4xA" \
  -H "Content-Type: application/json" \
  -d '{"email":"robertotcestari@gmail.com","password":"Ratc12345","returnSecureToken":true}' \
  | jq -r '.idToken')

PJBANK_ACCOUNT='{"db_id":6029003447074816,"account_number":"3000013744-7","account_type":"digital_account","active":true,"agency":"0001","balance":0,"created_at":"2023-04-03T13:02:41.614662Z","default":false,"description":"Conta Digital PJBank","favorite":true,"name":"PJBank","has_transactions":true,"has_integration":true,"has_digital_account":true,"initial_value":0,"start_at":"2023-04-01","bank":{"code":"301","db_id":5762824273920000,"logo_url":null,"name":"BPP Instituição de Pagamentos S/A"}}'
SICREDI_ACCOUNT='{"db_id":5253871883517952,"account_number":"44319-0","account_type":"others","active":true,"agency":"3003","balance":0,"created_at":"2023-03-23T12:03:11.825866Z","default":false,"description":"Sicredi","favorite":false,"name":"Sicredi","has_transactions":true,"has_integration":false,"has_digital_account":false,"initial_value":38994.74,"start_at":"2023-03-23","bank":{"code":"748","db_id":5759180434571264,"logo_url":null,"name":"Banco Cooperativo Sicredi S. A."}}'
CONTACT='{"db_id":5074170158252032,"name":"Ratc Gerenciamento e Administração de Bens Ltda","type":"organization"}'

curl -s -X POST "https://my.imobzi.com/v1/financial/transactions" \
  -H "accept: application/json, text/plain, */*" \
  -H "authorization: $TOKEN" \
  -H "content-type: application/json" \
  -H "origin: https://my.imobzi.com" \
  -H "referer: https://my.imobzi.com/" \
  --data-raw "{
    \"transaction_type\": \"transference\",
    \"description\": \"<description from PDF>\",
    \"value\": <amount>,
    \"payment_method\": \"Pix\",
    \"paid\": true,
    \"paid_at\": \"<YYYY-MM-DD>\",
    \"account_to\": $SICREDI_ACCOUNT,
    \"account_from\": $PJBANK_ACCOUNT,
    \"account\": $PJBANK_ACCOUNT,
    \"tags\": [], \"attachments\": [],
    \"contact\": $CONTACT,
    \"pix_key_type\": \"cpf_cnpj\",
    \"pix_key\": \"13.292.738/0001-11\",
    \"account_credit\": null, \"bar_code\": null,
    \"financial_conciliation_transaction_id\": null
  }" | jq '{transaction_id, type: .transaction_type}'
```

**After creating, verify the transfers appear:**
```bash
curl -s "https://api.imobzi.app/v1/financial/transactions?start_at=$YEAR-$MONTH_PADDED-01&end_at=$YEAR-$MONTH_PADDED-31&periodType=this_month&order_by=due_date&sort_by=asc&page=1&account_id=6029003447074816" \
  -H "Authorization: $TOKEN" \
  | jq '[.transactions[] | select(.transaction_type == "transference") | {date: .paid_at, value: .total_value, description}]'
```

**Final balance check** — Imobzi total must equal PJBank PDF ending balance:
```bash
curl -s "https://api.imobzi.app/v1/financial/transactions?start_at=$YEAR-$MONTH_PADDED-01&end_at=$YEAR-$MONTH_PADDED-31&periodType=this_month&order_by=due_date&sort_by=asc&page=1&account_id=6029003447074816" \
  -H "Authorization: $TOKEN" \
  | jq '[.transactions[].total_value] | add'
```
Compare with the **Saldo final** shown in the PJBank PDF. If they match → proceed to import.

### 2c. Import via API (preferred)

Once balances match, import directly via REST API — no browser needed:

```bash
# Preview first (check duplicates)
curl -s -X POST -H "Authorization: Bearer $RATC_API_KEY" -H "Content-Type: application/json" \
  -d "{\"startDate\": \"$YEAR-$(printf '%02d' $MONTH)-01\", \"endDate\": \"$YEAR-$(printf '%02d' $MONTH)-31\", \"bankAccountId\": \"cmejz0tjr0001h2ywdhgddbe7\"}" \
  "$RATC_API_URL/imobzi/preview" | jq '{total: .summary.total, new: .summary.new, duplicates: .summary.duplicates}'

# Import (skips duplicates automatically)
curl -s -X POST -H "Authorization: Bearer $RATC_API_KEY" -H "Content-Type: application/json" \
  -d "{\"startDate\": \"$YEAR-$(printf '%02d' $MONTH)-01\", \"endDate\": \"$YEAR-$(printf '%02d' $MONTH)-31\", \"bankAccountId\": \"cmejz0tjr0001h2ywdhgddbe7\"}" \
  "$RATC_API_URL/imobzi/import" | jq '{success, importBatchId, importedCount, skippedCount, failedCount}'
```

CC - PJBank account ID: `cmejz0tjr0001h2ywdhgddbe7`

**IMPORTANT**: Always ask the user for the PJBank PDF before proceeding. Run reconciliation and create all missing transfers BEFORE importing into the app.

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

### 5.2: Create Individual Mirror Transactions on CI Account

**DO NOT create a single lump-sum "ajuste".** For each APLIC/RESG in CC-Sicredi, create one mirror transaction in CI-SicrediInvest with the **opposite sign**:

- CC-Sicredi `APLICACAO FINANCEIRA` (negative) → CI-SicrediInvest entry with **positive** amount (money entered investment)
- CC-Sicredi `RESG.APLIC.FIN` (positive) → CI-SicrediInvest entry with **negative** amount (money left investment)

```python
# Example: create mirror for each CC-Sicredi APLIC/RESG
for each (date, amount, description) in cc_sicredi_aplic_resg:
    POST /transactions {
        bankAccountId: "<ci-sicrediinvest-id>",
        date: date,
        description: description,
        amount: -amount,   # opposite sign
        categoryId: "cat-transferencia-entre-contas"
    }
```

After all mirrors are created, verify: sum of ALL "Transferência Entre Contas" for the month = R$0,00.

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
./scripts/send-report.sh $YEAR $MONTH "robertotcestari@gmail.com,silviatcestari@gmail.com,alexandrecestari@gmail.com"
```

## Checklist Resumo

1. [ ] Perguntar ao usuário: qual mês?
2. [ ] Backup do banco de dados
3. [ ] Importar OFX: CC - Sicredi → **confirmar saldo**
4. [ ] Importar Imobzi: CC - PJBank (web UI) → **confirmar saldo**
5. [ ] Importar OFX: CC - BTG → **confirmar saldo**
6. [ ] Gerar e aplicar sugestões (`scripts/suggestions.sh`)
7. [ ] Categorizar transações restantes (heurísticas + perguntar ao usuário)
8. [ ] Balancear CI - SicrediInvest → pedir saldo real → transferências + rendimentos → **confirmar saldo**
9. [ ] Balancear CI - BTG → mesmo processo
10. [ ] Balancear CI - XP → mesmo processo
11. [ ] CHECK: Transferências somam 0
12. [ ] CHECK: Nenhuma transação sem categoria
13. [ ] CHECK: DRE correto
14. [ ] Enviar relatório mensal por email

## Known Categorizations (do not guess these)

| Descrição / CNPJ | Categoria | Observação |
|---|---|---|
| IMOBILIARIA PRO IMOVEIS (CNPJ 51840387000125) — boleto débito | `cat-despesas-pessoais-socios` | Aluguel do irmão do sócio pago pela empresa. NÃO é Aluguel Pago. |
| PRO IMOVEIS LTDA (CNPJ 51840387000125) — TED crédito | `cat-aluguel` | Repasse de aluguéis recebidos via imobiliária |
| DARF código 2089 | `cat-irpj` | IRPJ |
| DARF código 2372 | `cat-csll` | CSLL |
| PJBANK (tarifa imobizi) | `cat-ti` | |

## API: Notas Importantes

- **`POST /transactions/bulk-delete`**: o campo `ids` deve conter o valor do campo **`id`** do registro retornado (processedTransaction id), NÃO o campo `transactionId`. Usar o `transactionId` retorna `deletedCount: 0`.

## References

- **API Endpoints**: See `references/api-endpoints.md` for complete endpoint documentation
- **Categories**: See `references/categories.md` for the full category hierarchy
- **Categorization Guide**: See `references/categorization-guide.md` for description-to-category mapping patterns
