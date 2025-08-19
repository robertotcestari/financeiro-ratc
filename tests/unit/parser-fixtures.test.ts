/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { OFXParserService } from '@/lib/features/ofx/parser';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function makeFile(
  name: string,
  content: string,
  type = 'application/ofx'
): File {
  return new File([content], name, { type });
}

async function loadFixture(relPath: string): Promise<string> {
  const abs = resolve(process.cwd(), relPath);
  return await readFile(abs, { encoding: 'utf-8' });
}

describe('OFXParserService with fixture files (Task 14)', () => {
  const parser = new OFXParserService();

  it('parses sample-bank-xml.ofx (XML)', async () => {
    const content = await loadFixture('tests/fixtures/sample-bank-xml.ofx');
    const file = makeFile('sample-bank-xml.ofx', content, 'application/ofx');

    const result = await parser.parseFile(file);

    expect(result.format).toBe('XML');
    expect(Array.isArray(result.transactions)).toBe(true);
    // file should contain at least 1 transaction
    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  it('parses sample-bank-sgml.ofx (SGML)', async () => {
    const content = await loadFixture('tests/fixtures/sample-bank-sgml.ofx');
    const file = makeFile('sample-bank-sgml.ofx', content, 'application/ofx');

    const result = await parser.parseFile(file);

    // SGML fallback detected when no proper XML structure
    expect(['SGML', 'XML']).toContain(result.format);
    expect(Array.isArray(result.transactions)).toBe(true);
    expect(result.transactions.length).toBeGreaterThan(0);
  });

  it('parses sample-creditcard-sgml.ofx (SGML Credit Card)', async () => {
    const content = await loadFixture(
      'tests/fixtures/sample-creditcard-sgml.ofx'
    );
    const file = makeFile(
      'sample-creditcard-sgml.ofx',
      content,
      'application/ofx'
    );

    const result = await parser.parseFile(file);

    expect(Array.isArray(result.transactions)).toBe(true);
    expect(result.transactions.length).toBeGreaterThan(0);
    // Some credit card samples might parse as SGML with fallback
    expect(['SGML', 'XML']).toContain(result.format);
  });
});
