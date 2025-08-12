import { describe, it, expect, beforeEach } from 'vitest';
import { OFXParserService } from '../../lib/ofx/parser';

describe('OFXParserService', () => {
  let parser: OFXParserService;

  beforeEach(() => {
    parser = new OFXParserService();
  });

  describe('detectVersion', () => {
    it('should detect OFX 2.x XML format with XML declaration', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
        <OFX>
          <SIGNONMSGSRSV1>
            <SONRS>
              <STATUS>
                <CODE>0</CODE>
                <SEVERITY>INFO</SEVERITY>
              </STATUS>
            </SONRS>
          </SIGNONMSGSRSV1>
        </OFX>`;

      const result = parser.detectVersion(content);

      expect(result.format).toBe('XML');
      expect(result.version).toBe('2.x');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect OFX 2.x XML format with OFX root element', () => {
      const content = `<OFX>
        <BANKMSGSRSV1>
          <STMTTRNRS>
            <STMTRS>
              <CURDEF>USD</CURDEF>
            </STMTRS>
          </STMTTRNRS>
        </BANKMSGSRSV1>
      </OFX>`;

      const result = parser.detectVersion(content);

      expect(result.format).toBe('XML');
      expect(result.version).toBe('2.x');
      expect(result.confidence).toBe(0.9);
    });

    it('should detect OFX 1.x SGML format with header', () => {
      const content = `OFXHEADER:100
DATA:OFXSGML
VERSION:103
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
</SONRS>
</SIGNONMSGSRSV1>`;

      const result = parser.detectVersion(content);

      expect(result.format).toBe('SGML');
      expect(result.version).toBe('1.x');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect OFX 1.x SGML format with partial header', () => {
      const content = `OFXHEADER:100
VERSION:103

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD`;

      const result = parser.detectVersion(content);

      expect(result.format).toBe('SGML');
      expect(result.version).toBe('1.x');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should default to SGML 1.x for ambiguous content', () => {
      const content = `Some random content without clear OFX indicators`;

      const result = parser.detectVersion(content);

      expect(result.format).toBe('SGML');
      expect(result.version).toBe('1.x');
      expect(result.confidence).toBe(0.5);
    });

    it('should handle case-insensitive detection', () => {
      const content = `<ofx>
        <bankmsgsrsv1>
          <stmttrnrs>
          </stmttrnrs>
        </bankmsgsrsv1>
      </ofx>`;

      const result = parser.detectVersion(content);

      expect(result.format).toBe('XML');
      expect(result.version).toBe('2.x');
    });
  });

  describe('validateFormat', () => {
    it('should validate empty file as invalid', () => {
      const result = parser.validateFormat('');

      expect(result.isValid).toBe(false);
      expect(result.format).toBeNull();
      expect(result.version).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EMPTY_FILE');
    });

    it('should validate whitespace-only file as invalid', () => {
      const result = parser.validateFormat('   \n\t  ');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('EMPTY_FILE');
    });

    it('should validate valid XML OFX file', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
        <OFX>
          <BANKMSGSRSV1>
            <STMTTRNRS>
              <STMTRS>
                <CURDEF>USD</CURDEF>
              </STMTRS>
            </STMTTRNRS>
          </BANKMSGSRSV1>
        </OFX>`;

      const result = parser.validateFormat(content);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('XML');
      expect(result.version).toBe('2.x');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid SGML OFX file', () => {
      const content = `OFXHEADER:100
DATA:OFXSGML
VERSION:103

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD`;

      const result = parser.validateFormat(content);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('SGML');
      expect(result.version).toBe('1.x');
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate malformed XML', () => {
      const content = `<?xml version="1.0"?>
        <OFX>
          <BANKMSGSRSV1>
            <UNCLOSED_TAG>
          </BANKMSGSRSV1>
        </OFX>`;

      const result = parser.validateFormat(content);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_XML')).toBe(true);
    });

    it('should invalidate file missing required OFX elements', () => {
      const content = `<?xml version="1.0"?>
        <NOTOFX>
          <SOMEDATA>
            <VALUE>123</VALUE>
          </SOMEDATA>
        </NOTOFX>`;

      const result = parser.validateFormat(content);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'MISSING_REQUIRED_ELEMENTS')
      ).toBe(true);
    });

    it('should validate file with CREDITCARDMSGSRSV1 element', () => {
      const content = `OFXHEADER:100
VERSION:103

<OFX>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<CCSTMTRS>
<CURDEF>USD`;

      const result = parser.validateFormat(content);

      expect(result.isValid).toBe(true);
    });

    it('should validate file with INVSTMTMSGSRSV1 element', () => {
      const content = `<?xml version="1.0"?>
        <OFX>
          <INVSTMTMSGSRSV1>
            <INVSTMTTRNRS>
              <INVSTMTRS>
                <INVACCTFROM>
                  <ACCTID>123456789</ACCTID>
                </INVACCTFROM>
              </INVSTMTRS>
            </INVSTMTTRNRS>
          </INVSTMTMSGSRSV1>
        </OFX>`;

      const result = parser.validateFormat(content);

      expect(result.isValid).toBe(true);
    });
  });

  describe('parseFile', () => {
    it('should handle file reading errors gracefully', async () => {
      // Create a mock file that will cause a reading error
      const mockFile = {
        name: 'test.ofx',
        size: 100,
        type: 'application/x-ofx',
      } as File;

      // Mock FileReader to simulate error
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }
      } as any;

      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FILE_READ_ERROR');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });

    it('should return validation errors for invalid files', async () => {
      const content = '';

      // Mock FileReader to return empty content
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: content } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([content], 'empty.ofx', {
        type: 'application/x-ofx',
      });
      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'EMPTY_FILE')).toBe(true);

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });

    it('should return success for valid OFX file', async () => {
      const content = `OFXHEADER:100
VERSION:103

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD`;

      // Mock FileReader to return valid content
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: content } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([content], 'valid.ofx', {
        type: 'application/x-ofx',
      });
      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.format).toBe('SGML');
      expect(result.version).toBe('1.x');
      expect(result.errors).toHaveLength(0);

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });

  describe('XML Parsing', () => {
    it('should parse XML OFX file with bank account and transactions', async () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
        <OFX>
          <BANKMSGSRSV1>
            <STMTTRNRS>
              <STMTRS>
                <CURDEF>USD</CURDEF>
                <BANKACCTFROM>
                  <BANKID>123456789</BANKID>
                  <ACCTID>987654321</ACCTID>
                  <ACCTTYPE>CHECKING</ACCTTYPE>
                </BANKACCTFROM>
                <BANKTRANLIST>
                  <DTSTART>20240101</DTSTART>
                  <DTEND>20240131</DTEND>
                  <STMTTRN>
                    <TRNTYPE>DEBIT</TRNTYPE>
                    <DTPOSTED>20240115</DTPOSTED>
                    <TRNAMT>-50.00</TRNAMT>
                    <FITID>TXN001</FITID>
                    <NAME>Coffee Shop</NAME>
                    <MEMO>Morning coffee</MEMO>
                  </STMTTRN>
                  <STMTTRN>
                    <TRNTYPE>CREDIT</TRNTYPE>
                    <DTPOSTED>20240120</DTPOSTED>
                    <TRNAMT>1000.00</TRNAMT>
                    <FITID>TXN002</FITID>
                    <NAME>Salary Deposit</NAME>
                  </STMTTRN>
                </BANKTRANLIST>
              </STMTRS>
            </STMTTRNRS>
          </BANKMSGSRSV1>
        </OFX>`;

      // Mock FileReader
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: content } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([content], 'test.ofx', {
        type: 'application/x-ofx',
      });
      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.format).toBe('XML');
      expect(result.version).toBe('2.x');
      expect(result.accounts).toHaveLength(1);
      expect(result.transactions).toHaveLength(2);

      // Check account details
      const account = result.accounts[0];
      expect(account.accountId).toBe('987654321');
      expect(account.bankId).toBe('123456789');
      expect(account.accountType).toBe('CHECKING');

      // Check transaction details
      const transaction1 = result.transactions[0];
      expect(transaction1.transactionId).toBe('TXN001');
      expect(transaction1.amount).toBe(-50.0);
      expect(transaction1.description).toBe('Coffee Shop - Morning coffee');
      expect(transaction1.memo).toBe('Morning coffee');
      expect(transaction1.type).toBe('DEBIT');

      const transaction2 = result.transactions[1];
      expect(transaction2.transactionId).toBe('TXN002');
      expect(transaction2.amount).toBe(1000.0);
      expect(transaction2.description).toBe('Salary Deposit');
      expect(transaction2.type).toBe('CREDIT');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });

    it('should parse XML OFX file with credit card account and transactions', async () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
        <OFX>
          <CREDITCARDMSGSRSV1>
            <CCSTMTTRNRS>
              <CCSTMTRS>
                <CURDEF>USD</CURDEF>
                <CCACCTFROM>
                  <ACCTID>4111111111111111</ACCTID>
                </CCACCTFROM>
                <BANKTRANLIST>
                  <DTSTART>20240101</DTSTART>
                  <DTEND>20240131</DTEND>
                  <CCSTMTTRN>
                    <TRNTYPE>DEBIT</TRNTYPE>
                    <DTPOSTED>20240115</DTPOSTED>
                    <TRNAMT>-25.99</TRNAMT>
                    <FITID>CC001</FITID>
                    <NAME>Online Purchase</NAME>
                  </CCSTMTTRN>
                </BANKTRANLIST>
              </CCSTMTRS>
            </CCSTMTTRNRS>
          </CREDITCARDMSGSRSV1>
        </OFX>`;

      // Mock FileReader
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: content } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([content], 'cc.ofx', {
        type: 'application/x-ofx',
      });
      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.accounts).toHaveLength(1);
      expect(result.transactions).toHaveLength(1);

      // Check credit card account
      const account = result.accounts[0];
      expect(account.accountType).toBe('CREDITCARD');
      expect(account.accountId).toBe('4111111111111111');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });

    it('should handle XML parsing errors gracefully', async () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
        <OFX>
          <BANKMSGSRSV1>
            <STMTTRNRS>
              <UNCLOSED_TAG>
            </STMTTRNRS>
          </BANKMSGSRSV1>
        </OFX>`;

      // Mock FileReader
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: content } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([content], 'invalid.ofx', {
        type: 'application/x-ofx',
      });
      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_XML')).toBe(true);

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });

  describe('SGML Parsing', () => {
    it('should parse SGML OFX file with bank account and transactions', async () => {
      const content = `OFXHEADER:100
DATA:OFXSGML
VERSION:103
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>987654321
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>TXN001
<NAME>Coffee Shop
<MEMO>Morning coffee
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240120
<TRNAMT>1000.00
<FITID>TXN002
<NAME>Salary Deposit
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      // Mock FileReader
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: content } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([content], 'test.ofx', {
        type: 'application/x-ofx',
      });
      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.format).toBe('SGML');
      expect(result.version).toBe('1.x');
      expect(result.accounts).toHaveLength(1);
      expect(result.transactions).toHaveLength(2);

      // Check account details
      const account = result.accounts[0];
      expect(account.accountId).toBe('987654321');
      expect(account.bankId).toBe('123456789');
      expect(account.accountType).toBe('CHECKING');

      // Check transaction details
      const transaction1 = result.transactions[0];
      expect(transaction1.transactionId).toBe('TXN001');
      expect(transaction1.amount).toBe(-50.0);
      expect(transaction1.description).toBe('Coffee Shop - Morning coffee');
      expect(transaction1.memo).toBe('Morning coffee');
      expect(transaction1.type).toBe('DEBIT');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });

    it('should parse SGML OFX file with credit card transactions', async () => {
      const content = `OFXHEADER:100
VERSION:103

<OFX>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<CCSTMTRS>
<CURDEF>USD
<CCACCTFROM>
<ACCTID>4111111111111111
</CCACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<CCSTMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-25.99
<FITID>CC001
<NAME>Online Purchase
</CCSTMTTRN>
</BANKTRANLIST>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>`;

      // Mock FileReader
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: content } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([content], 'cc.ofx', {
        type: 'application/x-ofx',
      });
      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.accounts).toHaveLength(1);
      expect(result.transactions).toHaveLength(1);

      // Check credit card account
      const account = result.accounts[0];
      expect(account.accountType).toBe('CREDITCARD');
      expect(account.accountId).toBe('4111111111111111');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });

    it('should handle missing required fields in SGML transactions', async () => {
      const content = `OFXHEADER:100
VERSION:103

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>987654321
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<NAME>Incomplete Transaction
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      // Mock FileReader
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: content } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([content], 'incomplete.ofx', {
        type: 'application/x-ofx',
      });
      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.accounts).toHaveLength(1);
      expect(result.transactions).toHaveLength(0); // Transaction should be skipped due to missing required fields

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });

  describe('Date Parsing', () => {
    it('should parse OFX date formats correctly', () => {
      const testDates = [
        { input: '20240115', expected: new Date(2024, 0, 15) },
        { input: '20240115120000', expected: new Date(2024, 0, 15, 12, 0, 0) },
        {
          input: '20240115120000.000',
          expected: new Date(2024, 0, 15, 12, 0, 0),
        },
        {
          input: '20240115120000[GMT]',
          expected: new Date(2024, 0, 15, 12, 0, 0),
        },
      ];

      testDates.forEach(({ input, expected }) => {
        const result = (parser as any).parseOFXDate(input);
        expect(result).toEqual(expected);
      });
    });

    it('should handle invalid date formats', () => {
      const invalidDates = ['', 'invalid', '20241301', '20240230'];

      invalidDates.forEach((input) => {
        const result = (parser as any).parseOFXDate(input);
        expect(result).toBeNull();
      });
    });
  });

  describe('Account Type Mapping', () => {
    it('should map OFX account types correctly', () => {
      const mappings = [
        { input: 'CHECKING', expected: 'CHECKING' },
        { input: 'SAVINGS', expected: 'SAVINGS' },
        { input: 'INVESTMENT', expected: 'INVESTMENT' },
        { input: 'CREDITCARD', expected: 'CREDITCARD' },
        { input: 'UNKNOWN', expected: 'CHECKING' }, // Default
        { input: 'checking', expected: 'CHECKING' }, // Case insensitive
      ];

      mappings.forEach(({ input, expected }) => {
        const result = (parser as any).mapAccountType(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle parsing errors and continue processing', async () => {
      const content = `OFXHEADER:100
VERSION:103

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>987654321
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>INVALID_DATE
<TRNAMT>-50.00
<FITID>TXN001
<NAME>Invalid Date Transaction
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240120
<TRNAMT>1000.00
<FITID>TXN002
<NAME>Valid Transaction
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      // Mock FileReader
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: content } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([content], 'mixed.ofx', {
        type: 'application/x-ofx',
      });
      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.accounts).toHaveLength(1);
      expect(result.transactions).toHaveLength(1); // Only the valid transaction should be parsed
      expect(result.transactions[0].transactionId).toBe('TXN002');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });
});
