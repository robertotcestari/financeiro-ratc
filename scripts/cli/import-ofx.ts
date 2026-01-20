#!/usr/bin/env tsx
/**
 * OFX Import CLI
 *
 * CLI tool for importing OFX bank files with automatic categorization.
 *
 * Usage:
 *   npm run cli accounts                           # List available bank accounts
 *   npm run cli preview -f <file> -a <account>     # Preview import
 *   npm run cli import -f <file> -a <account>      # Execute import
 *   npm run cli import -f <file> -a <account> --env production  # Use production DB
 */

import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';

// Environment configuration
type Environment = 'local' | 'production' | 'prod' | 'test';

const ENV_FILES: Record<Environment, string> = {
  local: '.env.local',
  production: '.env.production',
  prod: '.env.production',
  test: '.env.test',
};

/**
 * Load environment variables based on --env flag
 * Must be done before importing Prisma
 */
function loadEnvironment(): Environment {
  // Parse --env flag from argv before Commander takes over
  const envIndex = process.argv.findIndex((arg) => arg === '--env' || arg === '-e');
  let env: Environment = 'local';

  if (envIndex !== -1 && process.argv[envIndex + 1]) {
    const envValue = process.argv[envIndex + 1] as Environment;
    if (envValue in ENV_FILES) {
      env = envValue;
    } else {
      console.error(`Ambiente invalido: ${envValue}`);
      console.error(`Ambientes disponiveis: local, production, test`);
      process.exit(1);
    }
  }

  const envFile = ENV_FILES[env];
  const envPath = path.resolve(process.cwd(), envFile);

  if (!fs.existsSync(envPath)) {
    if (env !== 'local') {
      console.error(`Arquivo de ambiente nao encontrado: ${envFile}`);
      console.error(`Crie o arquivo ${envFile} com as variaveis de ambiente necessarias.`);
      process.exit(1);
    }
    // Fallback to .env if .env.local doesn't exist
    config({ path: path.resolve(process.cwd(), '.env'), override: true, debug: false });
  } else {
    config({ path: envPath, override: true, debug: false });
  }

  return env;
}

// Load environment BEFORE any other imports that depend on DATABASE_URL
const currentEnv = loadEnvironment();

// Now we can safely import modules that use Prisma
import { Command } from 'commander';
import { prisma } from '@/lib/core/database/client';
import { listAccounts } from './commands/list-accounts';
import { listTransactions } from './commands/list-transactions';
import { previewImport } from './commands/preview';
import { importOFX } from './commands/import';
import { listAccountBalances } from './commands/account-balances';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './commands/categories';
import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  generateRuleSuggestions,
} from './commands/rules';
import {
  listSuggestions,
  applySuggestionsCommand,
  dismissSuggestionsCommand,
} from './commands/suggestions';
import { categorizeTransactions } from './commands/categorize';
import { createBackup, listBackups } from './commands/backup';
import { createTransaction } from './commands/create-transaction';
import { balanceCheck } from './commands/balance-check';
import { printError, printInfo, printWarning } from './utils/output';

const program = new Command();

program
  .name('import-ofx')
  .description('CLI para importacao de arquivos OFX com categorizacao automatica')
  .version('1.0.0')
  .option('-e, --env <environment>', 'Ambiente: local, production, test', 'local');

// Hook to show environment info
program.hook('preAction', () => {
  const envDisplay = currentEnv === 'local' ? 'local' : currentEnv.toUpperCase();
  const color = currentEnv === 'production' || currentEnv === 'prod' ? printWarning : printInfo;
  color(`[Ambiente: ${envDisplay}]`);
});

// List accounts command
program
  .command('list-accounts')
  .alias('accounts')
  .description('Lista as contas bancarias disponiveis')
  .option('--json', 'Output em formato JSON')
  .option('--all', 'Incluir contas inativas')
  .action(async (options) => {
    try {
      await listAccounts(options);
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// List account balances command
program
  .command('list-account-balances')
  .alias('balances')
  .description('Lista saldos e ultima transacao por conta')
  .option('--json', 'Output em formato JSON')
  .option('--all', 'Incluir contas inativas')
  .action(async (options) => {
    try {
      await listAccountBalances(options);
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// List categories command
program
  .command('list-categories')
  .alias('categories')
  .description('Lista categorias cadastradas')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await listCategories(options);
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Create category command
program
  .command('create-category')
  .description('Cria uma nova categoria')
  .requiredOption('--name <name>', 'Nome da categoria')
  .requiredOption('--type <type>', 'Tipo: INCOME, EXPENSE, TRANSFER, ADJUSTMENT')
  .option('--parent <id|name>', 'Categoria pai (id ou nome)')
  .option('--level <number>', 'Nivel (1-3)')
  .option('--order <number>', 'Ordem no DRE')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await createCategory({
        name: options.name,
        type: options.type,
        parent: options.parent,
        level: options.level ? Number(options.level) : undefined,
        order: options.order ? Number(options.order) : undefined,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Update category command
program
  .command('update-category')
  .description('Atualiza uma categoria')
  .requiredOption('--id <id>', 'ID da categoria')
  .option('--name <name>', 'Novo nome')
  .option('--type <type>', 'Tipo: INCOME, EXPENSE, TRANSFER, ADJUSTMENT')
  .option('--parent <id|name|null>', 'Categoria pai (id, nome, ou null)')
  .option('--level <number>', 'Nivel (1-3)')
  .option('--order <number>', 'Ordem no DRE')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await updateCategory({
        id: options.id,
        name: options.name,
        type: options.type,
        parent: options.parent,
        level: options.level ? Number(options.level) : undefined,
        order: options.order ? Number(options.order) : undefined,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Delete category command
program
  .command('delete-category')
  .description('Exclui uma categoria')
  .requiredOption('--id <id>', 'ID da categoria')
  .option('--yes', 'Confirmar exclusao')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await deleteCategory({
        id: options.id,
        yes: options.yes,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// List transactions command
program
  .command('list-transactions')
  .alias('transactions')
  .alias('tx')
  .description('Lista transacoes do banco de dados')
  .option('-l, --limit <number>', 'Numero de transacoes (max 500)', '50')
  .option('-a, --account <name>', 'Filtrar por conta bancaria')
  .option('-c, --category <name>', 'Filtrar por categoria')
  .option('-m, --month <YYYY-MM>', 'Filtrar por mes (ex: 2024-01)')
  .option('-u, --uncategorized', 'Mostrar apenas sem categoria')
  .option('-v, --verbose', 'Mostrar mais detalhes')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await listTransactions({
        ...options,
        limit: parseInt(options.limit, 10),
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// List rules command
program
  .command('list-rules')
  .alias('rules')
  .description('Lista regras de categorizacao')
  .option('--active', 'Somente regras ativas')
  .option('--inactive', 'Somente regras inativas')
  .option('--category <id|name>', 'Filtrar por categoria')
  .option('--property <id|code>', 'Filtrar por imovel')
  .option('--search <text>', 'Buscar por nome/descricao')
  .option('--limit <number>', 'Limite de regras', '50')
  .option('--offset <number>', 'Offset', '0')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      const active =
        options.active && options.inactive
          ? undefined
          : options.active
          ? true
          : options.inactive
          ? false
          : undefined;
      await listRules({
        json: options.json,
        active,
        category: options.category,
        property: options.property,
        search: options.search,
        limit: parseInt(options.limit, 10),
        offset: parseInt(options.offset, 10),
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Create rule command
program
  .command('create-rule')
  .description('Cria uma nova regra de categorizacao')
  .requiredOption('--name <name>', 'Nome da regra')
  .requiredOption('--category <id|name>', 'Categoria alvo')
  .requiredOption('--criteria <json>', 'Criterios da regra em JSON')
  .option('--description <text>', 'Descricao da regra')
  .option('--priority <number>', 'Prioridade da regra', '0')
  .option('--property <id|code>', 'Imovel alvo')
  .option('--details <text>', 'Detalhes a aplicar na transacao')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await createRule({
        name: options.name,
        description: options.description,
        priority: options.priority ? Number(options.priority) : undefined,
        category: options.category,
        property: options.property,
        details: options.details,
        criteria: options.criteria,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Update rule command
program
  .command('update-rule')
  .description('Atualiza uma regra de categorizacao')
  .requiredOption('--id <id>', 'ID da regra')
  .option('--name <name>', 'Novo nome')
  .option('--description <text>', 'Nova descricao')
  .option('--priority <number>', 'Nova prioridade')
  .option('--category <id|name>', 'Categoria alvo')
  .option('--property <id|code>', 'Imovel alvo')
  .option('--details <text>', 'Detalhes a aplicar na transacao')
  .option('--criteria <json>', 'Criterios da regra em JSON')
  .option('--active <true|false>', 'Ativar/desativar regra')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      const active =
        options.active !== undefined ? options.active === 'true' : undefined;
      await updateRule({
        id: options.id,
        name: options.name,
        description: options.description,
        priority: options.priority ? Number(options.priority) : undefined,
        category: options.category,
        property: options.property,
        details: options.details,
        criteria: options.criteria,
        active,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Delete rule command
program
  .command('delete-rule')
  .description('Exclui uma regra de categorizacao')
  .requiredOption('--id <id>', 'ID da regra')
  .option('--yes', 'Confirmar exclusao')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await deleteRule({
        id: options.id,
        yes: options.yes,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Toggle rule command
program
  .command('toggle-rule')
  .description('Ativa ou desativa uma regra')
  .requiredOption('--id <id>', 'ID da regra')
  .requiredOption('--active <true|false>', 'true para ativar, false para desativar')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await toggleRule({
        id: options.id,
        active: options.active === 'true',
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Generate suggestions from rules
program
  .command('generate-suggestions')
  .description('Gera sugestoes a partir de regras existentes')
  .option('--all', 'Considerar todas as transacoes processadas')
  .option('--uncategorized', 'Somente transacoes sem categoria')
  .option('--rule <id>', 'Filtrar por regra (repita para varias)', (value, prev) => {
    const current = Array.isArray(prev) ? prev : [];
    return [...current, value];
  })
  .option('--month <YYYY-MM>', 'Filtrar por mes')
  .option('--year <YYYY>', 'Filtrar por ano')
  .option('--account <name>', 'Filtrar por conta bancaria')
  .option('--limit <number>', 'Limite de transacoes', '500')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await generateRuleSuggestions({
        rule: options.rule,
        uncategorized: options.uncategorized,
        all: options.all,
        month: options.month,
        year: options.year ? Number(options.year) : undefined,
        account: options.account,
        limit: options.limit ? Number(options.limit) : undefined,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// List suggestions command
program
  .command('list-suggestions')
  .description('Lista sugestoes de categorizacao')
  .option('--all', 'Incluir sugestoes aplicadas')
  .option('--rule <id|name>', 'Filtrar por regra')
  .option('--category <id|name>', 'Filtrar por categoria sugerida')
  .option('--transaction <id>', 'Filtrar por transacao processada ou transacao bruta')
  .option('--limit <number>', 'Limite', '50')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await listSuggestions({
        json: options.json,
        pending: !options.all,
        rule: options.rule,
        category: options.category,
        transaction: options.transaction,
        limit: parseInt(options.limit, 10),
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Apply suggestions command
program
  .command('apply-suggestions')
  .description('Aplica sugestoes de categorizacao')
  .option('--ids <ids>', 'IDs separados por virgula')
  .option('--all', 'Aplicar todas as sugestoes pendentes')
  .option('--rule <id|name>', 'Filtrar por regra (com --all)')
  .option('--category <id|name>', 'Filtrar por categoria (com --all)')
  .option('--transaction <id>', 'Filtrar por transacao (com --all)')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await applySuggestionsCommand({
        ids: options.ids,
        all: options.all,
        pending: true,
        rule: options.rule,
        category: options.category,
        transaction: options.transaction,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Dismiss suggestions command
program
  .command('dismiss-suggestions')
  .description('Descarta sugestoes de categorizacao')
  .option('--ids <ids>', 'IDs separados por virgula')
  .option('--all', 'Descartar todas as sugestoes pendentes')
  .option('--yes', 'Confirmar exclusao')
  .option('--rule <id|name>', 'Filtrar por regra (com --all)')
  .option('--category <id|name>', 'Filtrar por categoria (com --all)')
  .option('--transaction <id>', 'Filtrar por transacao (com --all)')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await dismissSuggestionsCommand({
        ids: options.ids,
        all: options.all,
        yes: options.yes,
        pending: true,
        rule: options.rule,
        category: options.category,
        transaction: options.transaction,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Categorize command
program
  .command('categorize')
  .description('Aplica categoria/propriedade a transacoes processadas')
  .requiredOption('--category <id|name|uncategorized>', 'Categoria alvo')
  .option('--property <id|code|null>', 'Imovel alvo')
  .option('--ids <ids>', 'IDs de ProcessedTransaction (separados por virgula)')
  .option('--transactions <ids>', 'IDs de transacoes brutas (separados por virgula)')
  .option('--uncategorized', 'Aplicar a transacoes sem categoria')
  .option('--limit <number>', 'Limite quando usar --uncategorized', '200')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await categorizeTransactions({
        ids: options.ids,
        transactions: options.transactions,
        uncategorized: options.uncategorized,
        limit: options.limit ? Number(options.limit) : undefined,
        category: options.category,
        property: options.property,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Preview command
program
  .command('preview')
  .description('Mostra preview da importacao sem importar')
  .requiredOption('-f, --file <path>', 'Caminho do arquivo OFX')
  .requiredOption('-a, --account <name>', 'Nome ou ID da conta bancaria')
  .option('-v, --verbose', 'Mostrar detalhes de cada transacao')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      const result = await previewImport(options);
      process.exit(result ? 0 : 1);
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Import command
program
  .command('import')
  .description('Importa arquivo OFX para o banco de dados')
  .requiredOption('-f, --file <path>', 'Caminho do arquivo OFX')
  .requiredOption('-a, --account <name>', 'Nome ou ID da conta bancaria')
  .option('-y, --yes', 'Pular confirmacao')
  .option('--include-duplicates', 'Importar transacoes duplicadas')
  .option('-v, --verbose', 'Mostrar detalhes de erros')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      const result = await importOFX(options);
      process.exit(result?.success ? 0 : 1);
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Backup command
program
  .command('backup')
  .description('Cria backup do banco de dados de producao')
  .option('-o, --output <path>', 'Caminho personalizado para o arquivo')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      const result = await createBackup(options);
      process.exit(result?.success ? 0 : 1);
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    }
  });

// List backups command
program
  .command('list-backups')
  .alias('backups')
  .description('Lista backups disponiveis')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await listBackups(options);
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    }
  });

// Create transaction command
program
  .command('create-transaction')
  .alias('add-tx')
  .description('Cria uma transacao manual')
  .requiredOption('--account <name|id>', 'Conta bancaria (nome ou ID)')
  .requiredOption('--amount <number>', 'Valor da transacao (positivo=receita, negativo=despesa)')
  .requiredOption('--date <YYYY-MM-DD>', 'Data da transacao')
  .requiredOption('--description <text>', 'Descricao da transacao')
  .option('--details <text>', 'Detalhes adicionais da transacao')
  .option('--category <id|name>', 'Categoria')
  .option('--property <id|code>', 'Imovel')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await createTransaction({
        account: options.account,
        amount: options.amount,
        date: options.date,
        description: options.description,
        details: options.details,
        category: options.category,
        property: options.property,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Balance check command
program
  .command('balance-check')
  .alias('check-balance')
  .description('Verifica se saldo anterior + resultado = saldo atual')
  .option('-m, --month <YYYY-MM>', 'Mes a verificar (padrao: mes anterior)')
  .option('--json', 'Output em formato JSON')
  .action(async (options) => {
    try {
      await balanceCheck({
        month: options.month,
        json: options.json,
      });
    } catch (error) {
      printError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Parse arguments and run
program.parse();
