# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Financial management system for automating financial control by importing OFX bank files, automatically categorizing transactions, and generating financial statements (DRE). Built with Next.js 15 and Prisma ORM.

## Development Commands

### Core Development

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Database Operations

- `npx prisma generate` - Generate Prisma client (outputs to `app/generated/prisma`)
- `npm run db:migrate` - Create and apply migration (alias for `npx prisma migrate dev`)
- `npm run db:reset` - Reset database with migrations
- `npm run db:seed` - Seed database with initial data
- `npx prisma db push` - Push schema to database without migration
- `npx prisma studio` - Open Prisma Studio

### Legacy Data Import

- `npm run import:legacy` - Import legacy CSV data (script in `scripts/import-legacy.js`)

## Architecture

### Database Layer

- **ORM**: Prisma with MySQL database
- **Schema**: Located at `prisma/schema.prisma`
- **Generated Client**: Custom output path at `app/generated/prisma`
- **Connection**: Singleton pattern in `lib/database/client.ts`

### Core Data Models

- **BankAccount**: Bank accounts (Sicredi, PJBank, XP, etc.)
- **Transaction**: Raw imported OFX transactions
- **UnifiedTransaction**: Categorized and consolidated transactions
- **Category**: Hierarchical categorization system (3 levels)
- **Property**: Real estate properties for transaction linking
- **Transfer**: Inter-account transfers with matching logic
- (Future) Automated categorization rules
- **ImportBatch**: OFX import tracking and status

### Application Structure

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database Logic**: Organized in `lib/database/` modules:
  - `client.ts` - Prisma client singleton
  - `transactions.ts` - Transaction operations
  - (Future) `categorization.ts` - Auto-categorization logic
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

### Next.js Patterns

- Prefer Server Actions over API routes
- Use Server Components for data fetching
- Follow App Router conventions

### Financial Data

- All monetary values use `Decimal` type with precision 15,2
- Transactions maintain original bank data integrity
- Categorization is applied through `UnifiedTransaction` model
