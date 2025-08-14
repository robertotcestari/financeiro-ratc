import { prisma } from '@/lib/database/client';
import { OpenAILLMClient } from './llm-client';
import { PromptBuilder } from './prompts';
import { logger, createActionLogger } from '../logger';
import type {
  TransactionContext,
  CategoryInfo,
  PropertyInfo,
  HistoricalPattern,
  AISuggestionData,
  ProcessedTransactionWithContext,
  CategorySuggestion,
  AIMetadata,
} from './types';
import type { ProcessedTransaction, SuggestionSource } from '@/app/generated/prisma';

export class AICategorizationService {
  private llmClient: OpenAILLMClient;
  private modelName: string;

  constructor(modelName: string = 'gpt-5-mini') {
    this.llmClient = new OpenAILLMClient(modelName);
    this.modelName = modelName;
  }

  /**
   * Generate AI suggestion for a single transaction
   */
  async generateSuggestion(
    processedTransaction: ProcessedTransactionWithContext
  ): Promise<AISuggestionData | null> {
    try {
      const startTime = Date.now();

      // Prepare context for LLM
      const context = await this.prepareTransactionContext(processedTransaction);
      if (!context) {
        logger.error('Could not prepare transaction context', { 
          transactionId: processedTransaction.id 
        });
        return null;
      }

      // Get categories and properties
      const categories = await this.getCategories();
      const properties = await this.getProperties();
      const historicalPatterns = await this.getHistoricalPatterns(
        context.description
      );

      // Build prompt
      const systemPrompt = PromptBuilder.buildSinglePrompt(
        categories,
        properties,
        historicalPatterns
      );

      // Call LLM
      const suggestion = await this.llmClient.categorizeTransaction(
        context,
        systemPrompt
      );

      // Validate suggestion
      const validatedSuggestion = await this.validateSuggestion(suggestion);
      if (!validatedSuggestion) {
        logger.error('Invalid suggestion from LLM', { 
          transactionId: processedTransaction.id,
          suggestion 
        });
        return null;
      }

      const processingTime = Date.now() - startTime;

      // Create AI suggestion data
      const aiSuggestion: AISuggestionData = {
        processedTransactionId: processedTransaction.id,
        suggestedCategoryId: validatedSuggestion.categoryId,
        suggestedPropertyId: validatedSuggestion.propertyId,
        confidence: validatedSuggestion.confidence || 0.8,
        reasoning: validatedSuggestion.reasoning,
        metadata: {
          modelUsed: this.modelName,
          processingTime,
          timestamp: new Date(),
        },
      };

      return aiSuggestion;
    } catch (error) {
      logger.error('Error generating AI suggestion', { 
        transactionId: processedTransaction.id,
        error 
      });
      return null;
    }
  }

  /**
   * Generate AI suggestions for multiple transactions
   */
  async generateBulkSuggestions(
    processedTransactions: ProcessedTransactionWithContext[]
  ): Promise<AISuggestionData[]> {
      const bulkLogger = createActionLogger('ai-bulk-categorization', {
        totalTransactions: processedTransactions.length,
        model: this.modelName,
      });
      
      bulkLogger.info('Starting bulk AI suggestions generation');
      
      const startTime = Date.now();
      const suggestions: AISuggestionData[] = [];

      // Process in batches of 500 to optimize API calls
      const batchSize = 500;
      for (let i = 0; i < processedTransactions.length; i += batchSize) {
        const batch = processedTransactions.slice(i, i + batchSize);
        
        // Prepare contexts for batch
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(processedTransactions.length / batchSize);
        
        bulkLogger.info(`Processing batch ${batchNumber}/${totalBatches}`, {
          batchSize: batch.length,
          startIndex: i,
        });
        
        const contexts = await Promise.all(
          batch.map(t => this.prepareTransactionContext(t))
        );
        
        const validContexts = contexts.filter(c => c !== null) as TransactionContext[];
        if (validContexts.length === 0) {
          bulkLogger.warn('No valid contexts in batch, skipping', { 
            batchNumber 
          });
          continue;
        }
        
        bulkLogger.debug('Batch contexts prepared', {
          batchNumber,
          validContexts: validContexts.length,
          invalidContexts: batch.length - validContexts.length,
        });

        // Get categories and properties (once per batch)
        const categories = await this.getCategories();
        const properties = await this.getProperties();
        
        // Get historical patterns for each transaction
        const historicalPatterns = await this.getAggregatedHistoricalPatterns(
          validContexts.map(c => c.description)
        );

        // Build batch prompt
        const systemPrompt = PromptBuilder.buildBatchPrompt(
          categories,
          properties,
          historicalPatterns,
          validContexts.length
        );

        // Call LLM for batch
        const batchSuggestions = await this.llmClient.categorizeTransactionsBatch(
          validContexts,
          systemPrompt
        );

        const processingTime = Date.now() - startTime;

        // Process and validate each suggestion
        for (const suggestion of batchSuggestions) {
          // Find the matching transaction by ID
          const matchingTransaction = batch.find(t => t.id === suggestion.transactionId);
          if (!matchingTransaction) {
            bulkLogger.error('No matching transaction found', { 
              suggestionTransactionId: suggestion.transactionId 
            });
            continue;
          }

          const validatedSuggestion = await this.validateSuggestion(suggestion);
          if (!validatedSuggestion) continue;

          suggestions.push({
            processedTransactionId: matchingTransaction.id,
            suggestedCategoryId: validatedSuggestion.categoryId,
            suggestedPropertyId: validatedSuggestion.propertyId,
            confidence: validatedSuggestion.confidence || 0.8,
            reasoning: validatedSuggestion.reasoning,
            metadata: {
              modelUsed: this.modelName,
              processingTime: processingTime / batch.length, // Average per transaction
              timestamp: new Date(),
            },
          });
        }
      }

      return suggestions;
  }

  /**
   * Prepare transaction context for LLM
   */
  private async prepareTransactionContext(
    processedTransaction: ProcessedTransactionWithContext
  ): Promise<TransactionContext | null> {
    try {
      // Get transaction details if not already loaded
      let transaction = processedTransaction.transaction;
      
      if (!transaction) {
        const fullTransaction = await prisma.processedTransaction.findUnique({
          where: { id: processedTransaction.id },
          include: {
            transaction: {
              include: {
                bankAccount: true,
              },
            },
          },
        });

        if (!fullTransaction?.transaction) {
          return null;
        }

        transaction = {
          description: fullTransaction.transaction.description,
          amount: fullTransaction.transaction.amount.toNumber(),
          date: fullTransaction.transaction.date,
          bankAccount: {
            name: fullTransaction.transaction.bankAccount.name,
            accountType: fullTransaction.transaction.bankAccount.accountType,
          },
        };
      }

      const categories = await this.getCategories();
      const properties = await this.getProperties();

      return {
        transactionId: processedTransaction.id, // Include transaction ID
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        bankAccountName: transaction.bankAccount.name,
        bankAccountType: transaction.bankAccount.accountType,
        availableCategories: categories,
        availableProperties: properties,
      };
    } catch (error) {
      logger.error('Error preparing transaction context', { 
        transactionId: processedTransaction.id,
        error 
      });
      return null;
    }
  }

  /**
   * Get all categories formatted for LLM
   */
  private async getCategories(): Promise<CategoryInfo[]> {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
      },
      orderBy: [
        { level: 'asc' },
        { orderIndex: 'asc' },
        { name: 'asc' },
      ],
    });

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      parentName: cat.parent?.name,
      level: cat.level,
    }));
  }

  /**
   * Get all properties formatted for LLM
   */
  private async getProperties(): Promise<PropertyInfo[]> {
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      orderBy: [
        { city: 'asc' },
        { code: 'asc' },
      ],
    });

    return properties.map(prop => ({
      id: prop.id,
      code: prop.code,
      city: prop.city,
      address: prop.address,
    }));
  }

  /**
   * Get historical patterns for similar transactions
   */
  private async getHistoricalPatterns(
    description: string
  ): Promise<HistoricalPattern[]> {
    // Extract meaningful keywords from description (ignoring common words)
    const stopWords = ['de', 'da', 'do', 'para', 'com', 'em', 'no', 'na', 'por', 'ref', 'ltda', 'ltd', 's.a', 'sa', 'me', 'epp'];
    
    // Normalizar descrição
    const normalizedDesc = description
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, ' ') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
    
    // Extrair diferentes tipos de palavras-chave
    const words = normalizedDesc.split(/[\s\-\/]+/);
    
    // 1. CNPJ (14 dígitos)
    const cnpjPattern = words.find(w => /^\d{14}$/.test(w));
    
    // 2. Palavras significativas (excluindo stopwords e números muito longos)
    const significantWords = words
      .filter(w => w.length > 3 && !stopWords.includes(w) && !/^\d+$/.test(w))
      .slice(0, 5); // Pegar até 5 palavras importantes
    
    // 3. Primeira palavra significativa (geralmente indica o tipo de transação)
    const firstKeyword = significantWords[0];
    
    if (significantWords.length === 0 && !cnpjPattern) return [];

    // Construir condições de busca mais inteligentes
    const conditions = [];
    
    // Prioridade 1: CNPJ exato (se existir)
    if (cnpjPattern) {
      conditions.push({
        transaction: {
          description: {
            contains: cnpjPattern,
          },
        },
      });
    }
    
    // Prioridade 2: Primeira palavra-chave (tipo de transação)
    if (firstKeyword) {
      conditions.push({
        transaction: {
          description: {
            contains: firstKeyword,
          },
        },
      });
    }
    
    // Prioridade 3: Outras palavras significativas
    for (const keyword of significantWords.slice(1, 4)) {
      conditions.push({
        transaction: {
          description: {
            contains: keyword,
          },
        },
      });
    }

    // Find similar categorized transactions - AUMENTADO PARA 1000
    const similarTransactions = await prisma.processedTransaction.findMany({
      where: {
        AND: [
          { categoryId: { not: null } },
          {
            OR: conditions, // Buscar por qualquer uma das palavras-chave
          },
        ],
      },
      include: {
        category: true,
        property: true,
        transaction: true,
      },
      take: 1000, // Aumentado para 1000 transações
      orderBy: {
        updatedAt: 'desc', // Mais recentes primeiro
      },
    });

    // Group by pattern
    const patternMap = new Map<string, HistoricalPattern>();
    
    similarTransactions.forEach(trans => {
      if (!trans.transaction || !trans.category) return;
      
      const key = `${trans.transaction.description}_${trans.category.name}_${trans.property?.code || ''}`;
      
      if (patternMap.has(key)) {
        const pattern = patternMap.get(key)!;
        pattern.frequency++;
      } else {
        patternMap.set(key, {
          description: trans.transaction.description,
          categoryName: trans.category.name,
          propertyCode: trans.property?.code,
          frequency: 1,
        });
      }
    });

    return Array.from(patternMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 200); // Aumentado para 200 padrões históricos
  }

  /**
   * Get aggregated historical patterns for multiple descriptions
   */
  private async getAggregatedHistoricalPatterns(
    descriptions: string[]
  ): Promise<HistoricalPattern[]> {
    const allPatterns: HistoricalPattern[] = [];
    
    for (const description of descriptions) {
      const patterns = await this.getHistoricalPatterns(description);
      allPatterns.push(...patterns);
    }

    // Aggregate and deduplicate
    const patternMap = new Map<string, HistoricalPattern>();
    
    allPatterns.forEach(pattern => {
      const key = `${pattern.description}_${pattern.categoryName}_${pattern.propertyCode || ''}`;
      
      if (patternMap.has(key)) {
        const existing = patternMap.get(key)!;
        existing.frequency += pattern.frequency;
      } else {
        patternMap.set(key, { ...pattern });
      }
    });

    return Array.from(patternMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 200); // Aumentado para 200 padrões agregados
  }

  /**
   * Validate suggestion from LLM
   */
  private async validateSuggestion(
    suggestion: CategorySuggestion
  ): Promise<CategorySuggestion | null> {
    try {
      // Validate category exists
      const category = await prisma.category.findUnique({
        where: { id: suggestion.categoryId },
      });

      if (!category) {
        const sampleCategories = await prisma.category.findMany({ take: 5 });
        
        logger.error('Invalid category ID from AI', { 
          invalidCategoryId: suggestion.categoryId,
          sampleValidIds: sampleCategories.map(c => c.id),
          transactionId: suggestion.transactionId,
        });
        
        return null;
      }

      // Validate property if provided
      if (suggestion.propertyId) {
        const property = await prisma.property.findUnique({
          where: { id: suggestion.propertyId },
        });

        if (!property) {
          logger.warn('Invalid property ID from AI, continuing without property', { 
            invalidPropertyId: suggestion.propertyId,
            transactionId: suggestion.transactionId,
          });
          // Continue without property instead of failing
          suggestion.propertyId = undefined;
          suggestion.propertyCode = undefined;
        }
      }

      return suggestion;
    } catch (error) {
      logger.error('Error validating suggestion', { 
        suggestion,
        error 
      });
      return null;
    }
  }
}