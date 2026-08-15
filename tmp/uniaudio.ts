import { getImobziAuthToken } from '@/lib/features/imobzi/auth';

async function fetchInvoices(status: string, start: string, end: string) {
  const token = await getImobziAuthToken();
  const params = new URLSearchParams({
    order_by: 'due_date', sort_by: 'asc', status,
    start_at: start, end_at: end, page: '1', contract_type: 'all',
  });
  const res = await fetch(`https://my.imobzi.com/v1/invoices?${params}`, {
    headers: { accept: 'application/json, text/plain, */*', authorization: token, 'content-type': 'application/json' },
  });
  if (!res.ok) throw new Error(`${status}: ${res.statusText}`);
  const data = await res.json();
  return data.invoices || data || [];
}

async function main() {
  const out: any[] = [];
  for (const status of ['paid', 'pending']) {
    const inv = await fetchInvoices(status, '2025-12-01', '2026-07-31');
    for (const i of inv) {
      const name = i.contact?.name || '';
      const addr = i.property?.address || '';
      if (/uniaudio|Independ/i.test(name + ' ' + addr)) {
        out.push({ status: i.status, due: i.due_date, paid_at: i.paid_at,
          total: i.total_value, paid: i.paid_value ?? i.value_paid ?? null,
          tenant: name, addr, desc: i.description });
      }
    }
  }
  console.log('===JSON===');
  console.log(JSON.stringify(out, null, 2));
}
main();
