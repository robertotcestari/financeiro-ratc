# Contas De Investimento

Use esta referência para `CI - SicrediInvest`, `CI - BTG` e `CI - XP`.

## Objetivo

Fechar as contas de investimento do mês com:
- transferências espelho corretas
- rendimentos lançados
- saldo final validado com o usuário

## Regras Críticas

- Nunca criar ajuste agregado em `CI - SicrediInvest`.
- Cada aplicação ou resgate relevante deve ter espelho individual quando necessário.
- O saldo final precisa bater com a fonte externa antes de concluir a etapa.

## Fluxo Padrão

1. Identificar movimentações de transferência saindo ou voltando das contas correntes.
2. Para cada movimentação relevante, criar a contraparte correta na conta CI.
3. Pedir ao usuário o saldo real da conta de investimento no último dia do mês.
4. Comparar saldo real com saldo atual do app.
5. Lançar rendimentos pela diferença.
6. Validar o saldo final no app com o usuário.

## CI - SicrediInvest

Regras adicionais:
- aplicações em `CC - Sicredi` precisam de espelho individual positivo em `CI - SicrediInvest`
- resgates em `CC - Sicredi` precisam de espelho individual negativo em `CI - SicrediInvest`

## CI - BTG E CI - XP

Use o mesmo fluxo padrão:
- verificar se houve movimentação no mês
- criar espelhos necessários
- pedir saldo real ao usuário
- lançar rendimentos, se houver diferença
- validar saldo final

## Comandos E Endpoints

- Para criar lançamentos manuais, use `scripts/create-transaction.sh`.
- Para consultar contas e transações, use `api-endpoints.md`.
- Para categorias, use `categories.md`.

## Validação Antes De Avançar

- [ ] Cada conta CI com movimentação foi analisada
- [ ] Espelhos necessários foram criados individualmente
- [ ] O saldo real foi obtido com o usuário
- [ ] Os rendimentos foram lançados
- [ ] O saldo final foi confirmado pelo usuário

## Se Falhar

- Se faltar saldo real da fonte externa, não conclua a etapa.
- Se o saldo final não bater, revise espelhos e rendimentos antes de seguir.
- Se houver dúvida sobre categoria ou conta de destino, registre a pendência no arquivo de memória.
