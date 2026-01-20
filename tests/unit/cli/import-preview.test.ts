import { beforeEach, describe, expect, it, vi } from 'vitest';

const parserInstances: Array<{ parseOfxString: ReturnType<typeof vi.fn> }> = [];
const importInstances: Array<{
  previewImportFromParsedResult: ReturnType<typeof vi.fn>;
  executeImport: ReturnType<typeof vi.fn>;
}> = [];

let nextParseResult: any;
let nextPreviewResult: any;
let nextExecuteResult: any;

class MockParserService {
  parseOfxString = vi.fn(async () => nextParseResult);
  constructor() {
    parserInstances.push(this);
  }
}

class MockImportService {
  previewImportFromParsedResult = vi.fn(async () => nextPreviewResult);
  executeImport = vi.fn(async () => nextExecuteResult);
  constructor() {
    importInstances.push(this);
  }
}

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const mocked = {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
  return {
    ...mocked,
    default: mocked,
  };
});

vi.mock('@/lib/features/ofx', () => ({
  OFXParserService: MockParserService,
  ImportService: MockImportService,
}));

vi.mock('../../../scripts/cli/commands/list-accounts', () => ({
  findBankAccount: vi.fn(),
}));

vi.mock('../../../scripts/cli/utils/prompts', () => ({
  confirmImport: vi.fn(),
}));

vi.mock('../../../scripts/cli/utils/output', () => ({
  printHeader: vi.fn(),
  printSubHeader: vi.fn(),
  printSuccess: vi.fn(),
  printError: vi.fn(),
  printWarning: vi.fn(),
  printInfo: vi.fn(),
  printTable: vi.fn(),
  printSummary: vi.fn(),
  printResult: vi.fn(),
  printJson: vi.fn(),
  formatCurrency: (value: number) => `R$ ${value}`,
  formatDate: (date: Date) => date.toISOString().split('T')[0],
  truncate: (value: string) => value,
}));

const fs = await import('fs');
const output = await import('../../../scripts/cli/utils/output');
const { findBankAccount } = await import('../../../scripts/cli/commands/list-accounts');
const { confirmImport } = await import('../../../scripts/cli/utils/prompts');
const { previewImport } = await import('../../../scripts/cli/commands/preview');
const { importOFX } = await import('../../../scripts/cli/commands/import');

describe('CLI preview/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parserInstances.length = 0;
    importInstances.length = 0;
    nextParseResult = undefined;
    nextPreviewResult = undefined;
    nextExecuteResult = undefined;
  });

  describe('previewImport', () => {
    it('returns null when file is missing', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await previewImport({
        file: 'missing.ofx',
        account: 'Conta',
      });

      expect(result).toBeNull();
      expect(output.printError).toHaveBeenCalled();
    });

    it('returns null when account is not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(findBankAccount).mockResolvedValue(null);

      const result = await previewImport({
        file: 'file.ofx',
        account: 'Conta',
      });

      expect(result).toBeNull();
      expect(output.printError).toHaveBeenCalledWith(
        'Conta bancaria nao encontrada: Conta'
      );
      expect(output.printInfo).toHaveBeenCalled();
    });

    it('returns null on parse errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('ofx');
      vi.mocked(findBankAccount).mockResolvedValue({
        id: 'acc-1',
        name: 'Conta 1',
        type: 'CHECKING',
        bank: 'Banco',
        isActive: true,
      });
      nextParseResult = {
        success: false,
        errors: [{ message: 'Arquivo invalido' }],
      };

      const result = await previewImport({
        file: 'file.ofx',
        account: 'Conta 1',
      });

      expect(result).toBeNull();
      expect(output.printError).toHaveBeenCalled();
    });

    it('prints JSON preview on success', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('ofx');
      vi.mocked(findBankAccount).mockResolvedValue({
        id: 'acc-1',
        name: 'Conta 1',
        type: 'CHECKING',
        bank: 'Banco',
        isActive: true,
      });
      nextParseResult = {
        success: true,
        version: '1',
        format: 'OFX',
        transactions: [],
      };
      nextPreviewResult = {
        success: true,
        summary: {
          totalTransactions: 1,
          validTransactions: 1,
          invalidTransactions: 0,
          duplicateTransactions: 0,
          uniqueTransactions: 1,
          categorizedTransactions: 1,
          uncategorizedTransactions: 0,
        },
        transactions: [
          {
            transaction: {
              transactionId: 't-1',
              date: '2024-01-15',
              description: 'Pagamento',
              amount: 100,
            },
            isDuplicate: false,
            recommendedAction: 'import',
            categorization: {
              suggestedCategory: { name: 'Categoria' },
              confidence: 0.9,
              reason: 'match',
            },
          },
        ],
      };

      const result = await previewImport({
        file: 'file.ofx',
        account: 'Conta 1',
        json: true,
      });

      expect(result).not.toBeNull();
      expect(output.printJson).toHaveBeenCalled();
    });
  });

  describe('importOFX', () => {
    it('prints JSON error when file is missing', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await importOFX({
        file: 'missing.ofx',
        account: 'Conta',
        json: true,
      });

      expect(result).toBeNull();
      expect(output.printJson).toHaveBeenCalled();
    });

    it('prints JSON error when account is not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(findBankAccount).mockResolvedValue(null);

      const result = await importOFX({
        file: 'file.ofx',
        account: 'Conta',
        json: true,
      });

      expect(result).toBeNull();
      expect(output.printJson).toHaveBeenCalled();
    });

    it('prints JSON error when parse fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('ofx');
      vi.mocked(findBankAccount).mockResolvedValue({
        id: 'acc-1',
        name: 'Conta 1',
        type: 'CHECKING',
        bank: 'Banco',
        isActive: true,
      });
      nextParseResult = {
        success: false,
        errors: [{ message: 'Arquivo invalido' }],
      };

      const result = await importOFX({
        file: 'file.ofx',
        account: 'Conta 1',
        json: true,
      });

      expect(result).toBeNull();
      expect(output.printJson).toHaveBeenCalled();
    });

    it('prints JSON success when there is nothing to import', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('ofx');
      vi.mocked(findBankAccount).mockResolvedValue({
        id: 'acc-1',
        name: 'Conta 1',
        type: 'CHECKING',
        bank: 'Banco',
        isActive: true,
      });
      nextParseResult = {
        success: true,
        version: '1',
        format: 'OFX',
        transactions: [],
      };
      nextPreviewResult = {
        success: true,
        summary: {
          totalTransactions: 0,
          validTransactions: 0,
          invalidTransactions: 0,
          duplicateTransactions: 0,
          uniqueTransactions: 0,
          categorizedTransactions: 0,
          uncategorizedTransactions: 0,
        },
        transactions: [],
        validationErrors: [],
      };

      const result = await importOFX({
        file: 'file.ofx',
        account: 'Conta 1',
        json: true,
      });

      expect(result).toBeNull();
      expect(output.printJson).toHaveBeenCalled();
    });

    it('cancels import when confirmation is rejected', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('ofx');
      vi.mocked(findBankAccount).mockResolvedValue({
        id: 'acc-1',
        name: 'Conta 1',
        type: 'CHECKING',
        bank: 'Banco',
        isActive: true,
      });
      vi.mocked(confirmImport).mockResolvedValue(false);
      nextParseResult = {
        success: true,
        version: '1',
        format: 'OFX',
        transactions: [],
      };
      nextPreviewResult = {
        success: true,
        summary: {
          totalTransactions: 1,
          validTransactions: 1,
          invalidTransactions: 0,
          duplicateTransactions: 0,
          uniqueTransactions: 1,
          categorizedTransactions: 0,
          uncategorizedTransactions: 1,
        },
        transactions: [],
        validationErrors: [],
      };

      const result = await importOFX({
        file: 'file.ofx',
        account: 'Conta 1',
      });

      expect(result).toBeNull();
      expect(output.printInfo).toHaveBeenCalledWith('Importacao cancelada.');
    });

    it('prints JSON result on successful import', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('ofx');
      vi.mocked(findBankAccount).mockResolvedValue({
        id: 'acc-1',
        name: 'Conta 1',
        type: 'CHECKING',
        bank: 'Banco',
        isActive: true,
      });
      nextParseResult = {
        success: true,
        version: '1',
        format: 'OFX',
        transactions: [],
      };
      nextPreviewResult = {
        success: true,
        summary: {
          totalTransactions: 2,
          validTransactions: 2,
          invalidTransactions: 0,
          duplicateTransactions: 0,
          uniqueTransactions: 2,
          categorizedTransactions: 0,
          uncategorizedTransactions: 2,
        },
        transactions: [],
        validationErrors: [],
      };
      nextExecuteResult = {
        success: true,
        importBatchId: 'batch-1',
        summary: { imported: 2 },
        transactions: {
          imported: [{ id: 't1' }, { id: 't2' }],
          skipped: [],
          failed: [],
        },
        errors: [],
      };

      const result = await importOFX({
        file: 'file.ofx',
        account: 'Conta 1',
        json: true,
      });

      expect(result?.success).toBe(true);
      expect(output.printJson).toHaveBeenCalled();
    });
  });
});
