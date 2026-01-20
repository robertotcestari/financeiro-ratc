import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    transactionSuggestion: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/core/database/suggestions', () => ({
  applySuggestions: vi.fn(),
  dismissSuggestions: vi.fn(),
}));

vi.mock('../../../scripts/cli/utils/output', () => ({
  printHeader: vi.fn(),
  printTable: vi.fn(),
  printJson: vi.fn(),
  printWarning: vi.fn(),
  printInfo: vi.fn(),
  printError: vi.fn(),
  printSuccess: vi.fn(),
  truncate: (val: string) => val,
  formatDate: () => '01/01/2025',
}));

const { prisma } = await import('@/lib/core/database/client');
const suggestionsDb = await import('@/lib/core/database/suggestions');
const output = await import('../../../scripts/cli/utils/output');
const {
  listSuggestions,
  applySuggestionsCommand,
  dismissSuggestionsCommand,
} = await import('../../../scripts/cli/commands/suggestions');

describe('CLI suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists suggestions as JSON', async () => {
    vi.mocked(prisma.transactionSuggestion.findMany).mockResolvedValue([
      { id: 'sug-1' },
    ]);

    await listSuggestions({ json: true });

    expect(output.printJson).toHaveBeenCalledWith([{ id: 'sug-1' }]);
  });

  it('applies suggestions by ids', async () => {
    vi.mocked(suggestionsDb.applySuggestions).mockResolvedValue([
      { suggestionId: 's1', success: true },
      { suggestionId: 's2', success: true },
    ]);

    await applySuggestionsCommand({ ids: 's1,s2' });

    expect(suggestionsDb.applySuggestions).toHaveBeenCalledWith(['s1', 's2']);
    expect(output.printSuccess).toHaveBeenCalledWith('Sugestoes aplicadas: 2/2');
  });

  it('requires confirmation to dismiss', async () => {
    await dismissSuggestionsCommand({ ids: 's1', yes: false });

    expect(output.printError).toHaveBeenCalledWith(
      'Use --yes para confirmar a exclusao.'
    );
    expect(suggestionsDb.dismissSuggestions).not.toHaveBeenCalled();
  });
});

