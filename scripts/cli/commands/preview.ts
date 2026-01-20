/**
 * Preview Command
 * Shows preview of OFX import without actually importing
 */

import fs from 'fs';
import path from 'path';
import {
  OFXParserService,
  ImportService,
  type ImportPreview,
  type TransactionPreview,
} from '@/lib/features/ofx';
import { findBankAccount } from './list-accounts';
import {
  printHeader,
  printSubHeader,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printTable,
  printSummary,
  printJson,
  formatCurrency,
  formatDate,
  truncate,
} from '../utils/output';

export interface PreviewOptions {
  file: string;
  account: string;
  verbose?: boolean;
  json?: boolean;
}

export async function previewImport(options: PreviewOptions): Promise<ImportPreview | null> {
  const { file, account, verbose, json } = options;

  // Validate file exists
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    printError(`Arquivo nao encontrado: ${filePath}`);
    return null;
  }

  // Find bank account
  const bankAccount = await findBankAccount(account);
  if (!bankAccount) {
    printError(`Conta bancaria nao encontrada: ${account}`);
    printInfo('Use "npm run cli:accounts" para listar as contas disponiveis.');
    return null;
  }

  if (!json) {
    printInfo(`Processando arquivo: ${path.basename(filePath)}`);
    printInfo(`Conta: ${bankAccount.name}`);
  }

  // Read file content
  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse OFX
  const parser = new OFXParserService();
  const parseResult = await parser.parseOfxString(content);

  if (!parseResult.success) {
    printError('Erro ao processar arquivo OFX:');
    for (const error of parseResult.errors) {
      printError(`  - ${error.message}`);
    }
    return null;
  }

  if (!json) {
    printSuccess(`Arquivo OFX processado (${parseResult.version} ${parseResult.format})`);
  }

  // Generate preview
  const importService = new ImportService();
  const preview = await importService.previewImportFromParsedResult(parseResult, bankAccount.id);

  if (!preview.success) {
    printError('Erro ao gerar preview:');
    for (const error of preview.validationErrors) {
      printError(`  - ${error.message}`);
    }
    return null;
  }

  // Output results
  if (json) {
    printJson({
      success: true,
      bankAccount: {
        id: bankAccount.id,
        name: bankAccount.name,
      },
      summary: preview.summary,
      transactions: preview.transactions.map((t) => ({
        id: t.transaction.transactionId,
        date: t.transaction.date,
        description: t.transaction.description,
        amount: t.transaction.amount,
        isDuplicate: t.isDuplicate,
        recommendedAction: t.recommendedAction,
        categorization: t.categorization.suggestedCategory
          ? {
              category: t.categorization.suggestedCategory.name,
              confidence: t.categorization.confidence,
              reason: t.categorization.reason,
            }
          : null,
      })),
    });
    return preview;
  }

  // Print summary
  printSummary(preview.summary);

  // Print duplicates warning
  if (preview.summary.duplicateTransactions > 0) {
    printSubHeader('Duplicatas Detectadas');
    printWarning(
      `${preview.summary.duplicateTransactions} transacao(es) ja existem no banco de dados.`
    );
  }

  // Print transaction list
  if (verbose) {
    printTransactionDetails(preview.transactions);
  } else {
    printTransactionSummary(preview.transactions);
  }

  return preview;
}

function printTransactionSummary(transactions: TransactionPreview[]): void {
  printSubHeader('Transacoes');

  const headers = ['Data', 'Descricao', 'Valor', 'Status', 'Acao'];
  const rows = transactions.slice(0, 20).map((t) => {
    const status = t.isDuplicate ? 'DUPLICATA' : t.categorization.suggestedCategory ? 'OK' : '-';
    const action = t.recommendedAction.toUpperCase();
    return [
      formatDate(t.transaction.date),
      truncate(t.transaction.description, 30),
      formatCurrency(t.transaction.amount),
      status,
      action,
    ];
  });

  printTable(headers, rows);

  if (transactions.length > 20) {
    printInfo(`\n... e mais ${transactions.length - 20} transacao(es)`);
  }
}

function printTransactionDetails(transactions: TransactionPreview[]): void {
  printSubHeader('Detalhes das Transacoes');

  for (const t of transactions) {
    console.log(`\n  ${formatDate(t.transaction.date)} | ${formatCurrency(t.transaction.amount)}`);
    console.log(`  ${t.transaction.description}`);

    if (t.isDuplicate) {
      printWarning('    [DUPLICATA]');
    }

    if (t.categorization.suggestedCategory) {
      printInfo(
        `    Categoria: ${t.categorization.suggestedCategory.name} (${Math.round(t.categorization.confidence * 100)}%)`
      );
    }

    if (t.categorization.suggestedProperty) {
      printInfo(`    Imovel: ${t.categorization.suggestedProperty.code}`);
    }

    console.log(`    Acao recomendada: ${t.recommendedAction}`);
  }
}
