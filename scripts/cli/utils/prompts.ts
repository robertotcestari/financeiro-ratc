/**
 * CLI Prompts Utilities
 * Interactive prompts for user confirmation
 */

import readline from 'readline';
import type { ImportSummaryData } from './output';

/**
 * Ask user for confirmation (yes/no)
 */
export async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (s/N): `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 's' || normalized === 'sim' || normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Ask user to confirm import based on summary
 */
export async function confirmImport(summary: ImportSummaryData): Promise<boolean> {
  const toImport = summary.uniqueTransactions;
  const duplicates = summary.duplicateTransactions;

  let message = `\nDeseja importar ${toImport} transacao(es)?`;

  if (duplicates > 0) {
    message += ` (${duplicates} duplicata(s) serao ignoradas)`;
  }

  return confirm(message);
}

/**
 * Ask user to select from a list of options
 */
export async function selectOption<T extends { id: string; name: string }>(
  message: string,
  options: T[]
): Promise<T | null> {
  if (options.length === 0) {
    return null;
  }

  if (options.length === 1) {
    return options[0];
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`\n${message}`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.name}`);
  });

  return new Promise((resolve) => {
    rl.question('\nSelecione uma opcao (numero): ', (answer) => {
      rl.close();
      const index = parseInt(answer.trim(), 10) - 1;
      if (index >= 0 && index < options.length) {
        resolve(options[index]);
      } else {
        resolve(null);
      }
    });
  });
}
