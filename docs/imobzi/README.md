# API do Imobzi — referência para o fechamento mensal

Documentação da **API interna do app do Imobzi** (a mesma que `my.imobzi.com` consome no
navegador). Não é documentação oficial e não tem contrato de estabilidade: o plano da conta é
`Free`, com `api_third_party_access: false` (visto em `GET /v1/subscription`), então a API pública
de terceiros está desabilitada e este é o único caminho disponível.

Levantada em 15/08/2026 por três vias combinadas:

1. **Bundles JS do app** (`my.imobzi.com/build/*.js`) — inventário completo de operações; ver
   [endpoints.md](endpoints.md).
2. **Captura autenticada** de 130 chamadas GET reais — schemas de resposta em
   [api-spec/](api-spec/) (OpenAPI 3.1 + relatório HTML).
3. **Sondagem de validação** — o backend é FastAPI/Pydantic e devolve os valores aceitos em 422;
   ver [parametros.md](parametros.md).

| Arquivo | Conteúdo |
|---|---|
| [endpoints.md](endpoints.md) | 411 operações extraídas dos bundles — a superfície inteira da API |
| [parametros.md](parametros.md) | Quais parâmetros existem, quais são validados e o que aceitam |
| [api-spec/index.html](api-spec/index.html) | Relatório visual (abrir no navegador) |
| [api-spec/openapi.yaml](api-spec/openapi.yaml) | Spec OpenAPI 3.1 dos 27 endpoints amostrados |
| [api-spec/report.md](api-spec/report.md) | Resumo com exemplos de resposta por endpoint |
| [api-spec/client.mjs](api-spec/client.mjs) | Cliente `fetch` gerado, sem dependências |
| [api-spec/confidence.json](api-spec/confidence.json) | Amostras e confiança por endpoint |
| [tools/](tools/) | Scripts para regenerar tudo (ver [Como atualizar](#como-atualizar)) |

## Autenticação

Login via Google Identity Toolkit (Firebase); o `idToken` retornado vai **cru** no header
`authorization` (sem `Bearer`). Implementação em
[lib/features/imobzi/auth.ts](../../lib/features/imobzi/auth.ts).

```
POST https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=$IMOBZI_FIREBASE_API_KEY
{ "email": "...", "password": "...", "returnSecureToken": true }
→ { "idToken": "...", "refreshToken": "...", "expiresIn": "3600" }
```

Headers de toda chamada:

```
authorization: <idToken>
content-type: application/json
accept: application/json, text/plain, */*
```

Token inválido ou ausente → `401 {"message": "Not authorized"}`. O token expira em 1 h; para
scripts longos, reautentique.

Credenciais no `.env`: `IMOBZI_EMAIL`, `IMOBZI_PASSWORD`, `IMOBZI_FIREBASE_API_KEY`,
`IMOBZI_ACCOUNT_ID`.

## Hosts

| Host | Observação |
|---|---|
| `https://my.imobzi.com/v1` | Host do app. Use este por padrão. |
| `https://api.imobzi.app/v1` | Host alternativo, aceita o mesmo token. Só `financial/transactions` foi verificado ([lib/features/imobzi/api.ts:50](../../lib/features/imobzi/api.ts:50) o usa); respondeu idêntico ao host principal. Fora da spec, que cobre só `my.imobzi.com`. |

## Convenções

- **Datas**: `YYYY-MM-DD` em query params. Formato errado não dá 422 — vaza um erro de SQL em
  `500` (`Incorrect DATE value`).
- **Paginação**: `page=1,2,…`; a resposta traz `next_page` (número ou `null`). `/leases` usa
  `cursor` — um JWT opaco assinado pelo servidor cujo payload é `{"cursor_page": n}`; devolva o
  valor como veio.
- **IDs**: convivem dois formatos — `db_id` numérico (contratos, contas, contatos) e hash hex de
  32 caracteres (faturas, lançamentos, contas de locador). Use sempre o ID **completo**.
- **Valores**: números JSON, em reais (`1265.0`), não centavos.

## Endpoints usados no fechamento

| Operação | Uso |
|---|---|
| `GET /invoices` | Faturas do mês — por vencimento ou por pagamento |
| `GET /invoice/{invoice_id}` | Detalhe da fatura (itens, repasse, histórico) |
| `POST /invoice/{invoice_id}` | Quitação manual |
| `GET /financial/transactions` | Lançamentos (extrato do Imobzi) |
| `GET /financial/accounts` | Contas financeiras e saldos |
| `GET /leases` | Contratos ativos |
| `GET /financial/landlord/accounts` | Saldos a repassar por locador |
| `GET /financial/landlord/account/{id}/transactions` | Extrato do locador |
| `GET /financial/landlord/account/{id}/onlending` | Relatório de repasse |

### `GET /invoices`

O endpoint central do fechamento. É o mais validado da API — parâmetro fora do enum devolve `422`
com a lista aceita.

| Param | Tipo | Valores |
|---|---|---|
| `status` | enum | `pending`, `paid`, `partially_paid`, `expired`, `deleted`, `canceled`, `draft`, `all`, `overdue`, `in_process` |
| `period` | enum | `due_date` (padrão), `paid_at`, `created_at`, `updated_at` — **define a qual data `start_at`/`end_at` se aplicam** |
| `payment_method` | enum | `all_payments`, `all`, `bank_slip`, `credit_card`, `pix`, `cash`, `transference`, `bank_check`, `deposit` |
| `payments_methods_available` | enum | mesmos valores de `payment_method` |
| `start_at` / `end_at` | data | recorte do período |
| `page` | int | paginação |
| `lease_id` / `contact_id` | int | filtro por contrato / contato (aceita só `db_id` numérico) |
| `contact_type` | string | `person` ou `organization`; valor inválido → `400` |
| `order_by`, `sort_by`, `contract_type` | string | não validados; a UI manda `due_date`/`date`, `asc`/`desc`, `all` |

`all_payments` significa "qualquer meio"; `all` restringe aos meios online (cartão, boleto e Pix).

**`period=paid_at` é o filtro que o fechamento quer** para regime de caixa: traz o que foi *pago*
no mês, independentemente do vencimento.

```bash
curl -s -H "authorization: $TOKEN" \
  "https://my.imobzi.com/v1/invoices?status=paid&period=paid_at&start_at=2026-07-01&end_at=2026-07-31&page=1"
```

Resposta:

```
invoices[]         lista de faturas
count              quantidade na página
next_page          próxima página ou null
total              total do filtro
total_paid, total_pending, total_overdue
receipt_methods_available
```

Cada item de `invoices[]` traz `invoice_id`, `status`, `due_date`, `paid_at`, `value`,
`total_value`, `charge_fee_value`, `interest_value`, `difference_value`, `payment_method`,
`description`, `category`, `subcategory`, `reference_start_at`, `reference_end_at`, além dos
objetos `contact`, `property`, `account`, `lease` e `onlendings_and_fees`.

Atenção: na **listagem**, `lease` só traz `{code, contract_type}` — o `db_id` do contrato só
aparece no **detalhe** (`GET /invoice/{id}`).

### `GET /invoice/{invoice_id}`

Detalhe completo: acrescenta `items[]`, `beneficiaries[]`, `history[]`, `receipt_items[]`,
`installments`, `bank_slip_id`, `barcode`, `onlending_split` e `onlendings_and_fees` detalhado
(`onlendings`, `onlending_value`, `predicted_onlending_value`, `management_fee_value`,
`managed_expenses_value`, `charge_landlord`).

ID inexistente → `404 {"message": "Invoice not found"}`.

### `POST /invoice/{invoice_id}` — quitação

Não capturado nesta rodada (é escrita em produção); o payload em uso está em
[lib/features/imobzi/invoices.ts:235](../../lib/features/imobzi/invoices.ts:235). Campos enviados:
`invoice_id`, `total_value`, `status: "paid"`, `due_date`, `description`, `charge_fee_value`,
`payment_method`, `paid_at`, `payment_methods_available`, `interest_value`, `difference_value`,
`account` (objeto completo da conta), `category`, `subcategory`, `send_receipt_tenant`.

### `GET /financial/transactions`

Lançamentos financeiros. Ao contrário de `/invoices`, **quase nada é validado** — parâmetro
desconhecido é ignorado silenciosamente e `order_by` inválido cai direto no SQL (`500`). Confira o
resultado em vez de confiar no status.

Params observados: `start_at`, `end_at`, `periodType` (`this_month`, `this_month_until_today`,
`last_month`, `custom`), `order_by` (`due_date`, `paid_at`), `sort_by`, `page`, `account_id`,
`contact_id` + `contact_type` + `from_contact` (bool), `status`, `category_id`, `tag_id`,
`property_id`, `lease_id`, `search_text`.

Resposta: `transactions[]`, `next_page`, `total`, `previous_balance`, `incomes`, `coming_incomes`,
`expenses`, `coming_expenses`. Cada lançamento tem `transaction_id`, `value`, `total_value`,
`description`, `category`, `subcategory`, `due_date`, `paid`, `paid_at`, `payment_method`,
`account`, `contact`, `invoice_id`, `landlord_account_id`, `lease_item_description`, `tags`,
`transaction_type`.

### `GET /leases`

Contratos. Aceita `smart_list` (ex.: `actives`, `actives_except_vacation_rental`), `start_at`,
`end_at`, `search_text`, `search_type`, `owner_id`, `owner_type`, `property_id` — nenhum validado.
Resposta: `leases[]`, `cursor`, `count`, `value_total`, `management_fee_total`,
`count_lease_with_invoices_not_generated`.

Cada contrato: `db_id`, `code`, `lease_type`, `value`, `irrf`, `status`, `start_at`, `end_at`,
`management_fee`, `property`, `tenants[]`, `owners[]`, `beneficiaries[]`, `items[]`, `account`,
`next_invoice_due_date`, `next_invoice_start_at`/`end_at`.

`GET /lease/{db_id}` e `GET /lease/code/{code}` retornam o mesmo objeto detalhado. Um `db_id`
inválido devolve `500` (`Key path id is invalid`), não 404 — só o acesso por `code` devolve `404`.

### Repasses aos locadores

```
GET /financial/landlord/accounts
→ total, total_credit_balance, total_debit_balance,
  credit_balance[], debit_balance[], without_balance[]   (+ *_next_page)
```

Cada entrada: `landlord_account_id` (hash de 32 chars), `contact_id`, `contact_type`,
`contact_name`, `balance`, `onlendings_overdue`.

```
GET /financial/landlord/account/{landlord_account_id}/transactions?status=predicted|paid|overdue
→ transactions[] agrupados por dia ({date, balance, transactions[]}), next_page, has_invoice_overdue
```

```
GET /financial/landlord/account/{landlord_account_id}/onlending
    ?group_by=property|contract&show_non_rented_properties=false
    &show_other_services=true&show_overdue_rent=true&start_at=…&end_at=…
```

Esse último **exige os parâmetros do filtro** — sem eles responde `400` sem mensagem útil. Retorna
o template do relatório de repasse (`body` em HTML, `title`, `accounts`), o mesmo que a UI
transforma em PDF.

Não verificados: `GET /financial/landlord/account/individual-onlending/{id}` (`400` com
`preview_onlending=true`), `GET /commission/onlending` (`400` — faltam params) e
`/reports/landlord/account/onlending`, que é **POST**, não GET (`405`).

## Erros

| Situação | Resposta |
|---|---|
| Token ausente/inválido | `401 {"message": "Not authorized"}` |
| Enum inválido em `/invoices` | `422` Pydantic, com `ctx.expected` listando os valores aceitos |
| Fatura/lançamento/contrato inexistente | `404 {"message": "… not found"}` |
| `db_id` numérico malformado | `500 {"message": "Key path id is invalid. Must not be zero."}` |
| Data em formato errado | `500` com erro do MySQL vazado |
| Conta de locador inexistente | `400 {"message": "Landlord account not found"}` |

O padrão `422` é aproveitável: mandar um valor inválido de propósito faz o servidor listar o enum
completo. Foi assim que os valores acima foram levantados — ver [parametros.md](parametros.md).

Lembrete que já custou caro neste projeto: `POST /transactions/bulk-categorize` da **nossa** API
responde `success: true` mesmo em no-op (ID truncado). Confirme o efeito com um `GET` depois de
escrever.

## Limitações

- **Escopo**: os 27 endpoints amostrados cobrem o fechamento. Os outros ~384 do
  [inventário](endpoints.md) foram extraídos do bundle mas não exercitados — método e caminho são
  confiáveis, schema não.
- **Schemas são indutivos**: um campo presente em toda amostra pode ser opcional no servidor.
  `/invoices`, `/leases` e `/financial/transactions` têm 15–31 amostras (confiança `high`); os
  demais, 1–7. A etiqueta `low` no `confidence.json` às vezes reflete só "um único status
  observado", não schema fraco.
- **É API interna**: pode mudar sem aviso. Se um campo sumir, a captura precisa ser refeita.
- **Exemplos anonimizados**: nomes, documentos, e-mails, telefones e endereços foram substituídos
  por placeholders antes de gerar a spec. A captura crua (com dados de clientes) não está no
  repositório.

## Como atualizar

Os scripts em [tools/](tools/) reproduzem tudo. Todos leem `IMOBZI_*` do ambiente e só fazem
requisições **GET**.

```bash
set -a && source .env && set +a
cd /tmp/imobzi-capture

# 1. inventário de operações a partir dos bundles do app
curl -s -o main.js https://my.imobzi.com/build/main.js
node docs/imobzi/tools/extract-endpoints.mjs main.js

# 2. captura de amostras (as quatro passadas)
node docs/imobzi/tools/capture.mjs  capture/imobzi     # listagens e detalhes
node docs/imobzi/tools/capture2.mjs capture/imobzi     # repasses e vínculos
node docs/imobzi/tools/capture3.mjs capture/imobzi     # filtros e relatório de repasse
node docs/imobzi/tools/capture4.mjs capture/imobzi     # respostas de erro

# 3. sondagem de validação (gera param-probe.md)
node docs/imobzi/tools/probe.mjs capture/imobzi

# 4. anonimização + geração da spec
node docs/imobzi/tools/pre-scrub.mjs capture/imobzi capture/imobzi-pub
node .agents/skills/browser-to-api/scripts/discover.mjs \
  --run capture/imobzi-pub --origins my.imobzi.com,api.imobzi.app \
  --title "Imobzi — API interna do app (my.imobzi.com/v1)"
```

Publique apenas `capture/imobzi-pub/api-spec/` — o diretório `capture/imobzi/` contém dados reais
de clientes. Rode a checagem antes de commitar:

```bash
grep -rE '[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}|[0-9]{2}\.[0-9]{3}\.[0-9]{3}/[0-9]{4}-[0-9]{2}' docs/imobzi/api-spec
```

O diretório [cdp/](cdp/) guarda a captura de navegador de maio/2026, anterior a este levantamento,
mantida por referência histórica.
