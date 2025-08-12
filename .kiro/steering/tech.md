# Technology Stack

## Framework & Runtime

- **Next.js 15.4.6** with App Router architecture
- **React 19.1.0** with TypeScript
- **Node.js** runtime environment

## Database & ORM

- **Prisma ORM** with MySQL database
- Generated client located at `app/generated/prisma`
- Database migrations managed via Prisma CLI

## Styling & UI

- **Tailwind CSS 4.1.11** for styling - tailwind v4+ do not use any tailwind.config.js file.
- **Radix UI** components for accessible primitives
- **Lucide React** for icons
- **shadcn/ui** component system in `components/ui/`

## Testing

- **Vitest** for unit and integration testing
- **Playwright** for end-to-end testing
- **Testing Library** for React component testing
- **MSW (Mock Service Worker)** for API mocking
- **Testcontainers** for integration testing with real databases

## Development Tools

- **TypeScript 5** with strict configuration
- **ESLint** with Next.js configuration
- **tsx** for TypeScript execution
- **Turbopack** for fast development builds

## File Processing

- **csv-parse** for CSV file processing
- Custom OFX parser implementation in `lib/ofx/`

## Validation & Utilities

- **Zod** for schema validation
- **clsx** and **tailwind-merge** for conditional styling
- **class-variance-authority** for component variants

## Common Commands

### Development

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing

```bash
npm run test         # Run unit tests in watch mode
npm run test:run     # Run all tests once
npm run test:coverage # Run tests with coverage report
npm run test:ui      # Open Vitest UI
npm run test:e2e     # Run Playwright e2e tests
npm run test:e2e:ui  # Run Playwright with UI
```

### Database

```bash
npm run db:migrate   # Run Prisma migrations
npm run db:reset     # Reset database and run migrations
npm run db:seed      # Seed database with initial data
```

### Data Import

```bash
npm run import:legacy # Import legacy CSV data
```

## Build Configuration

- **PostCSS** for CSS processing
- **Sass** support enabled
- Path aliases configured with `@/*` pointing to project root
