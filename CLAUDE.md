# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Financial management system for automating financial control by importing OFX bank files, automatically categorizing transactions, and generating financial statements (DRE). Built with Next.js 15 and Prisma ORM.

## Development Commands

### Core Development

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application (without Turbopack for production)
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Database Operations

- `npx prisma generate` - Generate Prisma client (outputs to `app/generated/prisma`)
- `npm run db:migrate` - Create and apply migration (alias for `npx prisma migrate dev`)
- `npm run db:reset` - Reset database with migrations
- `npm run db:seed` - Seed database with initial data
- `npx prisma db push` - Push schema to database without migration
- `npx prisma studio` - Open Prisma Studio

### Testing

- `npm test` - Run unit and integration tests with Vitest
- `npm run test:run` - Run tests in CI mode (non-watch)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with Vitest UI

#### Test Database Setup

- `npm run test:db:setup` - Set up test database with migrations
- `npm run test:db:reset` - Reset test database
- `npm run test:db:seed` - Seed test database with initial data

**Important**: Tests use a separate database (`financeiro-ratc-test`) configured in `.env.test`

### Legacy Data Import

- `npm run import:legacy` - Import legacy CSV data (script in `prisma/seeder/import-legacy.js`)

## Architecture

### Database Layer

- **ORM**: Prisma with MySQL database
- **Schema**: Located at `prisma/schema.prisma`
- **Generated Client**: Custom output path at `app/generated/prisma`
- **Connection**: Singleton pattern in `lib/database/client.ts`

### Core Data Models

- **BankAccount**: Bank accounts (Sicredi, PJBank, XP, etc.)
- **Transaction**: Raw imported OFX transactions
- **ProcessedTransaction**: Categorized and consolidated transactions
- **Category**: Hierarchical categorization system (3 levels)
- **Property**: Real estate properties for transaction linking
- **Transfer**: Inter-account transfers with matching logic
- (Future) Automated categorization rules
- **ImportBatch**: OFX import tracking and status

### Application Structure

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with custom components:
  - `BanksList` and `BanksListSkeleton` - Bank account listing with loading states
  - `IntegrityData` and `IntegrityDataSkeleton` - Data integrity checks with Suspense
  - Enhanced `TransactionTable` with improved inline editing
  - Improved `Combobox` component for better interaction
- **Database Logic**: Organized in `lib/core/database/` modules:
  - `client.ts` - Prisma client singleton
  - `transactions.ts` - Transaction operations
  - `categorization.ts` - Categorization logic
  - `suggestions.ts` - Category suggestions (no longer requires property for all categories)
  - `rule-management.ts` - Categorization rules management
  - `dre.ts` - Financial statement generation

### Key Features

1. **OFX Import System**: Bulk import with duplicate detection
2. **Automatic Categorization**: Rule-based transaction classification
3. **Unified Transaction View**: Consolidated multi-account interface
4. **DRE Generation**: Automated financial statement creation
5. **Property Management**: Real estate transaction linking

## Development Guidelines

### Database

- Always use `npx prisma generate` after schema changes
- The Prisma client is imported from `@/app/generated/prisma`
- Use the singleton client from `lib/database/client.ts`
- **IMPORTANT**: Always import the database client as `prisma` from `@/lib/database/client`:
  ```typescript
  import { prisma } from '@/lib/database/client';
  ```

### Next.js Patterns

- Prefer Server Actions over API routes
- Use Server Components for data fetching
- Follow App Router conventions

### Financial Data

- All monetary values use `Decimal` type with precision 15,2
- Transactions maintain original bank data integrity
- Categorization is applied through `ProcessedTransaction` model

- Lembre sempre que devemos, por padrão usar server components. Apenas quando necessário usar client components.
- Lembre também que não devemos usar api routes (route handlers). Devemos SEMPRE priorizar server functions/actions

## Database Seeding

The project includes comprehensive seed data for initial setup:

### Bank Accounts (`prisma/seeder/bankAccounts.json`)

- **CC - Sicredi**: Checking account at Sicredi
- **CC - PJBank**: Checking account at PJBank
- **CI - XP**: Investment account at XP
- **CI - SicrediInvest**: Investment account at Sicredi

### Categories (`prisma/seeder/categories.json`)

Hierarchical 3-level category structure:

**Income Categories:**

- Receitas Operacionais (level 1)
  - Aluguel (level 2)
  - Aluguel de Terceiros (level 2)
  - Outras Receitas (level 2)

**Expense Categories:**

- Despesas Operacionais (level 1)
  - Despesas Administrativas (level 2)
    - Tarifas Bancárias, Escritórios e Postagens, Contabilidade, Salários, FGTS, INSS, TI, Documentações e Jurídico (level 3)
  - Despesas com Imóveis (level 2)
    - Condomínios, IPTU, Água, Energia, Internet, Aluguel, Manutenção, Seguro (level 3)
  - Despesas com Vendas (level 2)
    - Comissões, Marketing (level 3)
  - Despesas Tributárias (level 2)
    - IRPJ, Impostos e Taxas, DARF IRPF (level 3)

**Financial Categories:**

- Despesas Financeiras (level 1)
  - Juros, IOF, Taxas e Encargos (level 2)
- Receitas Financeiras (level 1)
  - Rendimentos (level 2)

**Investment Categories:**

- Investimentos (level 1)
  - Aplicações, Resgates (level 2)

**Transfer Category:**

- Transferências (level 1)
  - Transferência Entre Contas (level 2)

### Properties (`prisma/seeder/properties.json`)

Real estate properties for transaction linking:

- **CAT (Catanduva)**: 13 properties including commercial spaces and land
- **SJP (São José do Rio Preto)**: 3 properties on Av. Alberto Andaló
- **RIB (Ribeirão Preto)**: 3 commercial properties
- **SAO (São Paulo)**: 2 properties on Rua Pamplona
- **SAL (Sales)**: 3 rural properties (sítio and rancho)
- **SVC (São Vicente)**: 1 apartment

### Seeding Commands

- `npm run db:seed` - Run all seeders
- Seeds are idempotent using `upsert` operations
- Seed modules located in `prisma/seeder/`
- não tem password na base de dados mysql no ambiente dev e o user é root
