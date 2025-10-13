import { stringify } from 'csv-stringify';
import type { Readable } from 'node:stream';

export interface CsvExportOptions {
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
  delimiter?: string;
  includeBom?: boolean;
}

/**
 * Cria um stream CSV com cabeçalho e valores já formatados.
 */
export function createCsvStream({
  headers,
  rows,
  delimiter = ';',
  includeBom = true,
}: CsvExportOptions): Readable {
  const stringifier = stringify({
    header: true,
    columns: headers,
    delimiter,
    bom: includeBom,
  });

  for (const row of rows) {
    stringifier.write(row);
  }

  stringifier.end();

  return stringifier;
}

/**
 * Normaliza valores para escrita em CSV (substitui null/undefined por vazio).
 */
export function sanitizeCsvValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim();
  }

  return value as string | number | boolean;
}
