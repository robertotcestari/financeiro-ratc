/**
 * Categories Commands
 * CRUD operations for categories
 */

import { prisma } from '@/lib/core/database/client';
import { CategoryType } from '@/app/generated/prisma';
import {
  printHeader,
  printTable,
  printJson,
  printWarning,
  printInfo,
  printError,
  printSuccess,
} from '../utils/output';

export interface ListCategoriesOptions {
  json?: boolean;
}

export interface CreateCategoryOptions {
  name: string;
  type: string;
  parent?: string;
  level?: number;
  order?: number;
  json?: boolean;
}

export interface UpdateCategoryOptions {
  id: string;
  name?: string;
  type?: string;
  parent?: string;
  level?: number;
  order?: number;
  json?: boolean;
}

export interface DeleteCategoryOptions {
  id: string;
  yes?: boolean;
  json?: boolean;
}

function parseCategoryType(type: string): CategoryType | null {
  const normalized = type.trim().toUpperCase();
  const values = Object.values(CategoryType) as string[];
  if (values.includes(normalized)) {
    return normalized as CategoryType;
  }
  return null;
}

async function findCategoryByIdOrName(nameOrId: string) {
  const byId = await prisma.category.findUnique({
    where: { id: nameOrId },
  });
  if (byId) return byId;
  return prisma.category.findFirst({
    where: { name: { contains: nameOrId } },
  });
}

export async function listCategories(options: ListCategoriesOptions = {}): Promise<void> {
  const categories = await prisma.category.findMany({
    orderBy: [{ level: 'asc' }, { orderIndex: 'asc' }],
    include: {
      parent: true,
      _count: { select: { transactions: true } },
    },
  });

  if (categories.length === 0) {
    printWarning('Nenhuma categoria encontrada.');
    return;
  }

  if (options.json) {
    printJson(categories);
    return;
  }

  printHeader('Categorias');
  const headers = ['ID', 'Nome', 'Tipo', 'Nivel', 'Pai', 'Transacoes'];
  const rows = categories.map((cat) => [
    `${cat.id.slice(0, 8)}...`,
    cat.name,
    cat.type,
    String(cat.level),
    cat.parent?.name || '-',
    String(cat._count.transactions),
  ]);
  printTable(headers, rows);
  printInfo(`Total: ${categories.length} categoria(s)`);
}

export async function createCategory(options: CreateCategoryOptions): Promise<void> {
  const type = parseCategoryType(options.type);
  if (!type) {
    printError('Tipo de categoria invalido. Use INCOME, EXPENSE, TRANSFER ou ADJUSTMENT.');
    return;
  }

  let parentId: string | null = null;
  let level = options.level ?? 1;

  if (options.parent) {
    const parent = await findCategoryByIdOrName(options.parent);
    if (!parent) {
      printError(`Categoria pai nao encontrada: ${options.parent}`);
      return;
    }
    parentId = parent.id;
    const inferredLevel = parent.level + 1;
    if (options.level && options.level !== inferredLevel) {
      printError('Nivel informado nao corresponde ao nivel da categoria pai.');
      return;
    }
    level = inferredLevel;
  }

  if (level < 1 || level > 3) {
    printError('Nivel invalido. Use 1, 2 ou 3.');
    return;
  }

  const orderIndex = options.order ?? 0;

  const created = await prisma.category.create({
    data: {
      name: options.name,
      type,
      parentId,
      level,
      orderIndex,
      isSystem: false,
    },
  });

  if (options.json) {
    printJson(created);
    return;
  }

  printSuccess(`Categoria criada: ${created.name}`);
}

export async function updateCategory(options: UpdateCategoryOptions): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id: options.id },
  });
  if (!category) {
    printError('Categoria nao encontrada.');
    return;
  }
  if (category.isSystem) {
    printError('Categorias do sistema nao podem ser editadas.');
    return;
  }

  let parentId: string | null | undefined;
  let level = options.level;

  if (options.parent !== undefined) {
    if (options.parent === 'none' || options.parent === 'null') {
      parentId = null;
    } else if (options.parent) {
      const parent = await findCategoryByIdOrName(options.parent);
      if (!parent) {
        printError(`Categoria pai nao encontrada: ${options.parent}`);
        return;
      }
      parentId = parent.id;
      const inferredLevel = parent.level + 1;
      if (level && level !== inferredLevel) {
        printError('Nivel informado nao corresponde ao nivel da categoria pai.');
        return;
      }
      level = inferredLevel;
    }
  }

  if (level !== undefined && (level < 1 || level > 3)) {
    printError('Nivel invalido. Use 1, 2 ou 3.');
    return;
  }

  const type = options.type ? parseCategoryType(options.type) : undefined;
  if (options.type && !type) {
    printError('Tipo de categoria invalido. Use INCOME, EXPENSE, TRANSFER ou ADJUSTMENT.');
    return;
  }

  const updated = await prisma.category.update({
    where: { id: options.id },
    data: {
      name: options.name ?? undefined,
      type: type ?? undefined,
      parentId,
      level,
      orderIndex: options.order ?? undefined,
    },
  });

  if (options.json) {
    printJson(updated);
    return;
  }

  printSuccess(`Categoria atualizada: ${updated.name}`);
}

export async function deleteCategory(options: DeleteCategoryOptions): Promise<void> {
  if (!options.yes) {
    printError('Use --yes para confirmar a exclusao.');
    return;
  }

  const category = await prisma.category.findUnique({
    where: { id: options.id },
    include: {
      children: true,
      _count: { select: { transactions: true } },
    },
  });

  if (!category) {
    printError('Categoria nao encontrada.');
    return;
  }

  if (category.isSystem) {
    printError('Categorias do sistema nao podem ser excluidas.');
    return;
  }

  if (category.children.length > 0) {
    printError('Nao e possivel excluir uma categoria que possui subcategorias.');
    return;
  }

  if (category._count.transactions > 0) {
    printError('Nao e possivel excluir uma categoria que possui transacoes associadas.');
    return;
  }

  await prisma.category.delete({ where: { id: options.id } });

  if (options.json) {
    printJson({ success: true });
    return;
  }

  printSuccess('Categoria excluida com sucesso.');
}

