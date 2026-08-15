# Discovered API

**Base URL:** `https://my.imobzi.com`

## Quick start

```js
import { get_v1_invoices, get_v1_invoice_id, get_v1_financial_landlord_account_onlending_id, get_v1_leases, get_v1_lease_checklist, get_v1_lease_id, get_v1_lease_code_id, get_v1_financial_accounts, get_v1_financial_account_id, get_v1_financial_transactions, get_v1_financial_transaction_id, get_v1_financial_categories, get_v1_financial_tags, get_v1_financial_organization, get_v1_banks, get_v1_financial_landlord_accounts, get_v1_parameters, get_v1_real_estate, get_v1_subscription, get_v1_financial_landlord_account_id, get_v1_financial_landlord_account_id_transactions, get_v1_financial_landlord_account_id_onlending, get_v1_financial_landlord_account_individual_onlending_id, get_v1_reports_landlord_account_onlending, get_v1_commission_onlending, get_v1_network_group, get_v1_user_id_rules } from './client.mjs';
```

**27 functions**, zero dependencies. See [`client.mjs`](./client.mjs) for full signatures.

## Endpoints

| Method | Path | Samples | Statuses | Confidence |
|---|---|---|---|---|
| GET | `/v1/invoices` | 31 | 200, 400, 401, 422, 500 | high |
| GET | `/v1/financial/transactions` | 23 | 200, 422, 500 | high |
| GET | `/v1/leases` | 15 | 200, 500 | high |
| GET | `/v1/financial/landlord/accounts` | 7 | 200 | low |
| GET | `/v1/financial/landlord/account/{id}/transactions` | 6 | 200 | low |
| GET | `/v1/invoice/{id}` | 4 | 200, 404 | medium |
| GET | `/v1/financial/landlord/account/{id}/onlending` | 4 | 200, 400 | medium |
| GET | `/v1/lease/{id}` | 3 | 200, 500 | medium |
| GET | `/v1/lease/code/{id}` | 3 | 200, 404 | medium |
| GET | `/v1/financial/accounts` | 3 | 200, 401 | medium |
| GET | `/v1/financial/account/{id}` | 3 | 200, 500 | medium |
| GET | `/v1/financial/transaction/{id}` | 3 | 200, 404 | medium |
| GET | `/v1/financial/landlord/account/{id}` | 3 | 200, 400 | medium |
| GET | `/v1/financial/landlord/account/onlending/{id}` | 2 | 200 | low |
| GET | `/v1/lease/checklist` | 2 | 200 | low |
| GET | `/v1/financial/categories` | 2 | 200 | low |
| GET | `/v1/financial/tags` | 2 | 200 | low |
| GET | `/v1/financial/organization` | 2 | 200 | low |
| GET | `/v1/financial/landlord/account/individual-onlending/{id}` | 2 | 400 | low |
| GET | `/v1/reports/landlord/account/onlending` | 2 | 405 | low |
| GET | `/v1/banks` | 1 | 200 | low |
| GET | `/v1/parameters` | 1 | 200 | low |
| GET | `/v1/real-estate` | 1 | 200 | low |
| GET | `/v1/subscription` | 1 | 200 | low |
| GET | `/v1/commission/onlending` | 1 | 400 | low |
| GET | `/v1/network-group/` | 1 | 200 | low |
| GET | `/v1/user/{id}/rules` | 1 | 200 | low |

### `GET /v1/invoices`

<details><summary>Example response</summary>

```json
{
  "invoices": [
    {
      "total_value": 28000,
      "invoice_id": "e9da5146708611f1866b42004e494300",
      "status": "paid",
      "due_date": "<redacted>",
      "description": "Aluguel ref. 01/06/2026 a 30/06/2026",
      "charge_fee_value": 3.96,
      "payment_method": "bank_slip",
      "paid_at": "<redacted>",
      "payments_methods_available": {
        "bank_slip": {
          "receipt_type": "bank_slip",
          "account": {
            "name": "<redacted>",
            "db_id": 6029003447074816
          },
          "integration_name": "pjbank",
          "logo_url": "https://storage.googleapis.com/imobzi/image/pj-bank.svg",
          "bank_integration": {
            "name": "<redacted>",
            "active": true,
            "transference_fee": 2,
            "transference_split": 1.5,
            "account_type": "digital_account",
            "show_trading_name": true,
            "categories": {
              "bank_fee": {
                "name": "<redacted>"
  ...
}
```
</details>

### `GET /v1/financial/transactions`

<details><summary>Example response</summary>

```json
{
  "transactions": [
    {
      "account": {
        "name": "<redacted>",
        "db_id": 5253871883517952
      },
      "account_credit": null,
      "value": 541.12,
      "total_value": 541.12,
      "description": "Aluguel ref. 01/07/2026 a 31/07/2026, da locação 41 - Fatura: ee54adf4842a11f1b0a142004e494300",
      "category": "Terceiros (Administração)",
      "subcategory": "Recebimento de Aluguel",
      "due_date": "<redacted>",
      "invoice_onlending_split": false,
      "group_id": null,
      "paid": true,
      "paid_at": "<redacted>",
      "payment_method": "transference",
      "repeat_type": "unique",
      "sum_type": null,
      "repeat_frequency": "",
      "pix_key_type": null,
      "pix_key": null,
      "qrcode": null,
      "tags": [],
      "transaction_type": "income",
      "financial_conciliation_transaction_id": null,
      "transaction_id": "923d5900988c11f1a49a42004e494300",
      "invoice_id": 1331,
      "bank_slip_id": null,
      "lease_item_i
  ...
}
```
</details>

### `GET /v1/leases`

<details><summary>Example response</summary>

```json
{
  "leases": [
    {
      "db_id": 5332861076373504,
      "key": null,
      "code": "53",
      "lease_type": "residential",
      "value": 9000,
      "irrf": false,
      "property": {
        "address": "<redacted>",
        "address_complement": "<redacted>",
        "city": "Ribeirão Preto",
        "code": "47",
        "db_id": 6633730468216832,
        "neighborhood": "<redacted>",
        "state": "SP",
        "zipcode": "<redacted>",
        "owners": [
          {
            "emails": [
              "<redacted>"
            ],
            "db_id": 5880332491423744,
            "code": null,
            "rate": null,
            "percentage": 100,
            "db_key": "<redacted>",
            "name": "<redacted>",
            "landlord_account_id": "<redacted>",
            "cnpj": "<redacted>",
            "type": "<redacted>",
            "email": "<redacted>",
            "phone": {
              "number": "<redacted>",
              "country_code": "<redacted>",

  ...
}
```
</details>

### `GET /v1/financial/landlord/accounts`

<details><summary>Example response</summary>

```json
{
  "total": 269522.06,
  "total_credit_balance": 269522.06,
  "total_debit_balance": 0,
  "debit_balance": [],
  "credit_balance": [
    {
      "landlord_account_id": "1264085ec4dd11ed966675e7aa50eead",
      "contact_key": "<redacted>",
      "contact_id": 5880332491423744,
      "contact_type": "organization",
      "contact_name": "<redacted>",
      "contact_profile_image": null,
      "balance": 265308.94,
      "onlendings_overdue": 0
    },
    {
      "landlord_account_id": "54cd09e1fa6e11edb0b447d56d5fc94a",
      "contact_key": "<redacted>",
      "contact_id": 5862668037521408,
      "contact_type": "person",
      "contact_name": "<redacted>",
      "contact_profile_image": null,
      "balance": 4213.12,
      "onlendings_overdue": -4051.25
    }
  ],
  "without_balance": [
    {
      "landlord_account_id": "2fb3487cbe7011f0b24042004e494300",
      "contact_key": "<redacted>",
      "contact_id": 6526974162370560,
      "contact_type": "person",
      "contact_name": "<
  ...
}
```
</details>

### `GET /v1/financial/landlord/account/{id}/transactions`

<details><summary>Example response</summary>

```json
{
  "next_page": null,
  "has_invoice_overdue": false,
  "transactions": [
    {
      "date": "<redacted>",
      "balance": 267035.14,
      "transactions": [
        {
          "landlord_transaction_id": "537076b090be11f1a6f242004e494300",
          "landlord_account_id": 1,
          "description": "",
          "group_id": null,
          "contact_key": "<redacted>",
          "guaranteed_rental": false,
          "guaranteed_rental_is_paid": false,
          "paid_at": "<redacted>",
          "repeat_frequency": "",
          "repeat_type": "unique",
          "repeat_total": 1,
          "transaction_type": "management_fee",
          "value": -191.8,
          "invoice_id": "531632ea90be11f1a6f242004e494300",
          "created_at": "2026-08-05T11:10:54.000000Z",
          "invoice_onlending_split": null,
          "account_debit": null,
          "pix_key": null,
          "pix_key_type": null,
          "account_credit": null,
          "category": "Receitas",
          "sub
  ...
}
```
</details>

## Coverage

- **27** API endpoints discovered
- **7** observed only once

