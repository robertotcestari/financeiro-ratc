import { beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/core/database/client';

// Only run database setup for integration tests, not component tests
const isIntegrationTest = process.argv.some(arg => 
  arg.includes('integration/') || 
  arg.includes('test.ts') ||
  process.env.VITEST_INTEGRATION === 'true'
);

// Mock ResizeObserver for all tests (needed by cmdk component)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView for all tests (needed by cmdk component)
Element.prototype.scrollIntoView = () => {};

if (isIntegrationTest) {
  beforeAll(async () => {
    // Limpa o banco de dados antes de todos os testes de integração
    try {
      await prisma.accountSnapshot.deleteMany({});
      await prisma.transaction.deleteMany({});
      await prisma.bankAccount.deleteMany({});
    } catch (error) {
      console.warn('Database cleanup failed:', error.message);
    }
  });

  afterAll(async () => {
    // Desconecta do banco de dados após todos os testes de integração
    await prisma.$disconnect();
  });
}
