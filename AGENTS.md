# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and feature routes (e.g., `dre/`, `ofx-import/`).
- `lib/`: Shared code (`database/`, `ai/`, `ofx/`, utilities, logging).
- `components/`: Reusable UI and OFX-related components.
- `prisma/`: Prisma schema, migrations, and seeds. Generated client outputs to `app/generated/prisma/`.
- `tests/`: Unit, integration, and component tests; `e2e/`: Playwright specs.
- `scripts/`: Maintenance and data tools (e.g., `backup-database.js`, `generate-snapshots.ts`).
- `docs/`: Planning and specs; `logs/`: local logs (ignored in PRs).

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js with Turbopack at `http://localhost:3000`.
- `npm run build` / `npm start`: Build and serve production bundle.
- `npm run lint`: ESLint (Next + TS rules).
- `npm test` / `npm run test:run`: Run Vitest (jsdom by default).
- `npm run test:coverage`: Vitest with coverage.
- `npm run test:e2e` (`:ui`): Playwright E2E (UI runner optional).
- `npm run db:migrate|db:reset|db:seed`: Prisma database operations.
- `npm run test:db:setup|reset|seed`: Same, against `.env.test`.

## Coding Style & Naming Conventions
- **Language**: TypeScript (strict). **Indent**: 2 spaces. **Semicolons**: required.
- **React components**: PascalCase files/exports (e.g., `TransactionsTable.tsx`).
- **Tests**: `*.test.ts(x)` or `*.spec.ts`. Place under `tests/*` or `e2e/*` as appropriate.
- **Imports**: Use `@/` alias for repo root (see `tsconfig.json`).
- **Linting**: Keep code passing `npm run lint`. No Prettier config is enforced; match existing style.

## Testing Guidelines
- **Frameworks**: Vitest (+ Testing Library) for unit/integration; Playwright for E2E.
- **Setup**: Global setup in `tests/setup.ts` and `vitest.setup.ts` (jsdom, DOM cleanup, DB guards).
- **DB-backed tests**: Use `.env.test` and the `test:db:*` scripts. Integration tests live under `tests/integration/` and are auto-detected.
- **Coverage**: Aim for meaningful coverage of `lib/` and critical `app/` actions; run `npm run test:coverage` locally.

## Commit & Pull Request Guidelines
- **Commits**: Prefer Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Keep messages imperative and scoped (e.g., `feat(dre): add monthly summary`).
- **PRs**: Include purpose, screenshots for UI, steps to test, and linked issues. Ensure `npm run lint`, `npm test`, and migrations (if any) are included and documented.

## Security & Configuration
- Copy `.env.example` to `.env`; set `DATABASE_URL` for MySQL. Use `.env.test` for tests.
- Do not commit secrets, `logs/`, database dumps, or personal data. Use `npm run db:backup` for local backups.
