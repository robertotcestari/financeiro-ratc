---
name: Mensal
description: Monthly workflow for importing OFX bank files and categorizing transactions. Use this skill at the beginning of each month to process the previous month's bank statements.
---

# Mensal - Monthly Import Workflow

## Overview

This skill guides you through the monthly process of importing OFX files and categorizing transactions for all bank accounts.

**IMPORTANT: All CLI commands MUST use `--env production` to work with the production database.**

## Step 0: Database Backup (MANDATORY)

Before starting ANY work, create a backup of the production database:

```bash
npm run cli -- backup
```

Verify the backup was created:

```bash
npm run cli -- list-backups
```

**DO NOT PROCEED without a successful backup.**

## Step 1: Check Available OFX Files

List OFX files in the data directory:

```bash
ls -la data/ofx/
```

## Step 2: List Bank Accounts

Show available bank accounts to choose from:

```bash
npm run cli -- list-accounts --env production
```

## Step 3: Preview Import for Each Account

For each OFX file, preview the import to check for duplicates and see what will be imported:

```bash
npm run cli -- preview -f data/ofx/<filename>.ofx -a "<account-name>" --env production
```

## Step 4: Execute Import

After reviewing the preview, execute the import:

```bash
npm run cli -- import -f data/ofx/<filename>.ofx -a "<account-name>" --env production
```

## Step 5: Generate Rule-Based Suggestions

Generate categorization suggestions based on existing rules:

```bash
npm run cli -- generate-suggestions --uncategorized --env production
```

## Step 6: Review and Apply Suggestions

List pending suggestions:

```bash
npm run cli -- list-suggestions --env production
```

Apply suggestions (all or by specific criteria):

```bash
npm run cli -- apply-suggestions --all --env production
```

## Step 7: Categorize Remaining Transactions

List uncategorized transactions for the month:

```bash
npm run cli -- list-transactions --uncategorized --month YYYY-MM --limit 100 --env production
```

For interactive categorization, use the categorize command:

```bash
npm run cli -- categorize --category "<category-name>" --ids <transaction-ids> --env production
```

## Step 8: Balance Investment Accounts (CI - SicrediInvest, CI - BTG, CI - XP)

Investment accounts (CI) don't have OFX files. Balance them manually using transfers and interest.

### 8.1: Calculate Net Transfers

From CC - Sicredi transfers, calculate:
- **Aplicações** (APLICACAO FINANCEIRA): Total sent TO investment account
- **Resgates** (RESG.APLIC.FIN): Total received FROM investment account
- **Diferença**: Aplicações - Resgates = Net transfer to investment

If there's a net difference, create a balancing transaction on the investment account:

```bash
npm run cli -- add-tx \
  --account "CI - SicrediInvest" \
  --amount <diferenca> \
  --date YYYY-MM-DD \
  --description "Ajuste transferencia - Saldo aplicacoes MES/ANO" \
  --category "Transferência Entre Contas" \
  --env production
```

**Note:** Use positive amount if net flow was INTO investment, negative if OUT of investment.

### 8.2: Calculate Interest (Rendimentos)

After adding transfers, compare:
- **Saldo no Banco**: Actual balance from bank/investment statement
- **Saldo no App**: Balance shown in the app

```bash
npm run cli -- list-account-balances --env production
```

The difference is the **interest earned (Rendimentos)**:

```
Juros = Saldo no Banco - Saldo no App
```

Create the interest transaction:

```bash
npm run cli -- add-tx \
  --account "CI - SicrediInvest" \
  --amount <juros> \
  --date YYYY-MM-DD \
  --description "Rendimentos MES/ANO" \
  --category "Rendimentos" \
  --env production
```

**Note:** Interest is typically positive (income). Use the last day of the month as the date.

### 8.3: Repeat for CI - BTG and CI - XP

If CI - BTG or CI - XP have activity, repeat steps 8.1 and 8.2 for each account.

**CI - BTG**: Receives transfers from CC - BTG (TEF/PIX). Check CC - BTG OFX for transfer amounts.

---

## CRITICAL CHECKS (MANDATORY)

**IMPORTANTE: Só execute estas verificações APÓS:**
1. Importar TODOS os arquivos OFX de TODAS as contas
2. Balancear TODAS as contas de investimento (CI - SicrediInvest, CI - BTG, CI - XP)
3. Adicionar TODOS os rendimentos (juros) nas contas de investimento
4. Categorizar TODAS as transações

**Todas as contas devem estar corretamente configuradas antes de prosseguir.**

These checks MUST pass before the monthly closing is complete. **DO NOT skip any of these checks.**

### Check 1: Transfers Must Sum to Zero

**This is NON-NEGOTIABLE.** All transactions categorized as "Transferências" or "Transferência Entre Contas" MUST sum to exactly R$ 0,00.

```bash
npm run cli -- list-transactions --category "Transferência Entre Contas" --month YYYY-MM --limit 100 --env production
```

Sum all transaction amounts. The total MUST be exactly **0 (zero)**.

If the sum is not zero:
1. Identify which transfers are missing their counterpart
2. Check if a transfer was imported to only one account
3. Verify both sides of each transfer are categorized correctly

### Check 2: All Transactions Must Be Categorized

Every transaction for the month must have a category assigned:

```bash
npm run cli -- list-transactions --uncategorized --month YYYY-MM --limit 100 --env production
```

Expected result: **No transactions found** or empty list.

Additionally, certain transactions require a **property** to be assigned:
- Rental income (Aluguel, Aluguel de Terceiros)
- Property expenses (Condomínios, IPTU, Água, Energia, Manutenção)

### Check 3: Bank Balances Must Match

The balance shown in the app must match the actual bank balance exactly.

```bash
npm run cli -- list-account-balances --env production
```

Compare each account's balance with the bank statement:
- **CC - Sicredi**: Must match Sicredi bank statement
- **CC - PJBank**: Must match PJBank statement
- **CC - BTG**: Must match BTG checking account statement
- **CI - BTG**: Must match BTG investment balance
- **CI - SicrediInvest**: Must match Sicredi investment balance
- **CI - XP**: Must match XP investment balance

If balances don't match:
1. Check for missing transactions in the import
2. Verify all transactions from the OFX file were imported
3. Look for duplicate imports that may have inflated the balance

### Check 4: Balance Equation Must Hold

**This is a mathematical verification.** The equation must be true:

```
Saldo do Mês Anterior + Resultado do Mês = Saldo do Mês Atual
```

Run the automated check:

```bash
npm run cli -- balance-check --month YYYY-MM --env production
```

Example output when correct:
```
Saldo 2025-11:       R$ 30.155,17
Resultado 2025-12:   R$ 108.435,38
─────────────────────────────────────
Esperado:            R$ 138.590,55
Atual:               R$ 138.590,55

✓ Saldo verificado! A equação está correta.
```

If the check fails:
1. There are missing transactions in one of the months
2. There are duplicate transactions inflating the balance
3. A transaction has the wrong date (appearing in wrong month)

---

## Quick Reference

### Environment Flag

**ALWAYS use `--env production`** for all CLI commands:

```bash
npm run cli -- <command> --env production
```

### Month Parameter

By default, work with the **previous month**. Calculate it as:
- If current month is January 2025, previous month is `2024-12`
- If current month is March 2025, previous month is `2025-02`

### Common Categories

Use `npm run cli -- categories --env production` to list all available categories.

**Income categories:**
- Aluguel
- Aluguel de Terceiros
- Rendimentos

**Expense categories:**
- Tarifas Bancárias
- Condomínios
- IPTU
- Água
- Energia
- Manutenção

**Transfer category:**
- Transferência Entre Contas

### Account Names

Common account names (verify with `npm run cli -- list-accounts --env production`):
- CC - Sicredi
- CC - PJBank
- CC - BTG
- CI - SicrediInvest
- CI - BTG
- CI - XP

### Account-Specific Notes

**CC - Sicredi**: Import via OFX file downloaded from bank website.

**CC - PJBank**: **NÃO usar OFX do banco.** Importar via Imobzi, pois lá temos os recebimentos individuais dos aluguéis com identificação dos imóveis. Acesse: https://financeiro.ratc.com.br/importacao-imobzi

**CC - BTG**: Import via OFX file downloaded from BTG bank website.

**CI - SicrediInvest / CI - BTG / CI - XP**: Contas de investimento não têm OFX. Balancear manualmente com transferências e rendimentos (ver Step 8).

## Complete Monthly Checklist

1. [ ] **BACKUP**: Create database backup in `data/backups/`
2. [ ] Download OFX files from all banks
3. [ ] Place OFX files in `data/ofx/`
4. [ ] Import each OFX file to its corresponding account
5. [ ] Generate suggestions from rules
6. [ ] Apply high-confidence suggestions
7. [ ] Manually categorize remaining transactions
8. [ ] **INVESTMENT ACCOUNTS**: Balance CI - SicrediInvest, CI - BTG, and CI - XP
   - [ ] Add net transfer transactions (Transferência Entre Contas)
   - [ ] Calculate and add interest (Rendimentos)
9. [ ] **CHECK 1**: Verify transfers sum to zero
10. [ ] **CHECK 2**: Verify no uncategorized transactions remain
11. [ ] **CHECK 3**: Verify bank balances match app balances
12. [ ] **CHECK 4**: Verify balance equation holds (`npm run cli -- balance-check`)
13. [ ] Clean up OFX files from `data/ofx/` (optional)

## Email Recipients

Default recipients for monthly reports:
- roberto@ratc.com.br
- fernanda@ratc.com.br

## Troubleshooting

### Duplicate Transactions

If the preview shows duplicates:
- Review if these are truly duplicates or different transactions with same amount/date
- Use `--include-duplicates` flag only if you're sure they should be imported

### Unknown Account

If the account name is not found:
1. Run `npm run cli -- list-accounts --env production` to see exact account names
2. Use the exact name including "CC - " or "CI - " prefix

### Rule Not Matching

If a rule should match but doesn't:
1. Check rule criteria with `npm run cli -- rules --env production`
2. Verify the transaction description matches the rule pattern

### Transfers Not Balancing

If transfers don't sum to zero:
1. List all transfer transactions for the month
2. Match each debit with its corresponding credit
3. Look for transfers that may be missing one side
4. Check if a transfer was incorrectly categorized

### Balance Mismatch

If app balance doesn't match bank:
1. Export transactions from the app for the account
2. Compare with the bank statement line by line
3. Identify missing or extra transactions
4. Check the opening balance is correct

### Balance Equation Failed

If `balance-check` shows a difference:
1. Run `npm run cli -- balance-check --month YYYY-MM --env production` to see the difference
2. The difference indicates missing or extra transactions
3. Check if transactions were imported with wrong dates
4. Verify the previous month was also closed correctly

## When to Use This Skill

Use this skill when:
- Starting the monthly financial closing process
- Importing new OFX bank statements
- Categorizing uncategorized transactions
- Generating and applying rule-based suggestions
- Verifying all transactions are properly categorized
- Running the mandatory monthly checks
