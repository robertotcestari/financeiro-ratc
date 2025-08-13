import { describe, expect, it, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import { prisma } from '../../lib/database/client';
import { ruleManagementService } from '../../lib/database/rule-management';
import { ruleTestingService } from '../../lib/database/rule-testing';
import { ruleEngine } from '../../lib/database/rule-engine';
import type { CreateRuleRequest, UpdateRuleRequest } from '../../lib/database/rule-management';
import type { RuleCriteria } from '../../lib/database/rule-types';

// This test file uses the real database client for integration testing
// but with a test database to avoid affecting production data

describe('Rule Database Operations Integration', () => {
  // Test data setup
  let testCategoryId: string;
  let testPropertyId: string;
  let testBankAccountId: string;
  let testRuleId: string;
  let testTransactionId: string;
  let testProcessedTransactionId: string;

  beforeAll(async () => {
    // Create test data prerequisites
    const testCategory = await prisma.category.create({
      data: {
        name: 'Test Category',
        type: 'RECEITA',
        level: 1,
      },
    });
    testCategoryId = testCategory.id;

    const testProperty = await prisma.property.create({
      data: {
        code: 'TEST-001',
        description: 'Test Property',
        cityId: 'test-city',
        isActive: true,
      },
    });
    testPropertyId = testProperty.id;

    const testBankAccount = await prisma.bankAccount.create({
      data: {
        name: 'Test Bank Account',
        bankName: 'Test Bank',
        accountType: 'CHECKING',
        isActive: true,
      },
    });
    testBankAccountId = testBankAccount.id;

    // Create test transaction
    const testTransaction = await prisma.transaction.create({
      data: {
        bankAccountId: testBankAccountId,
        date: new Date('2025-01-15'),
        description: 'ALUGUEL TESTE CASA',
        amount: -1200.50,
      },
    });
    testTransactionId = testTransaction.id;

    const testProcessedTransaction = await prisma.processedTransaction.create({
      data: {
        transactionId: testTransactionId,
        year: 2025,
        month: 1,
      },
    });
    testProcessedTransactionId = testProcessedTransaction.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.transactionSuggestion.deleteMany({
      where: { processedTransactionId: testProcessedTransactionId },
    });

    await prisma.processedTransaction.deleteMany({
      where: { id: testProcessedTransactionId },
    });

    await prisma.transaction.deleteMany({
      where: { id: testTransactionId },
    });

    await prisma.categorizationRule.deleteMany({
      where: { categoryId: testCategoryId },
    });

    await prisma.category.deleteMany({
      where: { id: testCategoryId },
    });

    await prisma.property.deleteMany({
      where: { id: testPropertyId },
    });

    await prisma.bankAccount.deleteMany({
      where: { id: testBankAccountId },
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing rules from previous tests
    await prisma.transactionSuggestion.deleteMany({});
    await prisma.categorizationRule.deleteMany({
      where: { categoryId: testCategoryId },
    });
  });

  describe('Rule Management Service', () => {
    describe('createRule', () => {
      it('creates a rule with all relationships', async () => {
        const createRequest: CreateRuleRequest = {
          name: 'Integration Test Rule',
          description: 'Test rule for integration testing',
          categoryId: testCategoryId,
          propertyId: testPropertyId,
          priority: 5,
          criteria: {
            date: { dayRange: { start: 1, end: 15 } },
            value: { min: 1000, max: 1500, operator: 'between' },
            description: { keywords: ['ALUGUEL', 'TESTE'], operator: 'and' },
            accounts: [testBankAccountId],
          },
        };

        const rule = await ruleManagementService.createRule(createRequest);

        expect(rule.id).toBeDefined();
        expect(rule.name).toBe('Integration Test Rule');
        expect(rule.description).toBe('Test rule for integration testing');
        expect(rule.categoryId).toBe(testCategoryId);
        expect(rule.propertyId).toBe(testPropertyId);
        expect(rule.priority).toBe(5);
        expect(rule.isActive).toBe(true);
        expect(rule.criteria).toEqual(createRequest.criteria);

        // Check relationships
        expect(rule.category).toBeDefined();
        expect(rule.category?.name).toBe('Test Category');
        expect(rule.property).toBeDefined();
        expect(rule.property?.code).toBe('TEST-001');

        testRuleId = rule.id;
      });

      it('creates a rule without property', async () => {
        const createRequest: CreateRuleRequest = {
          name: 'Rule Without Property',
          categoryId: testCategoryId,
          priority: 3,
          criteria: {
            description: { keywords: ['TEST'], operator: 'or' },
          },
        };

        const rule = await ruleManagementService.createRule(createRequest);

        expect(rule.propertyId).toBeNull();
        expect(rule.property).toBeNull();
        expect(rule.category).toBeDefined();
      });

      it('validates category existence', async () => {
        const createRequest: CreateRuleRequest = {
          name: 'Invalid Category Rule',
          categoryId: 'non-existent-category',
          priority: 1,
          criteria: {},
        };

        await expect(ruleManagementService.createRule(createRequest))
          .rejects.toThrow();
      });
    });

    describe('updateRule', () => {
      it('updates rule properties correctly', async () => {
        // First create a rule
        const createRequest: CreateRuleRequest = {
          name: 'Original Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: { description: { keywords: ['OLD'], operator: 'or' } },
        };

        const originalRule = await ruleManagementService.createRule(createRequest);

        // Then update it
        const updateRequest: UpdateRuleRequest = {
          name: 'Updated Rule',
          description: 'Updated description',
          priority: 10,
          criteria: { description: { keywords: ['NEW'], operator: 'and' } },
        };

        const updatedRule = await ruleManagementService.updateRule(originalRule.id, updateRequest);

        expect(updatedRule.name).toBe('Updated Rule');
        expect(updatedRule.description).toBe('Updated description');
        expect(updatedRule.priority).toBe(10);
        expect(updatedRule.criteria).toEqual(updateRequest.criteria);
        expect(updatedRule.categoryId).toBe(testCategoryId); // Unchanged
        expect(updatedRule.updatedAt.getTime()).toBeGreaterThan(updatedRule.createdAt.getTime());
      });

      it('throws error for non-existent rule', async () => {
        const updateRequest: UpdateRuleRequest = {
          name: 'Non-existent Rule',
        };

        await expect(ruleManagementService.updateRule('non-existent-id', updateRequest))
          .rejects.toThrow();
      });
    });

    describe('deleteRule', () => {
      it('deletes rule and associated suggestions', async () => {
        // Create a rule
        const createRequest: CreateRuleRequest = {
          name: 'Rule To Delete',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {},
        };

        const rule = await ruleManagementService.createRule(createRequest);

        // Create a suggestion for this rule
        await prisma.transactionSuggestion.create({
          data: {
            processedTransactionId: testProcessedTransactionId,
            ruleId: rule.id,
            confidence: 0.8,
            suggestedCategoryId: testCategoryId,
          },
        });

        // Delete the rule
        await ruleManagementService.deleteRule(rule.id);

        // Verify rule and suggestions are deleted
        const deletedRule = await prisma.categorizationRule.findUnique({
          where: { id: rule.id },
        });
        expect(deletedRule).toBeNull();

        const suggestions = await prisma.transactionSuggestion.findMany({
          where: { ruleId: rule.id },
        });
        expect(suggestions).toHaveLength(0);
      });

      it('throws error for non-existent rule', async () => {
        await expect(ruleManagementService.deleteRule('non-existent-id'))
          .rejects.toThrow();
      });
    });

    describe('toggleRuleStatus', () => {
      it('toggles rule active status', async () => {
        // Create a rule
        const createRequest: CreateRuleRequest = {
          name: 'Toggle Test Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {},
        };

        const rule = await ruleManagementService.createRule(createRequest);
        expect(rule.isActive).toBe(true);

        // Toggle to inactive
        const inactiveRule = await ruleManagementService.toggleRuleStatus(rule.id, false);
        expect(inactiveRule.isActive).toBe(false);

        // Toggle back to active
        const activeRule = await ruleManagementService.toggleRuleStatus(rule.id, true);
        expect(activeRule.isActive).toBe(true);
      });
    });

    describe('listRules', () => {
      it('returns paginated rules with filters', async () => {
        // Create multiple rules with different properties
        await ruleManagementService.createRule({
          name: 'Active High Priority',
          categoryId: testCategoryId,
          priority: 10,
          criteria: {},
        });

        const inactiveRule = await ruleManagementService.createRule({
          name: 'Inactive Low Priority',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {},
        });

        await ruleManagementService.toggleRuleStatus(inactiveRule.id, false);

        // Test filtering by active status
        const activeRules = await ruleManagementService.listRules({ isActive: true }, 10, 0);
        expect(activeRules.rules.every(r => r.isActive)).toBe(true);

        // Test filtering by category
        const categoryRules = await ruleManagementService.listRules({ categoryId: testCategoryId }, 10, 0);
        expect(categoryRules.rules.every(r => r.categoryId === testCategoryId)).toBe(true);

        // Test pagination
        const paginatedRules = await ruleManagementService.listRules({}, 1, 0);
        expect(paginatedRules.rules).toHaveLength(1);

        // Test total count
        expect(paginatedRules.total).toBeGreaterThanOrEqual(2);
      });

      it('orders rules by priority and creation date', async () => {
        // Create rules with different priorities
        const lowPriorityRule = await ruleManagementService.createRule({
          name: 'Low Priority',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {},
        });

        // Wait a bit to ensure different creation times
        await new Promise(resolve => setTimeout(resolve, 10));

        const highPriorityRule = await ruleManagementService.createRule({
          name: 'High Priority',
          categoryId: testCategoryId,
          priority: 10,
          criteria: {},
        });

        const rules = await ruleManagementService.listRules({}, 10, 0);
        
        // Find our test rules
        const lowRule = rules.rules.find(r => r.id === lowPriorityRule.id);
        const highRule = rules.rules.find(r => r.id === highPriorityRule.id);
        
        expect(lowRule).toBeDefined();
        expect(highRule).toBeDefined();
        
        const lowIndex = rules.rules.indexOf(lowRule!);
        const highIndex = rules.rules.indexOf(highRule!);
        
        // High priority should come before low priority
        expect(highIndex).toBeLessThan(lowIndex);
      });
    });

    describe('getRuleStats', () => {
      it('calculates rule statistics correctly', async () => {
        // Create a rule
        const rule = await ruleManagementService.createRule({
          name: 'Stats Test Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {},
        });

        // Create suggestions with different states
        await prisma.transactionSuggestion.createMany({
          data: [
            {
              processedTransactionId: testProcessedTransactionId,
              ruleId: rule.id,
              confidence: 0.9,
              isApplied: true,
              appliedAt: new Date(),
            },
            {
              processedTransactionId: testProcessedTransactionId,
              ruleId: rule.id,
              confidence: 0.8,
              isApplied: false,
            },
          ],
        });

        const stats = await ruleManagementService.getRuleStats(rule.id);

        expect(stats.totalSuggestions).toBe(2);
        expect(stats.appliedSuggestions).toBe(1);
        expect(stats.pendingSuggestions).toBe(1);
        expect(stats.successRate).toBe(0.5); // 1/2
      });

      it('returns zero stats for rule with no suggestions', async () => {
        const rule = await ruleManagementService.createRule({
          name: 'No Stats Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {},
        });

        const stats = await ruleManagementService.getRuleStats(rule.id);

        expect(stats.totalSuggestions).toBe(0);
        expect(stats.appliedSuggestions).toBe(0);
        expect(stats.pendingSuggestions).toBe(0);
        expect(stats.successRate).toBe(0);
      });
    });

    describe('bulkToggleRules', () => {
      it('toggles multiple rules and reports results', async () => {
        // Create multiple rules
        const rule1 = await ruleManagementService.createRule({
          name: 'Bulk Test Rule 1',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {},
        });

        const rule2 = await ruleManagementService.createRule({
          name: 'Bulk Test Rule 2',
          categoryId: testCategoryId,
          priority: 2,
          criteria: {},
        });

        const result = await ruleManagementService.bulkToggleRules([rule1.id, rule2.id], false);

        expect(result.updated).toBe(2);
        expect(result.errors).toHaveLength(0);

        // Verify both rules are inactive
        const updatedRule1 = await ruleManagementService.getRule(rule1.id);
        const updatedRule2 = await ruleManagementService.getRule(rule2.id);

        expect(updatedRule1?.isActive).toBe(false);
        expect(updatedRule2?.isActive).toBe(false);
      });

      it('handles partial failures in bulk operations', async () => {
        const rule = await ruleManagementService.createRule({
          name: 'Valid Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {},
        });

        const result = await ruleManagementService.bulkToggleRules(
          [rule.id, 'non-existent-id'],
          false
        );

        expect(result.updated).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].ruleId).toBe('non-existent-id');
        expect(result.errors[0].error).toContain('not found');
      });
    });
  });

  describe('Rule Testing Service', () => {
    describe('testRuleCriteria', () => {
      it('finds matching transactions based on criteria', async () => {
        const criteria: RuleCriteria = {
          description: { keywords: ['ALUGUEL'], operator: 'or' },
          value: { min: 1000, operator: 'gte' },
        };

        const result = await ruleTestingService.testRuleCriteria({
          criteria,
          categoryId: testCategoryId,
          limit: 50,
        });

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].description).toContain('ALUGUEL');
        expect(Math.abs(result.matches[0].amount)).toBeGreaterThanOrEqual(1000);
        expect(result.matches[0].matched).toBe(true);
      });

      it('respects limit parameter', async () => {
        const criteria: RuleCriteria = {
          description: { keywords: ['ALUGUEL'], operator: 'or' },
        };

        const result = await ruleTestingService.testRuleCriteria({
          criteria,
          limit: 1,
        });

        expect(result.matches).toHaveLength(1);
      });

      it('returns empty results for non-matching criteria', async () => {
        const criteria: RuleCriteria = {
          description: { keywords: ['NONEXISTENT'], operator: 'or' },
        };

        const result = await ruleTestingService.testRuleCriteria({
          criteria,
          limit: 50,
        });

        expect(result.matches).toHaveLength(0);
        expect(result.totalMatches).toBe(0);
      });
    });

    describe('previewRule', () => {
      it('previews rule with complete parameters', async () => {
        const criteria: RuleCriteria = {
          description: { keywords: ['ALUGUEL'], operator: 'or' },
          accounts: [testBankAccountId],
        };

        const result = await ruleTestingService.previewRule({
          criteria,
          categoryId: testCategoryId,
          propertyId: testPropertyId,
          limit: 50,
        });

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].matched).toBe(true);
        expect(result.matches[0].confidence).toBeGreaterThan(0);
      });
    });

    describe('validateRule', () => {
      it('validates correct rule criteria', async () => {
        const criteria: RuleCriteria = {
          date: { dayRange: { start: 1, end: 15 } },
          value: { min: 100, max: 1000, operator: 'between' },
          description: { keywords: ['TEST'], operator: 'or' },
          accounts: [testBankAccountId],
        };

        const result = await ruleTestingService.validateRule(criteria, testCategoryId, testPropertyId);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('identifies invalid rule criteria', async () => {
        const criteria: RuleCriteria = {
          date: { months: [0, 13] }, // Invalid months
          value: { min: 1000, max: 500, operator: 'between' }, // Invalid range
          description: { keywords: [''], operator: 'or' }, // Empty keyword
        };

        const result = await ruleTestingService.validateRule(criteria);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('analyzeRulePerformance', () => {
      it('analyzes rule performance with historical data', async () => {
        // Create a rule
        const rule = await ruleManagementService.createRule({
          name: 'Performance Test Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {},
        });

        // Create suggestions with different months
        const currentDate = new Date();
        const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        
        await prisma.transactionSuggestion.createMany({
          data: [
            {
              processedTransactionId: testProcessedTransactionId,
              ruleId: rule.id,
              confidence: 0.9,
              isApplied: true,
              appliedAt: currentDate,
              createdAt: currentDate,
            },
            {
              processedTransactionId: testProcessedTransactionId,
              ruleId: rule.id,
              confidence: 0.8,
              isApplied: false,
              createdAt: lastMonth,
            },
          ],
        });

        const result = await ruleTestingService.analyzeRulePerformance(rule.id);

        expect(result.totalSuggestions).toBe(2);
        expect(result.appliedSuggestions).toBe(1);
        expect(result.dismissedSuggestions).toBe(0);
        expect(result.pendingSuggestions).toBe(1);
        expect(result.successRate).toBe(0.5);
        expect(result.averageConfidence).toBe(0.85);
        expect(result.monthlyBreakdown).toHaveLength(2);
      });
    });
  });

  describe('Rule Engine', () => {
    describe('evaluateTransaction', () => {
      it('evaluates transaction against rules', async () => {
        // Create a rule
        const rule = await ruleManagementService.createRule({
          name: 'Engine Test Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {
            description: { keywords: ['ALUGUEL'], operator: 'or' },
          },
        });

        // Get the processed transaction with its raw transaction
        const processedTransaction = await prisma.processedTransaction.findUnique({
          where: { id: testProcessedTransactionId },
          include: { transaction: true },
        });

        expect(processedTransaction).toBeDefined();
        expect(processedTransaction!.transaction).toBeDefined();

        const results = await ruleEngine.evaluateTransaction(
          processedTransaction!,
          [rule]
        );

        expect(results).toHaveLength(1);
        expect(results[0].ruleId).toBe(rule.id);
        expect(results[0].suggestedCategoryId).toBe(testCategoryId);
        expect(results[0].confidence).toBeGreaterThan(0);
      });

      it('returns empty array for non-matching rules', async () => {
        // Create a rule that won't match our test transaction
        const rule = await ruleManagementService.createRule({
          name: 'Non-matching Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {
            description: { keywords: ['NONEXISTENT'], operator: 'or' },
          },
        });

        const processedTransaction = await prisma.processedTransaction.findUnique({
          where: { id: testProcessedTransactionId },
          include: { transaction: true },
        });

        const results = await ruleEngine.evaluateTransaction(
          processedTransaction!,
          [rule]
        );

        expect(results).toHaveLength(0);
      });
    });

    describe('generateSuggestions', () => {
      it('generates suggestions for transactions', async () => {
        // Create a matching rule
        const rule = await ruleManagementService.createRule({
          name: 'Suggestion Test Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {
            description: { keywords: ['ALUGUEL'], operator: 'or' },
          },
        });

        const result = await ruleEngine.generateSuggestions([testProcessedTransactionId], [rule.id]);

        expect(result.processed).toBe(1);
        expect(result.suggested).toBe(1);

        // Verify suggestion was created
        const suggestion = await prisma.transactionSuggestion.findFirst({
          where: {
            processedTransactionId: testProcessedTransactionId,
            ruleId: rule.id,
          },
        });

        expect(suggestion).toBeDefined();
        expect(suggestion!.suggestedCategoryId).toBe(testCategoryId);
      });

      it('processes multiple transactions efficiently', async () => {
        // Create additional test transaction
        const transaction2 = await prisma.transaction.create({
          data: {
            bankAccountId: testBankAccountId,
            date: new Date('2025-01-20'),
            description: 'ALUGUEL OUTRO APARTAMENTO',
            amount: -800.00,
          },
        });

        const processedTransaction2 = await prisma.processedTransaction.create({
          data: {
            transactionId: transaction2.id,
            year: 2025,
            month: 1,
          },
        });

        const rule = await ruleManagementService.createRule({
          name: 'Multi-transaction Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {
            description: { keywords: ['ALUGUEL'], operator: 'or' },
          },
        });

        const result = await ruleEngine.generateSuggestions(
          [testProcessedTransactionId, processedTransaction2.id],
          [rule.id]
        );

        expect(result.processed).toBe(2);
        expect(result.suggested).toBe(2);

        // Clean up
        await prisma.transactionSuggestion.deleteMany({
          where: { processedTransactionId: processedTransaction2.id },
        });
        await prisma.processedTransaction.delete({
          where: { id: processedTransaction2.id },
        });
        await prisma.transaction.delete({
          where: { id: transaction2.id },
        });
      });
    });

    describe('applyRuleToTransactions', () => {
      it('applies specific rule to transactions', async () => {
        const rule = await ruleManagementService.createRule({
          name: 'Apply Rule Test',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {
            description: { keywords: ['ALUGUEL'], operator: 'or' },
          },
        });

        const results = await ruleEngine.applyRuleToTransactions(rule.id, [testProcessedTransactionId]);

        expect(results).toHaveLength(1);
        expect(results[0].processedTransactionId).toBe(testProcessedTransactionId);
        expect(results[0].success).toBe(true);
        expect(results[0].matched).toBe(true);
        expect(results[0].suggestionCreated).toBe(true);
      });

      it('handles non-matching transactions gracefully', async () => {
        const rule = await ruleManagementService.createRule({
          name: 'Non-matching Apply Rule',
          categoryId: testCategoryId,
          priority: 1,
          criteria: {
            description: { keywords: ['NONEXISTENT'], operator: 'or' },
          },
        });

        const results = await ruleEngine.applyRuleToTransactions(rule.id, [testProcessedTransactionId]);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);
        expect(results[0].matched).toBe(false);
        expect(results[0].suggestionCreated).toBe(false);
      });
    });
  });

  describe('Cross-Service Integration', () => {
    it('end-to-end rule workflow', async () => {
      // 1. Create a rule
      const rule = await ruleManagementService.createRule({
        name: 'E2E Test Rule',
        categoryId: testCategoryId,
        propertyId: testPropertyId,
        priority: 5,
        criteria: {
          description: { keywords: ['ALUGUEL'], operator: 'or' },
          value: { min: 1000, operator: 'gte' },
        },
      });

      // 2. Test the rule
      const testResult = await ruleTestingService.previewRule({
        criteria: rule.criteria as RuleCriteria,
        categoryId: rule.categoryId!,
        propertyId: rule.propertyId,
        limit: 10,
      });

      expect(testResult.matches.length).toBeGreaterThan(0);

      // 3. Generate suggestions
      const suggestionResult = await ruleEngine.generateSuggestions([testProcessedTransactionId], [rule.id]);
      expect(suggestionResult.suggested).toBeGreaterThan(0);

      // 4. Check rule stats
      const stats = await ruleManagementService.getRuleStats(rule.id);
      expect(stats.totalSuggestions).toBeGreaterThan(0);

      // 5. Update rule
      const updatedRule = await ruleManagementService.updateRule(rule.id, {
        name: 'Updated E2E Rule',
        priority: 10,
      });

      expect(updatedRule.name).toBe('Updated E2E Rule');
      expect(updatedRule.priority).toBe(10);

      // 6. Toggle rule status
      const inactiveRule = await ruleManagementService.toggleRuleStatus(rule.id, false);
      expect(inactiveRule.isActive).toBe(false);

      // 7. Clean up
      await ruleManagementService.deleteRule(rule.id);

      const deletedRule = await ruleManagementService.getRule(rule.id);
      expect(deletedRule).toBeNull();
    });
  });
});