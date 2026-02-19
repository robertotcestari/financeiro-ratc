import { z } from '@hono/zod-openapi'
import { PaginationMetaSchema } from './common'

export const RuleCriteriaSchema = z
  .object({
    accounts: z.array(z.string()).optional().openapi({ description: 'IDs de contas bancárias' }),
    value: z
      .object({
        operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'between']).optional(),
        amount: z.number().optional(),
        amountMin: z.number().optional(),
        amountMax: z.number().optional(),
        sign: z.enum(['positive', 'negative', 'any']).optional(),
      })
      .optional(),
    date: z
      .object({
        dayMin: z.number().int().min(1).max(31).optional(),
        dayMax: z.number().int().min(1).max(31).optional(),
        months: z.array(z.number().int().min(1).max(12)).optional(),
      })
      .optional(),
    description: z
      .object({
        keywords: z.array(z.string()).optional(),
        operator: z.enum(['and', 'or']).optional(),
        wholeWord: z.boolean().optional(),
        caseSensitive: z.boolean().optional(),
      })
      .optional(),
  })
  .openapi('RuleCriteria')

export const RuleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    priority: z.number().int(),
    details: z.string().nullable(),
    criteria: RuleCriteriaSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    category: z
      .object({ id: z.string(), name: z.string(), type: z.string() })
      .nullable(),
    property: z
      .object({ id: z.string(), code: z.string() })
      .nullable(),
    suggestionsCount: z.number().int(),
  })
  .openapi('Rule')

export const RuleListQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional().openapi({ description: 'Filtrar por status' }),
  categoryId: z.string().optional().openapi({ description: 'Filtrar por categoria' }),
  propertyId: z.string().optional().openapi({ description: 'Filtrar por imóvel' }),
  search: z.string().optional().openapi({ description: 'Busca por nome/descrição' }),
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(500).default(50).openapi({ example: 50 }),
})

export const RuleListResponseSchema = z
  .object({
    data: z.array(RuleSchema),
    meta: PaginationMetaSchema,
  })
  .openapi('RuleListResponse')

export const RuleDetailResponseSchema = z
  .object({ data: RuleSchema })
  .openapi('RuleDetailResponse')

export const CreateRuleInputSchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'PIX Aluguel' }),
    description: z.string().optional(),
    priority: z.number().int().optional().openapi({ example: 10 }),
    categoryId: z.string().openapi({ description: 'ID da categoria (obrigatório)' }),
    propertyId: z.string().optional().openapi({ description: 'ID do imóvel (opcional)' }),
    details: z.string().optional(),
    criteria: RuleCriteriaSchema,
  })
  .openapi('CreateRuleInput')

export const UpdateRuleInputSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    priority: z.number().int().optional(),
    categoryId: z.string().optional(),
    propertyId: z.string().optional(),
    details: z.string().optional(),
    criteria: RuleCriteriaSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .openapi('UpdateRuleInput')

export const ToggleRuleInputSchema = z
  .object({
    isActive: z.boolean().openapi({ description: 'Ativar ou desativar' }),
  })
  .openapi('ToggleRuleInput')

export const RuleStatsResponseSchema = z
  .object({
    data: z.object({
      totalSuggestions: z.number().int(),
      appliedSuggestions: z.number().int(),
      pendingSuggestions: z.number().int(),
      successRate: z.number(),
    }),
  })
  .openapi('RuleStatsResponse')

export const ApplyRuleInputSchema = z
  .object({
    transactionIds: z.array(z.string()).min(1).openapi({ description: 'IDs das transações processadas' }),
  })
  .openapi('ApplyRuleInput')

export const ApplyRuleResponseSchema = z
  .object({
    data: z.array(
      z.object({
        processedTransactionId: z.string(),
        success: z.boolean(),
        matched: z.boolean(),
        suggestionCreated: z.boolean(),
        error: z.string().optional(),
      })
    ),
  })
  .openapi('ApplyRuleResponse')
