import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../../scripts/cli/utils/output', () => ({
  printHeader: vi.fn(),
  printTable: vi.fn(),
  printJson: vi.fn(),
  printWarning: vi.fn(),
  printInfo: vi.fn(),
  printError: vi.fn(),
  printSuccess: vi.fn(),
}));

const { prisma } = await import('@/lib/core/database/client');
const output = await import('../../../scripts/cli/utils/output');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = await import('../../../scripts/cli/commands/categories');

describe('CLI categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('warns when no categories exist', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([]);

    await listCategories();

    expect(output.printWarning).toHaveBeenCalledWith('Nenhuma categoria encontrada.');
  });

  it('errors when parent category is not found', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.category.findFirst).mockResolvedValue(null);

    await createCategory({
      name: 'Nova',
      type: 'EXPENSE',
      parent: 'Pai',
    });

    expect(output.printError).toHaveBeenCalledWith(
      'Categoria pai nao encontrada: Pai'
    );
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('blocks updates to system categories', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue({
      id: 'cat-1',
      name: 'Sistema',
      isSystem: true,
    });

    await updateCategory({ id: 'cat-1', name: 'Novo' });

    expect(output.printError).toHaveBeenCalledWith(
      'Categorias do sistema nao podem ser editadas.'
    );
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('requires confirmation to delete', async () => {
    await deleteCategory({ id: 'cat-1', yes: false });

    expect(output.printError).toHaveBeenCalledWith(
      'Use --yes para confirmar a exclusao.'
    );
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });
});

