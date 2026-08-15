# PJBank E Imobzi

Use esta referência na etapa de `CC - PJBank`.

Para a API do Imobzi em si — autenticação, endpoints, parâmetros validados e schemas —
veja `docs/imobzi/README.md` no repositório. Em especial, `GET /invoices` aceita
`period=paid_at`, que filtra por data de pagamento em vez de vencimento.

## Objetivo

Garantir que:
- o PDF do PJBank foi recebido
- a movimentação do mês bate com o Imobzi
- transferências Pix faltantes foram registradas no Imobzi
- a importação via API só acontece depois da conciliação

## Entradas Necessárias

- PDF do PJBank do mês
- `RATC_API_URL`
- `RATC_API_KEY`
- credenciais ou token válidos para Imobzi, resolvidos fora do `SKILL.md`
- IDs de conta resolvidos dinamicamente ou lidos de configuração segura

Se precisar buscar credenciais ou conferir produção, use `production-access.md`.

## Fluxo

1. Receber o PDF do PJBank do mês.
2. Autenticar no Imobzi com o método atual do ambiente.
3. Buscar transações do período no Imobzi.
4. Comparar totais diários do Imobzi com o PDF do PJBank.
5. Criar no Imobzi as transferências Pix de saída que faltarem.
6. Validar que o saldo final do Imobzi bate com o saldo final do PDF.
7. Rodar preview da importação via API.
8. Executar a importação via API.
9. Confirmar o saldo final no app com o usuário.

## Importação Via API

Use endpoints e payloads em `api-endpoints.md`.

Fluxo mínimo:
- preview primeiro
- importar depois
- registrar `importBatchId`, contagens e divergências no arquivo de memória

Caminho recomendado: use os endpoints REST `POST /imobzi/preview` e `POST /imobzi/import` (rodam em produção com as credenciais do servidor). Eles trazem só créditos (boletos) + tarifas; as saídas Pix da varredura precisam ser lançadas manualmente (ver abaixo).

## Autenticação Imobzi (pode rodar localmente, sem SSH)

O projeto já autentica no Imobzi via `lib/features/imobzi/auth.ts` (`getImobziAuthToken`), usando `IMOBZI_EMAIL`/`IMOBZI_PASSWORD` do `.env` e uma chave Firebase Web. Pontos práticos descobertos:

- A chave Firebase é uma **client key pública** (não é segredo): fica embutida no bundle do app web do Imobzi (campo `apiKey` em `my.imobzi.com/build/main.js`). Se faltar `IMOBZI_FIREBASE_API_KEY` no `.env` local, a chave do app pode ser usada.
- Cuidado: o `index.html` expõe a chave do **Google Maps** (restrita); a chave do **Firebase Auth** está no `build/main.js`.
- A chave tem **restrição de HTTP referrer**. Ao chamar a API de fora do navegador, envie o header `Referer: https://my.imobzi.com/` na autenticação e nas chamadas a `https://my.imobzi.com/v1/*`.
- Com isso, as funções já existentes (`getImobziPendingInvoices`, `markInvoiceAsPaid` em `lib/features/imobzi/invoices.ts`) funcionam a partir do ambiente local — não é preciso SSH em produção para levantar pendentes nem para quitar faturas.

## Saídas Pix da varredura (lançar manualmente)

O Imobzi traz só os créditos (boletos) e as tarifas. As transferências Pix de saída do PJBank para a conta principal (RATC/Sicredi) NÃO aparecem no Imobzi. Para cada saída do PDF:
- crie a transação manual no PJBank com valor negativo;
- categorize como `Transferência Entre Contas` (a contraparte é o crédito PIX correspondente no CC - Sicredi);
- isso fecha o saldo final do PJBank e zera o check de transferências.

## Validação Antes De Avançar

- [ ] O PDF do PJBank foi recebido
- [ ] A reconciliação diária foi concluída
- [ ] As transferências Pix faltantes foram lançadas
- [ ] O saldo final do Imobzi bate com o PDF
- [ ] O preview da importação foi executado
- [ ] A importação foi executada
- [ ] O usuário confirmou o saldo final no app

## Se Falhar

- Se a reconciliação não bater, não importe ainda.
- Se existirem Pix de saída no PDF sem contraparte no Imobzi, crie primeiro essas transferências.
- Se o saldo final continuar divergente, registre a causa no arquivo de memória e trate como bloqueio da etapa.
