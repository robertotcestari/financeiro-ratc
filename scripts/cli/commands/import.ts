/**
 * Import Command
 * Executes full OFX import with duplicate detection and auto-categorization
 */

import fs from 'fs';
import path from 'path';
import {
  OFXParserService,
  ImportService,
  type ImportOptions,
  type ImportResult,
} from '@/lib/features/ofx';
import { findBankAccount } from './list-accounts';
import {
  printHeader,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printSummary,
  printResult,
  printJson,
} from '../utils/output';
import { confirmImport } from '../utils/prompts';

export interface ImportCommandOptions {
  file: string;
  account: string;
  yes?: boolean;
  includeDuplicates?: boolean;
  verbose?: boolean;
  json?: boolean;
}

export async function importOFX(options: ImportCommandOptions): Promise<ImportResult | null> {
  const { file, account, yes, includeDuplicates, verbose, json } = options;

  // Validate file exists
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    if (json) {
      printJson({ success: false, error: `Arquivo nao encontrado: ${filePath}` });
    } else {
      printError(`Arquivo nao encontrado: ${filePath}`);
    }
    return null;
  }

  // Find bank account
  const bankAccount = await findBankAccount(account);
  if (!bankAccount) {
    if (json) {
      printJson({ success: false, error: `Conta bancaria nao encontrada: ${account}` });
    } else {
      printError(`Conta bancaria nao encontrada: ${account}`);
      printInfo('Use "npm run cli:accounts" para listar as contas disponiveis.');
    }
    return null;
  }

  if (!json) {
    printHeader('Importacao OFX');
    printInfo(`Arquivo: ${path.basename(filePath)}`);
    printInfo(`Conta: ${bankAccount.name}`);
  }

  // Read file content
  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse OFX
  const parser = new OFXParserService();
  const parseResult = await parser.parseOfxString(content);

  if (!parseResult.success) {
    if (json) {
      printJson({ success: false, error: 'Erro ao processar arquivo OFX', details: parseResult.errors });
    } else {
      printError('Erro ao processar arquivo OFX:');
      for (const error of parseResult.errors) {
        printError(`  - ${error.message}`);
      }
    }
    return null;
  }

  if (!json) {
    printSuccess(`Arquivo OFX processado (${parseResult.version} ${parseResult.format})`);
    printInfo(`${parseResult.transactions.length} transacao(es) encontrada(s)`);
  }

  // Generate preview
  const importService = new ImportService();
  const preview = await importService.previewImportFromParsedResult(parseResult, bankAccount.id);

  if (!preview.success) {
    if (json) {
      printJson({ success: false, error: 'Erro ao gerar preview', details: preview.validationErrors });
    } else {
      printError('Erro ao gerar preview:');
      for (const error of preview.validationErrors) {
        printError(`  - ${error.message}`);
      }
    }
    return null;
  }

  // Show summary
  if (!json) {
    printSummary(preview.summary);

    if (preview.summary.duplicateTransactions > 0) {
      if (includeDuplicates) {
        printWarning(`${preview.summary.duplicateTransactions} duplicata(s) serao importadas.`);
      } else {
        printWarning(`${preview.summary.duplicateTransactions} duplicata(s) serao ignoradas.`);
      }
    }

    if (preview.summary.categorizedTransactions > 0) {
      printSuccess(
        `${preview.summary.categorizedTransactions} transacao(es) categorizadas automaticamente.`
      );
    }
  }

  // Check if there's anything to import
  const toImport = includeDuplicates
    ? preview.summary.validTransactions
    : preview.summary.uniqueTransactions;

  if (toImport === 0) {
    if (json) {
      printJson({
        success: true,
        message: 'Nenhuma transacao nova para importar',
        summary: preview.summary,
      });
    } else {
      printWarning('\nNenhuma transacao nova para importar.');
    }
    return null;
  }

  // Ask for confirmation unless --yes flag
  if (!yes && !json) {
    const confirmed = await confirmImport(preview.summary);
    if (!confirmed) {
      printInfo('Importacao cancelada.');
      return null;
    }
  }

  // Execute import
  if (!json) {
    printInfo('\nImportando transacoes...');
  }

  const importOptions: ImportOptions = {
    importDuplicates: includeDuplicates || false,
    createProcessedTransactions: true,
  };

  const result = await importService.executeImport(preview, importOptions);

  // Show result
  if (json) {
    printJson({
      success: result.success,
      importBatchId: result.importBatchId,
      summary: result.summary,
      imported: result.transactions.imported.length,
      skipped: result.transactions.skipped.length,
      failed: result.transactions.failed.length,
      errors: result.errors,
    });
  } else {
    printResult({
      success: result.success,
      importBatchId: result.importBatchId,
      imported: result.transactions.imported.length,
      skipped: result.transactions.skipped.length,
      failed: result.transactions.failed.length,
    });

    if (result.errors.length > 0) {
      printWarning('\nErros durante a importacao:');
      for (const error of result.errors) {
        printError(`  - ${error.message}`);
      }
    }

    if (verbose && result.transactions.failed.length > 0) {
      printWarning('\nTransacoes que falharam:');
      for (const failed of result.transactions.failed) {
        printError(`  - ${failed.transaction.description}: ${failed.error.message}`);
      }
    }
  }

  return result;
}
