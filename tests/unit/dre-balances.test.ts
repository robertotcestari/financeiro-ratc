import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/core/database/client';
import { generateDRE } from '@/lib/core/database/dre';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    bankAccount: { findMany: vi.fn() },
    transaction: { groupBy: vi.fn() },
    category: { findMany: vi.fn() },
    processedTransaction: { findMany: vi.fn() },
    accountSnapshot: { findMany: vi.fn() },
  },
}));

type Movement = { bankAccountId: string; date: Date; amount: string };
let movements: Movement[];

function movement(bankAccountId: string, year: number, month: number, amount: string): Movement {
  return { bankAccountId, date: new Date(year, month - 1, 15), amount };
}

async function balances(year: number, month?: number) {
  const lines = await generateDRE(year, month);
  return Object.fromEntries(
    lines.filter((line) => line.id.startsWith('saldo-')).map((line) => [line.id, line.amount])
  );
}

describe('saldos bancários automáticos do DRE', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    movements = [];
    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue([
      { id: 'checking', name: 'Conta corrente', isActive: true },
      { id: 'investment', name: 'Investimento', isActive: true },
    ] as Awaited<ReturnType<typeof prisma.bankAccount.findMany>>);
    vi.mocked(prisma.category.findMany).mockResolvedValue([]);
    vi.mocked(prisma.processedTransaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.accountSnapshot.findMany).mockRejectedValue(
      new Error('Saldos não devem depender de snapshots')
    );
    // Simula a agregação do banco sobre lançamentos sem saldo de extrato.
    vi.mocked(prisma.transaction.groupBy).mockImplementation(async (args) => {
      const where = args.where as {
        bankAccountId: { in: string[] };
        date: { lt: Date };
      };
      const sums = new Map<string, Prisma.Decimal>();
      for (const tx of movements) {
        if (!where.bankAccountId.in.includes(tx.bankAccountId) || tx.date >= where.date.lt) continue;
        sums.set(tx.bankAccountId, (sums.get(tx.bankAccountId) ?? new Prisma.Decimal(0)).plus(tx.amount));
      }
      return [...sums].map(([bankAccountId, amount]) => ({ bankAccountId, _sum: { amount } }));
    });
  });

  it('inclui o histórico anterior e dispensa o cálculo manual de snapshots', async () => {
    movements = [
      movement('checking', 2025, 12, '1000.10'),
      movement('checking', 2026, 9, '-200.05'),
      movement('investment', 2026, 9, '350.25'),
      movement('inactive', 2026, 9, '9999'),
    ];

    const lines = await generateDRE(2026, 9);
    expect(lines.find((line) => line.id === 'saldo-checking')?.amount).toBe(800.05);
    expect(lines.find((line) => line.id === 'total-saldos-bancarios')?.amount).toBe(1150.30);
    expect(prisma.bankAccount.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    expect(prisma.accountSnapshot.findMany).not.toHaveBeenCalled();
  });

  it('atualiza após importação, edição e exclusão retroativa sem clicar em um botão', async () => {
    movements = [movement('checking', 2026, 8, '100')];
    expect((await balances(2026, 9))['saldo-checking']).toBe(100);

    movements.push(movement('checking', 2026, 9, '-20'));
    expect((await balances(2026, 9))['saldo-checking']).toBe(80);

    movements[0].amount = '200';
    expect((await balances(2026, 9))['saldo-checking']).toBe(180);

    movements.splice(0, 1);
    expect((await balances(2026, 9))['saldo-checking']).toBe(-20);

    movements = [];
    expect((await balances(2026, 9))['saldo-checking']).toBe(0);
  });

  it('inclui o último milissegundo do mês e exclui o mês seguinte', async () => {
    movements = [
      { bankAccountId: 'checking', date: new Date(2026, 8, 30, 23, 59, 59, 999), amount: '10' },
      { bankAccountId: 'checking', date: new Date(2026, 9, 1), amount: '999' },
    ];
    expect((await balances(2026, 9))['saldo-checking']).toBe(10);
  });

  it('mantém o saldo em meses sem movimentação', async () => {
    movements = [movement('checking', 2026, 1, '125.45')];
    expect((await balances(2026, 9))['saldo-checking']).toBe(125.45);
  });

  it('preserva saldo zero e contas sem transações', async () => {
    movements = [
      movement('checking', 2026, 8, '0.30'),
      movement('checking', 2026, 9, '-0.30'),
    ];
    expect(await balances(2026, 9)).toEqual({ 'saldo-checking': 0, 'saldo-investment': 0 });
  });

  it('calcula o saldo anual até dezembro e exclui o ano seguinte', async () => {
    movements = [
      movement('checking', 2025, 12, '100'),
      movement('checking', 2026, 12, '25'),
      movement('checking', 2027, 1, '999'),
    ];
    expect((await balances(2026))['saldo-checking']).toBe(125);
  });
});
