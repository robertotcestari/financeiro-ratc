# Fase 1 - Estrutura de Dados Detalhada

## Visão Geral
Esta fase estabelece a fundação do sistema através da criação de uma estrutura de dados robusta e bem planejada no banco de dados MySQL usando Prisma ORM.

## Modelos de Dados (Schemas)

### 1. BankAccount (Contas Bancárias)
Gerencia as diferentes contas bancárias e de investimento.

```prisma
model BankAccount {
  id            String   @id @default(cuid())
  name          String   @unique  // "CC - Sicredi", "CC - PJBank", "CI - XP"
  bankName      String   // "Sicredi", "PJBank", "XP"
  accountType   AccountType  // CHECKING, SAVINGS, INVESTMENT
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  transactions  Transaction[]
  balances      AccountBalance[]
  transfersOut  Transfer[] @relation("TransferOrigin")
  transfersIn   Transfer[] @relation("TransferDestination")
}

enum AccountType {
  CHECKING     // Conta Corrente
  SAVINGS      // Poupança
  INVESTMENT   // Investimento
}
```

**Dados identificados nos CSVs:**
- CC - Sicredi (Conta Corrente)
- CC - PJBank (Conta Corrente)
- CI - XP (Conta Investimento)
- CI - SicrediInvest (Conta Investimento)

### 2. Category (Categorias)
Sistema hierárquico de categorias para classificação das transações.

```prisma
model Category {
  id            String   @id @default(cuid())
  name          String   @unique
  type          CategoryType  // INCOME, EXPENSE, TRANSFER, ADJUSTMENT
  parentId      String?
  parent        Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children      Category[] @relation("CategoryHierarchy")
  level         Int      // 1=Principal, 2=Subcategoria, 3=Detalhamento
  orderIndex    Int      // Para ordenação no DRE
  isSystem      Boolean  @default(false) // Categorias do sistema (não editáveis)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  transactions  UnifiedTransaction[]
  rules         CategoryRule[]
  dreConfigs    DRELineItem[]
}

enum CategoryType {
  INCOME      // Receita
  EXPENSE     // Despesa
  TRANSFER    // Transferência (não afeta DRE)
  ADJUSTMENT  // Ajuste de Saldo
}
```

**Estrutura de Categorias (baseada no Excel):**

```
Receitas Operacionais (INCOME)
├── Aluguel
├── Aluguel de Terceiros
└── Outras Receitas

Despesas Operacionais (EXPENSE)
├── Despesas Administrativas
│   ├── Tarifas Bancárias
│   ├── Escritórios e Postagens
│   ├── Contabilidade
│   ├── Salários
│   ├── FGTS
│   ├── INSS
│   ├── TI
│   └── Documentações e Jurídico
├── Despesas com Imóveis
│   ├── Condomínios
│   ├── Energia Elétrica
│   ├── Água e Esgoto
│   ├── Telefone e Internet
│   ├── Manutenção
│   ├── Benfeitorias
│   ├── IPTU
│   └── Repasse de Aluguel
└── Despesas com Impostos
    ├── IRPJ
    ├── CSLL
    ├── Taxa de Fiscalização
    ├── PIS
    └── Cofins

Controle Interno (TRANSFER/ADJUSTMENT)
├── Transferência entre Contas (TRANSFER)
├── Ajuste de Saldo (ADJUSTMENT)
└── Aplicação/Resgate Investimentos (TRANSFER)

Outras Categorias
├── Despesas Pessoais Sócios
└── Reformas
```

### 3. Property (Imóveis)
Cadastro dos imóveis para vinculação com transações de aluguel.

```prisma
model Property {
  id            String   @id @default(cuid())
  code          String   @unique  // "CAT - Rua Brasil", "SJP - Av. Alberto Andaló"
  city          String   // CAT, SJP, RIB, SAO, SAL, SVC
  address       String
  description   String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  transactions  UnifiedTransaction[]
  rules         CategoryRule[]
}
```

**Imóveis identificados nos CSVs:**
- **Catanduva (CAT)**
  - CAT - Otica - Casa ao Fundo
  - CAT - Rua Itapema
  - CAT - Rua Brasil
  - CAT - Rua Cuiabá
  - CAT - Rua Bahia (Salas 1-5)
  - CAT - Rua Minas Gerais - 1072
  - CAT - Rua Fortaleza - 494
  - CAT - Rua Said Tuma
  - CAT - Terreno Dahma
  - CAT - Rua Monte Aprazível

- **São José do Rio Preto (SJP)**
  - SJP - Av. Alberto Andaló - 2964
  - SJP - Av. Alberto Andaló - 2964 - 2
  - SJP - Av. Alberto Andaló - 3483

- **Ribeirão Preto (RIB)**
  - RIB - Av. Presidente Vargas 1
  - RIB - Av. Independência 1379
  - RIB - Av. Independência 1591

- **São Paulo (SAO)**
  - SAO - Rua Pamplona 391 - ap 12
  - SAO - Rua Pamplona - Garagem

- **Sales (SAL)**
  - SAL - Sítio - Sales
  - SAL - Rancho - Sales
  - SAL - Rancho - Sales II

- **São Vicente (SVC)**
  - SVC - São Vicente - Apartamento

### 4. Transaction (Transações Brutas)
Armazena as transações importadas diretamente dos arquivos OFX/CSV.

```prisma
model Transaction {
  id              String   @id @default(cuid())
  bankAccountId   String
  bankAccount     BankAccount @relation(fields: [bankAccountId], references: [id])
  date            DateTime
  description     String   @db.Text
  amount          Decimal  @db.Decimal(15, 2)
  balance         Decimal? @db.Decimal(15, 2)
  ofxTransId      String?  // ID da transação no arquivo OFX
  importBatchId   String?
  importBatch     ImportBatch? @relation(fields: [importBatchId], references: [id])
  isDuplicate     Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  unifiedTransaction UnifiedTransaction?
  transferOrigin     Transfer? @relation("TransferOriginTransaction")
  transferDestination Transfer? @relation("TransferDestinationTransaction")
  
  @@unique([bankAccountId, date, description, amount])
  @@index([date])
  @@index([importBatchId])
}
```

### 5. UnifiedTransaction (Transações Consolidadas)
Transações processadas, categorizadas e prontas para análise.

```prisma
model UnifiedTransaction {
  id              String   @id @default(cuid())
  transactionId   String   @unique
  transaction     Transaction @relation(fields: [transactionId], references: [id])
  
  year            Int
  month           Int
  categoryId      String
  category        Category @relation(fields: [categoryId], references: [id])
  propertyId      String?
  property        Property? @relation(fields: [propertyId], references: [id])
  
  details         String?  @db.Text  // Detalhes adicionais
  notes           String?  @db.Text  // Observações do usuário
  
  isTransfer      Boolean  @default(false) // Se é transferência entre contas
  transferId      String?  // ID da transferência relacionada
  transfer        Transfer? @relation(fields: [transferId], references: [id])
  
  isReviewed      Boolean  @default(false)
  autoCategorized Boolean  @default(false)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([year, month])
  @@index([categoryId])
  @@index([propertyId])
  @@index([transferId])
}
```

### 6. Transfer (Transferências entre Contas)
Registra transferências entre contas, garantindo que sempre somem zero.

```prisma
model Transfer {
  id                    String   @id @default(cuid())
  
  // Transação de origem (saída)
  originTransactionId   String   @unique
  originTransaction     Transaction @relation("TransferOriginTransaction", fields: [originTransactionId], references: [id])
  originAccountId       String
  originAccount         BankAccount @relation("TransferOrigin", fields: [originAccountId], references: [id])
  
  // Transação de destino (entrada)
  destinationTransactionId String? @unique
  destinationTransaction   Transaction? @relation("TransferDestinationTransaction", fields: [destinationTransactionId], references: [id])
  destinationAccountId    String
  destinationAccount       BankAccount @relation("TransferDestination", fields: [destinationAccountId], references: [id])
  
  amount                Decimal  @db.Decimal(15, 2) // Valor positivo
  date                  DateTime
  description           String?
  
  isComplete            Boolean  @default(false) // Se ambas as pontas foram identificadas
  isManual              Boolean  @default(false) // Se foi criada manualmente
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  unifiedTransactions   UnifiedTransaction[]
  
  @@index([date])
  @@index([originAccountId, destinationAccountId])
}
```

### 7. CategoryRule (Regras de Categorização Automática)
Define regras para categorização automática de transações.

```prisma
model CategoryRule {
  id              String   @id @default(cuid())
  name            String
  categoryId      String
  category        Category @relation(fields: [categoryId], references: [id])
  
  // Condições
  descriptionPattern String?  @db.Text  // Regex ou palavras-chave
  minAmount       Decimal? @db.Decimal(15, 2)
  maxAmount       Decimal? @db.Decimal(15, 2)
  bankAccountId   String?
  
  // Para transferências
  isTransferRule  Boolean  @default(false)
  transferAccountId String? // Conta de destino para identificar transferências
  
  propertyId      String?  // Vincular automaticamente a um imóvel
  property        Property? @relation(fields: [propertyId], references: [id])
  
  priority        Int      @default(0)
  isActive        Boolean  @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([priority])
}
```

**Exemplos de Regras de Categorização:**

**Transferências (não afetam DRE):**
- Descrição contém "TED" + valor positivo em Sicredi → Transferência de PJBank para Sicredi
- Descrição contém "DEBITO TED" + valor negativo → Transferência de Sicredi para outra conta
- Descrição contém "TRANSFERÊNCIA" → Categoria: "Transferência entre Contas"

**Receitas/Despesas (afetam DRE):**
- Descrição contém "BRADESCO SAUDE" → Categoria: "Despesas Pessoais Sócios", Subcategoria: "Plano Saúde"
- Descrição contém "ENERGISA" → Categoria: "Energia Elétrica"
- Descrição contém "CONDOMIN" → Categoria: "Condomínios"
- Descrição contém "IPTU" ou "MUNICIPIO" → Categoria: "IPTU"
- Descrição contém "RECEBIMENTO PIX" + nome do imóvel → Categoria: "Aluguel", Property: correspondente

### 8. DRELineItem (Configuração do DRE)
Configuração das linhas e estrutura do Demonstrativo de Resultado.

```prisma
model DRELineItem {
  id              String   @id @default(cuid())
  name            String   // Nome da linha no DRE
  categoryId      String?
  category        Category? @relation(fields: [categoryId], references: [id])
  
  lineType        DRELineType  // DETAIL, SUBTOTAL, TOTAL
  formula         String?  @db.Text  // Para linhas calculadas
  orderIndex      Int
  level           Int      // Nível de indentação
  
  includeTransfers Boolean @default(false) // Se deve incluir transferências (sempre false para DRE)
  
  showInReport    Boolean  @default(true)
  isBold          Boolean  @default(false)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([orderIndex])
}

enum DRELineType {
  DETAIL      // Linha de detalhe (categoria)
  SUBTOTAL    // Subtotal calculado
  TOTAL       // Total geral
  SEPARATOR   // Linha separadora
}
```

### 9. ImportBatch (Controle de Importações)
Registra e controla as importações de arquivos OFX.

```prisma
model ImportBatch {
  id              String   @id @default(cuid())
  fileName        String
  fileSize        Int
  bankAccountId   String
  
  startDate       DateTime
  endDate         DateTime
  transactionCount Int
  
  status          ImportStatus
  errorMessage    String?  @db.Text
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  transactions    Transaction[]
}

enum ImportStatus {
  PENDING     // Aguardando processamento
  PROCESSING  // Em processamento
  COMPLETED   // Concluído
  FAILED      // Falhou
}
```

### 10. AccountBalance (Saldos Históricos)
Mantém histórico de saldos das contas.

```prisma
model AccountBalance {
  id              String   @id @default(cuid())
  bankAccountId   String
  bankAccount     BankAccount @relation(fields: [bankAccountId], references: [id])
  
  date            DateTime
  balance         Decimal  @db.Decimal(15, 2)
  
  createdAt       DateTime @default(now())
  
  @@unique([bankAccountId, date])
  @@index([date])
}
```

## Fluxo de Dados

### 1. Importação
```
Arquivo OFX/CSV → Parser → Transaction (dados brutos) → ImportBatch (controle)
```

### 2. Processamento e Categorização
```
Transaction → Aplicar CategoryRules → Identificar tipo:
  ├─ Se Transferência → Criar/Vincular Transfer → UnifiedTransaction (isTransfer=true)
  └─ Se Receita/Despesa → UnifiedTransaction (isTransfer=false)
```

### 3. Identificação de Transferências
```
Cenário 1: Ambas as pontas importadas
  Transaction A (Sicredi -1000) ←→ Transfer ←→ Transaction B (PJBank +1000)
  
Cenário 2: Apenas uma ponta importada
  Transaction A (Sicredi -1000) → Transfer (incompleta, aguardando ponta B)
```

### 4. Relatórios DRE
```
UnifiedTransaction (onde isTransfer=false) → Agregação por Category → DRELineItem → DRE Final
```
**Importante:** Transferências NÃO entram no cálculo do DRE pois não afetam o resultado.

## Validações e Regras de Negócio

### Transferências
- **Validação de Soma Zero**: Total de transferências deve sempre somar zero
- **Identificação Automática**: Buscar transações correspondentes por valor e data próxima
- **Não Afetar DRE**: Transferências são excluídas dos cálculos de receita/despesa
- **Controle de Duplicidade**: Evitar criar múltiplas transferências para mesma transação

### Transações
- Não permitir duplicatas (unique constraint)
- Validar formato de valores monetários
- Validar datas (não futuras para importação)
- Toda transação deve ser categorizada (receita/despesa OU transferência)

### Categorização
- Aplicar regras por ordem de prioridade
- Identificar transferências ANTES de categorizar como receita/despesa
- Permitir recategorização manual
- Manter histórico de categorizações

### DRE
- **Excluir transferências** dos cálculos
- Incluir apenas categorias do tipo INCOME e EXPENSE
- Manter consistência nos períodos
- Calcular subtotais automaticamente

## Exemplos de Processamento

### Exemplo 1: Transferência Completa
```
1. Importa OFX Sicredi: "DEBITO TED RATC" -5000,00 em 10/04
2. Importa OFX PJBank: "TED RATC" +5000,00 em 10/04
3. Sistema identifica como transferência (regra por descrição + valor)
4. Cria Transfer ligando ambas transações
5. UnifiedTransactions marcadas com isTransfer=true
6. NÃO aparecem no DRE
```

### Exemplo 2: Receita de Aluguel
```
1. Importa OFX: "RECEBIMENTO PIX ISABEL CRISTINA" +1500,00
2. Aplica regra: identifica como Aluguel
3. Vincula ao imóvel "SJP - Av. Alberto Andaló"
4. Cria UnifiedTransaction com isTransfer=false
5. APARECE no DRE como receita
```

### Exemplo 3: Despesa Operacional
```
1. Importa OFX: "LIQUIDACAO BOLETO ENERGISA" -86,21
2. Aplica regra: identifica como Energia Elétrica
3. Vincula ao imóvel correspondente
4. Cria UnifiedTransaction com isTransfer=false
5. APARECE no DRE como despesa
```

## Índices e Performance

### Índices Principais
- **Transaction**: date, importBatchId, [bankAccountId, date, description, amount]
- **UnifiedTransaction**: [year, month], categoryId, propertyId, transferId
- **Transfer**: date, [originAccountId, destinationAccountId]
- **CategoryRule**: priority
- **DRELineItem**: orderIndex
- **AccountBalance**: date, [bankAccountId, date]

### Considerações de Performance
1. Uso de índices compostos para queries frequentes
2. Índices em foreign keys para otimizar JOINs
3. Campos de texto grandes (description, notes) usando `@db.Text`
4. Decimais com precisão adequada para valores monetários `@db.Decimal(15, 2)`

## Próximos Passos de Implementação

### 1. Criar Schema Prisma
- [ ] Atualizar arquivo `prisma/schema.prisma` com todos os modelos
- [ ] Incluir modelo Transfer para controle de transferências
- [ ] Configurar datasource para MySQL

### 2. Criar Banco de Dados
- [ ] Executar `npx prisma db push` para criar tabelas
- [ ] Verificar estrutura criada no MySQL

### 3. Popular Dados Iniciais
- [ ] Criar arquivo `prisma/seed.ts`
- [ ] Inserir contas bancárias
- [ ] Inserir estrutura de categorias (com tipo TRANSFER para transferências)
- [ ] Inserir imóveis
- [ ] Inserir regras de categorização (incluindo regras para identificar transferências)

### 4. Criar Utilitários
- [ ] Funções de importação de transações
- [ ] Motor de identificação de transferências
- [ ] Motor de categorização automática
- [ ] Funções de cálculo do DRE (excluindo transferências)
- [ ] Helpers para validação de soma zero em transferências

## Considerações de Segurança
- Valores monetários sempre em Decimal para evitar problemas de precisão
- Validação de soma zero para transferências
- Soft delete para manter histórico
- Logs de importação para auditoria
- Backup antes de importações em massa