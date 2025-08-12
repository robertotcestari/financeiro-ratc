import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../lib/database/client';
import {
  createOrUpdateSnapshot,
  calculateSnapshotData,
  validateSnapshot,
  cleanupOrphanSnapshots,
  getLatestSnapshot,
  getSnapshotsByPeriod,
} from '../../lib/database/account-snapshots';
import {
  getCurrentBalanceOptimized,
  getBalanceAtDateOptimized,
  getSnapshotPerformanceStats,
} from '../../lib/financial-calculations-optimized';
import { Decimal } from '@prisma/client/runtime/library';

describe('Account Snapshots', () => {
  let testAccountId: string;

  beforeEach(async () => {
    // Cria uma conta de teste com nome único
    const account = await prisma.bankAccount.create({
      data: {
        name: `Test Account ${Date.now()}`,
        bankName: 'Test Bank',
        accountType: 'CHECKING',
        isActive: true,
      },
    });
    testAccountId = account.id;

    // Adiciona algumas transações de teste
    const transactions = [
      {
        date: new Date('2024-01-15'),
        amount: new Decimal(1000),
        description: 'Depósito inicial',
      },
      {
        date: new Date('2024-01-20'),
        amount: new Decimal(-200),
        description: 'Pagamento',
      },
      {
        date: new Date('2024-02-10'),
        amount: new Decimal(500),
        description: 'Receita',
      },
      {
        date: new Date('2024-02-25'),
        amount: new Decimal(-100),
        description: 'Despesa',
      },
      {
        date: new Date('2024-03-05'),
        amount: new Decimal(300),
        description: 'Receita',
      },
    ];

    for (const tx of transactions) {
      await prisma.transaction.create({
        data: { bankAccountId: testAccountId, ...tx },
      });
    }
  });

  afterEach(async () => {
    await prisma.accountSnapshot.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
  });

  describe('calculateSnapshotData', () => {
    it('deve calcular corretamente os dados do snapshot para um mês', async () => {
      const result = await calculateSnapshotData(testAccountId, 2024, 2);

      expect(result.openingBalance.toNumber()).toBe(800); // 1000 - 200
      expect(result.closingBalance.toNumber()).toBe(1200); // 800 + 500 - 100
      expect(result.totalCredits.toNumber()).toBe(500);
      expect(result.totalDebits.toNumber()).toBe(100);
      expect(result.transactionCount).toBe(2);
    });

    it('deve retornar zero para mês sem transações', async () => {
      const result = await calculateSnapshotData(testAccountId, 2024, 4);

      expect(result.openingBalance.toNumber()).toBe(1500); // Saldo acumulado até março
      expect(result.closingBalance.toNumber()).toBe(1500); // Sem mudanças
      expect(result.totalCredits.toNumber()).toBe(0);
      expect(result.totalDebits.toNumber()).toBe(0);
      expect(result.transactionCount).toBe(0);
    });
  });

  describe('createOrUpdateSnapshot', () => {
    it('deve criar um novo snapshot', async () => {
      const snapshot = await createOrUpdateSnapshot(testAccountId, 2024, 1);

      expect(snapshot).toBeDefined();
      expect(snapshot.bankAccountId).toBe(testAccountId);
      expect(snapshot.year).toBe(2024);
      expect(snapshot.month).toBe(1);
      expect(snapshot.closingBalance.toNumber()).toBe(800);
    });

    it('deve atualizar um snapshot existente', async () => {
      // Cria o snapshot inicial
      const initial = await createOrUpdateSnapshot(testAccountId, 2024, 1);

      // Adiciona uma nova transação
      await prisma.transaction.create({
        data: {
          bankAccountId: testAccountId,
          date: new Date('2024-01-25'),
          amount: new Decimal(150),
          description: 'Nova transação',
        },
      });

      // Atualiza o snapshot
      const updated = await createOrUpdateSnapshot(testAccountId, 2024, 1);

      expect(updated.id).toBe(initial.id);
      expect(updated.closingBalance.toNumber()).toBe(950); // 800 + 150
      expect(updated.transactionCount).toBe(3); // 2 + 1
    });
  });

  describe('validateSnapshot', () => {
    it('deve validar um snapshot correto', async () => {
      const snapshot = await createOrUpdateSnapshot(testAccountId, 2024, 2);
      const validation = await validateSnapshot(snapshot.id);

      expect(validation.isValid).toBe(true);
      expect(validation.differences.closingBalance).toBe(0);
      expect(validation.differences.transactionCount).toBe(0);
    });

    it('deve detectar snapshot inválido', async () => {
      const snapshot = await createOrUpdateSnapshot(testAccountId, 2024, 2);

      // Modifica o snapshot manualmente para torná-lo inválido
      await prisma.accountSnapshot.update({
        where: { id: snapshot.id },
        data: { closingBalance: new Decimal(9999) },
      });

      const validation = await validateSnapshot(snapshot.id);

      expect(validation.isValid).toBe(false);
      expect(Math.abs(validation.differences.closingBalance)).toBeGreaterThan(
        0
      );
    });
  });

  describe('getLatestSnapshot', () => {
    it('deve retornar o snapshot mais recente', async () => {
      await createOrUpdateSnapshot(testAccountId, 2024, 1);
      await createOrUpdateSnapshot(testAccountId, 2024, 2);
      await createOrUpdateSnapshot(testAccountId, 2024, 3);

      const latest = await getLatestSnapshot(testAccountId);

      expect(latest).toBeDefined();
      expect(latest?.year).toBe(2024);
      expect(latest?.month).toBe(3);
    });
  });

  describe('getSnapshotsByPeriod', () => {
    it('deve retornar snapshots do período especificado', async () => {
      await createOrUpdateSnapshot(testAccountId, 2024, 1);
      await createOrUpdateSnapshot(testAccountId, 2024, 2);
      await createOrUpdateSnapshot(testAccountId, 2024, 3);

      const snapshots = await getSnapshotsByPeriod(2024, 2, testAccountId);

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].month).toBe(2);
    });

    it('deve retornar todos os snapshots do ano', async () => {
      await createOrUpdateSnapshot(testAccountId, 2024, 1);
      await createOrUpdateSnapshot(testAccountId, 2024, 2);
      await createOrUpdateSnapshot(testAccountId, 2024, 3);

      const snapshots = await getSnapshotsByPeriod(
        2024,
        undefined,
        testAccountId
      );

      expect(snapshots).toHaveLength(3);
    });
  });

  describe('cleanupOrphanSnapshots', () => {
    it('deve remover snapshots sem transações', async () => {
      // Cria um snapshot para um mês sem transações
      await prisma.accountSnapshot.create({
        data: {
          bankAccountId: testAccountId,
          year: 2024,
          month: 12,
          openingBalance: new Decimal(0),
          closingBalance: new Decimal(0),
          totalDebits: new Decimal(0),
          totalCredits: new Decimal(0),
          transactionCount: 0,
          lastSyncedAt: new Date(),
        },
      });

      const deletedCount = await cleanupOrphanSnapshots();

      expect(deletedCount).toBeGreaterThan(0);

      const remaining = await prisma.accountSnapshot.count({
        where: {
          bankAccountId: testAccountId,
          year: 2024,
          month: 12,
        },
      });

      expect(remaining).toBe(0);
    });
  });
});

describe('Optimized Balance Calculations', () => {
  let testAccountId: string;

  beforeEach(async () => {
    // Cria conta e transações de teste
    const account = await prisma.bankAccount.create({
      data: {
        name: `Optimization Test Account ${Date.now()}`,
        bankName: 'Test Bank',
        accountType: 'CHECKING',
        isActive: true,
      },
    });
    testAccountId = account.id;

    // Cria muitas transações para testar otimização
    const transactions = [];
    for (let month = 1; month <= 6; month++) {
      for (let day = 1; day <= 20; day++) {
        const amount = Math.random() * 1000 - 500;
        transactions.push({
          bankAccountId: testAccountId,
          date: new Date(2024, month - 1, day),
          amount: new Decimal(amount),
          description: `Transaction ${month}-${day}`,
        });
      }
    }
    await prisma.transaction.createMany({ data: transactions });
  });

  afterEach(async () => {
    await prisma.accountSnapshot.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
  });

  describe('getCurrentBalanceOptimized', () => {
    it('deve calcular saldo sem snapshots', async () => {
      const result = await getCurrentBalanceOptimized(testAccountId);

      expect(result.calculatedFrom).toBe('full-calculation');
      expect(result.transactionsProcessed).toBe(120); // 6 meses * 20 transações
      expect(typeof result.balance).toBe('number');
    });

    it('deve usar snapshots para otimização', async () => {
      // Cria snapshots para os primeiros 5 meses
      for (let month = 1; month <= 5; month++) {
        await createOrUpdateSnapshot(testAccountId, 2024, month);
      }

      const result = await getCurrentBalanceOptimized(
        testAccountId,
        new Date('2024-06-30')
      );

      expect(result.calculatedFrom).toBe('snapshot');
      expect(result.transactionsProcessed).toBeLessThan(120); // Deve processar menos transações
      expect(result.snapshotDate).toBeDefined();
    });
  });

  describe('getSnapshotPerformanceStats', () => {
    it('deve calcular estatísticas de performance', async () => {
      // Cria alguns snapshots
      await createOrUpdateSnapshot(testAccountId, 2024, 1);
      await createOrUpdateSnapshot(testAccountId, 2024, 2);
      await createOrUpdateSnapshot(testAccountId, 2024, 3);

      const stats = await getSnapshotPerformanceStats(testAccountId);

      expect(stats.totalTransactions).toBe(120);
      expect(stats.totalSnapshots).toBe(3);
      expect(stats.averageTransactionsPerSnapshot).toBe(20);
      expect(stats.coveragePercentage).toBe(50); // 3 meses de 6
      expect(stats.oldestSnapshot).toBeDefined();
      expect(stats.newestSnapshot).toBeDefined();
    });
  });

  describe('getBalanceAtDateOptimized', () => {
    it('deve calcular saldo em data específica usando snapshots', async () => {
      // Cria snapshot para janeiro
      await createOrUpdateSnapshot(testAccountId, 2024, 1);

      const balance1 = await getBalanceAtDateOptimized(
        testAccountId,
        new Date('2024-01-15')
      );

      const balance2 = await getBalanceAtDateOptimized(
        testAccountId,
        new Date('2024-02-15')
      );

      expect(typeof balance1).toBe('number');
      expect(typeof balance2).toBe('number');
      expect(balance1).not.toBe(balance2); // Saldos devem ser diferentes
    });
  });
});
