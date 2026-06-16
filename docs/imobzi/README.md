# Imobzi API Observada

Este documento resume os endpoints vistos em uma sessao autenticada do Imobzi.
Nao e uma documentacao oficial: os formatos foram inferidos a partir do trafego
do navegador e podem mudar.

Artefatos completos:

- HTML: `api-spec/index.html`
- OpenAPI: `api-spec/openapi.yaml`
- Cliente gerado: `api-spec/client.mjs`
- Captura redigida: `cdp/network/`

## Autenticacao

Todas as chamadas observadas para `https://my.imobzi.com/v1/*` usavam:

- `authorization: <ID_TOKEN>`
- `content-type: application/json`
- `accept: application/json, text/plain, */*`
- `x-current-database:`

Nunca persistir tokens reais, cookies ou dados reais de clientes em docs,
commits ou fixtures.

## Endpoints Observados

| Metodo | Endpoint | Uso observado |
|---|---|---|
| `GET` | `/v1/invoices` | Lista faturas, com filtros de data/status/pagamento. |
| `GET` | `/v1/leases` | Lista contratos. |
| `GET` | `/v1/lease/code/:code` | Busca contrato por codigo; a captura com `:code` literal retornou `404`. |
| `GET` | `/v1/lease/checklist` | Checklist/metadados de contratos. |
| `GET` | `/v1/financial/accounts` | Contas financeiras disponiveis. |
| `GET` | `/v1/network-group/` | Grupos/rede, com cursor. |
| `GET` | `/v1/subscription` | Dados do plano/assinatura. |
| `GET` | `/v1/real-estate` | Dados da imobiliaria/conta. |
| `GET` | `/v1/parameters` | Parametros gerais da conta. |
| `GET` | `/v1/user/{id}/rules` | Regras/permissoes de usuario. |

## Faturas

Endpoint:

```http
GET https://my.imobzi.com/v1/invoices
```

Query string observada na tela `#/financial/invoices`:

| Parametro | Exemplo observado | Significado provavel |
|---|---|---|
| `order_by` | `date` | Campo usado para ordenar. |
| `sort_by` | `desc` | Direcao da ordenacao. |
| `status` | `all` | Filtro de situacao. |
| `payments_methods_available` | `all_payments` | Filtro de metodos disponiveis. |
| `payment_method` | `all_payments` | Filtro de metodo de pagamento. |
| `start_at` | `2026-05-01` | Inicio do periodo. |
| `end_at` | `2026-05-31` | Fim do periodo. |
| `page` | `1` | Pagina da listagem. |

Exemplo sanitizado:

```http
GET /v1/invoices?order_by=date&sort_by=desc&status=all&payments_methods_available=all_payments&payment_method=all_payments&start_at=2026-05-01&end_at=2026-05-31&page=1
```

Resposta observada:

| Campo | Tipo inferido | Observacao |
|---|---|---|
| `invoices` | array | Lista de faturas. |
| `count` | integer | Quantidade retornada/contada. |
| `next_page` | integer | Proxima pagina quando houver paginacao. |
| `total` | number | Total geral no filtro. |
| `total_paid` | number | Total pago. |
| `total_pending` | number | Total pendente. |
| `total_overdue` | number | Total vencido. |
| `receipt_methods_available` | object | Metodos de recebimento disponiveis. |

Campos observados em cada item de `invoices`:

```text
total_value
invoice_id
status
due_date
description
charge_fee_value
payment_method
paid_at
payments_methods_available
payment_maximum_installments
interest_value
difference_value
invoice_url
contact
info_contract
property
account
bank_slip_id
bank_slip_url
onlending_split
category
subcategory
reference_start_at
reference_end_at
lease
onlendings_and_fees
```

## Contratos

Endpoint:

```http
GET https://my.imobzi.com/v1/leases
```

Query observada:

| Parametro | Exemplo observado |
|---|---|
| `smart_list` | vazio |

Tambem foram vistos formatos com filtros adicionais durante navegacao por
contratos:

```http
GET /v1/leases?smart_list=actives_except_vacation_rental&start_at=2026-05-15&end_at=2026-06-14
GET /v1/leases?search_text=casa&search_type=&owner_id=&owner_type=&property_id=
```

## Observacoes

- A confianca do OpenAPI gerado esta baixa porque cada endpoint tem poucas
  amostras.
- Os schemas sao indutivos: campo obrigatorio no arquivo pode ser apenas um
  campo presente nas amostras capturadas.
- Para melhorar a referencia, capture mais fluxos: mudar status de fatura,
  filtrar por pago/pendente/vencido, abrir detalhe de fatura e paginar.
