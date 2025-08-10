# Sistema de Gestão Financeira - Planejamento

## Visão Geral

Sistema web para automatizar o controle financeiro, importando arquivos OFX de bancos, categorizando transações automaticamente e gerando demonstrativos de resultado (DRE).

## Fases de Desenvolvimento

### Fase 1: Estrutura de Dados e Modelos

#### Modelos do Banco de Dados (Prisma Schema)

- **BankAccount** - Contas bancárias (Sicredi, PJBank, XP, etc.)
- **Transaction** - Transações importadas dos OFX
- **Category** - Categorias (Aluguel, Condomínios, IPTU, Salários, etc.)
- **Property** - Imóveis referenciados nas transações
- **UnifiedTransaction** - Transações consolidadas e categorizadas
- (Futuro) Regras de categorização automática
- **DREConfig** - Configuração das linhas do DRE

### Fase 2: Sistema de Importação OFX

#### Parser OFX

- Biblioteca para ler arquivos OFX
- Extração de dados: data, descrição, valor, saldo
- Ao final da extração de dados um diálogo: Você confirma que o novo saldo é XXX reais?

#### Upload e Processamento

- Interface de upload de múltiplos arquivos
- Identificação automática da conta bancária
- Detecção de duplicatas

### Fase 3: Motor de Categorização Automática

#### Sistema de Regras

- Regras baseadas em palavras-chave na descrição
- Regras por valor/faixa de valores
- Regras por conta de origem

#### Inteligência Artificial

- Aprendizado com categorizações anteriores
- Necessidade de confirmação manual

#### Interface de Revisão

- Visualização de transações categorizadas automaticamente
- Edição manual de categorias

### Fase 4: Interface de Contas Unificadas

#### Dashboard Principal

- Visão consolidada de todas as contas
- Filtros por período, conta, categoria
- Busca por descrição

#### Editor de Transações

- Edição de categoria
- Vinculação a imóveis
- Adição de detalhes/observações
- Split de transações

### Fase 5: Geração Automática do DRE

#### Motor de Cálculo

- Agregação por categoria e período
- Cálculo de subtotais e totais

#### Visualização do DRE

- Tabela dinâmica por mês/ano
- Gráficos de evolução
- Comparativos período a período

#### Exportação

- Excel
- PDF
- CSV

### Fase 6: Recursos Adicionais

#### Gestão de Imóveis

- Cadastro de propriedades
- Vinculação com transações

#### Relatórios e Analytics

- Análise de rentabilidade por imóvel
- Previsões de fluxo de caixa

#### Backup e Sincronização

- Exportação de dados
- Histórico de alterações

## Stack Tecnológico

### Frontend

- **Framework**: Next.js 15 com App Router
- **UI Components**: Tailwind CSS + shadcn/ui
- **Gráficos**: Recharts ou Chart.js

### Backend

- **API**: Server Actions do Next.js
- **ORM**: Prisma
- **Banco de Dados**: MySQL

### Bibliotecas Específicas

- **Parser OFX**: ofx-js ou node-ofx-parser
- **Exportação Excel**: ExcelJS

## Estrutura de Categorias (Baseada no Excel Atual)

### Receitas Operacionais

- Aluguel
- Aluguel de Terceiros
- Outras Receitas

### Despesas Operacionais

#### Despesas Administrativas

- Tarifas Bancárias
- Escritórios e Postagens
- Contabilidade
- Salários
- FGTS
- INSS
- TI
- Documentações e Jurídico

#### Despesas com Imóveis

- Condomínios
- Energia Elétrica
- Água e Esgoto
- Telefone e Internet
- Manutenção
- Benfeitorias
- Outras Despesas com Imóveis
- IPTU
- Repasse de Aluguel

#### Despesas com Impostos

- IRPJ
- CSLL
- Taxa de Fiscalização
- Outros Impostos
- PIS
- Cofins

### Outras Categorias

- Transferência entre Contas
- Ajuste de Saldo
- Despesas Pessoais Sócios
- Reformas

## Próximos Passos Imediatos

1. ✅ Configurar Prisma com MySQL
2. ✅ Criar documentação de planejamento
3. 🔄 Criar schema do Prisma com todos os modelos
4. Implementar parser OFX básico
5. Criar interface de upload
6. Desenvolver sistema de categorização automática
7. Construir interface de contas unificadas
8. Implementar geração do DRE

## Funcionalidades Principais

### MVP (Minimum Viable Product)

- [ ] Importação de arquivos OFX
- [ ] Categorização automática básica
- [ ] Interface de contas unificadas
- [ ] Edição manual de categorias
- [ ] Geração do DRE básico
- [ ] Exportação para Excel

### Versão 2.0

- [ ] Dashboard com gráficos
- [ ] Gestão completa de imóveis
- [ ] Regras avançadas de categorização
- [ ] Relatórios personalizados
- [ ] API para integrações
- [ ] Sistema de permissões/usuários

## Observações do Processo Atual

Baseado na análise dos CSVs exportados:

1. **Múltiplas Contas Bancárias**: Sicredi, PJBank, XP, SicrediInvest
2. **Categorização Detalhada**: Cada transação é categorizada e pode ter detalhes adicionais
3. **Vinculação com Imóveis**: Transações de aluguel são vinculadas a imóveis específicos
4. **DRE Mensal**: Demonstrativo organizado por mês/ano com cálculo automático de totais
5. **Saldos em Conta**: Tracking de saldo por conta bancária

## Decisões Técnicas

### Por que Next.js 15 com Server Actions?

- Reduz complexidade eliminando necessidade de API REST separada
- Melhor performance com Server Components
- Type-safety end-to-end com TypeScript
- Simplifica deploy e manutenção

### Por que Prisma?

- Type-safe database queries
- Migrations automáticas
- Excelente DX (Developer Experience)
- Suporte nativo para MySQL

### Por que MySQL?

- Requisito do projeto (já configurado)
- Robusto para dados financeiros
- Suporte completo a transações ACID
