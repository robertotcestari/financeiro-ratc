import { describe, expect, it } from 'vitest';
import { createCsvStream, sanitizeCsvValue } from '@/lib/utils/csv-export';
import type { Readable } from 'node:stream';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk, 'utf-8'));
    } else if (chunk instanceof Buffer) {
      chunks.push(chunk);
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }

  return Buffer.concat(chunks).toString('utf-8');
}

describe('csv-export utils', () => {
  it('sanitizes values and trims whitespace', () => {
    expect(sanitizeCsvValue('   foo   ')).toBe('foo');
    expect(sanitizeCsvValue(null)).toBe('');
    expect(sanitizeCsvValue(undefined)).toBe('');
    expect(sanitizeCsvValue('linha\ncom\nquebras')).toBe('linha com quebras');
  });

  it('creates csv stream with headers and rows', async () => {
    const stream = createCsvStream({
      headers: ['Coluna A', 'Coluna B'],
      rows: [
        ['Valor 1', 'Valor 2'],
        ['Outro', 'Teste'],
      ],
      delimiter: ';',
      includeBom: true,
    });

    const csv = await streamToString(stream);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Coluna A;Coluna B');
    expect(csv).toContain('Valor 1;Valor 2');
    expect(csv).toContain('Outro;Teste');
  });
});
