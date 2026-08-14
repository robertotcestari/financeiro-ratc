import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    payableRecurrence: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payable: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/core/database/payables', () => ({
  createPayable: vi.fn(),
}));

import { prisma } from '@/lib/core/database/client';
import { createPayable } from '@/lib/core/database/payables';
import { generateRecurrenceForPeriod } from '@/lib/core/database/payable-recurrences';

const recurrence = {
  id: 'rec-1',
  vendorId: 'vendor-1',
  description: 'Condomínio',
  categoryId: 'cat-1',
  propertyId: 'prop-1',
  amount: 800,
  paymentMethod: 'BOLETO',
  frequency: 'MONTHLY',
  dayOfMonth: 10,
  startDate: new Date('2026-01-10T00:00:00.000Z'),
  endDate: null,
  isActive: true,
};

describe('generateRecurrenceForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.payableRecurrence.findUnique).mockResolvedValue(
      recurrence as never
    );
  });

  it('does not create a second payable for the same competence', async () => {
    vi.mocked(prisma.payable.findFirst).mockResolvedValue({
      id: 'pay-existing',
    } as never);

    const result = await generateRecurrenceForPeriod('rec-1', 2026, 7);

    expect(result.created).toBe(false);
    expect(createPayable).not.toHaveBeenCalled();
  });

  it('creates a payable when the competence is still open', async () => {
    vi.mocked(prisma.payable.findFirst).mockResolvedValue(null);
    vi.mocked(createPayable).mockResolvedValue({ id: 'pay-new' } as never);
    vi.mocked(prisma.payableRecurrence.update).mockResolvedValue(
      recurrence as never
    );

    const result = await generateRecurrenceForPeriod('rec-1', 2026, 7);

    expect(result.created).toBe(true);
    expect(createPayable).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrenceId: 'rec-1',
        competenceDate: '2026-07-01',
        installments: [
          expect.objectContaining({ dueDate: '2026-07-10', amount: 800 }),
        ],
      })
    );
  });
});
