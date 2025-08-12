import {
  OFXParseResult,
  OFXValidationResult,
  OFXFormatDetectionResult,
  OFXVersion,
  OFXFormat,
  ParseError,
  OFXAccount,
  OFXTransaction,
} from './types';

export class OFXParserService {
  /**
   * Parse an OFX file and extract transaction data
   */
  async parseFile(file: File): Promise<OFXParseResult> {
    try {
      const content = await this.readFileContent(file);
      const validation = this.validateFormat(content);

      if (!validation.isValid) {
        return {
          success: false,
          version: validation.version || '1.x',
          format: validation.format || 'SGML',
          accounts: [],
          transactions: [],
          errors: validation.errors,
        };
      }

      // Parse the content based on format
      const result =
        validation.format === 'XML'
          ? this.parseXMLFormat(content, validation.version!)
          : this.parseSGMLFormat(content, validation.version!);

      // Associate transactions with their accounts
      this.associateTransactionsWithAccounts(
        result.accounts,
        result.transactions,
        content
      );

      return result;
    } catch (error) {
      return {
        success: false,
        version: '1.x',
        format: 'SGML',
        accounts: [],
        transactions: [],
        errors: [
          {
            type: 'FILE_FORMAT',
            code: 'FILE_READ_ERROR',
            message: `Failed to read file: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        ],
      };
    }
  }

  /**
   * Validate OFX file format and structure
   */
  validateFormat(content: string): OFXValidationResult {
    const errors: ParseError[] = [];

    if (!content || content.trim().length === 0) {
      errors.push({
        type: 'FILE_FORMAT',
        code: 'EMPTY_FILE',
        message: 'File is empty or contains no content',
      });
      return { isValid: false, format: null, version: null, errors };
    }

    const detection = this.detectVersion(content);

    // Basic format validation
    if (detection.format === 'XML') {
      if (!this.isValidXML(content)) {
        errors.push({
          type: 'FILE_FORMAT',
          code: 'INVALID_XML',
          message: 'File contains invalid XML structure',
        });
      }
    } else {
      if (!this.isValidSGML(content)) {
        errors.push({
          type: 'FILE_FORMAT',
          code: 'INVALID_SGML',
          message: 'File contains invalid SGML structure',
        });
      }
    }

    // Check for required OFX elements
    if (!this.hasRequiredOFXElements(content)) {
      errors.push({
        type: 'VALIDATION',
        code: 'MISSING_REQUIRED_ELEMENTS',
        message: 'File is missing required OFX elements',
      });
    }

    return {
      isValid: errors.length === 0,
      format: detection.format,
      version: detection.version,
      errors,
    };
  }

  /**
   * Detect OFX version and format from file content
   */
  detectVersion(content: string): OFXFormatDetectionResult {
    const trimmedContent = content.trim();

    // Check for XML declaration (OFX 2.x)
    if (trimmedContent.startsWith('<?xml')) {
      return {
        format: 'XML',
        version: '2.x',
        confidence: 0.95,
      };
    }

    // Check for SGML OFX header patterns first (OFX 1.x)
    const sgmlHeaderPatterns = [
      /OFXHEADER:\s*100/i,
      /DATA:\s*OFXSGML/i,
      /VERSION:\s*1\d{2}/i,
    ];

    let sgmlHeaderMatches = 0;
    for (const pattern of sgmlHeaderPatterns) {
      if (pattern.test(trimmedContent)) {
        sgmlHeaderMatches++;
      }
    }

    // If we have SGML header indicators, it's definitely SGML
    if (sgmlHeaderMatches >= 1) {
      return {
        format: 'SGML',
        version: '1.x',
        confidence: 0.8 + sgmlHeaderMatches * 0.05,
      };
    }

    // Check for XML-style OFX root element (OFX 2.x)
    if (trimmedContent.includes('<OFX>') || trimmedContent.includes('<ofx>')) {
      // If it has proper XML structure (closing tags), it's XML
      if (
        trimmedContent.includes('</OFX>') ||
        trimmedContent.includes('</ofx>')
      ) {
        return {
          format: 'XML',
          version: '2.x',
          confidence: 0.9,
        };
      }
      // Otherwise, it's likely SGML (no closing tags)
      return {
        format: 'SGML',
        version: '1.x',
        confidence: 0.7,
      };
    }

    // Default to SGML if no clear indicators
    return {
      format: 'SGML',
      version: '1.x',
      confidence: 0.5,
    };
  }

  /**
   * Read file content as text
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Basic XML validation
   */
  private isValidXML(content: string): boolean {
    try {
      // Check for basic XML structure
      const hasXMLDeclaration = content.trim().startsWith('<?xml');
      const hasMatchingTags = this.hasMatchingXMLTags(content);
      const hasValidCharacters = !/[<>&](?![a-zA-Z0-9#])/g.test(
        content.replace(/<[^>]*>/g, '')
      );

      return hasMatchingTags && hasValidCharacters;
    } catch {
      return false;
    }
  }

  /**
   * Check if XML has matching opening and closing tags
   */
  private hasMatchingXMLTags(content: string): boolean {
    const tagPattern = /<(\/?[a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    const stack: string[] = [];
    let match;

    while ((match = tagPattern.exec(content)) !== null) {
      const tagName = match[1];

      if (tagName.startsWith('/')) {
        // Closing tag
        const closingTag = tagName.substring(1);
        if (stack.length === 0 || stack.pop() !== closingTag) {
          return false;
        }
      } else if (!match[0].endsWith('/>')) {
        // Opening tag (not self-closing)
        stack.push(tagName);
      }
    }

    return stack.length === 0;
  }

  /**
   * Basic SGML validation for OFX format
   */
  private isValidSGML(content: string): boolean {
    // Check for basic SGML structure
    const hasOpeningTags = /<[A-Z][A-Z0-9]*>/i.test(content);

    // OFX SGML might not have closing tags, so we're more lenient
    // Just check that it has some tag-like structure
    return hasOpeningTags;
  }

  /**
   * Check for required OFX elements
   */
  private hasRequiredOFXElements(content: string): boolean {
    // Must have OFX root element
    const hasOFXRoot = /<OFX>/i.test(content);

    // Must have at least one message response element
    const hasMessageElement =
      /<BANKMSGSRSV1>|<CREDITCARDMSGSRSV1>|<INVSTMTMSGSRSV1>/i.test(content);

    return hasOFXRoot && hasMessageElement;
  }

  /**
   * Parse OFX content in XML format (OFX 2.x)
   */
  private parseXMLFormat(content: string, version: OFXVersion): OFXParseResult {
    const errors: ParseError[] = [];
    const accounts: OFXAccount[] = [];
    const transactions: OFXTransaction[] = [];

    try {
      // Check if DOMParser is available (browser environment)
      if (typeof DOMParser !== 'undefined') {
        // Parse XML using DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/xml');

        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          errors.push({
            type: 'PARSING',
            code: 'XML_PARSE_ERROR',
            message: `XML parsing failed: ${parserError.textContent}`,
          });
          return {
            success: false,
            version,
            format: 'XML',
            accounts,
            transactions,
            errors,
          };
        }

        // Extract accounts and transactions
        this.extractAccountsFromXML(doc, accounts, errors);
        this.extractTransactionsFromXML(doc, transactions, errors);
      } else {
        // Fallback to regex-based parsing for non-browser environments
        this.extractAccountsFromXMLRegex(content, accounts, errors);
        this.extractTransactionsFromXMLRegex(content, transactions, errors);
      }

      return {
        success: errors.length === 0,
        version,
        format: 'XML',
        accounts,
        transactions,
        errors,
      };
    } catch (error) {
      errors.push({
        type: 'PARSING',
        code: 'XML_PROCESSING_ERROR',
        message: `Failed to process XML: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });

      return {
        success: false,
        version,
        format: 'XML',
        accounts,
        transactions,
        errors,
      };
    }
  }

  /**
   * Parse OFX content in SGML format (OFX 1.x)
   */
  private parseSGMLFormat(
    content: string,
    version: OFXVersion
  ): OFXParseResult {
    const errors: ParseError[] = [];
    const accounts: OFXAccount[] = [];
    const transactions: OFXTransaction[] = [];

    try {
      // Extract accounts and transactions using regex-based parsing
      this.extractAccountsFromSGML(content, accounts, errors);
      this.extractTransactionsFromSGML(content, transactions, errors);

      return {
        success: errors.length === 0,
        version,
        format: 'SGML',
        accounts,
        transactions,
        errors,
      };
    } catch (error) {
      errors.push({
        type: 'PARSING',
        code: 'SGML_PROCESSING_ERROR',
        message: `Failed to process SGML: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });

      return {
        success: false,
        version,
        format: 'SGML',
        accounts,
        transactions,
        errors,
      };
    }
  }

  /**
   * Extract account information from XML document
   */
  private extractAccountsFromXML(
    doc: Document,
    accounts: OFXAccount[],
    errors: ParseError[]
  ): void {
    try {
      // Bank accounts
      const bankAccounts = doc.querySelectorAll('BANKACCTFROM, BANKACCTTO');
      bankAccounts.forEach((accountElement) => {
        const account = this.parseXMLBankAccount(accountElement);
        if (account) {
          accounts.push(account);
        }
      });

      // Credit card accounts
      const ccAccounts = doc.querySelectorAll('CCACCTFROM, CCACCTTO');
      ccAccounts.forEach((accountElement) => {
        const account = this.parseXMLCreditCardAccount(accountElement);
        if (account) {
          accounts.push(account);
        }
      });

      // Investment accounts
      const invAccounts = doc.querySelectorAll('INVACCTFROM');
      invAccounts.forEach((accountElement) => {
        const account = this.parseXMLInvestmentAccount(accountElement);
        if (account) {
          accounts.push(account);
        }
      });
    } catch (error) {
      errors.push({
        type: 'PARSING',
        code: 'ACCOUNT_EXTRACTION_ERROR',
        message: `Failed to extract accounts from XML: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }

  /**
   * Extract transaction information from XML document
   */
  private extractTransactionsFromXML(
    doc: Document,
    transactions: OFXTransaction[],
    errors: ParseError[]
  ): void {
    try {
      // Bank transactions
      const bankTransactions = doc.querySelectorAll('STMTTRN');
      bankTransactions.forEach((transElement, index) => {
        try {
          const transaction = this.parseXMLBankTransaction(transElement);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            type: 'PARSING',
            code: 'TRANSACTION_PARSE_ERROR',
            message: `Failed to parse bank transaction at index ${index}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            line: index + 1,
          });
        }
      });

      // Credit card transactions
      const ccTransactions = doc.querySelectorAll('CCSTMTTRN');
      ccTransactions.forEach((transElement, index) => {
        try {
          const transaction = this.parseXMLCreditCardTransaction(transElement);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            type: 'PARSING',
            code: 'TRANSACTION_PARSE_ERROR',
            message: `Failed to parse credit card transaction at index ${index}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            line: index + 1,
          });
        }
      });

      // Investment transactions
      const invTransactions = doc.querySelectorAll('INVTRAN');
      invTransactions.forEach((transElement, index) => {
        try {
          const transaction = this.parseXMLInvestmentTransaction(transElement);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            type: 'PARSING',
            code: 'TRANSACTION_PARSE_ERROR',
            message: `Failed to parse investment transaction at index ${index}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            line: index + 1,
          });
        }
      });
    } catch (error) {
      errors.push({
        type: 'PARSING',
        code: 'TRANSACTION_EXTRACTION_ERROR',
        message: `Failed to extract transactions from XML: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }

  /**
   * Extract account information from SGML content using regex
   */
  private extractAccountsFromSGML(
    content: string,
    accounts: OFXAccount[],
    errors: ParseError[]
  ): void {
    try {
      // Bank accounts
      const bankAccountPattern =
        /<BANKACCTFROM>(.*?)<\/BANKACCTFROM>|<BANKACCTFROM>(.*?)(?=<[A-Z])/gis;
      let match;
      while ((match = bankAccountPattern.exec(content)) !== null) {
        const accountData = match[1] || match[2];
        const account = this.parseSGMLBankAccount(accountData);
        if (account) {
          accounts.push(account);
        }
      }

      // Credit card accounts
      const ccAccountPattern =
        /<CCACCTFROM>(.*?)<\/CCACCTFROM>|<CCACCTFROM>(.*?)(?=<[A-Z])/gis;
      while ((match = ccAccountPattern.exec(content)) !== null) {
        const accountData = match[1] || match[2];
        const account = this.parseSGMLCreditCardAccount(accountData);
        if (account) {
          accounts.push(account);
        }
      }

      // Investment accounts
      const invAccountPattern =
        /<INVACCTFROM>(.*?)<\/INVACCTFROM>|<INVACCTFROM>(.*?)(?=<[A-Z])/gis;
      while ((match = invAccountPattern.exec(content)) !== null) {
        const accountData = match[1] || match[2];
        const account = this.parseSGMLInvestmentAccount(accountData);
        if (account) {
          accounts.push(account);
        }
      }
    } catch (error) {
      errors.push({
        type: 'PARSING',
        code: 'ACCOUNT_EXTRACTION_ERROR',
        message: `Failed to extract accounts from SGML: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }

  /**
   * Extract transaction information from SGML content using regex
   */
  private extractTransactionsFromSGML(
    content: string,
    transactions: OFXTransaction[],
    errors: ParseError[]
  ): void {
    try {
      // Bank transactions
      const bankTransPattern =
        /<STMTTRN>(.*?)<\/STMTTRN>|<STMTTRN>(.*?)(?=<STMTTRN|<\/STMTRS|<\/BANKTRANLIST)/gis;
      let match;
      let transactionIndex = 0;
      while ((match = bankTransPattern.exec(content)) !== null) {
        try {
          const transactionData = match[1] || match[2];
          const transaction = this.parseSGMLBankTransaction(transactionData);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            type: 'PARSING',
            code: 'TRANSACTION_PARSE_ERROR',
            message: `Failed to parse bank transaction at index ${transactionIndex}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            line: transactionIndex + 1,
          });
        }
        transactionIndex++;
      }

      // Credit card transactions
      const ccTransPattern =
        /<CCSTMTTRN>(.*?)<\/CCSTMTTRN>|<CCSTMTTRN>(.*?)(?=<CCSTMTTRN|<\/CCSTMTRS|<\/BANKTRANLIST)/gis;
      transactionIndex = 0;
      while ((match = ccTransPattern.exec(content)) !== null) {
        try {
          const transactionData = match[1] || match[2];
          const transaction =
            this.parseSGMLCreditCardTransaction(transactionData);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            type: 'PARSING',
            code: 'TRANSACTION_PARSE_ERROR',
            message: `Failed to parse credit card transaction at index ${transactionIndex}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            line: transactionIndex + 1,
          });
        }
        transactionIndex++;
      }
    } catch (error) {
      errors.push({
        type: 'PARSING',
        code: 'TRANSACTION_EXTRACTION_ERROR',
        message: `Failed to extract transactions from SGML: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }

  /**
   * Parse bank account from XML element
   */
  private parseXMLBankAccount(element: Element): OFXAccount | null {
    const bankId = element.querySelector('BANKID')?.textContent?.trim();
    const accountId = element.querySelector('ACCTID')?.textContent?.trim();
    const accountType = element.querySelector('ACCTTYPE')?.textContent?.trim();

    if (!bankId || !accountId) {
      return null;
    }

    return {
      accountId,
      bankId,
      accountType: this.mapAccountType(accountType || 'CHECKING'),
      accountNumber: accountId,
      routingNumber: bankId,
    };
  }

  /**
   * Parse credit card account from XML element
   */
  private parseXMLCreditCardAccount(element: Element): OFXAccount | null {
    const accountId = element.querySelector('ACCTID')?.textContent?.trim();

    if (!accountId) {
      return null;
    }

    return {
      accountId,
      bankId: 'CREDITCARD',
      accountType: 'CREDITCARD',
      accountNumber: accountId,
    };
  }

  /**
   * Parse investment account from XML element
   */
  private parseXMLInvestmentAccount(element: Element): OFXAccount | null {
    const brokerId = element.querySelector('BROKERID')?.textContent?.trim();
    const accountId = element.querySelector('ACCTID')?.textContent?.trim();

    if (!accountId) {
      return null;
    }

    return {
      accountId,
      bankId: brokerId || 'INVESTMENT',
      accountType: 'INVESTMENT',
      accountNumber: accountId,
    };
  }

  /**
   * Parse bank transaction from XML element
   */
  private parseXMLBankTransaction(element: Element): OFXTransaction | null {
    const transactionId = element.querySelector('FITID')?.textContent?.trim();
    const dateStr = element.querySelector('DTPOSTED')?.textContent?.trim();
    const amountStr = element.querySelector('TRNAMT')?.textContent?.trim();
    const description = element.querySelector('NAME')?.textContent?.trim();
    const type = element.querySelector('TRNTYPE')?.textContent?.trim();
    const memo = element.querySelector('MEMO')?.textContent?.trim();
    const checkNumber = element.querySelector('CHECKNUM')?.textContent?.trim();

    if (!transactionId || !dateStr || !amountStr) {
      return null;
    }

    const date = this.parseOFXDate(dateStr);
    const amount = parseFloat(amountStr);

    if (!date || isNaN(amount)) {
      return null;
    }

    return {
      transactionId,
      accountId: '', // Will be set by the calling context
      date,
      amount,
      description: description || '',
      type: type || 'OTHER',
      memo,
      checkNumber,
    };
  }

  /**
   * Parse credit card transaction from XML element
   */
  private parseXMLCreditCardTransaction(
    element: Element
  ): OFXTransaction | null {
    const transactionId = element.querySelector('FITID')?.textContent?.trim();
    const dateStr = element.querySelector('DTPOSTED')?.textContent?.trim();
    const amountStr = element.querySelector('TRNAMT')?.textContent?.trim();
    const description = element.querySelector('NAME')?.textContent?.trim();
    const type = element.querySelector('TRNTYPE')?.textContent?.trim();
    const memo = element.querySelector('MEMO')?.textContent?.trim();

    if (!transactionId || !dateStr || !amountStr) {
      return null;
    }

    const date = this.parseOFXDate(dateStr);
    const amount = parseFloat(amountStr);

    if (!date || isNaN(amount)) {
      return null;
    }

    return {
      transactionId,
      accountId: '', // Will be set by the calling context
      date,
      amount,
      description: description || '',
      type: type || 'OTHER',
      memo,
    };
  }

  /**
   * Parse investment transaction from XML element
   */
  private parseXMLInvestmentTransaction(
    element: Element
  ): OFXTransaction | null {
    const transactionId = element.querySelector('FITID')?.textContent?.trim();
    const dateStr = element.querySelector('DTTRADE')?.textContent?.trim();
    const description = element.querySelector('MEMO')?.textContent?.trim();

    if (!transactionId || !dateStr) {
      return null;
    }

    const date = this.parseOFXDate(dateStr);

    if (!date) {
      return null;
    }

    return {
      transactionId,
      accountId: '', // Will be set by the calling context
      date,
      amount: 0, // Investment transactions may not have simple amounts
      description: description || '',
      type: 'INVESTMENT',
      memo: description,
    };
  }

  /**
   * Parse bank account from SGML data
   */
  private parseSGMLBankAccount(data: string): OFXAccount | null {
    const bankId = this.extractSGMLValue(data, 'BANKID');
    const accountId = this.extractSGMLValue(data, 'ACCTID');
    const accountType = this.extractSGMLValue(data, 'ACCTTYPE');

    if (!bankId || !accountId) {
      return null;
    }

    return {
      accountId,
      bankId,
      accountType: this.mapAccountType(accountType || 'CHECKING'),
      accountNumber: accountId,
      routingNumber: bankId,
    };
  }

  /**
   * Parse credit card account from SGML data
   */
  private parseSGMLCreditCardAccount(data: string): OFXAccount | null {
    const accountId = this.extractSGMLValue(data, 'ACCTID');

    if (!accountId) {
      return null;
    }

    return {
      accountId,
      bankId: 'CREDITCARD',
      accountType: 'CREDITCARD',
      accountNumber: accountId,
    };
  }

  /**
   * Parse investment account from SGML data
   */
  private parseSGMLInvestmentAccount(data: string): OFXAccount | null {
    const brokerId = this.extractSGMLValue(data, 'BROKERID');
    const accountId = this.extractSGMLValue(data, 'ACCTID');

    if (!accountId) {
      return null;
    }

    return {
      accountId,
      bankId: brokerId || 'INVESTMENT',
      accountType: 'INVESTMENT',
      accountNumber: accountId,
    };
  }

  /**
   * Parse bank transaction from SGML data
   */
  private parseSGMLBankTransaction(data: string): OFXTransaction | null {
    const transactionId = this.extractSGMLValue(data, 'FITID');
    const dateStr = this.extractSGMLValue(data, 'DTPOSTED');
    const amountStr = this.extractSGMLValue(data, 'TRNAMT');
    const description = this.extractSGMLValue(data, 'NAME');
    const type = this.extractSGMLValue(data, 'TRNTYPE');
    const memo = this.extractSGMLValue(data, 'MEMO');
    const checkNumber = this.extractSGMLValue(data, 'CHECKNUM');

    if (!transactionId || !dateStr || !amountStr) {
      return null;
    }

    const date = this.parseOFXDate(dateStr);
    const amount = parseFloat(amountStr);

    if (!date || isNaN(amount)) {
      return null;
    }

    return {
      transactionId,
      accountId: '', // Will be set by the calling context
      date,
      amount,
      description: description || '',
      type: type || 'OTHER',
      memo,
      checkNumber,
    };
  }

  /**
   * Parse credit card transaction from SGML data
   */
  private parseSGMLCreditCardTransaction(data: string): OFXTransaction | null {
    const transactionId = this.extractSGMLValue(data, 'FITID');
    const dateStr = this.extractSGMLValue(data, 'DTPOSTED');
    const amountStr = this.extractSGMLValue(data, 'TRNAMT');
    const description = this.extractSGMLValue(data, 'NAME');
    const type = this.extractSGMLValue(data, 'TRNTYPE');
    const memo = this.extractSGMLValue(data, 'MEMO');

    if (!transactionId || !dateStr || !amountStr) {
      return null;
    }

    const date = this.parseOFXDate(dateStr);
    const amount = parseFloat(amountStr);

    if (!date || isNaN(amount)) {
      return null;
    }

    return {
      transactionId,
      accountId: '', // Will be set by the calling context
      date,
      amount,
      description: description || '',
      type: type || 'OTHER',
      memo,
    };
  }

  /**
   * Extract value from SGML data using tag name
   */
  private extractSGMLValue(data: string, tagName: string): string | null {
    const pattern = new RegExp(`<${tagName}>([^<]*?)(?=<|$)`, 'i');
    const match = pattern.exec(data);
    return match ? match[1].trim() : null;
  }

  /**
   * Parse OFX date format (YYYYMMDD[HHMMSS[.SSS]][TZ])
   */
  private parseOFXDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.length < 8) return null;

    // Remove timezone and milliseconds for simplicity
    const cleanDateStr = dateStr.replace(/\[.*?\]|\.\d+/g, '');

    // Must be at least 8 characters for YYYYMMDD
    if (cleanDateStr.length < 8) return null;

    // Check if it's all digits (except for removed parts)
    if (!/^\d+$/.test(cleanDateStr)) return null;

    // Extract date parts
    const year = parseInt(cleanDateStr.substring(0, 4), 10);
    const month = parseInt(cleanDateStr.substring(4, 6), 10) - 1; // Month is 0-based
    const day = parseInt(cleanDateStr.substring(6, 8), 10);

    // Extract time parts if present
    let hour = 0;
    let minute = 0;
    let second = 0;

    if (cleanDateStr.length >= 14) {
      hour = parseInt(cleanDateStr.substring(8, 10), 10);
      minute = parseInt(cleanDateStr.substring(10, 12), 10);
      second = parseInt(cleanDateStr.substring(12, 14), 10);
    }

    // Validate date components
    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      year < 1900 ||
      year > 2100 ||
      month < 0 ||
      month > 11 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    // Additional validation for month/day combinations
    if (month === 1 && day > 29) return null; // February
    if ([3, 5, 8, 10].includes(month) && day > 30) return null; // April, June, September, November
    if (month === 1 && day === 29) {
      // Check for leap year
      const isLeapYear =
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      if (!isLeapYear) return null;
    }

    // Validate time components
    if (hour > 23 || minute > 59 || second > 59) return null;

    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Map OFX account type to our standard types
   */
  private mapAccountType(
    ofxType: string
  ): 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'CREDITCARD' {
    const type = ofxType.toUpperCase();
    switch (type) {
      case 'CHECKING':
        return 'CHECKING';
      case 'SAVINGS':
        return 'SAVINGS';
      case 'INVESTMENT':
        return 'INVESTMENT';
      case 'CREDITCARD':
        return 'CREDITCARD';
      default:
        return 'CHECKING';
    }
  }

  /**
   * Associate transactions with their corresponding accounts
   */
  private associateTransactionsWithAccounts(
    accounts: OFXAccount[],
    transactions: OFXTransaction[],
    content: string
  ): void {
    // For each account, find its associated transactions
    accounts.forEach((account) => {
      // Find transactions that belong to this account by looking at the structure
      const accountTransactions = transactions.filter((transaction) => {
        // If transaction already has an accountId, use it
        if (transaction.accountId && transaction.accountId !== '') {
          return transaction.accountId === account.accountId;
        }

        // Otherwise, try to determine from context
        // This is a simplified approach - in a real implementation,
        // you'd need to parse the hierarchical structure more carefully
        return true; // For now, associate all transactions with the first account
      });

      // Set the accountId for transactions that don't have one
      accountTransactions.forEach((transaction) => {
        if (!transaction.accountId || transaction.accountId === '') {
          transaction.accountId = account.accountId;
        }
      });
    });

    // If we have transactions but no accounts, create a default account
    if (transactions.length > 0 && accounts.length === 0) {
      const defaultAccount: OFXAccount = {
        accountId: 'UNKNOWN',
        bankId: 'UNKNOWN',
        accountType: 'CHECKING',
        accountNumber: 'UNKNOWN',
      };
      accounts.push(defaultAccount);

      transactions.forEach((transaction) => {
        transaction.accountId = defaultAccount.accountId;
      });
    }
  }

  /**
   * Extract account information from XML content using regex (fallback)
   */
  private extractAccountsFromXMLRegex(
    content: string,
    accounts: OFXAccount[],
    errors: ParseError[]
  ): void {
    try {
      // Bank accounts
      const bankAccountPattern = /<BANKACCTFROM>(.*?)<\/BANKACCTFROM>/gis;
      let match;
      while ((match = bankAccountPattern.exec(content)) !== null) {
        const accountData = match[1];
        const account = this.parseXMLBankAccountFromString(accountData);
        if (account) {
          accounts.push(account);
        }
      }

      // Credit card accounts
      const ccAccountPattern = /<CCACCTFROM>(.*?)<\/CCACCTFROM>/gis;
      while ((match = ccAccountPattern.exec(content)) !== null) {
        const accountData = match[1];
        const account = this.parseXMLCreditCardAccountFromString(accountData);
        if (account) {
          accounts.push(account);
        }
      }

      // Investment accounts
      const invAccountPattern = /<INVACCTFROM>(.*?)<\/INVACCTFROM>/gis;
      while ((match = invAccountPattern.exec(content)) !== null) {
        const accountData = match[1];
        const account = this.parseXMLInvestmentAccountFromString(accountData);
        if (account) {
          accounts.push(account);
        }
      }
    } catch (error) {
      errors.push({
        type: 'PARSING',
        code: 'ACCOUNT_EXTRACTION_ERROR',
        message: `Failed to extract accounts from XML: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }

  /**
   * Extract transaction information from XML content using regex (fallback)
   */
  private extractTransactionsFromXMLRegex(
    content: string,
    transactions: OFXTransaction[],
    errors: ParseError[]
  ): void {
    try {
      // Bank transactions
      const bankTransPattern = /<STMTTRN>(.*?)<\/STMTTRN>/gis;
      let match;
      let transactionIndex = 0;
      while ((match = bankTransPattern.exec(content)) !== null) {
        try {
          const transactionData = match[1];
          const transaction =
            this.parseXMLBankTransactionFromString(transactionData);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            type: 'PARSING',
            code: 'TRANSACTION_PARSE_ERROR',
            message: `Failed to parse bank transaction at index ${transactionIndex}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            line: transactionIndex + 1,
          });
        }
        transactionIndex++;
      }

      // Credit card transactions
      const ccTransPattern = /<CCSTMTTRN>(.*?)<\/CCSTMTTRN>/gis;
      transactionIndex = 0;
      while ((match = ccTransPattern.exec(content)) !== null) {
        try {
          const transactionData = match[1];
          const transaction =
            this.parseXMLCreditCardTransactionFromString(transactionData);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            type: 'PARSING',
            code: 'TRANSACTION_PARSE_ERROR',
            message: `Failed to parse credit card transaction at index ${transactionIndex}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            line: transactionIndex + 1,
          });
        }
        transactionIndex++;
      }
    } catch (error) {
      errors.push({
        type: 'PARSING',
        code: 'TRANSACTION_EXTRACTION_ERROR',
        message: `Failed to extract transactions from XML: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }

  /**
   * Parse bank account from XML string data
   */
  private parseXMLBankAccountFromString(data: string): OFXAccount | null {
    const bankId = this.extractXMLValue(data, 'BANKID');
    const accountId = this.extractXMLValue(data, 'ACCTID');
    const accountType = this.extractXMLValue(data, 'ACCTTYPE');

    if (!bankId || !accountId) {
      return null;
    }

    return {
      accountId,
      bankId,
      accountType: this.mapAccountType(accountType || 'CHECKING'),
      accountNumber: accountId,
      routingNumber: bankId,
    };
  }

  /**
   * Parse credit card account from XML string data
   */
  private parseXMLCreditCardAccountFromString(data: string): OFXAccount | null {
    const accountId = this.extractXMLValue(data, 'ACCTID');

    if (!accountId) {
      return null;
    }

    return {
      accountId,
      bankId: 'CREDITCARD',
      accountType: 'CREDITCARD',
      accountNumber: accountId,
    };
  }

  /**
   * Parse investment account from XML string data
   */
  private parseXMLInvestmentAccountFromString(data: string): OFXAccount | null {
    const brokerId = this.extractXMLValue(data, 'BROKERID');
    const accountId = this.extractXMLValue(data, 'ACCTID');

    if (!accountId) {
      return null;
    }

    return {
      accountId,
      bankId: brokerId || 'INVESTMENT',
      accountType: 'INVESTMENT',
      accountNumber: accountId,
    };
  }

  /**
   * Parse bank transaction from XML string data
   */
  private parseXMLBankTransactionFromString(
    data: string
  ): OFXTransaction | null {
    const transactionId = this.extractXMLValue(data, 'FITID');
    const dateStr = this.extractXMLValue(data, 'DTPOSTED');
    const amountStr = this.extractXMLValue(data, 'TRNAMT');
    const description = this.extractXMLValue(data, 'NAME');
    const type = this.extractXMLValue(data, 'TRNTYPE');
    const memo = this.extractXMLValue(data, 'MEMO');
    const checkNumber = this.extractXMLValue(data, 'CHECKNUM');

    if (!transactionId || !dateStr || !amountStr) {
      return null;
    }

    const date = this.parseOFXDate(dateStr);
    const amount = parseFloat(amountStr);

    if (!date || isNaN(amount)) {
      return null;
    }

    return {
      transactionId,
      accountId: '', // Will be set by the calling context
      date,
      amount,
      description: description || '',
      type: type || 'OTHER',
      memo,
      checkNumber,
    };
  }

  /**
   * Parse credit card transaction from XML string data
   */
  private parseXMLCreditCardTransactionFromString(
    data: string
  ): OFXTransaction | null {
    const transactionId = this.extractXMLValue(data, 'FITID');
    const dateStr = this.extractXMLValue(data, 'DTPOSTED');
    const amountStr = this.extractXMLValue(data, 'TRNAMT');
    const description = this.extractXMLValue(data, 'NAME');
    const type = this.extractXMLValue(data, 'TRNTYPE');
    const memo = this.extractXMLValue(data, 'MEMO');

    if (!transactionId || !dateStr || !amountStr) {
      return null;
    }

    const date = this.parseOFXDate(dateStr);
    const amount = parseFloat(amountStr);

    if (!date || isNaN(amount)) {
      return null;
    }

    return {
      transactionId,
      accountId: '', // Will be set by the calling context
      date,
      amount,
      description: description || '',
      type: type || 'OTHER',
      memo,
    };
  }

  /**
   * Extract value from XML data using tag name
   */
  private extractXMLValue(data: string, tagName: string): string | null {
    const pattern = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 'is');
    const match = pattern.exec(data);
    return match ? match[1].trim() : null;
  }
}
