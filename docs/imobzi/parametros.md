# Parâmetros e validação

O backend do Imobzi é FastAPI com Pydantic v2. Quando um query param é validado e recebe valor
fora do domínio, a resposta `422` **enumera os valores aceitos** — documentação vinda do próprio
servidor, não inferida de amostras.

As tabelas abaixo foram geradas por [tools/probe.mjs](tools/probe.mjs), que manda `___probe___` em
cada parâmetro conhecido e registra a resposta.

Como interpretar a coluna **status**:

| status | significa |
|---|---|
| `422` | parâmetro validado; a coluna "aceita" traz o domínio exato |
| `400` / `500` | chega a ser usado, mas sem validação — o valor inválido estoura mais adiante (conversão para int, SQL) |
| `200` | ignorado silenciosamente: ou o parâmetro não existe, ou não filtra nada com valor desconhecido |

Um `200` **não** prova que o parâmetro não é suportado — vários funcionam com valores válidos e só
não reclamam de valor inválido (`order_by`, `contract_type`, `smart_list`). Prova apenas que não há
validação.

## Enums confirmados pelo servidor

```
status         pending | paid | partially_paid | expired | deleted | canceled | draft | all | overdue | in_process
period         due_date | paid_at | created_at | updated_at
payment_method all_payments | all | bank_slip | credit_card | pix | cash | transference | bank_check | deposit
```

`payments_methods_available` aceita o mesmo domínio de `payment_method`. Na UI: "Todos" =
`all_payments`; "Cartão, Boleto e Pix" = `all`. Note que `pix` existe na API mas não aparece como
opção isolada no filtro do app.

Valores usados pela UI e não validados pelo servidor (portanto, apenas observados):

```
order_by (invoices)       date | due_date
order_by (transactions)   due_date | paid_at
sort_by                   asc | desc
contract_type             all | signatures_and_sales | leases | without_link
periodType                this_month | this_month_until_today | last_month | custom
smart_list (leases)       actives | actives_except_vacation_rental
status (landlord tx)      predicted | paid | overdue
group_by (onlending)      property | contract
```

## GET /invoices

| param | status | tipo do erro | aceita |
|---|---|---|---|
| `status` | 422 | literal_error | 'pending', 'paid', 'partially_paid', 'expired', 'deleted', 'canceled', 'draft', 'all', 'overdue', 'in_process' or None |
| `period` | 422 | literal_error | 'paid_at', 'due_date', 'created_at', 'updated_at' or None |
| `payment_method` | 422 | literal_error | 'all', 'bank_slip', 'credit_card', 'pix', 'cash', 'transference', 'all_payments', 'bank_check' or 'deposit' |
| `payments_methods_available` | 422 | literal_error | 'all', 'bank_slip', 'credit_card', 'pix', 'cash', 'transference', 'all_payments', 'bank_check', 'deposit' or None |
| `order_by` | 200 | — | — |
| `sort_by` | 200 | — | — |
| `contract_type` | 200 | — | — |
| `page` | 422 | int_parsing | Input should be a valid integer, unable to parse string as an integer |
| `lease_id` | 422 | int_parsing | Input should be a valid integer, unable to parse string as an integer |
| `contact_id` | 422 | int_parsing | Input should be a valid integer, unable to parse string as an integer |
| `contact_type` | 400 | — | Bad request |
| `account_id` | 500 | — | invalid literal for int() with base 10: '___probe___' |
| `start_at` | 500 | — | (pymysql.err.OperationalError) (1525, "Incorrect DATE value: '___probe___'") |
| `category_id` | 200 | — | — |
| `property_id` | 200 | — | — |
| `search_text` | 200 | — | — |
| `smart_list` | 200 | — | — |
| `periodType` | 200 | — | — |

## GET /financial/transactions

| param | status | tipo do erro | aceita |
|---|---|---|---|
| `periodType` | 200 | — | — |
| `order_by` | 500 | — | Can't resolve label reference for ORDER BY / GROUP BY / DISTINCT etc. Textual SQL expression '___probe___' should be exp |
| `sort_by` | 200 | — | — |
| `status` | 200 | — | — |
| `account_id` | 500 | — | invalid literal for int() with base 10: '___probe___' |
| `contact_id` | 200 | — | — |
| `contact_type` | 200 | — | — |
| `from_contact` | 422 | bool_parsing | Input should be a valid boolean, unable to interpret input |
| `page` | 500 | — | invalid literal for int() with base 10: '___probe___' |
| `category_id` | 200 | — | — |
| `type` | 200 | — | — |
| `tag_id` | 200 | — | — |
| `property_id` | 200 | — | — |
| `lease_id` | 200 | — | — |
| `search_text` | 200 | — | — |

## GET /leases

| param | status | tipo do erro | aceita |
|---|---|---|---|
| `smart_list` | 200 | — | — |
| `order_by` | 200 | — | — |
| `sort_by` | 200 | — | — |
| `page` | 200 | — | — |
| `search_text` | 200 | — | — |
| `search_type` | 200 | — | — |
| `owner_id` | 200 | — | — |
| `owner_type` | 200 | — | — |
| `property_id` | 500 | — | invalid literal for int() with base 10: '___probe___' |
| `start_at` | 200 | — | — |
| `status` | 200 | — | — |

## GET /financial/landlord/accounts

| param | status | tipo do erro | aceita |
|---|---|---|---|
| `status` | 200 | — | — |
| `order_by` | 200 | — | — |
| `page` | 200 | — | — |
| `search_text` | 200 | — | — |
