import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OFXParserService } from '../../lib/ofx/parser';

describe('OFX Parser Integration Tests', () => {
  let parser: OFXParserService;

  beforeEach(() => {
    parser = new OFXParserService();
  });

  describe('Sample File Parsing', () => {
    it('should parse SGML bank statement file correctly', async () => {
      const filePath = join(__dirname, '../fixtures/sample-bank-sgml.ofx');
      const content = readFileSync(filePath, 'utf-8');

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

      const mockFile = new File([content], 'sample-bank-sgml.ofx', {
        type: 'application/x-ofx',
      });

      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.format).toBe('SGML');
      expect(result.version).toBe('1.x');
      expect(result.errors).toHaveLength(0);

      // Check accounts
      expect(result.accounts).toHaveLength(1);
      const account = result.accounts[0];
      expect(account.accountId).toBe('987654321');
      expect(account.bankId).toBe('123456789');
      expect(account.accountType).toBe('CHECKING');

      // Check transactions
      expect(result.transactions).toHaveLength(3);

      const transaction1 = result.transactions[0];
      expect(transaction1.transactionId).toBe('TXN001');
      expect(transaction1.amount).toBe(-50.0);
      expect(transaction1.description).toBe('Coffee Shop Purchase');
      expect(transaction1.memo).toBe('Morning coffee and pastry');
      expect(transaction1.type).toBe('DEBIT');
      expect(transaction1.checkNumber).toBe('1001');
      expect(transaction1.date).toEqual(new Date(2024, 0, 15));

      const transaction2 = result.transactions[1];
      expect(transaction2.transactionId).toBe('TXN002');
      expect(transaction2.amount).toBe(1000.0);
      expect(transaction2.description).toBe('Salary Deposit');
      expect(transaction2.type).toBe('CREDIT');

      const transaction3 = result.transactions[2];
      expect(transaction3.transactionId).toBe('TXN003');
      expect(transaction3.amount).toBe(-75.5);
      expect(transaction3.description).toBe('Grocery Store');
      expect(transaction3.type).toBe('DEBIT');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });

    it('should parse XML bank statement file correctly', async () => {
      const filePath = join(__dirname, '../fixtures/sample-bank-xml.ofx');
      const content = readFileSync(filePath, 'utf-8');

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

      const mockFile = new File([content], 'sample-bank-xml.ofx', {
        type: 'application/x-ofx',
      });

      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.format).toBe('XML');
      expect(result.version).toBe('2.x');
      expect(result.errors).toHaveLength(0);

      // Check accounts
      expect(result.accounts).toHaveLength(1);
      const account = result.accounts[0];
      expect(account.accountId).toBe('987654321');
      expect(account.bankId).toBe('123456789');
      expect(account.accountType).toBe('CHECKING');

      // Check transactions
      expect(result.transactions).toHaveLength(3);

      const transaction1 = result.transactions[0];
      expect(transaction1.transactionId).toBe('TXN001');
      expect(transaction1.amount).toBe(-50.0);
      expect(transaction1.description).toBe('Coffee Shop Purchase');
      expect(transaction1.memo).toBe('Morning coffee and pastry');
      expect(transaction1.type).toBe('DEBIT');
      expect(transaction1.checkNumber).toBe('1001');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });

    it('should parse SGML credit card statement file correctly', async () => {
      const filePath = join(
        __dirname,
        '../fixtures/sample-creditcard-sgml.ofx'
      );
      const content = readFileSync(filePath, 'utf-8');

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

      const mockFile = new File([content], 'sample-creditcard-sgml.ofx', {
        type: 'application/x-ofx',
      });

      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.format).toBe('SGML');
      expect(result.version).toBe('1.x');
      expect(result.errors).toHaveLength(0);

      // Check accounts
      expect(result.accounts).toHaveLength(1);
      const account = result.accounts[0];
      expect(account.accountId).toBe('4111111111111111');
      expect(account.bankId).toBe('CREDITCARD');
      expect(account.accountType).toBe('CREDITCARD');

      // Check transactions
      expect(result.transactions).toHaveLength(3);

      const transaction1 = result.transactions[0];
      expect(transaction1.transactionId).toBe('CC001');
      expect(transaction1.amount).toBe(-25.99);
      expect(transaction1.description).toBe('Online Purchase');
      expect(transaction1.memo).toBe('Amazon.com purchase');
      expect(transaction1.type).toBe('DEBIT');

      const transaction2 = result.transactions[1];
      expect(transaction2.transactionId).toBe('CC002');
      expect(transaction2.amount).toBe(-150.0);
      expect(transaction2.description).toBe('Restaurant');
      expect(transaction2.type).toBe('DEBIT');

      const transaction3 = result.transactions[2];
      expect(transaction3.transactionId).toBe('CC003');
      expect(transaction3.amount).toBe(200.0);
      expect(transaction3.description).toBe('Payment');
      expect(transaction3.type).toBe('CREDIT');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });

  describe('Error Handling with Real Files', () => {
    it('should handle malformed OFX files gracefully', async () => {
      const malformedContent = `OFXHEADER:100
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
<TRNAMT>NOT_A_NUMBER
<FITID>TXN001
<NAME>Invalid Transaction
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
              this.onload({ target: { result: malformedContent } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([malformedContent], 'malformed.ofx', {
        type: 'application/x-ofx',
      });

      const result = await parser.parseFile(mockFile);

      expect(result.success).toBe(true); // Should still succeed with partial data
      expect(result.accounts).toHaveLength(1);
      expect(result.transactions).toHaveLength(1); // Only the valid transaction
      expect(result.transactions[0].transactionId).toBe('TXN002');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });

  describe('Performance with Large Files', () => {
    it('should handle files with many transactions efficiently', async () => {
      // Generate a large OFX file with many transactions
      const headerContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:103

<OFX>
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
<DTEND>20240131`;

      const footerContent = `</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      // Generate 100 transactions
      let transactionsContent = '';
      for (let i = 1; i <= 100; i++) {
        transactionsContent += `
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-${(i * 10).toFixed(2)}
<FITID>TXN${i.toString().padStart(3, '0')}
<NAME>Transaction ${i}
<MEMO>Test transaction ${i}
</STMTTRN>`;
      }

      const largeContent = headerContent + transactionsContent + footerContent;

      // Mock FileReader
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        onload: ((e: any) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: largeContent } });
            }
          }, 0);
        }
      } as any;

      const mockFile = new File([largeContent], 'large.ofx', {
        type: 'application/x-ofx',
      });

      const startTime = Date.now();
      const result = await parser.parseFile(mockFile);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.accounts).toHaveLength(1);
      expect(result.transactions).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify first and last transactions
      expect(result.transactions[0].transactionId).toBe('TXN001');
      expect(result.transactions[0].amount).toBe(-10.0);
      expect(result.transactions[99].transactionId).toBe('TXN100');
      expect(result.transactions[99].amount).toBe(-1000.0);

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });
});
