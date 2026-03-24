# Relatório Mensal - {{MONTH_LABEL}}

## Meta

- Mês de referência: `{{YEAR}}-{{MONTH_PADDED}}`
- Arquivo de memória: `data/monthly-report-memory/{{YEAR}}-{{MONTH_PADDED}}.md`
- Status geral: `em_andamento`
- Responsável: `{{OPERATOR}}`
- Última atualização: `{{LAST_UPDATED}}`

## Resumo Executivo

- Objetivo do mês:
- Situação atual:
- Bloqueios ativos:
- Próxima ação:

## Workflow Status

| Step | Etapa | Status | Observações |
|---|---|---|---|
| 0 | Confirmar mês | pendente | |
| 1 | Criar arquivo de memória | pendente | |
| 2 | Criar task list | pendente | |
| 3 | Backup | pendente | |
| 4 | Importações e conciliações | pendente | |
| 5 | Sugestões automáticas | pendente | |
| 6 | Categorização manual | pendente | |
| 7 | Contas de investimento | pendente | |
| 8 | Verificação de inadimplentes | pendente | |
| 9 | Checks finais | pendente | |
| 10 | Envio do relatório | pendente | |
| 11 | Checar relatório de tributação | pendente | |
| 12 | Enviar relatório de tributação | pendente | |

## Task List Operacional

| Tarefa | Status | Observações |
|---|---|---|
| Backup do banco de dados | pendente | |
| Importar OFX: CC - Sicredi | pendente | |
| Confirmar saldo: CC - Sicredi | pendente | |
| Importar Imobzi: CC - PJBank | pendente | |
| Confirmar saldo: CC - PJBank | pendente | |
| Importar OFX/CSV: CC - BTG | pendente | |
| Confirmar saldo: CC - BTG | pendente | |
| Gerar e aplicar sugestões de categorização | pendente | |
| Categorizar transações restantes | pendente | |
| Balancear CI - SicrediInvest | pendente | |
| Balancear CI - BTG | pendente | |
| Balancear CI - XP | pendente | |
| Verificar inadimplentes atuais do sistema | pendente | |
| Levantar pendentes do Imobzi | pendente | |
| Revisar correspondência pendentes x depósitos | pendente | |
| Marcar pagamentos aprovados como pagos no Imobzi | pendente | |
| Atualizar lista de inadimplentes do sistema | pendente | |
| Verificações finais (checks) | pendente | |
| Enviar relatório mensal por email | pendente | |
| Checar relatório de tributação | pendente | |
| Enviar relatório de tributação por email | pendente | |

## Step 0 - Confirmar Mês

### Definição De Feito

- [ ] O mês foi confirmado com o usuário
- [ ] `YEAR`, `MONTH` e `YYYY-MM` foram definidos

### Registro

- Mês confirmado:
- Observações:

## Step 1 - Criar Arquivo De Memória

### Definição De Feito

- [ ] O arquivo `data/monthly-report-memory/YYYY-MM.md` foi criado
- [ ] Os placeholders principais foram substituídos
- [ ] O resumo executivo foi inicializado

### Registro

- Caminho do arquivo:
- Observações:

## Step 2 - Criar Task List

### Definição De Feito

- [ ] Todas as tarefas do workflow foram criadas
- [ ] A ordem das tarefas segue o workflow principal
- [ ] O status inicial foi registrado

### Registro

- Ferramenta usada:
- Observações:

## Step 3 - Backup

### Definição De Feito

- [ ] O comando de backup foi executado
- [ ] O backup foi concluído com sucesso
- [ ] O resultado foi registrado

### Registro

- Comando executado:
- Resultado:
- Nome/local do backup:
- Observações:

## Step 4 - Importações E Conciliações

### Definição De Feito Da Etapa

- [ ] `CC - Sicredi` foi tratada
- [ ] `CC - PJBank` foi tratada
- [ ] `CC - BTG` foi tratada
- [ ] Todos os saldos exigidos foram validados antes de avançar

### CC - Sicredi

- Arquivo do mês:
- Preview executado:
- Import executado:
- Transações importadas:
- Duplicadas:
- Saldo no app:
- Saldo externo:
- Usuário confirmou saldo: `nao`
- Observações:

### CC - PJBank

- PDF recebido: `nao`
- Reconciliação PJBank vs Imobzi executada:
- Transferências Pix criadas:
- Preview da importação:
- Importação API executada:
- Saldo no Imobzi:
- Saldo no PDF:
- Usuário confirmou saldo: `nao`
- Observações:

### CC - BTG

- Arquivo do mês:
- Método de importação:
- Preview executado:
- Import executado:
- Saldo no app:
- Saldo externo:
- Usuário confirmou saldo: `nao`
- Observações:

## Step 5 - Sugestões Automáticas

### Definição De Feito

- [ ] O script de sugestões foi executado para o mês correto
- [ ] A quantidade gerada foi registrada
- [ ] As sugestões aplicáveis foram aplicadas
- [ ] O restante foi encaminhado para a etapa manual

### Registro

- Script executado:
- Modo:
- Total de sugestões:
- Total aplicado:
- Restante para análise manual:
- Observações:

## Step 6 - Categorização Manual

### Definição De Feito

- [ ] As transações sem categoria foram listadas
- [ ] O histórico foi consultado antes de perguntar ao usuário
- [ ] O usuário só foi consultado para casos sem histórico ou ambíguos
- [ ] Todas as decisões foram registradas
- [ ] Nenhuma transação foi marcada como reviewed

### Pendências

| ID | Data | Conta | Descrição | Valor | Status | Observações |
|---|---|---|---|---|---|---|
| | | | | | pendente | |

### Histórico Consultado

| Termo | Encontrou histórico | Sugestão | Imóvel | Referência |
|---|---|---|---|---|
| | nao | | | |

### Perguntas Ao Usuário

| Data | Descrição | Valor | Conta | Pergunta | Resposta |
|---|---|---|---|---|---|
| | | | | | |

### Resultado

- Total categorizado manualmente:
- Total ainda pendente:
- Observações:

## Step 7 - Contas De Investimento

### Definição De Feito Da Etapa

- [ ] Cada conta CI com movimentação foi analisada
- [ ] As transferências espelho foram lançadas individualmente quando necessário
- [ ] O saldo real foi obtido com o usuário quando necessário
- [ ] Os rendimentos foram lançados
- [ ] Os saldos finais foram validados

### CI - SicrediInvest

- Transferências espelho criadas:
- Rendimentos lançados:
- Saldo no app antes dos rendimentos:
- Saldo real informado pelo usuário:
- Saldo final no app:
- Usuário confirmou saldo: `nao`
- Observações:

### CI - BTG

- Houve movimentação no mês: `nao`
- Transferências espelho criadas:
- Rendimentos lançados:
- Saldo real informado pelo usuário:
- Saldo final no app:
- Usuário confirmou saldo: `nao`
- Observações:

### CI - XP

- Houve movimentação no mês: `nao`
- Transferências espelho criadas:
- Rendimentos lançados:
- Saldo real informado pelo usuário:
- Saldo final no app:
- Usuário confirmou saldo: `nao`
- Observações:

## Step 8 - Verificação De Inadimplentes

### Definição De Feito

- [ ] Os inadimplentes ativos do sistema foram listados
- [ ] Os pendentes do Imobzi do mês foram listados
- [ ] O usuário viu os três blocos: lista anterior, pendentes do Imobzi e novo estado proposto
- [ ] Foi gerada uma lista de matches e possíveis matches
- [ ] Nenhum match foi fechado sem aprovação explícita do usuário
- [ ] Os pagamentos aprovados foram marcados como pagos no Imobzi quando aplicável
- [ ] As inclusões e remoções finais da lista do sistema foram registradas

### Inadimplentes Atuais Do Sistema

| ID | Inquilino | Imóvel | Valor | Vencimento | Status | Observações |
|---|---|---|---|---|---|---|
| | | | | | ativo | |

### Pendentes Do Imobzi

| Invoice ID | Inquilino | Imóvel | Vencimento | Valor | Método | Situação |
|---|---|---|---|---|---|---|
| | | | | | inconclusivo | pendente |

### Correspondência Com Depósitos/Recebimentos

| Invoice ID | Conta/Depósito candidato | Evidência | Força do match | Precisa aprovação do usuário | Decisão |
|---|---|---|---|---|---|
| | | | possivel | sim | pendente |

### Casos Sem Match

| Invoice ID | Inquilino | Imóvel | Valor | Candidato a inadimplente novo | Observações |
|---|---|---|---|---|---|
| | | | | sim | |

### Aprovações Do Usuário

| Caso | Pergunta | Resposta do usuário | Decisão operacional |
|---|---|---|---|
| | | | |

### Quitações No Imobzi

| Invoice ID | Marcada como paga no Imobzi | Data usada | Observações |
|---|---|---|---|
| | nao | | |

### Atualizações Na Lista Do Sistema

- Inclusões feitas:
- Remoções feitas:
- Observações:

## Step 9 - Checks Finais

### Definição De Feito

- [ ] O script de checks foi executado para o mês correto
- [ ] `Transferência Entre Contas` soma zero
- [ ] Não restam transações sem categoria
- [ ] O DRE foi gerado sem erro
- [ ] Qualquer falha foi corrigida antes de prosseguir

### Registro

- Script executado:
- Transferências somam zero: `nao_validado`
- Total líquido de `Transferência Entre Contas`:
- Há transações sem categoria: `nao_validado`
- DRE gerado com sucesso: `nao_validado`
- Falhas encontradas:
- Correções feitas:

## Step 10 - Envio Do Relatório

### Definição De Feito

- [ ] O script de envio foi executado com os destinatários corretos
- [ ] O resultado foi registrado
- [ ] O status final do mês foi atualizado

### Registro

- Script executado:
- Destinatários:
- Enviado com sucesso: `nao`
- Horário:
- Observações:

## Step 11 - Checar Relatório De Tributação

### Definição De Feito

- [ ] O relatório de tributação do mês correto foi aberto
- [ ] O relatório foi apresentado ao usuário
- [ ] O usuário disse explicitamente que o relatório está correto

### Registro

- Caminho/tela usada:
- O usuário aprovou: `nao`
- Observações:

## Step 12 - Envio Do Relatório De Tributação

### Definição De Feito

- [ ] O email de tributação foi enviado
- [ ] Os destinatários foram registrados
- [ ] O resultado do envio foi registrado

### Registro

- Tela/ação usada:
- Destinatários:
- Enviado com sucesso: `nao`
- Horário:
- Observações:

## Evidências

### Arquivos Recebidos

| Tipo | Arquivo | Origem | Status |
|---|---|---|---|
| OFX | | | pendente |
| PDF | | | pendente |
| CSV | | | pendente |

### Comandos E IDs Relevantes

```text
# Cole aqui importBatchId, comandos, IDs, contagens ou saídas relevantes.
```

## Encerramento

### Definição De Feito

- [ ] Todas as etapas têm status final
- [ ] O resumo final foi escrito
- [ ] Pendências remanescentes foram explicitadas

### Registro Final

- Status final:
- Resumo final:
- Pendências para revisão humana:
- Próximo passo recomendado:
