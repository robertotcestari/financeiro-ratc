# Project Structure

## Architecture Pattern

- **Next.js App Router** with file-based routing
- **Server Actions** for data mutations (files ending with `actions.ts`). Do not use API Route Handlers, unless explicitly told!
- **Component co-location** with feature-specific components in dedicated folders
- **Database layer separation** with dedicated utilities in `lib/database/`

## Directory Organization

### `/app` - Next.js App Router

```
app/
├── layout.tsx              # Root layout with Navbar
├── page.tsx                # Homepage with feature cards
├── globals.css             # Global styles
├── components/             # Shared app components
│   └── Navbar.tsx          # Main navigation
├── [feature]/              # Feature-based routing
│   ├── page.tsx            # Feature main page
│   ├── actions.ts          # Server actions for the feature
│   ├── components/         # Feature-specific components
│   └── [id]/               # Dynamic routes
└── generated/prisma/       # Prisma generated client
```

### `/lib` - Shared Utilities

```
lib/
├── database/               # Database operations
│   ├── client.ts           # Prisma client singleton
│   ├── transactions.ts     # Transaction queries
│   ├── dre.ts             # DRE calculations
│   └── categorization.ts   # Auto-categorization logic
├── ofx/                   # OFX file processing
│   ├── parser.ts          # OFX parser implementation
│   ├── types.ts           # OFX type definitions
│   └── index.ts           # Public API
├── constants/             # Application constants
├── utils.ts               # General utilities (cn function)
├── formatters.ts          # Data formatting utilities
└── financial-calculations.ts # Financial math utilities
```

### `/components` - Reusable UI Components

```
components/
└── ui/                    # shadcn/ui components
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    └── label.tsx
```

### `/prisma` - Database Schema & Migrations

```
prisma/
├── schema.prisma          # Database schema definition
├── dev.db                 # SQLite development database
├── seed.ts                # Database seeding script
├── migrations/            # Database migrations
└── seeder/                # Seed data files (JSON/CSV)
```

### `/tests` - Test Organization

```
tests/
├── components/            # Component tests
├── unit/                  # Unit tests
├── integration/           # Integration tests
├── fixtures/              # Test data files
└── mocks/                 # MSW handlers
```

## Naming Conventions

### Files & Folders

- **PascalCase** for React components (`BankCard.tsx`)
- **camelCase** for utilities and actions (`actions.ts`, `formatters.ts`)
- **kebab-case** for test files (`bank-stats.test.tsx`)
- **Feature folders** use lowercase (`bancos`, `transacoes`, `categorias`)

### Components

- **Feature components** in `[feature]/components/` folder
- **Shared UI components** in `components/ui/`
- **One component per file** with default export
- **Props interfaces** defined inline or with component

### Database

- **Prisma models** use PascalCase (`BankAccount`, `UnifiedTransaction`)
- **Database tables** use snake_case via `@@map` directive
- **Enum values** use SCREAMING_SNAKE_CASE

## Import Patterns

- Use `@/` path alias for imports from project root
- Import Prisma client from `@/app/generated/prisma`
- Import UI components from `@/components/ui/[component]`
- Group imports: external libraries, internal modules, relative imports

## Feature Organization

Each major feature follows this pattern:

```
[feature]/
├── page.tsx               # Main feature page
├── actions.ts             # Server actions
├── components/            # Feature components
│   ├── [Feature]Manager.tsx    # Main management component
│   ├── [Feature]Form.tsx       # Form component
│   └── [Feature]List.tsx       # List/table component
└── [id]/                  # Dynamic routes if needed
    └── page.tsx
```

## Key Architectural Decisions

- **Server Actions** over API routes for data mutations
- **Prisma client singleton** pattern for database connections
- **Component co-location** for better feature organization
- **Separate database layer** for complex queries and business logic
- **Custom OFX parser** instead of external library for better control
