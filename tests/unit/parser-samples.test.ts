/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { OFXParserService } from '@/lib/ofx/parser';
import type { OFXParseResult } from '@/lib/ofx/types';

function makeFile(
  name: string,
  content: string,
  type = 'application/ofx'
): File {
  return new File([content], name, { type });
}

const SAMPLE_BANK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKACCTFROM>
          <BANKID>123</BANKID>
          <ACCTID>ACC001</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20240115</DTPOSTED>
            <TRNAMT>1500.00</TRNAMT>
            <FITID>INV_001</FITID>
            <NAME>Deposito Salario</NAME>
            <MEMO>Salario</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20240116</DTPOSTED>
            <TRNAMT>-200.50</TRNAMT>
            <FITID>EXP_001</FITID>
            <NAME>Pagamento Luz</NAME>
            <MEMO>Conta de energia</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`.trim();

const SAMPLE_MULTI_ACCOUNT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKACCTFROM>
          <BANKID>001</BANKID>
          <ACCTID>ACC_A</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20240102</DTPOSTED>
            <TRNAMT>-50.00</TRNAMT>
            <FITID>A_001</FITID>
            <NAME>Cafe</NAME>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
    <STMTTRNRS>
      <STMTRS>
        <BANKACCTFROM>
          <BANKID>002</BANKID>
          <ACCTID>ACC_B</ACCTID>
          <ACCTTYPE>SAVINGS</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20240103</DTPOSTED>
            <TRNAMT>1000.00</TRNAMT>
            <FITID>B_001</FITID>
            <NAME>Transferencia</NAME>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`.trim();

const SAMPLE_INVESTMENT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <INVSTMTMSGSRSV1>
    <INVSTMTTRNRS>
      <INVSTMTRS>
        <INVACCTFROM>
          <BROKERID>BRK123</BROKERID>
          <ACCTID>INV001</ACCTID>
        </INVACCTFROM>
        <INVTRANLIST>
          <INVTRAN>
            <FITID>INVTRN_1</FITID>
            <DTTRADE>20240110</DTTRADE>
            <MEMO>Compra Acoes</MEMO>
          </INVTRAN>
        </INVTRANLIST>
      </INVSTMTRS>
    </INVSTMTTRNRS>
  </INVSTMTMSGSRSV1>
</OFX>`.trim();

const SAMPLE_INVALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <!-- Missing BANKTRANLIST and improper closing tags -->
        <BANKACCTFROM>
          <BANKID>123</BANKID>
          <ACCTID>ACC001</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
<!-- Missing </OFX> intentionally -->`.trim();

const SAMPLE_INVALID_MISSING_ELEMENTS = `<OFX>
  <!-- Missing BANKMSGSRSV1/CC/CreditCard/INV message elements entirely -->
  <SOMETHINGELSE>Data</SOMETHINGELSE>
</OFX>`.trim();

function makeLargeBankXML(count: number): string {
  const items = Array.from({ length: count }, (_, i) => {
    const amt = (i % 2 === 0 ? 1 : -1) * (100 + (i % 50));
    const day = ((i % 28) + 1).toString().padStart(2, '0');
    const date = `202401${day}`;
    return `
      <STMTTRN>
        <TRNTYPE>${amt > 0 ? 'CREDIT' : 'DEBIT'}</TRNTYPE>
        <DTPOSTED>${date}</DTPOSTED>
        <TRNAMT>${amt.toFixed(2)}</TRNAMT>
        <FITID>LARGE_${i}</FITID>
        <NAME>Item ${i}</NAME>
      </STMTTRN>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKACCTFROM>
          <BANKID>999</BANKID>
          <ACCTID>LARGE_ACC</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          ${items}
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`.trim();
}

describe('OFXParserService samples (Task 14)', () => {
  const parser = new OFXParserService();

  it('parses valid bank XML sample with 2 transactions', async () => {
    const file = makeFile('bank.xml', SAMPLE_BANK_XML);
    const result = (await parser.parseFile(file)) as OFXParseResult;

    expect(result.success).toBe(true);
    expect(result.format).toBe('XML');
    expect(result.transactions.length).toBe(2);
    expect(result.accounts.length).toBeGreaterThan(0);
    // sanity check first txn
    expect(result.transactions[0].transactionId).toBe('INV_001');
    expect(result.transactions[0].amount).toBe(1500.0);
  });

  it('parses multi-account XML sample', async () => {
    const file = makeFile('multi.xml', SAMPLE_MULTI_ACCOUNT_XML);
    const result = (await parser.parseFile(file)) as OFXParseResult;

    expect(result.success).toBe(true);
    expect(result.accounts.length).toBeGreaterThanOrEqual(2);
    expect(result.transactions.length).toBe(2);
  });

  it('parses investment XML sample', async () => {
    const file = makeFile('investment.xml', SAMPLE_INVESTMENT_XML);
    const result = (await parser.parseFile(file)) as OFXParseResult;

    expect(result.success).toBe(true);
    expect(result.format).toBe('XML');
    expect(result.transactions.length).toBe(1);
    expect(result.transactions[0].type).toBe('INVESTMENT');
  });

  it('fails on malformed XML structure', async () => {
    const file = makeFile('invalid-xml.ofx', SAMPLE_INVALID_XML, 'text/xml');
    const validation = parser.validateFormat(SAMPLE_INVALID_XML);
    expect(validation.isValid).toBe(false);
    // Either invalid XML or missing required elements
    const codes = validation.errors.map((e) => e.code);
    expect(
      codes.some(
        (c) => c === 'INVALID_XML' || c === 'MISSING_REQUIRED_ELEMENTS'
      )
    ).toBe(true);

    const result = await parser.parseFile(file);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('fails when required OFX elements are missing', async () => {
    const file = makeFile(
      'missing-elems.ofx',
      SAMPLE_INVALID_MISSING_ELEMENTS,
      'text/xml'
    );
    const validation = parser.validateFormat(SAMPLE_INVALID_MISSING_ELEMENTS);
    expect(validation.isValid).toBe(false);
    const codes = validation.errors.map((e) => e.code);
    expect(codes).toContain('MISSING_REQUIRED_ELEMENTS');

    const result = await parser.parseFile(file);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles large OFX bank XML performance within a sane bound', async () => {
    const largeContent = makeLargeBankXML(800);
    const file = makeFile('large.ofx', largeContent, 'application/ofx');

    const start = performance.now();
    const result = await parser.parseFile(file);
    const elapsed = performance.now() - start;

    expect(result.success).toBe(true);
    expect(result.transactions.length).toBe(800);
    // Assert under 5 seconds as a coarse bound in CI/dev
    expect(elapsed).toBeLessThan(5000);
  });
});
