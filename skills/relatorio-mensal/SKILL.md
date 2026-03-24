---
name: relatorio-mensal
description: Runs the RATC monthly financial closing workflow via REST API, including account imports, Imobzi reconciliation, transaction categorization, investment balancing, verification checks, and monthly report email delivery. Trigger on requests about relatório mensal, monthly closing, OFX import, or transaction categorization for a month.
---

# Relatório Mensal — Workflow via API

Workflow principal para fechamento financeiro mensal da RATC.

## Quando usar

Use esta skill quando a tarefa envolver:

- fechamento do mês
- relatório mensal
- importar OFX ou conciliar movimentações do mês
- categorizar transações do mês
- balancear contas de investimento antes do envio do relatório

## Pré-requisitos

Antes de começar, confirme que estes insumos existem:

- `RATC_API_URL`
- `RATC_API_KEY`
- `curl`
- `jq`

Quando a etapa exigir produção, use `references/production-access.md`.

## Bootstrap Do Ambiente

Antes de rodar qualquer etapa que use a API:

1. Verifique se `RATC_API_URL` e `RATC_API_KEY` já estão exportadas.
2. Se não estiverem, carregue-as do `.env` do projeto.
3. Só depois siga para o workflow.

Comandos sugeridos:

```bash
printenv | rg '^(RATC_API_URL|RATC_API_KEY)='
```

Se não houver saída:

```bash
set -a
source ./.env
set +a
printenv | rg '^(RATC_API_URL|RATC_API_KEY)='
```

Regras:

- prefira carregar do `.env` do projeto atual antes de assumir que as variáveis já estão exportadas
- não interrompa o workflow só porque `printenv` veio vazio na primeira checagem
- se precisar validar produção, veja `references/production-access.md`

## Gotchas

- Não avance para a próxima etapa sem registrar a validação da etapa atual.
- Se houver bloqueio, registre no arquivo de memória e mantenha visível para a próxima etapa.
- Nunca crie ajustes ou transferências fictícias para forçar o balanceamento.
- Não pare até concluir todos os checks finais.

## Guardrails Críticos

- Nunca marcar transações como reviewed durante este workflow.
- Nunca criar transferências fictícias ou ajustes de transferência sem contraparte real.
- Em `CI - SicrediInvest`, nunca criar um único ajuste agregado para aplicações e resgates.
- Só avançar de etapa quando a validação da etapa atual tiver sido registrada.

## Workflow Overview

Esta é a fonte única de verdade do fluxo:

0. Confirmar o mês de referência com o usuário.
1. Criar `data/monthly-report-memory/YYYY-MM.md` a partir de `assets/monthly-report-memory-template.md`.
2. Criar a task list operacional do mês na ferramenta de todo-list do agente.
3. Executar backup do banco em produção.
4. Importar e conciliar contas do mês.
5. Gerar e aplicar sugestões automáticas.
6. Categorizar manualmente o que restar.
7. Balancear contas de investimento.
8. Rodar checks finais e corrigir falhas.
9. Enviar o relatório mensal por email.
10. Checar o relatório de tributação com o usuário.
11. Enviar o email de relatório de tributação.

## Step 0 — Confirmar Mês

- Pergunte ao usuário qual mês deve ser processado.
- Se o usuário não especificar, proponha o mês anterior.
- Normalize em `YEAR`, `MONTH` e `YYYY-MM`.
- Antes de seguir para o Step 1, confirme que `RATC_API_URL` e `RATC_API_KEY` estão carregadas no shell atual.

## Step 1 — Criar Arquivo De Memória

```bash
mkdir -p data/monthly-report-memory
cp skills/relatorio-mensal/assets/monthly-report-memory-template.md data/monthly-report-memory/YYYY-MM.md
```

Depois:

- substitua placeholders do template
- registre o mês confirmado
- use esse arquivo como memória operacional até o fim do workflow

## Step 2 — Criar Task List Na Ferramenta De Todo-List

Registre as tarefas derivadas do workflow principal na ferramenta de todo-list do agente usando estes títulos:

| Step | Tarefa                                     |
| ---- | ------------------------------------------ |
| 3    | Backup do banco de dados                   |
| 4    | Importar OFX: CC - Sicredi                 |
| 4    | Confirmar saldo: CC - Sicredi              |
| 4    | Importar Imobzi: CC - PJBank               |
| 4    | Confirmar saldo: CC - PJBank               |
| 4    | Importar OFX/CSV: CC - BTG                 |
| 4    | Confirmar saldo: CC - BTG                  |
| 5    | Gerar e aplicar sugestões de categorização |
| 6    | Categorizar transações restantes           |
| 7    | Balancear CI - SicrediInvest               |
| 7    | Balancear CI - BTG                         |
| 7    | Balancear CI - XP                          |
| 8    | Verificações finais (checks)               |
| 9    | Enviar relatório mensal por email          |
| 10   | Checar relatório de tributação             |
| 11   | Enviar relatório de tributação por email   |

Regras:

- não mantenha o workflow apenas no texto da conversa ou só no arquivo de memória
- crie a todo-list logo no início do trabalho, antes de entrar no backup
- marque `in_progress` antes de iniciar cada tarefa
- marque `completed` só depois da validação da etapa
- mantenha a todo-list sincronizada com o andamento real do workflow
- se houver bloqueio, registre no arquivo de memória e mantenha visível para a próxima etapa

## Step 3 — Backup

Use este comando:

```bash
ssh robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && npm run cli -- backup"
```

Se precisar de produção, logs ou validação de serviços, abra `references/production-access.md`.

## Step 4 — Importações E Conciliações

Subfluxos desta etapa:

- `CC - Sicredi`: usar `scripts/import-ofx.sh`
- `CC - PJBank`: seguir `references/pjbank-imobzi.md`
- `CC - BTG`: importar o arquivo do mês e confirmar saldo externo

Referências:

- `references/pjbank-imobzi.md`
- `references/api-endpoints.md`
- `references/checks-and-validation.md`

## Step 5 — Sugestões Automáticas

Use:

```bash
./scripts/suggestions.sh $YEAR $MONTH --auto-apply
```

Depois valide a etapa com a checklist de `references/checks-and-validation.md`.

## Step 6 — Categorização Manual

Fluxo:

1. Liste transações sem categoria.
2. Consulte `references/categorization-guide.md`.
3. Consulte histórico do próprio sistema antes de perguntar ao usuário.
4. Pergunte ao usuário apenas o que continuar sem histórico ou ambíguo.
5. Categorize sem marcar `reviewed`.

Referências:

- `references/categorization-guide.md`
- `references/categories.md`
- `references/api-endpoints.md`

## Step 7 — Contas De Investimento

Siga `references/investments.md`.

Cobertura mínima:

- `CI - SicrediInvest`
- `CI - BTG`
- `CI - XP`

## Step 8 — Checks Finais

Use:

```bash
./scripts/checks.sh $YEAR $MONTH
```

Se falhar:

- não avance para o envio
- corrija a causa
- rerode os checks

Use a checklist em `references/checks-and-validation.md`.

## Step 9 — Envio Do Relatório

Use:

```bash
./scripts/send-report.sh $YEAR $MONTH "<destinatarios>"
```

Só envie depois que os checks finais passarem.

## Step 10 — Checar Relatório De Tributação

Abra o relatório em `/relatorios/tributacao` para o mês de referência e revise o preview com o usuário.

Definição de feito desta etapa:

- o relatório de tributação foi apresentado ao usuário
- o usuário disse explicitamente que o relatório está correto

Se o usuário não aprovar:

- não avance para o envio do email de tributação
- registre a pendência no arquivo de memória

## Step 11 — Enviar Relatório De Tributação

Depois da aprovação do usuário no Step 10:

- envie o email de relatório de tributação pelo fluxo existente da tela `/relatorios/tributacao`
- registre destinatários e resultado no arquivo de memória

Só envie depois da aprovação explícita do usuário no Step 10.

## Checklists De Validação

### Importações

- [ ] O arquivo do mês correto foi usado
- [ ] O preview foi executado quando aplicável
- [ ] O saldo no app foi comparado com a fonte externa
- [ ] O usuário confirmou o saldo quando a etapa pede confirmação
- [ ] O resultado foi registrado no arquivo de memória

### Sugestões Automáticas

- [ ] O script foi executado para `YEAR` e `MONTH` corretos
- [ ] A quantidade aplicada foi registrada
- [ ] O restante foi encaminhado para categorização manual
- [ ] Não houve avanço silencioso com erro não investigado

### Checks Finais

- [ ] `Transferência Entre Contas` soma zero no mês
- [ ] Não restam transações sem categoria
- [ ] O DRE foi gerado sem erro
- [ ] Qualquer falha foi corrigida antes do envio

### Relatório De Tributação

- [ ] O relatório de tributação foi aberto para o mês correto
- [ ] O usuário disse explicitamente que o relatório está correto
- [ ] O email de tributação foi enviado
- [ ] Destinatários e resultado foram registrados no arquivo de memória

## References

- `references/api-endpoints.md`: endpoints e formatos de payload
- `references/pjbank-imobzi.md`: conciliação PJBank e importação via Imobzi
- `references/investments.md`: espelhamento, rendimentos e validação das contas CI
- `references/checks-and-validation.md`: critérios de parada, validação e rerun
- `references/production-access.md`: SSH, backup, logs e checks de produção
- `references/categories.md`: categorias e hierarquia
- `references/categorization-guide.md`: heurísticas de categorização

## Scripts

- `scripts/import-ofx.sh`
- `scripts/suggestions.sh`
- `scripts/categorize.sh`
- `scripts/create-transaction.sh`
- `scripts/checks.sh`
- `scripts/send-report.sh`
