# Discovered API

**Base URL:** `https://my.imobzi.com`

## Quick start

```js
import { get_v1_financial_accounts, get_v1_network_group, get_v1_subscription, get_v1_real_estate, get_v1_parameters, get_v1_user_id_rules, get_v1_lease_code__code, get_v1_leases, get_v1_lease_checklist, get_v1_invoices } from './client.mjs';
```

**10 functions**, zero dependencies. See [`client.mjs`](./client.mjs) for full signatures.

## Endpoints

| Method | Path | Samples | Statuses | Confidence |
|---|---|---|---|---|
| GET | `/v1/lease/code/:code` | 2 | 404 | low |
| GET | `/v1/financial/accounts` | 1 | 200 | low |
| GET | `/v1/network-group/` | 1 | 200 | low |
| GET | `/v1/subscription` | 1 | 200 | low |
| GET | `/v1/real-estate` | 1 | 200 | low |
| GET | `/v1/parameters` | 1 | 200 | low |
| GET | `/v1/user/{id}/rules` | 1 | 200 | low |
| GET | `/v1/leases` | 1 | 200 | low |
| GET | `/v1/lease/checklist` | 1 | 200 | low |
| GET | `/v1/invoices` | 1 | 200 | low |

### `GET /v1/financial/accounts`

<details><summary>Example response</summary>

```json
{
  "accounts": [
    {
      "account_number": "44319-0",
      "account_type": "others",
      "active": true,
      "agency": "3003",
      "balance": 3253838.53,
      "bank": {
        "bank_slip_fee": null,
        "code": "748",
        "db_id": 5759180434571264,
        "integration_name": null,
        "logo_url": null,
        "name": "<redacted>",
        "resources": null,
        "transference_fee": null,
        "transference_split": null
      },
      "bank_integrations": null,
      "bank_integration_active": [],
      "created_at": "2023-03-23T12:03:11.825866Z",
      "db_id": 5253871883517952,
      "default": false,
      "description": "Sicredi",
      "favorite": false,
      "has_integration": false,
      "has_transactions": true,
      "initial_value": 38994.74,
      "name": "<redacted>",
      "start_at": "<redacted>"
    },
    {
      "account_number": "",
      "account_type": "others",
      "active": true,
      "agency": "",
      "balance": -10,
      
  ...
}
```
</details>

### `GET /v1/network-group/`

<details><summary>Example response</summary>

```json
{
  "networks_active": {
    "networks": []
  },
  "networks_pending": {
    "networks": []
  }
}
```
</details>

### `GET /v1/subscription`

<details><summary>Example response</summary>

```json
{
  "namespace": "ac-tlna233176iwe",
  "namespace_administrator": {
    "db_key": "<redacted>",
    "db_id": "CWLAFmKOHLOIPDr9hOSRCvDx2Aa2",
    "name": "<redacted>",
    "email": "<redacted>"
  },
  "payment_type": "bank_slip",
  "value_per_user": 44,
  "value_plan": 274.72,
  "due_date": 17,
  "expiration_at": null,
  "membership_date": "<redacted>",
  "created_at": "2023-03-17T13:48:02.837586",
  "updated_at": "2023-03-17T13:48:02.837586",
  "canceled_at": "2025-07-02T02:14:56.168967",
  "invoice_payment_status": "",
  "status": "active",
  "promo_codes": [],
  "resale": false,
  "users_amount": 1,
  "users_active": 1,
  "value_total": 274.72,
  "plan_name": "Free",
  "plan_display_name": "Free",
  "plans_package": [
    {
      "name": "<redacted>",
      "display_name": "Free",
      "limitations": {
        "api_third_party_access": false,
        "calendar_sync": false,
        "contact_count": 50,
        "report_create": false,
        "network_group_create": false,
        "i
  ...
}
```
</details>

### `GET /v1/real-estate`

<details><summary>Example response</summary>

```json
{
  "address": "<redacted>",
  "address_complement": "<redacted>",
  "business_type": "real_estate",
  "cities": [],
  "city": "Catanduva",
  "company_name": "<redacted>",
  "company_type": "legal_entity",
  "country": "Brasil",
  "database": "ac-tlna233176iwe",
  "db_id": "ac-tlna233176iwe",
  "description": "",
  "email": "<redacted>",
  "legal_information": [
    {
      "validate": "\\d{3}\\.*\\d{3}\\.*\\d{3}-*\\d{2}",
      "required": false,
      "company_type": "individual",
      "name": "<redacted>"
    },
    {
      "validate": "\\d{2}\\.*\\d{3}\\.*\\d{3}\\/*\\d{4}-*\\d{2}",
      "required": false,
      "company_type": "legal_entity",
      "name": "<redacted>",
      "value": "<redacted>"
    },
    {
      "required": false,
      "company_type": "all",
      "name": "<redacted>",
      "value": "<redacted>"
    },
    {
      "required": false,
      "company_type": "all",
      "name": "<redacted>",
      "value": "<redacted>"
    },
    {
      "validate": "\\d{3}\\.
  ...
}
```
</details>

### `GET /v1/parameters`

<details><summary>Example response</summary>

```json
{
  "database": "ac-tlna233176iwe",
  "db_id": "ac-tlna233176iwe",
  "block_duplicate_contacts": false,
  "namespace_administrator": "CWLAFmKOHLOIPDr9hOSRCvDx2Aa2",
  "real_estate_data": {
    "address": "<redacted>",
    "address_complement": "<redacted>",
    "business_type": "real_estate",
    "cities": [],
    "city": "Catanduva",
    "company_name": "<redacted>",
    "company_type": "legal_entity",
    "country": "Brasil",
    "database": "ac-tlna233176iwe",
    "db_id": "ac-tlna233176iwe",
    "description": "",
    "email": "<redacted>",
    "legal_information": [
      {
        "validate": "\\d{3}\\.*\\d{3}\\.*\\d{3}-*\\d{2}",
        "required": false,
        "company_type": "individual",
        "name": "<redacted>"
      },
      {
        "validate": "\\d{2}\\.*\\d{3}\\.*\\d{3}\\/*\\d{4}-*\\d{2}",
        "required": false,
        "company_type": "legal_entity",
        "name": "<redacted>",
        "value": "<redacted>"
      },
      {
        "required": false,
      
  ...
}
```
</details>

## Coverage

- **10** API endpoints discovered
- **9** observed only once

