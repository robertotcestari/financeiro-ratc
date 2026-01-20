/**
 * CLI Output Utilities
 * Provides consistent formatting for CLI output
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

export function printSuccess(message: string): void {
  console.log(`${colors.green}${message}${colors.reset}`);
}

export function printError(message: string): void {
  console.error(`${colors.red}${message}${colors.reset}`);
}

export function printWarning(message: string): void {
  console.log(`${colors.yellow}${message}${colors.reset}`);
}

export function printInfo(message: string): void {
  console.log(`${colors.cyan}${message}${colors.reset}`);
}

export function printDim(message: string): void {
  console.log(`${colors.dim}${message}${colors.reset}`);
}

export function printHeader(title: string): void {
  const line = '─'.repeat(60);
  console.log(`\n${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.dim}${line}${colors.reset}`);
}

export function printSubHeader(title: string): void {
  console.log(`\n${colors.bright}${title}${colors.reset}`);
}

/**
 * Print a formatted table
 */
export function printTable(headers: string[], rows: string[][]): void {
  // Calculate column widths
  const colWidths = headers.map((h, i) => {
    const maxDataWidth = Math.max(...rows.map((r) => (r[i] || '').length));
    return Math.max(h.length, maxDataWidth);
  });

  // Print header
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join('  ');
  console.log(`${colors.bright}${headerRow}${colors.reset}`);

  // Print separator
  const separator = colWidths.map((w) => '─'.repeat(w)).join('──');
  console.log(`${colors.dim}${separator}${colors.reset}`);

  // Print rows
  for (const row of rows) {
    const formattedRow = row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join('  ');
    console.log(formattedRow);
  }
}

/**
 * Print import summary
 */
export interface ImportSummaryData {
  totalTransactions: number;
  validTransactions: number;
  invalidTransactions: number;
  duplicateTransactions: number;
  uniqueTransactions: number;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
}

export function printSummary(summary: ImportSummaryData): void {
  printHeader('Resumo da Importacao');

  const items = [
    ['Total de transacoes', summary.totalTransactions.toString()],
    ['Transacoes validas', summary.validTransactions.toString()],
    ['Transacoes invalidas', summary.invalidTransactions.toString()],
    ['Duplicatas detectadas', summary.duplicateTransactions.toString()],
    ['Transacoes unicas', summary.uniqueTransactions.toString()],
    ['Categorizadas automaticamente', summary.categorizedTransactions.toString()],
    ['Sem categoria', summary.uncategorizedTransactions.toString()],
  ];

  for (const [label, value] of items) {
    const valueColor =
      label.includes('invalidas') || label.includes('Duplicatas')
        ? parseInt(value) > 0
          ? colors.yellow
          : colors.green
        : colors.white;
    console.log(`  ${label.padEnd(30)} ${valueColor}${value}${colors.reset}`);
  }
}

/**
 * Print import result
 */
export interface ImportResultData {
  success: boolean;
  importBatchId: string | null;
  imported: number;
  skipped: number;
  failed: number;
}

export function printResult(result: ImportResultData): void {
  printHeader('Resultado da Importacao');

  if (result.success) {
    printSuccess(`\n  Importacao concluida com sucesso!`);
  } else {
    printError(`\n  Importacao falhou!`);
  }

  if (result.importBatchId) {
    printDim(`  Batch ID: ${result.importBatchId}`);
  }

  console.log(`\n  Importadas:  ${colors.green}${result.imported}${colors.reset}`);
  console.log(`  Ignoradas:   ${colors.yellow}${result.skipped}${colors.reset}`);
  console.log(`  Falharam:    ${colors.red}${result.failed}${colors.reset}`);
}

/**
 * Print JSON output
 */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format date
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
