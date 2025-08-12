# Plano de Implementação - Refinamento do Categorizador de Transações

## Fase 0: Preparação da Infraestrutura

- [x] 1. **Configurar Schema para Transações Não Categorizadas**

  - [x] 1.1. Criar migration para tornar `categoryId` opcional (String?) no modelo UnifiedTransaction
  - [x] 1.2. Atualizar constraints e índices do banco de dados
  - [x] 1.3. Executar `npx prisma generate` para atualizar tipos TypeScript
  - [x] 1.4. Testar migration em ambiente de desenvolvimento
  - _Requisitos: Schema flexível para inbox de transações_

- [x] 2. **Atualizar Validações e Server Actions**

  - [x] 2.1. Ajustar schemas Zod para aceitar categoryId opcional
  - [x] 2.2. Modificar `categorizeOneAction` para lidar com transações sem categoria
  - [x] 2.3. Atualizar `bulkCategorizeAction` para transações não categorizadas
  - [x] 2.4. Ajustar tratamento de erros para casos de categoryId null
  - _Requisitos: Server Actions compatíveis com novo schema_

<!-- Não vamos fazer agora -->
<!-- - [ ] 3. **Atualizar Sistema de Seeding**
  - [ ] 3.1. Modificar seeders para criar UnifiedTransactions com categoryId null inicialmente
  - [ ] 3.2. Ajustar seeder de transações legadas para manter compatibilidade
  - [ ] 3.3. Testar processo completo de seed com novas regras
  - _Requisitos: Transações importadas começam não categorizadas_ -->

## Fase 1: Implementação da Lógica de Inbox

- [x] 4. **Implementar Lógica de "Transação Pendente"**

  - [x] 4.1. Criar função helper `isPendingTransaction()` para determinar status
  - [x] 4.2. Implementar query builder para filtro "pendentes" no server component
  - [x] 4.3. Atualizar página `/transacoes/page.tsx` com nova lógica de filtros
  - [x] 4.4. Testar filtros com diferentes cenários (sem categoria, sem transactionId, etc.)
  - _Requisitos: Definição clara de transações pendentes_

- [ ] 5. **Configurar Filtros Padrão do Inbox**

  - [ ] 5.1. Modificar TransactionFilters para definir mês atual + "pendentes" como padrão
  - [ ] 5.2. Ajustar lógica de URL params para manter filtros padrão
  - [ ] 5.3. Implementar reset inteligente que mantém contexto do inbox
  - [ ] 5.4. Adicionar indicador visual quando filtros padrão estão ativos
  - _Requisitos: Experiência focada no que precisa atenção_

- [ ] 6. **Implementar Contadores e Indicadores**
  - [ ] 6.1. Criar query para contar transações pendentes por período
  - [ ] 6.2. Adicionar contador na página principal ("/transacoes")
  - [ ] 6.3. Implementar badge no menu de navegação com número de pendentes
  - [ ] 6.4. Criar progress indicator para taxa de categorização mensal
  - _Requisitos: Visibilidade do progresso de categorização_

## Fase 2: Melhorias de UX e Interface

- [ ] 7. **Aprimorar Seleção e Ações em Massa**

  - [ ] 7.1. Redesign da barra de ações em massa para maior visibilidade
  - [ ] 7.2. Implementar contador destacado de seleções ("X de Y selecionadas")
  - [ ] 7.3. Adicionar botão "Selecionar Todas Pendentes" da página atual
  - [ ] 7.4. Criar ação rápida "Marcar Selecionadas como Revisadas"
  - [ ] 7.5. Implementar feedback visual de loading e sucesso para ações em massa
  - _Requisitos: Ações em massa claras e eficientes_

- [ ] 8. **Melhorar Edição Inline de Transações**

  - [ ] 8.1. Aprimorar dropdown de categoria com hierarquia visual melhorada
  - [ ] 8.2. Implementar auto-complete para seleção de propriedades
  - [ ] 8.3. Adicionar aplicação instantânea de mudanças (auto-save)
  - [ ] 8.4. Criar feedback visual de loading, sucesso e erro para edições
  - [ ] 8.5. Implementar validação client-side antes de enviar mudanças
  - _Requisitos: Edição fluida e responsiva_

- [ ] 9. **Implementar Sistema de Sugestões Automáticas**
  - [ ] 9.1. Criar função `suggestCategorization()` baseada em histórico de transações
  - [ ] 9.2. Implementar análise de padrões (descrição similar, conta, valor)
  - [ ] 9.3. Desenvolver popover com top 3 sugestões por transação
  - [ ] 9.4. Adicionar aplicação de sugestão em um clique
  - [ ] 9.5. Implementar scoring baseado em frequência e contexto temporal
  - _Requisitos: Automação inteligente de categorização_

## Fase 3: Funcionalidades Avançadas

- [ ] 10. **Implementar Atalhos de Teclado**

  - [ ] 10.1. Criar hook personalizado `useKeyboardNavigation` para gerenciar atalhos
  - [ ] 10.2. Implementar navegação entre transações (j/k)
  - [ ] 10.3. Adicionar seleção/desseleção por teclado (x)
  - [ ] 10.4. Criar atalho para abrir ações (a) e marcar como revisado (r)
  - [ ] 10.5. Implementar atalho para abrir sugestões (s) e limpar seleções (Esc)
  - [ ] 10.6. Adicionar indicadores visuais de atalhos disponíveis
  - _Requisitos: Navegação rápida por teclado_

- [ ] 11. **Desenvolver Analytics e Métricas**
  - [ ] 11.1. Criar queries para métricas de produtividade de categorização
  - [ ] 11.2. Implementar tracking de % de sugestões aceitas
  - [ ] 11.3. Adicionar métricas de tempo médio para categorizar transações
  - [ ] 11.4. Criar dashboard simples com estatísticas de categorização
  - [ ] 11.5. Implementar alertas para transações pendentes há muito tempo
  - _Requisitos: Visibilidade do desempenho do sistema_

## Fase 4: Otimizações e Performance

- [ ] 12. **Otimizar Performance de Queries**

  - [ ] 12.1. Analisar queries atuais e identificar gargalos
  - [ ] 12.2. Criar índices adicionais para filtros frequentes (isReviewed, year, month)
  - [ ] 12.3. Implementar índice composto para queries do inbox
  - [ ] 12.4. Otimizar query de contagem para dashboard e badges
  - [ ] 12.5. Testar performance com volumes grandes de transações
  - _Requisitos: Resposta rápida mesmo com muitos dados_

- [ ] 13. **Implementar Paginação Inteligente**
  - [ ] 13.1. Avaliar implementação de scroll infinito vs paginação tradicional
  - [ ] 13.2. Implementar lazy loading de dropdowns pesados (categorias, propriedades)
  - [ ] 13.3. Adicionar debounce em filtros dinâmicos para reduzir requests
  - [ ] 13.4. Otimizar re-renders desnecessários com React.memo e useMemo
  - _Requisitos: Interface fluida com grandes volumes_

## Fase 5: Integração e Testes

- [ ] 14. **Testes de Integração**

  - [ ] 14.1. Criar testes para fluxo completo de importação → categorização → revisão
  - [ ] 14.2. Testar cenários edge cases (transações sem categoria, sem transactionId)
  - [ ] 14.3. Validar performance de filtros com diferentes volumes de dados
  - [ ] 14.4. Testar ações em massa com seleções grandes
  - [ ] 14.5. Verificar compatibilidade com dados existentes após migration
  - _Requisitos: Sistema robusto e confiável_

- [ ] 15. **Documentação e Refinamentos Finais**
  - [ ] 15.1. Criar documentação de atalhos de teclado para usuários
  - [ ] 15.2. Documentar APIs das Server Actions para manutenção futura
  - [ ] 15.3. Criar guia de troubleshooting para problemas comuns
  - [ ] 15.4. Implementar error boundaries para melhor tratamento de erros
  - [ ] 15.5. Realizar testes de usabilidade e ajustes finais baseados em feedback
  - _Requisitos: Sistema completo e bem documentado_

---

## Dependências e Ordem de Execução

- **Tarefas 1-3** devem ser executadas primeiro (Fase 0 - Infraestrutura)
- **Tarefas 4-6** dependem das tarefas 1-3 (Fase 1 - Lógica base)
- **Tarefas 7-9** podem ser executadas em paralelo após tarefas 4-6 (Fase 2 - UX)
- **Tarefas 10-11** dependem das melhorias de UX (Fase 3 - Funcionalidades avançadas)
- **Tarefas 12-13** podem ser executadas paralelamente às anteriores (Fase 4 - Performance)
- **Tarefas 14-15** devem ser executadas por último (Fase 5 - Finalização)
