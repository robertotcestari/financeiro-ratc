import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { logger, createActionLogger } from '../logger';
import { openAIDebugLogger } from './debug-logger';
import type {
  TransactionContext,
  CategorySuggestion,
  AIError,
  AIResponse,
  BatchAIResponse,
} from './types';

// Zod schema for AI response validation
const AIResponseSchema = z.object({
  suggestion: z.object({
    transactionId: z.string(), // Required to match with transaction
    categoryId: z.string(),
    categoryName: z.string(),
    propertyId: z.string().nullable().optional(),
    propertyCode: z.string().nullable().optional(),
    reasoning: z.string(),
  }),
  metadata: z.object({
    processingTime: z.number(),
    modelUsed: z.string(),
  }),
});

const BatchAIResponseSchema = z.object({
  suggestions: z.array(AIResponseSchema),
});

export interface LLMClient {
  categorizeTransaction(
    context: TransactionContext,
    systemPrompt: string
  ): Promise<CategorySuggestion>;
  
  categorizeTransactionsBatch(
    contexts: TransactionContext[],
    systemPrompt: string
  ): Promise<CategorySuggestion[]>;
}

export class OpenAILLMClient implements LLMClient {
  private model: string;
  private temperature: number;
  private maxRetries: number;

  constructor(
    model: string = 'gpt-5-mini',
    temperature: number = 0.3,
    maxRetries: number = 3
  ) {
    this.model = model;
    this.temperature = temperature;
    this.maxRetries = maxRetries;
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
  }

  async categorizeTransaction(
    context: TransactionContext,
    systemPrompt: string
  ): Promise<CategorySuggestion> {
    const startTime = Date.now();
    const aiLogger = createActionLogger('openai-single', {
      transactionId: context.transactionId,
      model: this.model,
    });
    
    try {
      const userPrompt = this.buildUserPrompt([context]);
      
      aiLogger.info('OpenAI request initiated', {
        model: this.model,
        temperature: this.temperature,
        systemPromptLength: systemPrompt.length,
        userPrompt: userPrompt,
      });
      
      const result = await this.callLLMWithRetry(async () => {
        const requestPayload = {
          model: openai(this.model),
          temperature: this.temperature,
          system: systemPrompt,
          prompt: userPrompt,
          schema: AIResponseSchema,
        };
        
        // Salvar request completo para debug
        const fullRequest = {
          model: this.model,
          temperature: this.temperature,
          systemPrompt: systemPrompt,
          userPrompt: userPrompt,
        };
        
        // Salvar em arquivo se debug habilitado
        openAIDebugLogger.saveRequest(context.transactionId, fullRequest);
        
        aiLogger.info('📤 OpenAI Request', {
          model: this.model,
          temperature: this.temperature,
          transactionId: context.transactionId,
          promptSizes: {
            system: systemPrompt.length,
            user: userPrompt.length,
          },
        });
        
        return await generateObject(requestPayload);
      }, aiLogger);

      const processingTime = Date.now() - startTime;
      
      // Salvar response completo para debug
      openAIDebugLogger.saveResponse(context.transactionId, result.object);
      
      aiLogger.info('📥 OpenAI Response', {
        processingTime,
        categoryId: result.object.suggestion.categoryId,
        categoryName: result.object.suggestion.categoryName,
        hasProperty: !!result.object.suggestion.propertyId,
      });
      
      return {
        transactionId: result.object.suggestion.transactionId,
        categoryId: result.object.suggestion.categoryId,
        categoryName: result.object.suggestion.categoryName,
        propertyId: result.object.suggestion.propertyId || undefined,
        propertyCode: result.object.suggestion.propertyCode || undefined,
        reasoning: result.object.suggestion.reasoning,
        confidence: 0.8, // Default confidence for now
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async categorizeTransactionsBatch(
    contexts: TransactionContext[],
    systemPrompt: string
  ): Promise<CategorySuggestion[]> {
    const startTime = Date.now();
    const aiLogger = createActionLogger('openai-batch', {
      transactionCount: contexts.length,
      model: this.model,
    });
    
    try {
      const userPrompt = this.buildUserPrompt(contexts);
      
      aiLogger.info('OpenAI batch request initiated', {
        model: this.model,
        temperature: this.temperature,
        systemPromptLength: systemPrompt.length,
        transactionCount: contexts.length,
      });
      
      aiLogger.debug('Request details', {
        userPrompt,
        transactionIds: contexts.map(c => c.transactionId),
      });
      
      const result = await this.callLLMWithRetry(async () => {
        const requestPayload = {
          model: openai(this.model),
          temperature: this.temperature,
          system: systemPrompt,
          prompt: userPrompt,
          schema: BatchAIResponseSchema,
        };
        
        // Salvar request batch completo para debug
        const fullBatchRequest = {
          model: this.model,
          temperature: this.temperature,
          systemPrompt: systemPrompt,
          userPrompt: userPrompt,
          transactionCount: contexts.length,
        };
        
        // Gerar ID único para o batch
        const batchId = `batch_${Date.now()}`;
        
        aiLogger.info('📤 OpenAI Batch Request', {
          batchId,
          model: this.model,
          transactionCount: contexts.length,
          promptSizes: {
            system: systemPrompt.length,
            user: userPrompt.length,
          },
        });
        
        // Salvar request/response batch para debug
        openAIDebugLogger.saveBatch(batchId, fullBatchRequest, null);
        
        const response = await generateObject(requestPayload);
        
        // Salvar response batch
        openAIDebugLogger.saveBatch(batchId, fullBatchRequest, response.object);
        
        return response;
      }, aiLogger);
      
      const processingTime = Date.now() - startTime;
      
      aiLogger.info('📥 OpenAI Batch Response', {
        batchId: `batch_${Date.now() - processingTime}`, // Mesmo batchId
        processingTime,
        suggestionsCount: result.object.suggestions.length,
        averageTimePerTransaction: processingTime / contexts.length,
      });
      
      return result.object.suggestions.map((suggestion) => ({
        transactionId: suggestion.suggestion.transactionId,
        categoryId: suggestion.suggestion.categoryId,
        categoryName: suggestion.suggestion.categoryName,
        propertyId: suggestion.suggestion.propertyId || undefined,
        propertyCode: suggestion.suggestion.propertyCode || undefined,
        reasoning: suggestion.suggestion.reasoning,
        confidence: 0.8, // Default confidence for now
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private buildUserPrompt(contexts: TransactionContext[]): string {
    const transactionsList = contexts
      .map((context, index) => {
        return `
[${index + 1}]
Transaction ID: ${context.transactionId}
Descrição: ${context.description}
Valor: R$ ${context.amount.toFixed(2)}
Data: ${context.date.toISOString().split('T')[0]}
Conta Bancária: ${context.bankAccountName} (${context.bankAccountType})
`;
      })
      .join('\n');

    return `TRANSAÇÕES PARA CATEGORIZAR:\n${transactionsList}`;
  }

  private async callLLMWithRetry<T>(
    fn: () => Promise<T>,
    aiLogger?: ReturnType<typeof createActionLogger>,
    retryCount: number = 0
  ): Promise<T> {
    const loggerInstance = aiLogger || logger;
    
    try {
      return await fn();
    } catch (error: any) {
      loggerInstance.error('OpenAI API error', {
        attempt: retryCount + 1,
        maxRetries: this.maxRetries + 1,
        errorCode: error?.code,
        errorMessage: error?.message,
        error,
      });
      
      if (retryCount >= this.maxRetries) {
        throw error;
      }

      const delay = this.getRetryDelay(retryCount, error);
      loggerInstance.warn(`Retrying after ${delay}ms delay`, {
        retryCount: retryCount + 1,
        delay,
      });
      
      await this.sleep(delay);
      
      return this.callLLMWithRetry(fn, aiLogger, retryCount + 1);
    }
  }

  private getRetryDelay(retryCount: number, error: any): number {
    // Check if error has a specific retry-after header
    if (error?.headers?.['retry-after']) {
      return parseInt(error.headers['retry-after']) * 1000;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, retryCount), 10000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleError(error: any): AIError {
    logger.error('LLM Client Error', { error });

    if (error?.code === 'rate_limit_exceeded') {
      return {
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please try again later.',
        retryable: true,
        retryAfter: error?.headers?.['retry-after'] 
          ? parseInt(error.headers['retry-after']) 
          : 60,
      };
    }

    if (error?.code === 'invalid_request_error') {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Invalid request to OpenAI API',
        retryable: false,
      };
    }

    if (error?.response?.status >= 500) {
      return {
        code: 'API_ERROR',
        message: 'OpenAI API error. Please try again later.',
        retryable: true,
      };
    }

    return {
      code: 'API_ERROR',
      message: error.message || 'Unknown error occurred',
      retryable: false,
    };
  }
}