/**
 * Rules Commands
 * CRUD operations and suggestion generation for categorization rules
 */

import type { Prisma } from '@/app/generated/prisma';
import { prisma } from '@/lib/core/database/client';
import { ruleManagementService } from '@/lib/core/database/rule-management';
import { ruleEngine } from '@/lib/core/database/rule-engine';
import type { RuleCriteria } from '@/lib/core/database/rule-types';
import {
  printHeader,
  printTable,
  printJson,
  printWarning,
  printInfo,
  printError,
  printSuccess,
} from '../utils/output';

export interface ListRulesOptions {
  json?: boolean;
  active?: boolean;
  category?: string;
  property?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateRuleOptions {
  name: string;
  description?: string;
  priority?: number;
  category: string;
  property?: string;
  details?: string;
  criteria: string;
  json?: boolean;
}

export interface UpdateRuleOptions {
  id: string;
  name?: string;
  description?: string;
  priority?: number;
  category?: string;
  property?: string;
  details?: string;
  criteria?: string;
  active?: boolean;
  json?: boolean;
}

export interface DeleteRuleOptions {
  id: string;
  yes?: boolean;
  json?: boolean;
}

export interface ToggleRuleOptions {
  id: string;
  active: boolean;
  json?: boolean;
}

export interface GenerateRuleSuggestionsOptions {
  rule?: string[];
  uncategorized?: boolean;
  all?: boolean;
  month?: string;
  year?: number;
  account?: string;
  limit?: number;
  json?: boolean;
}

async function findCategoryId(nameOrId: string): Promise<string | null> {
  const byId = await prisma.category.findUnique({ where: { id: nameOrId } });
  if (byId) return byId.id;
  const byName = await prisma.category.findFirst({
    where: { name: { contains: nameOrId } },
  });
  return byName?.id ?? null;
}

async function findPropertyId(codeOrId: string): Promise<string | null> {
  const byId = await prisma.property.findUnique({ where: { id: codeOrId } });
  if (byId) return byId.id;
  const byCode = await prisma.property.findFirst({
    where: { code: { contains: codeOrId } },
  });
  return byCode?.id ?? null;
}

function parseCriteria(criteria: string): RuleCriteria | null {
  try {
    return JSON.parse(criteria) as RuleCriteria;
  } catch {
    return null;
  }
}

export async function listRules(options: ListRulesOptions = {}): Promise<void> {
  const filters: {
    isActive?: boolean;
    categoryId?: string;
    propertyId?: string;
    search?: string;
  } = {};

  if (options.active !== undefined) filters.isActive = options.active;
  if (options.category) {
    const categoryId = await findCategoryId(options.category);
    if (!categoryId) {
      printError(`Categoria nao encontrada: ${options.category}`);
      return;
    }
    filters.categoryId = categoryId;
  }
  if (options.property) {
    const propertyId = await findPropertyId(options.property);
    if (!propertyId) {
      printError(`Imovel nao encontrado: ${options.property}`);
      return;
    }
    filters.propertyId = propertyId;
  }
  if (options.search) filters.search = options.search;

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const result = await ruleManagementService.listRules(filters, limit, offset);

  if (result.rules.length === 0) {
    printWarning('Nenhuma regra encontrada.');
    return;
  }

  if (options.json) {
    printJson(result);
    return;
  }

  printHeader('Regras de Categorizacao');
  const headers = ['ID', 'Nome', 'Ativa', 'Prioridade', 'Categoria', 'Imovel', 'Sugestoes'];
  const rows = result.rules.map((rule) => [
    `${rule.id.slice(0, 8)}...`,
    rule.name,
    rule.isActive ? 'Sim' : 'Nao',
    String(rule.priority),
    rule.category?.name || '-',
    rule.property?.code || '-',
    String(rule._count.suggestions),
  ]);
  printTable(headers, rows);
  printInfo(`Total: ${result.total} regra(s)`);
}

export async function createRule(options: CreateRuleOptions): Promise<void> {
  const criteria = parseCriteria(options.criteria);
  if (!criteria) {
    printError('Criterios invalidos. Forneca JSON valido em --criteria.');
    return;
  }

  const categoryId = await findCategoryId(options.category);
  if (!categoryId) {
    printError(`Categoria nao encontrada: ${options.category}`);
    return;
  }

  let propertyId: string | undefined;
  if (options.property) {
    const found = await findPropertyId(options.property);
    if (!found) {
      printError(`Imovel nao encontrado: ${options.property}`);
      return;
    }
    propertyId = found;
  }

  const created = await ruleManagementService.createRule({
    name: options.name,
    description: options.description,
    priority: options.priority,
    categoryId,
    propertyId,
    details: options.details,
    criteria,
  });

  if (options.json) {
    printJson(created);
    return;
  }

  printSuccess(`Regra criada: ${created.name}`);
}

export async function updateRule(options: UpdateRuleOptions): Promise<void> {
  let criteria: RuleCriteria | undefined;
  if (options.criteria) {
    const parsed = parseCriteria(options.criteria);
    if (!parsed) {
      printError('Criterios invalidos. Forneca JSON valido em --criteria.');
      return;
    }
    criteria = parsed;
  }

  let categoryId: string | undefined;
  if (options.category) {
    const found = await findCategoryId(options.category);
    if (!found) {
      printError(`Categoria nao encontrada: ${options.category}`);
      return;
    }
    categoryId = found;
  }

  let propertyId: string | undefined;
  if (options.property) {
    const found = await findPropertyId(options.property);
    if (!found) {
      printError(`Imovel nao encontrado: ${options.property}`);
      return;
    }
    propertyId = found;
  }

  const updated = await ruleManagementService.updateRule(options.id, {
    name: options.name,
    description: options.description,
    priority: options.priority,
    categoryId,
    propertyId,
    details: options.details,
    criteria,
    isActive: options.active,
  });

  if (options.json) {
    printJson(updated);
    return;
  }

  printSuccess(`Regra atualizada: ${updated.name}`);
}

export async function deleteRule(options: DeleteRuleOptions): Promise<void> {
  if (!options.yes) {
    printError('Use --yes para confirmar a exclusao.');
    return;
  }

  await ruleManagementService.deleteRule(options.id);

  if (options.json) {
    printJson({ success: true });
    return;
  }

  printSuccess('Regra excluida com sucesso.');
}

export async function toggleRule(options: ToggleRuleOptions): Promise<void> {
  const updated = await ruleManagementService.toggleRuleStatus(
    options.id,
    options.active
  );

  if (options.json) {
    printJson(updated);
    return;
  }

  printSuccess(
    `Regra ${updated.isActive ? 'ativada' : 'desativada'}: ${updated.name}`
  );
}

export async function generateRuleSuggestions(
  options: GenerateRuleSuggestionsOptions
): Promise<void> {
  if (!options.all && !options.uncategorized) {
    printError('Use --all ou --uncategorized para selecionar transacoes.');
    return;
  }

  const where: Prisma.ProcessedTransactionWhereInput = {};
  if (options.uncategorized) {
    where.categoryId = null;
  }

  if (options.year) {
    where.year = options.year;
  }

  if (options.month) {
    const [year, mon] = options.month.split('-').map(Number);
    if (!year || !mon) {
      printError('Mes invalido. Use o formato YYYY-MM.');
      return;
    }
    where.year = year;
    where.month = mon;
  }

  if (options.account) {
    const account = await prisma.bankAccount.findFirst({
      where: { name: { contains: options.account } },
    });
    if (!account) {
      printError(`Conta nao encontrada: ${options.account}`);
      return;
    }
    where.transaction = { bankAccountId: account.id };
  }

  const limit = Math.min(options.limit ?? 500, 1000);
  const processed = await prisma.processedTransaction.findMany({
    where,
    select: { id: true },
    take: limit,
  });

  if (processed.length === 0) {
    printWarning('Nenhuma transacao encontrada para gerar sugestoes.');
    return;
  }

  const ruleIds = options.rule && options.rule.length > 0 ? options.rule : undefined;
  const result = await ruleEngine.generateSuggestions(
    processed.map((t) => t.id),
    ruleIds
  );

  if (options.json) {
    printJson(result);
    return;
  }

  printSuccess(
    `Sugestoes geradas: ${result.suggested} (processadas ${result.processed})`
  );
}

