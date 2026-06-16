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
- Nunca sobrescreva o arquivo de memória mensal se ele já existir.
- Nunca crie ajustes ou transferências fictícias para forçar o balanceamento.
- Não pare até concluir todos os checks finais.
- **Shell não persiste entre comandos**: cada chamada Bash é um shell novo. Re-exporte o `.env` em TODO comando que usa a API: `set -a && source ./.env && set +a && curl ...`. Sintoma de esquecimento: `curl: (3) URL rejected: No host part in the URL`.
- **`bulk-categorize` retorna `{"success":true}` mesmo com IDs inexistentes/truncados (no-op silencioso)**. Use SEMPRE o ID COMPLETO da transação e CONFIRME com `GET /transactions/{id}` que a categoria foi aplicada. Não confie só no `success:true`.
- **Backup (`POST /backups`) quase sempre responde `504 Gateway Time-out` (nginx)**, mas o backup conclui no servidor. Valide via SSH (`ls -lht /opt/financeiro-ratc/shared/backups`) — exige autorização explícita do usuário para o SSH. Não trate o 504 como falha.
- **Propriedades inativas/vendidas não aparecem em `GET /properties`** (ex.: `CAT - Terreno Dahma`, `GUA - Apartamento Guarujá`), mas ainda são usadas em categorizações. Pegue o `propertyId` delas a partir de transações históricas que já as usam.
- **O patrimônio do print da corretora pode ser de qualquer conta CI** — confirme com o usuário QUAL conta (BTG, XP, etc.) antes de balancear. Em maio/2026 o print "Ratc" era o BTG, não a XP.
- **Imobzi não exige SSH**: pendentes, quitação, preview e import podem ser feitos a partir do ambiente local pelo fluxo de auth já existente no projeto (`lib/features/imobzi/auth.ts`). Veja `references/pjbank-imobzi.md`.

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
8. Verificar inadimplentes do mês e atualizar a lista do sistema.
9. Rodar checks finais e corrigir falhas.
10. Enviar o relatório mensal por email.
11. Checar o relatório de tributação com o usuário.
12. Enviar o email de relatório de tributação.

## Step 0 — Confirmar Mês

- Pergunte ao usuário qual mês deve ser processado.
- Se o usuário não especificar, proponha o mês anterior.
- Normalize em `YEAR`, `MONTH` e `YYYY-MM`.
- Antes de seguir para o Step 1, confirme que `RATC_API_URL` e `RATC_API_KEY` estão carregadas no shell atual.
- Quando esta etapa estiver concluída e validada, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 1 — Criar Arquivo De Memória

Se `data/monthly-report-memory/YYYY-MM.md` já existir:

- não crie outro arquivo
- continue usando o arquivo existente como memória operacional do mês

Se o arquivo ainda não existir:

```bash
mkdir -p data/monthly-report-memory
cp skills/relatorio-mensal/assets/monthly-report-memory-template.md data/monthly-report-memory/YYYY-MM.md
```

Depois:

- substitua placeholders do template
- registre o mês confirmado
- use esse arquivo como memória operacional até o fim do workflow
- Quando esta etapa estiver concluída e validada, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 2 — Criar Task List Na Ferramenta De Todo-List

Registre as tarefas derivadas do workflow principal na ferramenta de todo-list do agente usando estes títulos:

| Step | Tarefa                                        |
| ---- | --------------------------------------------- |
| 3    | Backup do banco de dados                      |
| 4    | Importar OFX: CC - Sicredi                    |
| 4    | Confirmar saldo: CC - Sicredi                 |
| 4    | Importar Imobzi: CC - PJBank                  |
| 4    | Confirmar saldo: CC - PJBank                  |
| 4    | Importar OFX/CSV: CC - BTG                    |
| 4    | Confirmar saldo: CC - BTG                     |
| 5    | Gerar e aplicar sugestões de categorização    |
| 6    | Categorizar transações restantes              |
| 7    | Balancear CI - SicrediInvest                  |
| 7    | Balancear CI - BTG                            |
| 7    | Balancear CI - XP                             |
| 8    | Verificar inadimplentes atuais do sistema     |
| 8    | Levantar pendentes do Imobzi                  |
| 8    | Revisar correspondência pendentes x depósitos |
| 8    | Marcar pagamentos aprovados como pagos no Imobzi |
| 8    | Atualizar lista de inadimplentes do sistema   |
| 9    | Verificações finais (checks)                  |
| 10   | Enviar relatório mensal por email             |
| 11   | Checar relatório de tributação                |
| 12   | Enviar relatório de tributação por email      |

Regras:

- não mantenha o workflow apenas no texto da conversa ou só no arquivo de memória
- crie a todo-list logo no início do trabalho, antes de entrar no backup
- marque `in_progress` antes de iniciar cada tarefa
- marque `completed` só depois da validação da etapa
- mantenha a todo-list sincronizada com o andamento real do workflow
- se houver bloqueio, registre no arquivo de memória e mantenha visível para a próxima etapa

Quando a todo-list inicial do mês estiver criada e revisada, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 3 — Backup

Use a API de backup como caminho padrão:

```bash
curl -X POST "$RATC_API_URL/backups" \
  -H "Authorization: Bearer $RATC_API_KEY"
```

Validação mínima desta etapa:

- confirme que a resposta da API retornou `success: true`
- registre `filename`, `filepath`, `sizeBytes` ou `sizeHuman` no arquivo de memória
- trate a etapa como concluída apenas depois de confirmar que o backup foi realmente criado

Se a chamada da API falhar ou travar:

- não invente um fallback automaticamente
- abra `references/production-access.md`
- use SSH apenas para diagnóstico, logs e validação do que aconteceu em produção
- só use um comando alternativo de backup se houver necessidade operacional clara e isso ficar registrado no arquivo de memória

Quando o backup estiver concluído e validado, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 4 — Importações E Conciliações

Subfluxos desta etapa:

- `CC - Sicredi`: usar `scripts/import-ofx.sh`
- `CC - PJBank`: seguir `references/pjbank-imobzi.md`
- `CC - BTG`: importar o arquivo do mês e confirmar saldo externo

Referências:

- `references/pjbank-imobzi.md`
- `references/api-endpoints.md`
- `references/checks-and-validation.md`

Quando cada subfluxo desta etapa estiver concluído e validado, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 5 — Sugestões Automáticas

Use:

```bash
./scripts/suggestions.sh $YEAR $MONTH --auto-apply
```

Depois valide a etapa com a checklist de `references/checks-and-validation.md`.

Quando a etapa estiver concluída e validada, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 6 — Categorização Manual

Fluxo:

1. Liste transações sem categoria.
2. Consulte `references/categorization-guide.md`.
3. Consulte histórico do próprio sistema antes de perguntar ao usuário.
4. Pergunte ao usuário apenas o que continuar sem histórico ou ambíguo.
5. Categorize sem marcar `reviewed`.

Regra fixa de imóvel:

- Recebimentos de `Santa Maria Tem Negocios Imobiliarios` / `Santa Maria Tem` / CNPJ `64.508.005/0001-02` devem ser categorizados como `Aluguel` no imóvel `RIB - Av. Independência 1589`. Nunca use `POA - Protásio Alves Porto Alegre` para esse pagador/CNPJ.
- Recebimentos de `Painew Propaganda e Publicidade` / `Painew Propaganda` devem ser categorizados como `Aluguel` no imóvel `RIB - Totem`.
- Recebimentos de `Ilha da Madeira Gestao Hoteis` / `Ilha da Madeira` / CNPJ `10.706.625/0001-27` devem ser categorizados como `Aluguel` no imóvel `BER - Riviera de São Lourenço`.
- Recebimentos de `Instituto de Olhos de Catanduva` / CNPJ `00.579.873/0001-09` devem ser categorizados como `Aluguel` no imóvel `CAT - Otica - Casa ao Fundo`.
- Recebimentos de `Agatha Brandini Fernandes` / `Agatha Brandini` devem ser categorizados como `Aluguel` no imóvel `CAT - Rua Bahia Sala 4`.
- Boleto/saída `Village Damha` via `PJBANK PAGAMENTOS` no valor de `550,00` deve ser categorizado como `Condomínios` no imóvel `CAT - Terreno Dahma`.

Referências:

- `references/categorization-guide.md`
- `references/categories.md`
- `references/api-endpoints.md`

Quando a categorização manual estiver concluída e validada, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 7 — Contas De Investimento

Siga `references/investments.md`.

Cobertura mínima:

- `CI - SicrediInvest`
- `CI - BTG`
- `CI - XP`

Quando cada conta de investimento estiver balanceada e validada, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 8 — Verificação De Inadimplentes

Objetivo desta etapa:

1. verificar quais inadimplentes já estão cadastrados no sistema e vieram do mês anterior
2. levantar os pagamentos pendentes do Imobzi para o mês
3. cruzar os pendentes do Imobzi com os depósitos/recebimentos do sistema financeiro
4. apresentar ao usuário a revisão completa em três blocos fixos
5. decidir, sempre com aprovação explícita do usuário, quais inadimplentes devem entrar ou sair da lista do sistema

Fluxo mínimo:

1. Liste os inadimplentes atuais do sistema via `GET /inadimplentes`.
2. Busque os pendentes do Imobzi do mês na fonte operacional atual.
3. Gere uma lista de correspondência entre pendentes do Imobzi e depósitos/recebimentos nas contas correntes.
4. Mostre sempre ao usuário, de forma separada e explícita:
   - os inadimplentes que vieram do mês anterior
   - os pendentes do Imobzi
   - o novo estado proposto dos inadimplentes
5. Apresente todos os matches e possíveis matches ao usuário antes de fechar qualquer correspondência.
6. Para casos que pareçam pagos fora do fluxo do Imobzi, peça aprovação explícita do usuário antes de remover ou deixar de adicionar à lista.
7. Para casos sem correspondência confiável, trate como candidato a inadimplente novo.
8. Só considere um match fechado depois que o usuário aprovar explicitamente aquele caso.
9. Se o usuário aprovar que um pendente foi pago fora do fluxo do Imobzi, marque a invoice como paga no Imobzi via API antes de atualizar o estado final da etapa.
10. Se um inadimplente antigo tiver pagamento confirmado, remova-o da lista ativa do sistema.
11. Se houver inadimplente novo confirmado, adicione-o à lista do sistema.

Regras críticas desta etapa:

- a fonte de verdade da lista ativa é o sistema `financeiro.ratc.com.br`
- não atualize a lista de inadimplentes sem registrar a evidência no arquivo de memória
- não trate correspondência fraca como confirmação automática
- não feche nenhum match sem aprovação explícita do usuário
- sempre apresente os matches e possíveis matches ao usuário antes de decidir
- sempre mostre ao usuário os três blocos: lista anterior, pendentes do Imobzi e novo estado proposto
- se um match aprovado implicar quitação fora do fluxo normal, marque a invoice como paga no Imobzi antes de fechar a etapa
- para casos de boleto, a ausência de pagamento no Imobzi é só um indício; ainda assim cheque se houve depósito na conta corrente
- para casos não-boleto, faça a checagem um a um contra depósitos/recebimentos do sistema

Referência operacional:

- `references/inadimplentes.md`
- `references/api-endpoints.md`

Quando a etapa estiver concluída e validada, marque as tarefas correspondentes como `completed` na ferramenta de todo-list do agente.

## Step 9 — Checks Finais

Use:

```bash
./scripts/checks.sh $YEAR $MONTH
```

Se falhar:

- não avance para o envio
- corrija a causa
- rerode os checks

Use a checklist em `references/checks-and-validation.md`.

Quando todos os checks passarem, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 10 — Envio Do Relatório

O envio é uma ação externa (email para a família/sócios): **só envie com confirmação explícita do usuário** e com os destinatários confirmados por ele.

**Pré-envio — gerar os anexos (DRE e Aluguéis):** o email referencia os PDFs salvos; se não existirem para o mês, eles não vão no email. Os dados do fechamento ficam em PRODUÇÃO (via API), mas `scripts/reports/save-monthly-artifacts.ts` usa o banco LOCAL por padrão — então aponte para o banco remoto:

```bash
set -a && source ./.env && set +a
DATABASE_URL="$DATABASE_URL_REMOTE" npx tsx scripts/reports/save-monthly-artifacts.ts $YEAR $MONTH
```

Isso gera `DRE_YYYY_MM.pdf` e `Alugueis_YYYY_MM.pdf`, sobe no S3 e registra em `saved_files`. Depois envie:

```bash
./scripts/send-report.sh $YEAR $MONTH "<destinatarios>"
```

Só envie depois que os checks finais passarem.

Quando o envio do relatório mensal estiver concluído e registrado, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 11 — Checar Relatório De Tributação

Abra o relatório em `/relatorios/tributacao` para o mês de referência e revise o preview com o usuário.

Definição de feito desta etapa:

- o relatório de tributação foi apresentado ao usuário
- o usuário disse explicitamente que o relatório está correto

Se o usuário não aprovar:

- não avance para o envio do email de tributação
- registre a pendência no arquivo de memória

Se o usuário aprovar e a etapa estiver validada, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

## Step 12 — Enviar Relatório De Tributação

Depois da aprovação do usuário no Step 11:

- envie o email de relatório de tributação pelo fluxo existente da tela `/relatorios/tributacao`
- registre destinatários e resultado no arquivo de memória

Só envie depois da aprovação explícita do usuário no Step 11.

Quando o envio do relatório de tributação estiver concluído e registrado, marque a tarefa correspondente como `completed` na ferramenta de todo-list do agente.

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

### Inadimplentes

- [ ] Os inadimplentes atuais do sistema foram listados
- [ ] Os pendentes do Imobzi do mês foram listados
- [ ] Foi gerada uma lista de matches e possíveis matches com depósitos/recebimentos
- [ ] Nenhum match foi fechado sem aprovação explícita do usuário
- [ ] As inclusões e remoções finais da lista do sistema foram registradas

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
- `references/inadimplentes.md`: heurísticas, matching, aprovação do usuário e atualização da lista
- `references/categories.md`: categorias e hierarquia
- `references/categorization-guide.md`: heurísticas de categorização

## Scripts

- `scripts/import-ofx.sh`
- `scripts/suggestions.sh`
- `scripts/categorize.sh`
- `scripts/create-transaction.sh`
- `scripts/checks.sh`
- `scripts/send-report.sh`
