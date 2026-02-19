import { z } from '@hono/zod-openapi'

export const SuggestionSchema = z
  .object({
    id: z.string(),
    processedTransactionId: z.string(),
    source: z.string().openapi({ example: 'RULE' }),
    confidence: z.number().openapi({ example: 0.85 }),
    isApplied: z.boolean(),
    appliedAt: z.string().nullable(),
    reasoning: z.string().nullable(),
    suggestedCategory: z
      .object({ id: z.string(), name: z.string() })
      .nullable(),
    suggestedProperty: z
      .object({ id: z.string(), code: z.string() })
      .nullable(),
    suggestedDetails: z.string().nullable(),
    rule: z
      .object({ id: z.string(), name: z.string() })
      .nullable(),
  })
  .openapi('Suggestion')

export const SuggestionListResponseSchema = z
  .object({
    data: z.array(SuggestionSchema),
  })
  .openapi('SuggestionListResponse')

export const GenerateSuggestionsInputSchema = z
  .object({
    transactionIds: z.array(z.string()).min(1).openapi({ description: 'IDs das transações processadas' }),
    ruleIds: z.array(z.string()).optional().openapi({ description: 'IDs das regras (opcional, usa todas as ativas se omitido)' }),
  })
  .openapi('GenerateSuggestionsInput')

export const GenerateSuggestionsResponseSchema = z
  .object({
    processed: z.number().int(),
    suggested: z.number().int(),
    matched: z.number().int(),
  })
  .openapi('GenerateSuggestionsResponse')

export const BulkApplyInputSchema = z
  .object({
    suggestionIds: z.array(z.string()).min(1),
  })
  .openapi('BulkApplySuggestionsInput')

export const BulkResultSchema = z
  .object({
    results: z.array(
      z.object({
        suggestionId: z.string(),
        success: z.boolean(),
        error: z.string().optional(),
      })
    ),
    summary: z.object({
      total: z.number().int(),
      successful: z.number().int(),
      failed: z.number().int(),
    }),
  })
  .openapi('BulkSuggestionResult')

export const BulkDismissInputSchema = z
  .object({
    suggestionIds: z.array(z.string()).min(1),
  })
  .openapi('BulkDismissSuggestionsInput')
