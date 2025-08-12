import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/database/client';

beforeAll(async () => {
  // Limpa o banco de dados antes de todos os testes
  await prisma.accountSnapshot.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.bankAccount.deleteMany({});
});

afterAll(async () => {
  // Desconecta do banco de dados após todos os testes
  await prisma.$disconnect();
});
