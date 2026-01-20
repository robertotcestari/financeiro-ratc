import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    property: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    processedTransaction: {
      findMany: vi.fn(),
    },
    bankAccount: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/core/database/rule-management', () => ({
  ruleManagementService: {
    listRules: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    toggleRuleStatus: vi.fn(),
  },
}));

vi.mock('@/lib/core/database/rule-engine', () => ({
  ruleEngine: {
    generateSuggestions: vi.fn(),
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
const { ruleManagementService } = await import('@/lib/core/database/rule-management');
const { ruleEngine } = await import('@/lib/core/database/rule-engine');
const output = await import('../../../scripts/cli/utils/output');
const {
  createRule,
  listRules,
  generateRuleSuggestions,
} = await import('../../../scripts/cli/commands/rules');

describe('CLI rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid criteria JSON', async () => {
    await createRule({
      name: 'Regra',
      category: 'cat',
      criteria: '{invalid',
    });

    expect(output.printError).toHaveBeenCalledWith(
      'Criterios invalidos. Forneca JSON valido em --criteria.'
    );
    expect(ruleManagementService.createRule).not.toHaveBeenCalled();
  });

  it('creates rule with category resolution', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.category.findFirst).mockResolvedValue({
      id: 'cat-1',
      name: 'Categoria',
    });
    vi.mocked(ruleManagementService.createRule).mockResolvedValue({
      id: 'rule-1',
      name: 'Regra',
    });

    await createRule({
      name: 'Regra',
      category: 'Categoria',
      criteria: '{"description":{"keywords":["aluguel"],"operator":"or"}}',
    });

    expect(ruleManagementService.createRule).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-1' })
    );
    expect(output.printSuccess).toHaveBeenCalledWith('Regra criada: Regra');
  });

  it('lists rules as JSON', async () => {
    vi.mocked(ruleManagementService.listRules).mockResolvedValue({
      rules: [
        {
          id: 'rule-1',
          name: 'Regra',
          isActive: true,
          priority: 0,
          category: null,
          property: null,
          _count: { suggestions: 0 },
        },
      ],
      total: 1,
    });

    await listRules({ json: true });

    expect(output.printJson).toHaveBeenCalled();
  });

  it('generates suggestions for uncategorized transactions', async () => {
    vi.mocked(prisma.processedTransaction.findMany).mockResolvedValue([
      { id: 'ptx-1' },
    ]);
    vi.mocked(ruleEngine.generateSuggestions).mockResolvedValue({
      processed: 1,
      suggested: 1,
      matched: 1,
    });

    await generateRuleSuggestions({ uncategorized: true, all: false });

    expect(ruleEngine.generateSuggestions).toHaveBeenCalledWith(['ptx-1'], undefined);
    expect(output.printSuccess).toHaveBeenCalledWith(
      'Sugestoes geradas: 1 (processadas 1)'
    );
  });
});

