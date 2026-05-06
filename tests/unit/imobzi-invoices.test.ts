import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/features/imobzi/auth', () => ({
  getImobziAuthToken: vi.fn().mockResolvedValue('test-token'),
}));

const { getImobziPendingInvoices } = await import('@/lib/features/imobzi/invoices');

describe('getImobziPendingInvoices', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00Z'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('fetches April pending invoices without payment method filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        invoices: [
          {
            invoice_id: 'inv-1',
            due_date: '2026-04-10',
            total_value: 1125,
            status: 'pending',
            contact: { name: 'Imobiliária Casa Verde', type: 'company' },
            property: {
              address: 'Rua Piauí, 317',
              city: 'Catanduva',
              state: 'SP',
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock;

    const invoices = await getImobziPendingInvoices(4, 2026);

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.hostname).toBe('my.imobzi.com');
    expect(requestedUrl.pathname).toBe('/v1/invoices');
    expect(requestedUrl.searchParams.get('status')).toBe('pending');
    expect(requestedUrl.searchParams.get('start_at')).toBe('2026-04-01');
    expect(requestedUrl.searchParams.get('end_at')).toBe('2026-04-30');
    expect(requestedUrl.searchParams.get('order_by')).toBe('due_date');
    expect(requestedUrl.searchParams.has('payment_method')).toBe(false);
    expect(requestedUrl.searchParams.has('payment_methods_available')).toBe(false);

    expect(invoices).toEqual([
      expect.objectContaining({
        id: 'inv-1',
        tenantName: 'Imobiliária Casa Verde',
        propertyName: 'Rua Piauí, 317 - Catanduva',
        dueDate: '2026-04-10',
        value: 1125,
        status: 'pending',
      }),
    ]);
  });
});
