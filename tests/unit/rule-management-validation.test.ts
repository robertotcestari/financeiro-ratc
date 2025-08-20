import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RuleManagementService } from '../../lib/core/database/rule-management';
import { prisma } from '../../lib/core/database/client';

// Mock Prisma
vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
    },
    property: {
      findUnique: vi.fn(),
    },
    bankAccount: {
      findMany: vi.fn(),
    },
    categorizationRule: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('RuleManagementService - Property Optional Validation', () => {
  let service: RuleManagementService;

  beforeEach(() => {
    service = new RuleManagementService();
    vi.clearAllMocks();
  });

  describe('createRule', () => {
    it('should allow creating a rule with only category (no property)', async () => {
      const mockCategory = { id: 'cat-1', name: 'Aluguel' };
      const mockRule = {
        id: 'rule-1',
        name: 'Test Rule',
        categoryId: 'cat-1',
        propertyId: null,
        criteria: {},
        category: mockCategory,
        property: null,
        _count: { suggestions: 0 },
      };

      // Setup mocks
      vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as any);
      vi.mocked(prisma.categorizationRule.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.categorizationRule.create).mockResolvedValue(mockRule as any);

      const result = await service.createRule({
        name: 'Test Rule',
        categoryId: 'cat-1',
        criteria: {},
      });

      expect(result).toBeDefined();
      expect(result.categoryId).toBe('cat-1');
      expect(result.propertyId).toBeNull();
      expect(prisma.categorizationRule.create).toHaveBeenCalled();
    });

    it('should allow creating a rule with both category and property', async () => {
      const mockCategory = { id: 'cat-1', name: 'Aluguel' };
      const mockProperty = { id: 'prop-1', code: 'CAT-001' };
      const mockRule = {
        id: 'rule-1',
        name: 'Test Rule',
        categoryId: 'cat-1',
        propertyId: 'prop-1',
        criteria: {},
        category: mockCategory,
        property: mockProperty,
        _count: { suggestions: 0 },
      };

      // Setup mocks
      vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as any);
      vi.mocked(prisma.property.findUnique).mockResolvedValue(mockProperty as any);
      vi.mocked(prisma.categorizationRule.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.categorizationRule.create).mockResolvedValue(mockRule as any);

      const result = await service.createRule({
        name: 'Test Rule',
        categoryId: 'cat-1',
        propertyId: 'prop-1',
        criteria: {},
      });

      expect(result).toBeDefined();
      expect(result.categoryId).toBe('cat-1');
      expect(result.propertyId).toBe('prop-1');
      expect(prisma.categorizationRule.create).toHaveBeenCalled();
    });

    it('should reject creating a rule without category', async () => {
      await expect(
        service.createRule({
          name: 'Test Rule',
          criteria: {},
        })
      ).rejects.toThrow('Rule must have a category');
    });
  });

  describe('updateRule', () => {
    it('should allow updating a rule to remove property but keep category', async () => {
      const existingRule = {
        id: 'rule-1',
        name: 'Test Rule',
        categoryId: 'cat-1',
        propertyId: 'prop-1',
        criteria: {},
      };
      
      const updatedRule = {
        ...existingRule,
        propertyId: null,
        category: { id: 'cat-1', name: 'Aluguel' },
        property: null,
        _count: { suggestions: 0 },
      };

      // Setup mocks
      vi.mocked(prisma.categorizationRule.findUnique).mockResolvedValue(existingRule as any);
      vi.mocked(prisma.categorizationRule.update).mockResolvedValue(updatedRule as any);

      const result = await service.updateRule('rule-1', {
        propertyId: undefined,
      });

      expect(result).toBeDefined();
      expect(result.propertyId).toBeNull();
      expect(result.categoryId).toBe('cat-1');
    });

    it('should maintain category when not explicitly updating it', async () => {
      const existingRule = {
        id: 'rule-1',
        name: 'Test Rule',
        categoryId: 'cat-1',
        propertyId: 'prop-1',
        criteria: {},
      };
      
      const updatedRule = {
        ...existingRule,
        name: 'Updated Rule',
        category: { id: 'cat-1', name: 'Aluguel' },
        property: { id: 'prop-1', code: 'CAT-001' },
        _count: { suggestions: 0 },
      };

      // Setup mocks
      vi.mocked(prisma.categorizationRule.findUnique).mockResolvedValue(existingRule as any);
      vi.mocked(prisma.categorizationRule.update).mockResolvedValue(updatedRule as any);

      const result = await service.updateRule('rule-1', {
        name: 'Updated Rule',
      });
      
      // The rule should still have its category
      expect(result).toBeDefined();
      expect(result.categoryId).toBe('cat-1');
    });
  });
});