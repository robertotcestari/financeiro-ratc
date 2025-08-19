import { prisma } from './client';
import type { 
  CategorizationRule, 
  Category,
  Property,
  Prisma
} from '@/app/generated/prisma';
import { RuleCriteria, validateRuleCriteria } from './rule-types';

export interface CreateRuleRequest {
  name: string;
  description?: string;
  priority?: number;
  categoryId?: string;
  propertyId?: string;
  criteria: RuleCriteria;
}

export interface UpdateRuleRequest {
  name?: string;
  description?: string;
  priority?: number;
  categoryId?: string;
  propertyId?: string;
  criteria?: RuleCriteria;
  isActive?: boolean;
}

export interface RuleListFilters {
  isActive?: boolean;
  categoryId?: string;
  propertyId?: string;
  search?: string;
}

// Use Prisma's inferred type from the include clause
export type RuleWithRelations = CategorizationRule & {
  category: Category | null;
  property: Property | null;
  _count: {
    suggestions: number;
  };
};

/**
 * Rule Management Service - Handles CRUD operations for categorization rules
 */
export class RuleManagementService {
  /**
   * Create a new categorization rule with validation
   */
  async createRule(params: CreateRuleRequest): Promise<RuleWithRelations> {
    const { name, description, priority = 0, categoryId, propertyId, criteria } = params;

    // Validate that at least one target is provided (category OR property)
    if (!categoryId && !propertyId) {
      throw new Error('Rule must target at least one category or property');
    }

    // Validate rule criteria
    const { valid, errors } = validateRuleCriteria(criteria);
    if (!valid) {
      throw new Error(`Invalid rule criteria: ${errors.join('; ')}`);
    }

    // Validate that category exists if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Validate that property exists if provided
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (!property) {
        throw new Error('Property not found');
      }
    }

    // Validate that bank accounts exist if specified in criteria
    if (criteria.accounts && criteria.accounts.length > 0) {
      const accounts = await prisma.bankAccount.findMany({
        where: { id: { in: criteria.accounts } },
      });
      if (accounts.length !== criteria.accounts.length) {
        throw new Error('One or more specified bank accounts do not exist');
      }
    }

    // Check for name uniqueness
    const existingRule = await prisma.categorizationRule.findFirst({
      where: { name },
    });
    if (existingRule) {
      throw new Error('Rule name must be unique');
    }

    // Create the rule
    const rule = await prisma.categorizationRule.create({
      data: {
        name,
        description: description || null,
        priority,
        categoryId: categoryId || null,
        propertyId: propertyId || null,
        criteria: criteria as Prisma.InputJsonValue, // Prisma Json type
        isActive: true,
      },
      include: {
        category: true,
        property: true,
        _count: {
          select: {
            suggestions: true,
          },
        },
      },
    });

    return rule;
  }

  /**
   * Update an existing categorization rule
   */
  async updateRule(ruleId: string, params: UpdateRuleRequest): Promise<RuleWithRelations> {
    const { name, description, priority, categoryId, propertyId, criteria, isActive } = params;

    // Check if rule exists
    const existingRule = await prisma.categorizationRule.findUnique({
      where: { id: ruleId },
    });
    if (!existingRule) {
      throw new Error('Rule not found');
    }

    // If updating criteria, validate them
    if (criteria) {
      const { valid, errors } = validateRuleCriteria(criteria);
      if (!valid) {
        throw new Error(`Invalid rule criteria: ${errors.join('; ')}`);
      }

      // Validate bank accounts if specified
      if (criteria.accounts && criteria.accounts.length > 0) {
        const accounts = await prisma.bankAccount.findMany({
          where: { id: { in: criteria.accounts } },
        });
        if (accounts.length !== criteria.accounts.length) {
          throw new Error('One or more specified bank accounts do not exist');
        }
      }
    }

    // Validate targets - at least one must be provided after update
    const finalCategoryId = categoryId !== undefined ? categoryId : existingRule.categoryId;
    const finalPropertyId = propertyId !== undefined ? propertyId : existingRule.propertyId;
    
    if (!finalCategoryId && !finalPropertyId) {
      throw new Error('Rule must target at least one category or property');
    }

    // Validate category if provided
    if (categoryId && categoryId !== existingRule.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Validate property if provided
    if (propertyId && propertyId !== existingRule.propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (!property) {
        throw new Error('Property not found');
      }
    }

    // Check name uniqueness if name is being updated
    if (name && name !== existingRule.name) {
      const duplicateRule = await prisma.categorizationRule.findFirst({
        where: { name, NOT: { id: ruleId } },
      });
      if (duplicateRule) {
        throw new Error('Rule name must be unique');
      }
    }

    // Build update data explicitly
    const updateData: Prisma.CategorizationRuleUpdateInput = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (categoryId !== undefined) {
      if (categoryId === null) {
        updateData.category = { disconnect: true };
      } else {
        updateData.category = { connect: { id: categoryId } };
      }
    }
    if (propertyId !== undefined) {
      if (propertyId === null) {
        updateData.property = { disconnect: true };
      } else {
        updateData.property = { connect: { id: propertyId } };
      }
    }
    if (criteria) updateData.criteria = criteria as Prisma.InputJsonValue;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update the rule
    const updatedRule = await prisma.categorizationRule.update({
      where: { id: ruleId },
      data: updateData,
      include: {
        category: true,
        property: true,
        _count: {
          select: {
            suggestions: true,
          },
        },
      },
    });

    return updatedRule;
  }

  /**
   * Delete a categorization rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const existingRule = await prisma.categorizationRule.findUnique({
      where: { id: ruleId },
      include: {
        _count: {
          select: {
            suggestions: true,
          },
        },
      },
    });

    if (!existingRule) {
      throw new Error('Rule not found');
    }

    // Check if rule has applied suggestions
    const appliedSuggestions = await prisma.transactionSuggestion.count({
      where: { ruleId, isApplied: true },
    });

    if (appliedSuggestions > 0) {
      throw new Error(
        `Cannot delete rule: ${appliedSuggestions} suggestions have been applied. ` +
        'Consider deactivating the rule instead.'
      );
    }

    // Delete the rule and cascade delete non-applied suggestions
    await prisma.$transaction(async (tx) => {
      // Delete non-applied suggestions first
      await tx.transactionSuggestion.deleteMany({
        where: { ruleId, isApplied: false },
      });

      // Delete the rule
      await tx.categorizationRule.delete({
        where: { id: ruleId },
      });
    });
  }

  /**
   * Toggle rule activation status
   */
  async toggleRuleStatus(ruleId: string, isActive: boolean): Promise<RuleWithRelations> {
    const existingRule = await prisma.categorizationRule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      throw new Error('Rule not found');
    }

    const updatedRule = await prisma.categorizationRule.update({
      where: { id: ruleId },
      data: { isActive },
      include: {
        category: true,
        property: true,
        _count: {
          select: {
            suggestions: true,
          },
        },
      },
    });

    return updatedRule;
  }

  /**
   * Get a single rule by ID with relations
   */
  async getRule(ruleId: string): Promise<RuleWithRelations | null> {
    const rule = await prisma.categorizationRule.findUnique({
      where: { id: ruleId },
      include: {
        category: true,
        property: true,
        _count: {
          select: {
            suggestions: true,
          },
        },
      },
    });

    return rule;
  }

  /**
   * List rules with filtering and pagination
   */
  async listRules(
    filters: RuleListFilters = {},
    limit = 50,
    offset = 0
  ): Promise<{
    rules: RuleWithRelations[];
    total: number;
  }> {
    const { isActive, categoryId, propertyId, search } = filters;

    const whereClause: {
      isActive?: boolean;
      categoryId?: string;
      propertyId?: string;
      OR?: Array<Record<string, unknown>>;
    } = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (propertyId) {
      whereClause.propertyId = propertyId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rules, total] = await Promise.all([
      prisma.categorizationRule.findMany({
        where: whereClause,
        include: {
          category: true,
          property: true,
          _count: {
            select: {
              suggestions: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.categorizationRule.count({
        where: whereClause,
      }),
    ]);

    return { rules, total };
  }

  /**
   * Get all active rules (used by rule engine)
   */
  async getActiveRules(): Promise<CategorizationRule[]> {
    return prisma.categorizationRule.findMany({
      where: { isActive: true },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Bulk toggle multiple rules
   */
  async bulkToggleRules(ruleIds: string[], isActive: boolean): Promise<{
    updated: number;
    errors: Array<{ ruleId: string; error: string }>;
  }> {
    const errors: Array<{ ruleId: string; error: string }> = [];
    let updated = 0;

    for (const ruleId of ruleIds) {
      try {
        await this.toggleRuleStatus(ruleId, isActive);
        updated++;
      } catch (error) {
        errors.push({
          ruleId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { updated, errors };
  }

  /**
   * Get rule statistics
   */
  async getRuleStats(ruleId: string): Promise<{
    totalSuggestions: number;
    appliedSuggestions: number;
    pendingSuggestions: number;
    successRate: number;
  }> {
    const stats = await prisma.transactionSuggestion.groupBy({
      by: ['isApplied'],
      where: { ruleId },
      _count: true,
    });

    const applied = stats.find((s) => s.isApplied)?._count || 0;
    const pending = stats.find((s) => !s.isApplied)?._count || 0;
    const total = applied + pending;

    return {
      totalSuggestions: total,
      appliedSuggestions: applied,
      pendingSuggestions: pending,
      successRate: total > 0 ? applied / total : 0,
    };
  }
}

// Export singleton instance
export const ruleManagementService = new RuleManagementService();