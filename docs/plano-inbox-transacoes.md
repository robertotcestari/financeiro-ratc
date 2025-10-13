# Plano da Caixa de Revisão de Transações (/transacoes) — Server Actions Only

Objetivo

- Centralizar categorização das transações no Inbox unificado em /transacoes, espelhando seu fluxo de Excel Contas Unificadas, com foco em velocidade de triagem, consistência e auditabilidade.

Princípios

- Fonte única de verdade: [UnifiedTransaction](prisma/schema.prisma:129).
- Priorizar Server Components e Server Actions. A exportação CSV utiliza rota dedicada em `app/api/transacoes/export`.
- Reuso dos serviços existentes: [categorizeTransaction()](lib/database/categorization.ts:23), [bulkCategorizeTransactions()](lib/database/categorization.ts:52), [findPotentialTransfers()](lib/database/transactions.ts:221).
- Transferências não afetam DRE.

Fluxo de alto nível

```mermaid
flowchart LR
  A[Importar arquivos] --> B[Transaction]
  B --> C[Revisão manual]
  C --> D[UnifiedTransaction isReviewed true]
  D --> E[/transacoes Inbox]
  E -->|Sugestoes e edicoes| F[categorizeTransaction]
  E -->|Selecao em lote| G[bulkCategorizeTransactions]
  E -->|Marcar revisado| H[isReviewed true]
  B --> I[findPotentialTransfers]
  I --> J[Transfer Review]
  J --> K[Transfer confirmado]
  D --> L[DRE Totais]
```

Modelos e consultas relevantes

- Tabela alvo: [UnifiedTransaction](prisma/schema.prisma:129) com campos year, month, categoryId, propertyId, isTransfer, isReviewed.
- Página server-side que lista: [TransacoesPage](app/transacoes/page.tsx:18), construção de filtros [TransacoesPage where](app/transacoes/page.tsx:42), paginação e ordenação [TransacoesPage findMany](app/transacoes/page.tsx:61) e serialização [TransacoesPage safeTransactions](app/transacoes/page.tsx:96).
- DRE impactado por reclassificação: [getDRETotalsByPeriod()](lib/database/transactions.ts:83).

UX do Inbox em /transacoes

- Filtros no topo [TransactionFilters](app/transacoes/components/TransactionFilters.tsx:31):
  - Categoria, Conta, Ano, Mês existentes.
  - Novos filtros:
    - Status: Todos, Pendentes, Revisados. Mapeia para isReviewed undefined, false, true.
  - Origem: Removida (auto-categorização descontinuada).
  - Padrão ao entrar: mês atual e Status Pendentes.
- Tabela [TransactionTable](app/transacoes/components/TransactionTable.tsx:51):
  - Coluna de seleção por linha e contagem de selecionadas.
  - Barra de ações em lote fixa com:
    - Definir Categoria e Propriedade para selecionadas.
    - Marcar como Revisado.
    - Reaplicar Regras.
  - Edição inline por linha:
    - Seletor hierárquico de Categoria exibindo Nivel1 > Nivel2, reutilizando lógica do filtro.
    - Seletor de Propriedade por code.
    - Botões Aplicar ou Reaplicar regras.
  - Sugestões:
    - Ação que abre popover, carrega top 3 de [suggestCategorization()](lib/database/categorization.ts:217) via server action e aplica em um clique.
  - Transfer badge:
    - Mantém exibição atual de origem e destino, e atalho para painel de Transfer Review.

Server Actions

- Arquivo único de ações: [actions.ts](app/transacoes/actions.ts:1) com "use server".
- Todas as ações validam input com Zod e chamam revalidatePath em /transacoes.
- Ações propostas:
  - [categorizeOneAction()](app/transacoes/actions.ts:1)
    - Input: { id, categoryId, propertyId?, markReviewed? }
    - Comportamento: usa [categorizeTransaction()](lib/database/categorization.ts:93); se markReviewed, faz update do isReviewed.
  - [bulkCategorizeAction()](app/transacoes/actions.ts:1)
    - Input: { ids, categoryId, propertyId?, markReviewed? }
    - Comportamento: usa [bulkCategorizeTransactions()](lib/database/categorization.ts:180); se markReviewed, atualiza flag em lote.
  - [markReviewedAction()](app/transacoes/actions.ts:1)
    - Input: { id, reviewed, note? }
    - Comportamento: atualiza isReviewed e anexa note em notes.
  - [reapplyRulesAction()](app/transacoes/actions.ts:1)
    - Input: { id }
    - Comportamento: recategorização direta (sem auto-categorização automática).
  - [bulkReapplyRulesAction()](app/transacoes/actions.ts:1)
    - Input: { ids }
    - Comportamento: idem acima para varios ids.
  - suggestionsAction removida por ora.
  - [potentialTransfersAction()](app/transacoes/actions.ts:1)
    - Input: { start, end }
    - Output: retorno de [findPotentialTransfers()](lib/database/transactions.ts:221).
  - [confirmTransferAction()](app/transacoes/actions.ts:1)
    - Input: { originTransactionId, destinationTransactionId, description? }
    - Comportamento: criar ou completar Transfer conforme [Transfer](prisma/schema.prisma:162).

Passagem de ações para Client Components

- Server Actions podem ser passadas como props para [TransactionTable](app/transacoes/components/TransactionTable.tsx:51) e subcomponentes.
- As ações retornam payload mínimo para permitir otimistic UI; ainda assim chamamos revalidatePath para garantir consistência.

Regras de fallback e auditoria

- Fallback para categoria padrão previsto em [categorizeTransaction()] usando Outras Receitas.
- Definir convenção de notas: prefixar com timestamp e autor quando disponível.

Taxonomia inicial sugerida

- Receita: Aluguel, Multas e juros, Reembolsos, Outras Receitas.
- Despesa: Manutenção, Condomínio, IPTU, Taxas bancárias, Tarifas PJ, Juros, Outras Despesas.
- Transferência: Entre contas.
- Ajuste: Ajustes de saldo.

Exportação CSV

- Botão "Exportar CSV" no cabeçalho da tabela aciona fetch para `GET /api/transacoes/export`, respeitando filtros ativos.
- O serviço usa `buildProcessedTransactionWhere()` para garantir equivalência de filtros entre UI e exportação.
- Arquivo segue cabeçalhos: ID, Data, Descrição original, Detalhes, Categoria, Tipo, Propriedade, Conta, Banco, Valor, Status, Sugestões pendentes.
- Nome padrão: `transacoes_<ano>_<mes>.csv`; quando filtros abrangem todos os meses, o sufixo fica `todos-meses`.

Filtros e query server-side

- Acrescentar a construção de filtros no server component:
  - status
    - pendentes: isReviewed false
    - revisados: isReviewed true
    - todos: sem filtro
  - origem: removida
- Atualizar where builder em [TransacoesPage where](app/transacoes/page.tsx:42).

Performance e indices

- Manter ordenação estável [TransacoesPage findMany](app/transacoes/page.tsx:84).
- Avaliar índices adicionais em [UnifiedTransaction](prisma/schema.prisma:155) conforme necessário.

Atalhos de teclado

- j k navegam entre linhas.
- x seleciona ou desseleciona.
- a abre ação de categorizar.
- r marca como revisado.
- s abre sugestões.

Entregas por fase
Fase 1 MVP

- Criar [actions.ts](app/transacoes/actions.ts:1) com [categorizeOneAction()](app/transacoes/actions.ts:1), [bulkCategorizeAction()](app/transacoes/actions.ts:1), [markReviewedAction()](app/transacoes/actions.ts:1), [suggestionsAction()](app/transacoes/actions.ts:1).
- Estender filtros com Status em [TransactionFilters](app/transacoes/components/TransactionFilters.tsx:31) e default para mês atual pendentes.
- Adicionar seleção de linhas e barra de ações em [TransactionTable](app/transacoes/components/TransactionTable.tsx:51).
- Edição inline de categoria e propriedade por linha com chamadas às actions.

Fase 2

- [reapplyRulesAction()](app/transacoes/actions.ts:1) e [bulkReapplyRulesAction()](app/transacoes/actions.ts:1) integradas.
- Painel Transfer Review com [potentialTransfersAction()](app/transacoes/actions.ts:1) e [confirmTransferAction()](app/transacoes/actions.ts:1).
- Quick edit mínimo em página de conta.

Fase 3

- Passo de performance e eventuais índices.
- Documentação final e atalhos.

Critérios de aceite

- Usuário consegue filtrar mês atual e ver apenas pendentes.
- Reclassificar uma ou várias transações altera categoria e propriedade e atualiza a UI sem reload completo.
- Marcar revisado move as transações para fora da visão pendente.
- Sugestões aparecem e são aplicáveis em um clique.
- DRE reflete recategorização via [getDRETotalsByPeriod()](lib/database/transactions.ts:83).

Notas de implementação

- Preferir revalidatePath em /transacoes após cada mutação.
- Para experiência fluida, manter estado local otimista e reconciliar com retorno da action.
- Evitar API routes totalmente conforme orientação.

Riscos e mitigação

- Volume alto de itens selecionados
  - Processar em lotes no client e no server action se necessário.
- Categorias ausentes
  - Garantir seed de Outras Receitas e demais categorias base.

Referências rápidas

- Server Component da página: [TransacoesPage](app/transacoes/page.tsx:18).
- Filtros: [TransactionFilters](app/transacoes/components/TransactionFilters.tsx:31).
- Tabela: [TransactionTable](app/transacoes/components/TransactionTable.tsx:51).
- Serviços de categorização: [categorization.ts](lib/database/categorization.ts:1).
- Consultas auxiliares: [transactions.ts](lib/database/transactions.ts:1).
